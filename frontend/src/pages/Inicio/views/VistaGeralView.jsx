import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { Field, TextTextarea } from '../../../components/forms/FormControls';
import { apiRequest } from '../../../services/api';
import { formatMedicoLabel } from '../../../utils/redeSaude';
import { Panel, PrimaryButton } from '../ui';

const PERFIL = { ADMIN: 1, CUIDADOR: 4, RESPONSAVEL: 5, PACIENTE: 6, AUTOCUIDADO: 7 };

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

function parseJsonIds(value) {
  if (Array.isArray(value)) return value.map(Number).filter((n) => Number.isFinite(n));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isFinite(n)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function matchesQuery(text, q) {
  if (!q) return true;
  return String(text || '')
    .toLocaleLowerCase('pt-BR')
    .includes(q);
}

function RedeDirectory({ pacienteId, hideWhenEmpty, title, somenteVinculados = false }) {
  const [hospitais, setHospitais] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [farmacias, setFarmacias] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cuidadores, setCuidadores] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [catalog, setCatalog] = useState({
    hospitais: [],
    medicos: [],
    farmacias: [],
    empresas: [],
    cuidadores: [],
  });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiRequest('/hospitais', { query: { pageSize: 200, status: 'ativo' } }).catch(() => ({ data: [] })),
      apiRequest('/medicos', { query: { pageSize: 200, status: 'ativo' } }).catch(() => ({ data: [] })),
      apiRequest('/farmacias', { query: { pageSize: 200, status: 'ativo' } }).catch(() => ({ data: [] })),
      apiRequest('/empresas-cuidadoras', { query: { pageSize: 200, status: 'ativo' } }).catch(() => ({
        data: [],
      })),
      apiRequest('/cuidadores', { query: { pageSize: 200, status: 'ativo' } }).catch(() => ({ data: [] })),
      pacienteId ? apiRequest(`/pacientes/${pacienteId}`).catch(() => null) : Promise.resolve(null),
      pacienteId
        ? apiRequest(`/pacientes/${pacienteId}/cuidador-vinculos`).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      pacienteId
        ? apiRequest('/inicio/medicamentos', { query: { paciente_id: pacienteId } }).catch(() => ({
            data: [],
          }))
        : Promise.resolve({ data: [] }),
    ])
      .then(([hRes, mRes, fRes, eRes, cRes, pacienteRes, vRes, medsRes]) => {
        if (cancelled) return;
        const allHosp = hRes.data || [];
        const allMeds = mRes.data || [];
        const allFarm = fRes.data || [];
        const allEmp = eRes.data || [];
        const allCuid = cRes.data || [];
        setCatalog({
          hospitais: allHosp,
          medicos: allMeds,
          farmacias: allFarm,
          empresas: allEmp,
          cuidadores: allCuid,
        });
        const paciente = pacienteRes?.data || pacienteRes;
        const vinculosRows = vRes.data || [];
        setVinculos(vinculosRows);

        const medicoIds = new Set(parseJsonIds(paciente?.medico_ids));
        if (paciente?.medico_id) medicoIds.add(Number(paciente.medico_id));
        const farmIds = new Set(
          (medsRes.data || [])
            .map((r) => Number(r.farmacia_id))
            .filter((id) => Number.isFinite(id) && id > 0)
        );
        const empIds = new Set(
          vinculosRows.map((v) => Number(v.empresa_cuidadora_id)).filter((id) => id > 0)
        );
        const cuidIds = new Set(
          vinculosRows.map((v) => Number(v.cuidador_id)).filter((id) => id > 0)
        );
        if (paciente?.cuidador_id) cuidIds.add(Number(paciente.cuidador_id));

        let meds = allMeds;
        let hosps = allHosp;
        let farms = allFarm;
        let emps = allEmp;
        let cuids = allCuid;

        if (somenteVinculados || paciente?.id) {
          if (medicoIds.size) {
            meds = allMeds.filter((m) => medicoIds.has(Number(m.id)));
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
              if (Array.isArray(est)) est.forEach((e) => estIds.add(Number(e.id)));
              if (m.hospital_clinica_id) estIds.add(Number(m.hospital_clinica_id));
            }
            hosps = estIds.size ? allHosp.filter((h) => estIds.has(Number(h.id))) : [];
          } else if (somenteVinculados || paciente?.id) {
            meds = [];
            hosps = [];
          }
          farms = farmIds.size ? allFarm.filter((f) => farmIds.has(Number(f.id))) : [];
          emps = empIds.size ? allEmp.filter((e) => empIds.has(Number(e.id))) : [];
          cuids = cuidIds.size ? allCuid.filter((c) => cuidIds.has(Number(c.id))) : [];
        }

        setHospitais(hosps);
        setMedicos(meds);
        setFarmacias(farms);
        setEmpresas(emps);
        setCuidadores(cuids);
      })
      .catch(() => {
        if (!cancelled) {
          setHospitais([]);
          setMedicos([]);
          setFarmacias([]);
          setEmpresas([]);
          setCuidadores([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pacienteId, somenteVinculados]);

  const q = busca.trim().toLocaleLowerCase('pt-BR');
  const buscaAtiva = q.length >= 2;

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

  const sugestoes = useMemo(() => {
    if (!buscaAtiva) return [];
    const items = [];
    const push = (tipo, id, label) => {
      items.push({ tipo, id, label });
    };
    catalog.medicos
      .filter((m) => matchesQuery(`${m.nome} ${m.especialidade}`, q))
      .slice(0, 8)
      .forEach((m) => push('Profissional', m.id, formatMedicoLabel(m)));
    catalog.hospitais
      .filter((h) => matchesQuery(h.nome_fantasia, q))
      .slice(0, 6)
      .forEach((h) => push('Estabelecimento', h.id, h.nome_fantasia));
    catalog.farmacias
      .filter((f) => matchesQuery(f.nome_fantasia, q))
      .slice(0, 6)
      .forEach((f) => push('Farmácia', f.id, f.nome_fantasia));
    catalog.empresas
      .filter((e) => matchesQuery(e.nome_fantasia, q))
      .slice(0, 6)
      .forEach((e) => push('Empresa cuidadora', e.id, e.nome_fantasia));
    catalog.cuidadores
      .filter((c) => matchesQuery(c.nome, q))
      .slice(0, 6)
      .forEach((c) => push('Cuidador', c.id, c.nome));
    return items;
  }, [buscaAtiva, catalog, q]);

  if (loading) {
    return hideWhenEmpty ? null : (
      <p className="text-sm text-slate-health">Carregando rede de cuidado…</p>
    );
  }

  const hasData =
    hospitais.length > 0 ||
    medicos.length > 0 ||
    farmacias.length > 0 ||
    empresas.length > 0 ||
    cuidadores.length > 0 ||
    vinculos.length > 0;

  if (hideWhenEmpty && !hasData && !buscaAtiva) return null;

  return (
    <div className={title ? 'mt-6' : 'grid gap-4'}>
      {title ? (
        <h2 className="mb-3 font-display text-xl font-bold text-ink">{title}</h2>
      ) : null}
      <Panel>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-ink">Buscar na rede (lista suspensa)</span>
          <input
            className="min-h-11 rounded-xl border border-[#d7e8e7] px-3 text-sm"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Profissionais, estabelecimentos, farmácias, empresas ou cuidadores…"
          />
        </label>
        {buscaAtiva ? (
          <ul className="mt-2 max-h-56 overflow-auto rounded-xl border border-[#d7e8e7] bg-white">
            {sugestoes.length ? (
              sugestoes.map((s) => (
                <li
                  key={`${s.tipo}-${s.id}`}
                  className="border-b border-[#eef6f5] px-3 py-2 last:border-b-0"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-health">
                    {s.tipo}
                  </span>
                  <p className="text-sm font-semibold text-ink">{s.label}</p>
                </li>
              ))
            ) : (
              <li className="px-3 py-3 text-sm text-slate-health">Nenhum resultado.</li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-health">
            Abaixo aparecem apenas os vínculos do paciente. Use a busca para localizar os demais cadastros.
          </p>
        )}
      </Panel>

      {!hasData && somenteVinculados ? (
        <Panel>
          <p className="text-sm text-slate-health">
            Sua rede de cuidado lista apenas os profissionais e estabelecimentos vinculados ao paciente.
            Nenhum vínculo encontrado ainda.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-4">
          {['hospital', 'clinica', 'laboratorio'].map((tipo) => {
            if (hideWhenEmpty && !byTipo[tipo]?.length) return null;
            return (
              <Panel key={tipo}>
                <h2 className="mb-2 font-display text-lg font-bold text-aqua-deep">{TIPO_LABEL[tipo]}</h2>
                {byTipo[tipo]?.length ? (
                  <ul className="grid gap-1">
                    {byTipo[tipo].map((h) => (
                      <li key={h.id} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-ink">
                        {h.nome_fantasia}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-health">Nenhum vinculado.</p>
                )}
              </Panel>
            );
          })}

          {hideWhenEmpty && byEsp.length === 0 ? null : (
            <Panel>
              <h2 className="mb-3 font-display text-lg font-bold text-aqua-deep">
                Profissionais por Especialidade
              </h2>
              {byEsp.length === 0 ? (
                <p className="text-sm text-slate-health">Nenhum profissional vinculado.</p>
              ) : (
                <div className="grid gap-4">
                  {byEsp.map(([esp, lista]) => (
                    <div key={esp}>
                      <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-vita">{esp}</h3>
                      <ul className="grid gap-1">
                        {lista.map((m) => (
                          <li key={m.id} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-ink">
                            {formatMedicoLabel(m)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {hideWhenEmpty && !farmacias.length ? null : (
            <Panel>
              <h2 className="mb-2 font-display text-lg font-bold text-aqua-deep">Farmácias</h2>
              {farmacias.length ? (
                <ul className="grid gap-1">
                  {farmacias.map((f) => (
                    <li key={f.id} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-ink">
                      {f.nome_fantasia}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-health">Nenhuma farmácia vinculada aos medicamentos.</p>
              )}
            </Panel>
          )}

          {hideWhenEmpty && !empresas.length && !cuidadores.length ? null : (
            <Panel>
              <h2 className="mb-2 font-display text-lg font-bold text-aqua-deep">Cuidado no domicílio</h2>
              {empresas.length ? (
                <>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-vita">
                    Empresas cuidadoras
                  </h3>
                  <ul className="mb-3 grid gap-1">
                    {empresas.map((e) => (
                      <li key={e.id} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-ink">
                        {e.nome_fantasia}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {cuidadores.length ? (
                <>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-vita">Cuidadores</h3>
                  <ul className="grid gap-1">
                    {cuidadores.map((c) => (
                      <li key={c.id} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-ink">
                        {c.nome}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {!empresas.length && !cuidadores.length ? (
                <p className="text-sm text-slate-health">Nenhuma empresa ou cuidador vinculado.</p>
              ) : null}
            </Panel>
          )}
        </div>
      )}
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
  const isSelfCare = perfilId === PERFIL.PACIENTE || perfilId === PERFIL.AUTOCUIDADO;

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
    if (!pacienteId) {
      setAppointments([]);
      setMedicines([]);
      setTaken([]);
      return;
    }
    const { de, ate } = weekRange();
    const [agendaRes, medsRes, admRes] = await Promise.all([
      apiRequest('/agenda', {
        query: { paciente_id: pacienteId, de, ate },
      }).catch(() => ({ data: [] })),
      apiRequest('/inicio/medicamentos', { query: { paciente_id: pacienteId } }).catch(() => ({
        data: [],
      })),
      apiRequest('/remedios/administracoes-hoje', {
        query: { paciente_id: pacienteId },
      }).catch(() => ({ data: [] })),
    ]);
    setAppointments((agendaRes.data || []).filter((e) => String(e.tipo || '') !== 'medicamento'));
    setMedicines(medsRes.data || []);
    setTaken((admRes.data || []).map((r) => String(r.remedio_id)));
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
            Sua Rede de Cuidados
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
            to={isSelfCare ? '/inicio/perfil' : `/pacientes?edit=${pacienteId}`}
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

      {appointments.length > 0 || medicines.length > 0 ? (
      <div className="grid gap-4 sm:grid-cols-2">
        {appointments.length > 0 ? (
        <Panel>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-aqua-soft text-aqua-deep">
              ▣
            </span>
            <small className="text-xs font-bold uppercase tracking-wider text-slate-health">
              Compromissos da semana
            </small>
          </div>
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
        </Panel>
        ) : null}

        {medicines.length > 0 ? (
        <Panel>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff1ed] text-[#e07a5f]">
              ✦
            </span>
            <small className="text-xs font-bold uppercase tracking-wider text-slate-health">
              Medicamentos de hoje
            </small>
          </div>
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
        </Panel>
        ) : null}
      </div>
      ) : null}

      {!isAdmin ? (
        <RedeDirectory
          pacienteId={pacienteId || undefined}
          hideWhenEmpty={false}
          somenteVinculados
          title="Sua Rede de Cuidados"
        />
      ) : null}
      </>
      ) : null}
    </div>
  );
}
