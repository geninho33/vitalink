import { useCallback, useEffect, useState } from 'react';
import PageHeader, { PlaceholderCard } from './PageHeader';
import { Modal, TextInput, TextSelect } from './forms/FormControls';
import { apiRequest } from '../services/api';

export default function EntityCrudPage({
  title,
  description,
  endpoint,
  columns,
  emptyForm,
  renderForm,
  toPayload,
  mapRow,
  statusFilter = true,
  onAfterSave,
  extraActions,
  extraRowActions,
}) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() =>
    typeof emptyForm === 'function' ? emptyForm() : { ...emptyForm }
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(endpoint, {
        query: {
          q: q || undefined,
          status: status || undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
      });
      setRows(res.data || []);
      setPagination((p) => ({
        ...p,
        ...(res.pagination || {
          total: (res.data || []).length,
          page: 1,
          pageSize: Math.max(10, (res.data || []).length),
        }),
      }));
    } catch (err) {
      setError(err.message || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [endpoint, q, status, pagination.page, pagination.pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(typeof emptyForm === 'function' ? emptyForm() : { ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(mapRow ? mapRow(row) : { ...row });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = toPayload ? await Promise.resolve(toPayload(form, editing)) : form;
      const clean = { ...payload };
      delete clean.anamnese;
      let savedId = editing?.id;
      if (editing?.id) {
        await apiRequest(`${endpoint}/${editing.id}`, { method: 'PUT', body: clean });
      } else {
        const created = await apiRequest(endpoint, { method: 'POST', body: clean });
        savedId = created?.id;
      }
      if (onAfterSave) {
        await onAfterSave({ form, editing, savedId });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const label = row.nome || row.nome_fantasia || row.nome_comercial || row.id;
    if (!window.confirm(`Inativar/excluir o registro "${label}"?`)) return;
    try {
      await apiRequest(`${endpoint}/${row.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message || 'Falha ao excluir.');
    }
  }

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize));

  return (
    <div>
      <PageHeader title={title} description={description} />

      <PlaceholderCard>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className={`grid flex-1 gap-3 sm:grid-cols-2 ${statusFilter ? 'lg:grid-cols-3' : ''}`}>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-ink">Buscar</span>
              <TextInput
                value={q}
                onChange={(e) => {
                  setPagination((p) => ({ ...p, page: 1 }));
                  setQ(e.target.value);
                }}
                placeholder="Buscar..."
              />
            </label>
            {statusFilter ? (
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-ink">Status</span>
                <TextSelect
                  value={status}
                  onChange={(e) => {
                    setPagination((p) => ({ ...p, page: 1 }));
                    setStatus(e.target.value);
                  }}
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </TextSelect>
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {extraActions}
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white transition hover:bg-aqua-deep"
            >
              Novo cadastro
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Desktop table */}
        <div id="entity-crud-print-table" className="hidden overflow-x-auto rounded-xl border border-[#e2eeee] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#eaf7f6] text-xs uppercase tracking-wide text-aqua-deep">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-3 font-bold">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-3 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-health">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-health">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#e8f1f0] hover:bg-[#f8fcfc]">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-3 text-ink">
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {extraRowActions ? extraRowActions(row, { reload: load }) : null}
                        <button
                          type="button"
                          className="min-h-10 rounded-lg border border-aqua px-3 text-xs font-semibold text-aqua hover:bg-aqua-soft"
                          onClick={() => openEdit(row)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(row)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 md:hidden">
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-health">Carregando...</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-health">Nenhum registro encontrado.</p>
          ) : (
            rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-[#d7e8e7] bg-[#f8fcfc] p-4">
                <div className="grid gap-2">
                  {columns.slice(0, 4).map((c) => (
                    <div key={c.key}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-health">
                        {c.label}
                      </p>
                      <p className="text-sm font-semibold text-ink">
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="min-h-12 rounded-xl border border-aqua font-semibold text-aqua"
                    onClick={() => openEdit(row)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="min-h-12 rounded-xl border border-red-200 font-semibold text-red-700"
                    onClick={() => handleDelete(row)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-health sm:flex-row sm:items-center sm:justify-between">
          <span>
            {pagination.total} registro(s) · página {pagination.page} de {totalPages}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              disabled={pagination.page <= 1}
              className="min-h-11 rounded-xl border border-[#d7e8e7] px-4 disabled:opacity-40"
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagination.page >= totalPages}
              className="min-h-11 rounded-xl border border-[#d7e8e7] px-4 disabled:opacity-40"
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              Próxima
            </button>
          </div>
        </div>
      </PlaceholderCard>

      <Modal
        open={modalOpen}
        wide
        title={editing ? `Editar — ${title}` : `Novo — ${title}`}
        onClose={() => setModalOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleSave}>
          {renderForm(form, setForm, { editing })}
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
