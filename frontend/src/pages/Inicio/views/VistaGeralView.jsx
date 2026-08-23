import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { Field, TextTextarea } from '../../../components/forms/FormControls';
import { apiRequest } from '../../../services/api';
import { EmptyState, Panel, PrimaryButton } from '../ui';

const PERFIL = { ADMIN: 1, CUIDADOR: 4, RESPONSAVEL: 5, PACIENTE: 6 };

const TIPO_LABEL = {
  hospital: 'Hospitais',
  clinica: 'Clínicas',
  laboratorio: 'Laboratórios Médicos',
};

function weekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { de: start.toISOString(), ate: end.toISOString() };
}

function RedeDirectory({ pacienteId }) {
  const [hospitais, setHospitais] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiRequest('/hospitais', { query: { pageSize: 200, status: 'ativo' } }),
      apiRequest('/medicos', { query: { pageSize: 200, status: 'ativo' } }),
      pacienteId
        ? apiRequest(`/pacientes/${pacienteId}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([hRes, mRes, pacienteRes]) => {
        if (cancelled) return;
        let hosps = hRes.data || [];
        let meds = mRes.data || [];
        const paciente = pacienteRes?.data || pacienteRes;
        if (paciente?.id) {
          const medicoIds = new Set(
            (Array.isArray(paciente.medico_ids)
              ? paciente.medico_ids
              : typeof paciente.medico_ids === 'string'
                ? JSON.parse(paciente.medico_ids || '[]')
                : []
            ).map(Number)
          );
          if (medicoIds.size) {
            meds = meds.filter((m) => medicoIds.has(Number(m.id)));
            const estIds = new Set();
            for (const m of meds) {
              let est = m.estabelecimentos;
              if (typeof est === 'string') {
                try {
                  est = JSON.parse(est);
                } catch {
                  est = [];
                }
              }
              if (Array.isArray(est)) {
                est.forEach((e) => estIds.add(Number(e.id)));
              }
              if (m.hospital_clinica_id) estIds.add(Number(m.hospital_clinica_id));
            }
            if (estIds.size) hosps = hosps.filter((h) => estIds.has(Number(h.id)));
          }
        }
        setHospitais(hosps);
        setMedicos(meds);
      })
      .catch(() => {
        if (!cancelled) {
          setHospitais([]);
          setMedicos([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pacienteId]);

  const byTipo = useMemo(() => {
    const map = { hospital: [], clinica: [], laboratorio: [] };
    for (const h of hospitais) {
      const t = h.tipo_estabelecimento || 'clinica';
      if (!map[t]) map[t] = [];
      map[t].push(h);
    }
    return map;
  }, [hospitais]);

  const byEsp = useMemo(() => {
    const map = new Map();
    for (const m of medicos) {
      const key = m.especialidade || 'Sem especialidade';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [medicos]);

  if (loading) {
    return <p className="text-sm text-slate-health">Carregando rede de cuidado…</p>;
  }

  return (
    <div className="grid gap-4">
      {['hospital', 'clinica', 'laboratorio'].map((tipo) => (
        <Panel key={tipo}>
          <h2 className="mb-2 font-display text-lg font-bold text-aqua-deep">{TIPO_LABEL[tipo]}</h2>
          {byTipo[tipo]?.length ? (
            <ul className="grid gap-1">
              {byTipo[tipo].map((h) => (
                <li key={h.id}>
                  <Link
                    to={`/hospitais?edit=${h.id}`}
                    className="block rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-vita-soft/50"
                  >
                    {h.nome_fantasia}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-health">Nenhum cadastrado.</p>
          )}
        </Panel>
      ))}

      <Panel>
        <h2 className="mb-3 font-display text-lg font-bold text-aqua-deep">
          Profissionais por Especialidade
        </h2>
        {byEsp.length === 0 ? (
          <p className="text-sm text-slate-health">Nenhum profissional cadastrado.</p>
        ) : (
          <div className="grid gap-4">
            {byEsp.map(([esp, lista]) => (
              <div key={esp}>
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-vita">{esp}</h3>
                <ul className="grid gap-1">
                  {lista.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/medicos?edit=${m.id}`}
                        className="block rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-vita-soft/50"
                      >
                        {m.nome}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function VistaGeralView() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const perfilId = Number(usuario?.perfil?.id || usuario?.perfil_id || 0);
  const firstName = usuario?.nome?.split(' ')[0] || 'Usuário';
  const isAdmin = perfilId === PERFIL.ADMIN;
  const isResponsavel = perfilId === PERFIL.RESPONSAVEL;

  const { pacientes, pacienteId, paciente: selectedPaciente } = usePacienteAtivo();
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [taken, setTaken] = useState([]);
  const [quickText, setQuickText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [busyMed, setBusyMed] = useState(null);

  const loadCareData = useCallback(async () => {
    const { de, ate } = weekRange();
    try {
      const [agendaRes, medsRes, admRes] = await Promise.all([
        apiRequest('/agenda', {
          query: {
            paciente_id: pacienteId || undefined,
            de,
            ate,
          },
        }),
        apiRequest('/remedios', { query: { pageSize: 100, status: 'ativo' } }),
        apiRequest('/remedios/administracoes-hoje').catch(() => ({ data: [] })),
      ]);
      setAppointments(agendaRes.data || []);
      setMedicines(medsRes.data || []);
      setTaken((admRes.data || []).map((r) => String(r.remedio_id)));
    } catch {
      setAppointments([]);
      setMedicines([]);
      setTaken([]);
    }
  }, [pacienteId]);

  useEffect(() => {
    if (isAdmin) return;
    loadCareData();
  }, [isAdmin, loadCareData]);

  async function handleQuickSubmit(e) {
    e.preventDefault();
    const text = quickText.trim();
    if (!text) return;
    setSaving(true);
    setMsg('');
    try {
      const firstLine = text.split('\n')[0].slice(0, 80);
      await apiRequest('/inicio', {
        method: 'POST',
        body: {
          titulo: firstLine || 'Registro rápido',
          descricao: text,
          tipo: 'saude',
          prioridade: 'media',
          status: 'ativo',
          paciente_id: pacienteId || null,
        },
      });
      setQuickText('');
      setMsg('Registrado em Eventos.');
    } catch (err) {
      setMsg(err.message || 'Falha ao registrar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleTaken(med) {
    const sid = String(med.id);
    if (taken.includes(sid)) {
      // Não estorna estoque ao desmarcar
      setTaken((prev) => prev.filter((x) => x !== sid));
      return;
    }
    setBusyMed(sid);
    try {
      await apiRequest(`/remedios/${med.id}/administrar`, {
        method: 'POST',
        body: { paciente_id: pacienteId || null },
      });
      setTaken((prev) => [...new Set([...prev, sid])]);
      setMedicines((prev) =>
        prev.map((m) =>
          String(m.id) === sid
            ? {
                ...m,
                quantidade_estoque: Math.max(
                  0,
                  Number(m.quantidade_estoque || 0) -
                    (Number(String(m.quantidade_administrar).match(/[\d.]+/)?.[0]) || 1)
                ),
              }
            : m
        )
      );
    } catch (err) {
      window.alert(err.message || 'Falha ao registrar administração.');
    } finally {
      setBusyMed(null);
    }
  }

  function handleSearchEvents(e) {
    e.preventDefault();
    const q = searchQ.trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    if (pacienteId) params.set('paciente_id', pacienteId);
    navigate(`/timeline?${params.toString()}`);
  }

  // —— Admin: diretório institucional ——
  if (isAdmin) {
    return (
      <div>
        <div className="mb-5">
          <p className="text-sm text-slate-health">
            Olá, <span className="font-semibold text-ink">{firstName}</span>
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Rede de cuidado
          </h1>
          <p className="mt-1 text-sm text-slate-health">
            Resumo das instituições e profissionais cadastrados no sistema.
          </p>
        </div>
        <RedeDirectory />
      </div>
    );
  }

  const checkInLabel = isResponsavel
    ? selectedPaciente
      ? `Como está a saúde do seu paciente hoje?`
      : 'De quem você irá cuidar hoje?'
    : 'Como está sua saúde hoje?';

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-slate-health">
          Olá, <span className="font-semibold text-ink">{firstName}</span>
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {isResponsavel ? 'De quem você irá cuidar hoje?' : checkInLabel}
        </h1>
      </div>

      {pacienteId ? (
        <p className="mb-4 text-sm text-slate-health">
          Paciente ativo:{' '}
          <Link
            to={`/pacientes?edit=${pacienteId}`}
            className="font-semibold text-aqua hover:underline"
          >
            {selectedPaciente?.nome || 'ficha'}
          </Link>
        </p>
      ) : pacientes.length === 0 ? (
        <Panel className="mb-4">
          <p className="text-sm text-slate-health">Nenhum paciente vinculado ao seu usuário.</p>
        </Panel>
      ) : null}

      {pacienteId ? (
        <Panel className="mb-4">
          <form className="grid gap-3" onSubmit={handleQuickSubmit}>
            <Field
              label={
                isResponsavel
                  ? 'Como está a saúde do seu paciente hoje?'
                  : 'Registre como você está hoje'
              }
              required
            >
              <TextTextarea
                rows={4}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Ex.: Pressão 12/8 às 8h; temperatura 36,5 °C; dor de cabeça leve."
                required
              />
            </Field>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar em Eventos'}
            </PrimaryButton>
            {msg ? <p className="text-sm text-aqua-deep">{msg}</p> : null}
          </form>
        </Panel>
      ) : null}

      {pacienteId ? (
      <>
      <Panel className="mb-4">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleSearchEvents}>
          <label className="grid flex-1 gap-1 text-sm">
            <span className="font-semibold text-ink">Buscar eventos</span>
            <input
              className="min-h-11 rounded-xl border border-[#d7e8e7] px-3 text-sm"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Ex.: Febre, Dor de cabeça..."
            />
          </label>
          <PrimaryButton type="submit">Buscar na Linha do Tempo</PrimaryButton>
        </form>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-aqua-soft text-aqua-deep">
              ▣
            </span>
            <small className="text-xs font-bold uppercase tracking-wider text-slate-health">
              Compromissos da semana
            </small>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-health">Nenhum compromisso nesta semana.</p>
          ) : (
            <ul className="space-y-2">
              {appointments.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link
                    to="/inicio/agenda"
                    className="block rounded-xl bg-[#f4fbfa] px-3 py-2 text-sm hover:bg-aqua-soft"
                  >
                    <strong className="text-ink">{item.titulo}</strong>
                    <span className="mt-0.5 block text-xs text-slate-health">
                      {item.data_hora_inicio
                        ? new Date(item.data_hora_inicio).toLocaleString('pt-BR')
                        : '—'}
                      {item.consulta_especialidade
                        ? ` · ${item.consulta_especialidade}`
                        : item.tipo
                          ? ` · ${item.tipo}`
                          : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff1ed] text-[#e07a5f]">
              ✦
            </span>
            <small className="text-xs font-bold uppercase tracking-wider text-slate-health">
              Medicamentos de hoje
            </small>
          </div>
          {medicines.length === 0 ? (
            <>
              <p className="text-sm text-slate-health">Nenhum medicamento cadastrado.</p>
              <EmptyState>Cadastre em Medicamentos</EmptyState>
            </>
          ) : (
            <ul className="space-y-2">
              {medicines.map((m) => {
                const checked = taken.includes(String(m.id));
                return (
                  <li key={m.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                        checked ? 'bg-mint-soft/60 opacity-80' : 'bg-[#f4fbfa]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        disabled={busyMed === String(m.id)}
                        onChange={() => toggleTaken(m)}
                      />
                      <span>
                        <strong className="text-ink">{m.nome_comercial}</strong>
                        <small className="mt-0.5 block text-xs text-slate-health">
                          {m.periodo_horario || 'Horário'}
                          {m.quantidade_administrar ? ` · ${m.quantidade_administrar}` : ''}
                          {m.quantidade_estoque != null
                            ? ` · total ${m.quantidade_estoque} compr./mL`
                            : ''}
                        </small>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {!isAdmin ? (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">
            Sua rede de cuidado
          </h2>
          <RedeDirectory pacienteId={pacienteId || undefined} />
        </div>
      ) : null}
      </>
      ) : null}
    </div>
  );
}
