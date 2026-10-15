import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { EmptyState, PageTitle, Panel } from '../ui';

const PAPEL_ROTULO = {
  responsavel: 'Responsável',
  cuidador: 'Cuidador',
  autocuidado: 'Paciente',
  paciente: 'Paciente',
};
const SITUACAO = { pendente: 'Aguardando', usado: 'Aceito', revogado: 'Cancelado', expirado: 'Expirado' };

function primeiroNome(n) {
  return String(n || '').trim().split(/\s+/)[0] || '';
}

function LinkGerado({ link, texto, onFechar }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      window.prompt('Copie o link:', link);
    }
  }
  async function compartilhar() {
    try {
      await navigator.share({ title: 'Convite VitaLink', text: texto, url: link });
    } catch {
      /* cancelado */
    }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`;
  return (
    <div className="grid gap-2 rounded-xl bg-aqua-soft p-3">
      <p className="text-sm font-semibold text-ink">Link criado. Envie para a pessoa convidada:</p>
      <input readOnly value={link} className="h-10 rounded-lg border border-[#cfe0df] bg-white px-2 text-xs" onFocus={(e) => e.target.select()} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" onClick={copiar} className="h-11 rounded-xl bg-aqua font-semibold text-white">
          {copiado ? 'Copiado ✓' : 'Copiar link'}
        </button>
        <a href={wa} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-xl bg-[#25D366] font-semibold text-white">
          WhatsApp
        </a>
        {typeof navigator !== 'undefined' && navigator.share ? (
          <button type="button" onClick={compartilhar} className="h-11 rounded-xl border border-[#cfe0df] font-semibold text-ink">
            Compartilhar…
          </button>
        ) : null}
      </div>
      <p className="text-xs text-slate-health">
        Por segurança o link só aparece agora. Vale 7 dias e serve para uma pessoa. Se perder, cancele e gere outro.
      </p>
      <button type="button" onClick={onFechar} className="justify-self-start text-sm text-slate-health underline">Fechar</button>
    </div>
  );
}

export default function RedeView() {
  const { usuario } = useAuth();
  const { pacienteId, paciente } = usePacienteAtivo();
  const [membros, setMembros] = useState([]);
  const [gestor, setGestor] = useState(false);
  const [convites, setConvites] = useState([]);
  const [papel, setPapel] = useState('cuidador');
  const [rotulo, setRotulo] = useState('');
  const [gerado, setGerado] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!pacienteId) return;
    try {
      const m = await apiRequest('/rede-cuidado/membros', { query: { paciente_id: pacienteId } });
      setMembros(m.data || []);
      setGestor(Boolean(m.pode_gerenciar));
      if (m.pode_gerenciar) {
        const c = await apiRequest('/convites', { query: { paciente_id: pacienteId } });
        setConvites(c.data || []);
      } else {
        setConvites([]);
      }
    } catch (e) {
      setErr(e.message || 'Não foi possível carregar a rede de cuidado.');
    }
  }, [pacienteId]);

  useEffect(() => {
    setGerado(null);
    load();
  }, [load]);

  async function convidar(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const r = await apiRequest('/convites', {
        method: 'POST',
        body: { paciente_id: Number(pacienteId), papel, rotulo: rotulo.trim() || undefined },
      });
      const link = `${window.location.origin}/convite/${r.data.token}`;
      const quem = primeiroNome(usuario?.nome) || 'Eu';
      const texto = `Olá! ${quem} convidou você para acompanhar os cuidados de ${primeiroNome(paciente?.nome)} no VitaLink como ${PAPEL_ROTULO[papel].toLowerCase()}. Abra o link para aceitar (vale 7 dias):`;
      setGerado({ link, texto });
      setRotulo('');
      await load();
    } catch (e2) {
      setErr(e2.message || 'Não foi possível criar o convite.');
    } finally {
      setBusy(false);
    }
  }

  async function revogar(id) {
    if (!window.confirm('Cancelar este convite? O link deixará de funcionar.')) return;
    setErr('');
    try {
      await apiRequest(`/convites/${id}/revogar`, { method: 'POST' });
      setMsg('Convite cancelado.');
      await load();
    } catch (e) {
      setErr(e.message || 'Não foi possível cancelar.');
    }
  }

  async function remover(m) {
    if (!window.confirm(`Remover o acesso de ${m.nome} a ${primeiroNome(paciente?.nome)}? A pessoa deixa de ver os dados na hora.`)) return;
    setErr('');
    try {
      await apiRequest(`/rede-cuidado/membros/${m.usuario_id}`, { method: 'DELETE', query: { paciente_id: pacienteId } });
      setMsg(`Acesso de ${m.nome} removido.`);
      await load();
    } catch (e) {
      setErr(e.message || 'Não foi possível remover.');
    }
  }

  if (!pacienteId) return <EmptyState>Selecione um paciente.</EmptyState>;

  const pendentes = convites.filter((c) => c.situacao === 'pendente');
  const historico = convites.filter((c) => c.situacao !== 'pendente').slice(0, 10);

  return (
    <div className="grid gap-4">
      <PageTitle
        eyebrow="Família e cuidadores"
        title={`Rede de cuidado${paciente?.nome ? ` · ${primeiroNome(paciente.nome)}` : ''}`}
        description="Quem acompanha este paciente no VitaLink. Convide familiares e cuidadores por link."
      />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm font-semibold text-aqua-deep">✓ {msg}</p> : null}

      {gestor ? (
        <Panel>
          <form onSubmit={convidar} className="grid gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-health">Convidar</h2>
            <div className="grid grid-cols-2 gap-2">
              {['cuidador', 'responsavel'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPapel(p)}
                  className={`h-11 rounded-xl border font-semibold ${papel === p ? 'border-aqua bg-aqua text-white' : 'border-[#cfe0df] text-ink'}`}
                >
                  {PAPEL_ROTULO[p]}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-health">
              {papel === 'responsavel'
                ? 'Responsável: vê e registra tudo e também pode convidar ou remover pessoas.'
                : 'Cuidador: vê e registra remédios, sinais e rotina. Não pode convidar nem remover pessoas.'}
            </p>
            <input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              maxLength={160}
              placeholder="Para quem é? (opcional, ex.: Maria – filha)"
              className="h-11 rounded-xl border border-[#cfe0df] px-3"
            />
            <button type="submit" disabled={busy} className="h-12 rounded-xl bg-aqua font-semibold text-white disabled:opacity-50">
              {busy ? 'Gerando…' : 'Gerar link de convite'}
            </button>
            {gerado ? <LinkGerado {...gerado} onFechar={() => setGerado(null)} /> : null}
          </form>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-health">Quem acompanha</h2>
        {membros.length ? (
          <ul className="divide-y divide-[#e2eeee]">
            {membros.map((m) => (
              <li key={m.usuario_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold text-ink">
                    {m.nome} {m.eu ? <span className="text-xs font-normal text-slate-health">(você)</span> : null}
                  </p>
                  <p className="text-xs text-slate-health">
                    {PAPEL_ROTULO[m.papel] || m.papel || 'Vinculado'}
                    {m.email ? ` · ${m.email}` : ''}
                  </p>
                </div>
                {m.removivel ? (
                  <button type="button" onClick={() => remover(m)} className="h-10 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700">
                    Remover acesso
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Ninguém vinculado ainda.</EmptyState>
        )}
      </Panel>

      {gestor ? (
        <Panel>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-health">Convites aguardando</h2>
          {pendentes.length ? (
            <ul className="divide-y divide-[#e2eeee]">
              {pendentes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-semibold text-ink">{c.rotulo || 'Convite sem nome'} · {PAPEL_ROTULO[c.papel]}</p>
                    <p className="text-xs text-slate-health">
                      Vale até {new Date(c.expires_at).toLocaleDateString('pt-BR')} · criado por {c.criado_por_nome || '—'}
                    </p>
                  </div>
                  <button type="button" onClick={() => revogar(c.id)} className="h-10 rounded-xl border border-[#cfe0df] px-3 text-sm font-semibold text-ink">
                    Revogar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nenhum convite aguardando.</EmptyState>
          )}
          {historico.length ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-slate-health">Convites anteriores</summary>
              <ul className="mt-1 grid gap-1 text-xs text-slate-health">
                {historico.map((c) => (
                  <li key={c.id}>
                    {c.rotulo || 'Convite'} · {PAPEL_ROTULO[c.papel]} · {SITUACAO[c.situacao]}
                    {c.usado_por_nome ? ` por ${c.usado_por_nome}` : ''}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
