import { useCallback, useEffect, useState } from 'react';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiDownload, apiRequest } from '../../../services/api';
import { EmptyState, PageTitle, Panel } from '../ui';

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];
const VALIDADES = [
  { h: 24, label: '24 horas' },
  { h: 72, label: '3 dias' },
  { h: 168, label: '7 dias' },
];
const SIT = { ativo: 'Ativo', expirado: 'Expirado', revogado: 'Cancelado' };

function hojeISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
function menosDias(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function br(iso) {
  return String(iso).slice(0, 10).split('-').reverse().join('/');
}

export default function RelatorioView() {
  const { pacienteId, paciente } = usePacienteAtivo();
  const [fim, setFim] = useState(hojeISO());
  const [inicio, setInicio] = useState(menosDias(hojeISO(), 29));
  const [validade, setValidade] = useState(72);
  const [links, setLinks] = useState(null);
  const [gerado, setGerado] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [copiado, setCopiado] = useState(false);

  const load = useCallback(async () => {
    if (!pacienteId) return;
    try {
      const r = await apiRequest('/relatorios/links', { query: { paciente_id: pacienteId } });
      setLinks(r.data || []);
    } catch {
      setLinks(null); // sem permissão para links (ex.: cuidador)
    }
  }, [pacienteId]);

  useEffect(() => {
    setGerado(null);
    load();
  }, [load]);

  function escolher(dias) {
    const f = hojeISO();
    setFim(f);
    setInicio(menosDias(f, dias - 1));
  }

  async function baixar() {
    setBusy('pdf');
    setErr('');
    try {
      await apiDownload(`/relatorios/paciente/${pacienteId}/pdf`, {
        query: { inicio, fim },
        filename: 'relatorio-vitalink.pdf',
      });
    } catch (e) {
      setErr(e.message || 'Não foi possível gerar o PDF.');
    } finally {
      setBusy('');
    }
  }

  async function gerarLink() {
    setBusy('link');
    setErr('');
    setMsg('');
    setCopiado(false);
    try {
      const r = await apiRequest('/relatorios/links', {
        method: 'POST',
        body: { paciente_id: Number(pacienteId), inicio, fim, validade_horas: validade },
      });
      const url = `${window.location.origin}/api/v1/relatorios/publico/${r.data.token}`;
      setGerado({ url, expires_at: r.data.expires_at });
      await load();
    } catch (e) {
      setErr(e.message || 'Não foi possível criar o link.');
    } finally {
      setBusy('');
    }
  }

  async function revogar(id) {
    if (!window.confirm('Cancelar este link? Quem tiver o link não conseguirá mais abrir o relatório.')) return;
    try {
      await apiRequest(`/relatorios/links/${id}/revogar`, { method: 'POST' });
      setMsg('Link cancelado.');
      if (gerado) setGerado(null);
      await load();
    } catch (e) {
      setErr(e.message || 'Não foi possível cancelar.');
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(gerado.url);
      setCopiado(true);
    } catch {
      window.prompt('Copie o link:', gerado.url);
    }
  }

  if (!pacienteId) return <EmptyState>Selecione um paciente.</EmptyState>;
  const textoWa = gerado
    ? `Relatório de ${String(paciente?.nome || '').split(' ')[0]} (VitaLink), período ${br(inicio)} a ${br(fim)}. O link vale até ${new Date(gerado.expires_at).toLocaleString('pt-BR')}: ${gerado.url}`
    : '';

  return (
    <div className="grid gap-4">
      <PageTitle
        eyebrow="Consulta"
        title="Relatório para o médico"
        description="PDF com remédios e doses, sinais vitais com as faixas definidas, anotações e exames do período. É um registro: não traz diagnóstico."
      />
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm font-semibold text-aqua-deep">✓ {msg}</p> : null}
      <Panel>
        <div className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-health">Período</h2>
          <div className="grid grid-cols-3 gap-2">
            {PERIODOS.map((p) => (
              <button key={p.dias} type="button" onClick={() => escolher(p.dias)}
                className={`h-11 rounded-xl border font-semibold ${inicio === menosDias(fim, p.dias - 1) && fim === hojeISO() ? 'border-aqua bg-aqua text-white' : 'border-[#cfe0df] text-ink'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="grid gap-1">De
              <input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} className="h-11 rounded-xl border border-[#cfe0df] px-2" />
            </label>
            <label className="grid gap-1">Até
              <input type="date" value={fim} min={inicio} max={hojeISO()} onChange={(e) => setFim(e.target.value)} className="h-11 rounded-xl border border-[#cfe0df] px-2" />
            </label>
          </div>
          <button type="button" onClick={baixar} disabled={busy === 'pdf'} className="h-12 rounded-xl bg-aqua font-semibold text-white disabled:opacity-50">
            {busy === 'pdf' ? 'Gerando PDF…' : 'Baixar PDF'}
          </button>
        </div>
      </Panel>

      {links ? (
        <Panel>
          <div className="grid gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-health">Link temporário para o médico</h2>
            <p className="text-xs text-slate-health">
              Quem tiver o link vê apenas este PDF, até expirar ou ser cancelado. Cada abertura fica registrada. O responsável vê e cancela todos os links; cuidadores, os que criaram.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Validade:</span>
              {VALIDADES.map((v) => (
                <button key={v.h} type="button" onClick={() => setValidade(v.h)}
                  className={`h-10 rounded-xl border px-3 font-semibold ${validade === v.h ? 'border-aqua bg-aqua text-white' : 'border-[#cfe0df] text-ink'}`}>
                  {v.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={gerarLink} disabled={busy === 'link'} className="h-12 rounded-xl border border-aqua font-semibold text-aqua-deep disabled:opacity-50">
              {busy === 'link' ? 'Criando…' : 'Gerar link'}
            </button>
            {gerado ? (
              <div className="grid gap-2 rounded-xl bg-aqua-soft p-3">
                <input readOnly value={gerado.url} onFocus={(e) => e.target.select()} className="h-10 rounded-lg border border-[#cfe0df] bg-white px-2 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={copiar} className="h-11 rounded-xl bg-aqua font-semibold text-white">{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(textoWa)}`} target="_blank" rel="noreferrer"
                    className="flex h-11 items-center justify-center rounded-xl bg-[#25D366] font-semibold text-white">WhatsApp</a>
                </div>
                <p className="text-xs text-slate-health">O link só aparece agora. Vale até {new Date(gerado.expires_at).toLocaleString('pt-BR')}.</p>
              </div>
            ) : null}
            {links.length ? (
              <ul className="divide-y divide-[#e2eeee] text-sm">
                {links.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-semibold text-ink">{br(l.periodo_inicio)} a {br(l.periodo_fim)} · {SIT[l.situacao]}</p>
                      <p className="text-xs text-slate-health">
                        Até {new Date(l.expires_at).toLocaleString('pt-BR')} · aberto {l.visualizacoes}x
                        {l.ultima_visualizacao_em ? ` (último: ${new Date(l.ultima_visualizacao_em).toLocaleString('pt-BR')})` : ''}
                        {l.criado_por_nome ? ` · por ${l.criado_por_nome}` : ''}
                      </p>
                    </div>
                    {l.situacao === 'ativo' && l.pode_revogar ? (
                      <button type="button" onClick={() => revogar(l.id)} className="h-10 rounded-xl border border-[#cfe0df] px-3 text-sm font-semibold text-ink">Revogar</button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
