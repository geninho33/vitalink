import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, assetUrl } from '../services/api';

/**
 * Lista documentos (exames/receitas) vinculados a um evento da agenda
 * e oferece atalho para anexar novos na tela Exames/Receitas.
 */
export default function AgendaDocsLinks({ event }) {
  const [docs, setDocs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!event?.id) {
      setDocs([]);
      setMeta(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiRequest(`/agenda/${event.id}/documentos`)
      .then((res) => {
        if (cancelled) return;
        setDocs(res.data || []);
        setMeta(res.meta || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Falha ao carregar documentos.');
          setDocs([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [event?.id]);

  if (!event?.id) return null;

  const day = String(event.data_hora_inicio || meta?.data || '').slice(0, 10);
  const especialidade =
    meta?.especialidade ||
    event.consulta_especialidade ||
    (String(event.titulo || '').match(/Consulta:\s*(.+?)\s*—/i)?.[1] || '').trim();

  const query = new URLSearchParams();
  if (event.paciente_id) query.set('paciente_id', String(event.paciente_id));
  if (day) query.set('data', day);
  if (especialidade) query.set('especialidade', especialidade);
  query.set('agenda_evento_id', String(event.id));
  if (event.consulta_id || meta?.consulta_id) {
    query.set('consulta_id', String(event.consulta_id || meta.consulta_id));
  }
  query.set('novo', '1');
  const attachHref = `/exames-receitas?${query.toString()}`;
  const listHref = `/exames-receitas?${new URLSearchParams({
    ...(event.paciente_id ? { paciente_id: String(event.paciente_id) } : {}),
    ...(day ? { data: day } : {}),
    ...(especialidade ? { especialidade } : {}),
  }).toString()}`;

  return (
    <div className="mt-3 rounded-xl border border-[#d0e4ef] bg-vita-soft/40 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-vita">
          Exames / Receitas
          {typeof event.docs_count === 'number' ? ` (${event.docs_count})` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to={listHref} className="text-[11px] font-semibold text-vita hover:underline">
            Ver pasta
          </Link>
          <Link
            to={attachHref}
            className="rounded-md bg-vita px-2 py-0.5 text-[11px] font-semibold text-white"
          >
            + Anexar
          </Link>
        </div>
      </div>

      {loading ? <p className="text-xs text-slate-health">Carregando documentos…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {!loading && !error && docs.length === 0 ? (
        <p className="text-xs text-slate-health">
          Nenhum documento vinculado a esta data
          {especialidade ? ` / ${especialidade}` : ''}.
        </p>
      ) : null}

      <ul className="grid gap-1">
        {docs.map((d) => {
          const href = d.arquivo_caminho ? assetUrl(d.arquivo_caminho) : null;
          return (
            <li key={d.id}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1.5 text-xs font-semibold text-ink hover:bg-white"
                >
                  <span className="rounded bg-sky-100 px-1 py-0.5 text-[10px] uppercase text-sky-800">
                    {d.tipo}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{d.titulo}</span>
                  <span className="text-[10px] text-slate-health">
                    {d.data_documento ? String(d.data_documento).slice(0, 10) : ''}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1.5 text-xs">
                  <span className="rounded bg-sky-100 px-1 py-0.5 text-[10px] uppercase text-sky-800">
                    {d.tipo}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{d.titulo}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
