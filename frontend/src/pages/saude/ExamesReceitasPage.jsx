import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader, { PlaceholderCard } from '../../components/PageHeader';
import FileUploadField from '../../components/FileUploadField';
import { Field, Modal, TextInput, TextSelect } from '../../components/forms/FormControls';
import { apiRequest, assetUrl } from '../../services/api';

function usePacientes() {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    apiRequest('/pacientes', { query: { pageSize: 200, status: 'ativo' } })
      .then((res) => setOptions(res.data || []))
      .catch(() => setOptions([]));
  }, []);
  return options;
}

const emptyForm = (overrides = {}) => ({
  paciente_id: '',
  especialidade: '',
  titulo: '',
  tipo: 'exame',
  data_documento: new Date().toISOString().slice(0, 10),
  arquivo_id: null,
  arquivo_caminho: '',
  observacoes: '',
  agenda_evento_id: null,
  consulta_id: null,
  ...overrides,
});

export default function ExamesReceitasPage() {
  const pacientes = usePacientes();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [openFolders, setOpenFolders] = useState({});

  const filterPacienteId = searchParams.get('paciente_id') || '';
  const filterData = searchParams.get('data') || '';
  const filterEspecialidade = searchParams.get('especialidade') || '';
  const filterAgendaId = searchParams.get('agenda_evento_id') || '';
  const filterConsultaId = searchParams.get('consulta_id') || '';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/exames-receitas', {
        query: {
          pageSize: 200,
          q: q || undefined,
          paciente_id: filterPacienteId || undefined,
          data: filterData || undefined,
          especialidade: filterEspecialidade || undefined,
          agenda_evento_id: filterAgendaId || undefined,
          consulta_id: filterConsultaId || undefined,
        },
      });
      const sorted = [...(res.data || [])].sort((a, b) => {
        const da = String(a.data_documento || '');
        const db = String(b.data_documento || '');
        if (da !== db) return db.localeCompare(da);
        return (b.id || 0) - (a.id || 0);
      });
      setRows(sorted);
    } catch (err) {
      setError(err.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [q, filterPacienteId, filterData, filterEspecialidade, filterAgendaId, filterConsultaId]);

  useEffect(() => {
    load();
  }, [load]);

  // Pré-preenche e abre modal quando vem da Agenda (?novo=1)
  useEffect(() => {
    if (searchParams.get('novo') !== '1') return;
    setForm(
      emptyForm({
        paciente_id: filterPacienteId || '',
        especialidade: filterEspecialidade || '',
        data_documento: filterData || new Date().toISOString().slice(0, 10),
        agenda_evento_id: filterAgendaId ? Number(filterAgendaId) : null,
        consulta_id: filterConsultaId ? Number(filterConsultaId) : null,
        titulo: filterEspecialidade
          ? `Documento — ${filterEspecialidade}`
          : '',
      })
    );
    setModalOpen(true);
    if (filterEspecialidade) {
      setOpenFolders((prev) => ({ ...prev, [filterEspecialidade]: true }));
    }
    // Mantém filtros de pasta; vínculos ficam só no form
    const next = new URLSearchParams();
    if (filterPacienteId) next.set('paciente_id', filterPacienteId);
    if (filterData) next.set('data', filterData);
    if (filterEspecialidade) next.set('especialidade', filterEspecialidade);
    setSearchParams(next, { replace: true });
  }, [
    searchParams,
    setSearchParams,
    filterPacienteId,
    filterEspecialidade,
    filterData,
    filterAgendaId,
    filterConsultaId,
  ]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.especialidade || 'Sem especialidade';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [rows]);

  useEffect(() => {
    setOpenFolders((prev) => {
      const next = { ...prev };
      for (const [name] of grouped) {
        if (next[name] === undefined) next[name] = true;
      }
      return next;
    });
  }, [grouped]);

  const hasActiveFilters = Boolean(
    filterPacienteId || filterData || filterEspecialidade || filterAgendaId || filterConsultaId
  );

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest('/exames-receitas', {
        method: 'POST',
        body: {
          paciente_id: Number(form.paciente_id),
          especialidade: form.especialidade,
          titulo: form.titulo,
          tipo: form.tipo,
          data_documento: form.data_documento,
          arquivo_id: form.arquivo_id || null,
          observacoes: form.observacoes || null,
          agenda_evento_id: form.agenda_evento_id || null,
          consulta_id: form.consulta_id || null,
        },
      });
      setModalOpen(false);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Exames / Receitas"
        description="Documentos clínicos agrupados por especialidade, em ordem cronológica."
      />

      <PlaceholderCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid flex-1 gap-1 text-sm">
            <span className="font-semibold text-ink">Buscar</span>
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Título ou especialidade..."
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setForm(
                emptyForm({
                  paciente_id: filterPacienteId || '',
                  especialidade: filterEspecialidade || '',
                  data_documento: filterData || new Date().toISOString().slice(0, 10),
                  agenda_evento_id: filterAgendaId ? Number(filterAgendaId) : null,
                  consulta_id: filterConsultaId ? Number(filterConsultaId) : null,
                })
              );
              setModalOpen(true);
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white hover:bg-aqua-deep"
          >
            Novo documento
          </button>
        </div>

        {hasActiveFilters ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#d0e4ef] bg-vita-soft/40 px-3 py-2 text-xs text-ink">
            <span className="font-bold uppercase tracking-wider text-vita">Filtros</span>
            {filterPacienteId ? (
              <span className="rounded-md bg-white px-2 py-0.5">
                Paciente #
                {pacientes.find((p) => String(p.id) === String(filterPacienteId))?.nome ||
                  filterPacienteId}
              </span>
            ) : null}
            {filterData ? (
              <span className="rounded-md bg-white px-2 py-0.5">Data {filterData}</span>
            ) : null}
            {filterEspecialidade ? (
              <span className="rounded-md bg-white px-2 py-0.5">{filterEspecialidade}</span>
            ) : null}
            {filterAgendaId ? (
              <span className="rounded-md bg-white px-2 py-0.5">Agenda #{filterAgendaId}</span>
            ) : null}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto font-semibold text-vita hover:underline"
            >
              Limpar
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-health">Carregando...</p>
        ) : grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-health">Nenhum documento encontrado.</p>
        ) : (
          <div className="grid gap-4">
            {grouped.map(([especialidade, items]) => (
              <section
                key={especialidade}
                className="overflow-hidden rounded-2xl border border-[#d7e8e7] bg-[#f8fcfc]"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left font-display text-base font-bold text-aqua-deep hover:bg-white"
                  onClick={() =>
                    setOpenFolders((f) => ({ ...f, [especialidade]: !f[especialidade] }))
                  }
                >
                  <span>{especialidade}</span>
                  <span className="text-sm font-semibold text-slate-health">
                    {items.length} · {openFolders[especialidade] ? '▾' : '▸'}
                  </span>
                </button>
                {openFolders[especialidade] ? (
                  <ul className="divide-y divide-[#e8f1f0] border-t border-[#e8f1f0] bg-white">
                    {items.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-ink">{doc.titulo}</p>
                          <p className="text-xs text-slate-health">
                            {doc.data_documento
                              ? String(doc.data_documento).slice(0, 10)
                              : '—'}{' '}
                            · {doc.paciente_nome || 'Paciente'} · {doc.tipo || 'exame'}
                          </p>
                        </div>
                        {doc.arquivo_caminho ? (
                          <a
                            href={assetUrl(doc.arquivo_caminho)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-aqua hover:underline"
                          >
                            Abrir arquivo
                          </a>
                        ) : (
                          <span className="text-xs text-slate-health">Sem arquivo</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </PlaceholderCard>

      <Modal open={modalOpen} wide title="Novo exame / receita" onClose={() => setModalOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSave}>
          {(form.agenda_evento_id || form.consulta_id) && (
            <p className="rounded-lg border border-[#d0e4ef] bg-vita-soft/40 px-3 py-2 text-xs text-ink">
              Documento será vinculado
              {form.agenda_evento_id ? ` à agenda #${form.agenda_evento_id}` : ''}
              {form.consulta_id ? ` · consulta #${form.consulta_id}` : ''}.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paciente" required>
              <TextSelect
                value={form.paciente_id}
                onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
              >
                <option value="">Selecione</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Especialidade" required>
              <TextInput
                value={form.especialidade}
                onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
                placeholder="Ex.: Cardiologia"
              />
            </Field>
            <Field label="Título" required>
              <TextInput
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </Field>
            <Field label="Data do documento">
              <TextInput
                type="date"
                value={form.data_documento}
                onChange={(e) => setForm({ ...form, data_documento: e.target.value })}
              />
            </Field>
            <Field label="Tipo">
              <TextSelect
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="exame">Exame</option>
                <option value="receita">Receita</option>
                <option value="laudo">Laudo</option>
                <option value="outro">Outro</option>
              </TextSelect>
            </Field>
            <div className="sm:col-span-2">
              <FileUploadField
                label="Arquivo (PDF ou imagem)"
                accept="image/*,application/pdf"
                valueId={form.arquivo_id}
                valuePath={form.arquivo_caminho}
                onUploaded={({ id, caminho }) =>
                  setForm({ ...form, arquivo_id: id, arquivo_caminho: caminho })
                }
                onCleared={() =>
                  setForm({ ...form, arquivo_id: null, arquivo_caminho: '' })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Field label="Observações">
                <TextInput
                  value={form.observacoes || ''}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-[#e8f1f0] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-12 rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-xl bg-aqua px-4 text-sm font-semibold text-white hover:bg-aqua-deep disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
