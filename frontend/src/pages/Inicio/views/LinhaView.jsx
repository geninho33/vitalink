import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TimelineRail from '../../../components/TimelineRail';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { isEventoRotineiroOuMedicao } from '../../../utils/timelineFiltro';
import { EmptyState, PageTitle, Panel } from '../ui';

function timelineDateValue(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function LinhaView() {
  const { pacienteId } = usePacienteAtivo();
  const [mostrarTudo, setMostrarTudo] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!pacienteId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await apiRequest(`/timeline/${pacienteId}`);
      setEvents(r.data || []);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar a linha do tempo.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
    setSelectedId(null);
  }, [load]);

  const visiveis = useMemo(() => {
    const base = (events || []).filter((e) => String(e.tipo || '') !== 'medicamento');
    const filtrados = mostrarTudo ? base : base.filter((e) => !isEventoRotineiroOuMedicao(e));
    return [...filtrados].sort(
      (a, b) => timelineDateValue(a.data_hora_inicio) - timelineDateValue(b.data_hora_inicio)
    );
  }, [events, mostrarTudo]);

  const ocultos = useMemo(
    () => (events || []).filter((e) => String(e.tipo || '') !== 'medicamento' && isEventoRotineiroOuMedicao(e)).length,
    [events]
  );

  const activeId = selectedId || visiveis[visiveis.length - 1]?.id;
  const active = visiveis.find((e) => Number(e.id) === Number(activeId));

  const railItems = visiveis.map((item) => ({
    id: item.id,
    title: item.titulo,
    category: item.tipo,
    status: item.status || 'pendente',
    subtitle: item.data_hora_inicio ? new Date(item.data_hora_inicio).toLocaleString('pt-BR') : '',
    selected: Number(item.id) === Number(activeId),
    onClick: () => setSelectedId(item.id),
  }));

  return (
    <div>
      <PageTitle
        eyebrow="Histórico clínico"
        title="Linha do tempo"
        description="Fatos relevantes do paciente em ordem cronológica. Medições de pressão e observações de rotina ficam ocultas por padrão."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={mostrarTudo}
            onChange={(e) => {
              setMostrarTudo(e.target.checked);
              setSelectedId(null);
            }}
          />
          Mostrar tudo
          {!mostrarTudo && ocultos ? (
            <span className="font-normal text-slate-health">({ocultos} medições/observações ocultas)</span>
          ) : null}
        </label>
        <Link
          to="/inicio/eventos"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink hover:bg-[#f4fbfa]"
        >
          + Novo evento
        </Link>
      </div>

      {!pacienteId ? (
        <EmptyState>Selecione um paciente no topo para ver a linha do tempo.</EmptyState>
      ) : loading ? (
        <p className="text-sm text-slate-health">Carregando…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : visiveis.length === 0 ? (
        <EmptyState>
          {ocultos
            ? 'Nenhum fato relevante no momento. Use “Mostrar tudo” para ver medições de pressão e observações de rotina.'
            : 'Nenhum evento encontrado. Cadastre uma consulta ou um evento de saúde para iniciar a linha do tempo.'}
        </EmptyState>
      ) : (
        <>
          <TimelineRail items={railItems} orientation="horizontal" />

          {active ? (
            <Panel className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-aqua">{active.tipo}</p>
              <h2 className="font-display text-xl font-bold text-ink">{active.titulo}</h2>
              <p className="mt-1 text-sm text-slate-health">
                {active.data_hora_inicio
                  ? new Date(active.data_hora_inicio).toLocaleString('pt-BR')
                  : ''}
              </p>
              {active.descricao ? <p className="mt-3 text-sm text-ink">{active.descricao}</p> : null}
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}
