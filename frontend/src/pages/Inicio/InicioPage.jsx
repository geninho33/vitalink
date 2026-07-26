import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader, { PlaceholderCard } from '../../components/PageHeader';
import QuickNavMenu from '../../components/inicio/QuickNavMenu';
import { Modal, Field, TextInput, TextSelect, TextTextarea } from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';

const TIPO_LABEL = {
  saude: 'Saúde',
  aviso: 'Aviso',
  compromisso: 'Compromisso',
  medicamento: 'Medicamento',
  outro: 'Outro',
};

const PRIORIDADE_LABEL = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

function emptyForm() {
  return {
    titulo: '',
    descricao: '',
    tipo: 'saude',
    data_registro: '',
    prioridade: 'media',
    status: 'ativo',
  };
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function isSameLocalDay(iso, date = new Date()) {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

function isInCurrentWeek(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // segunda
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

export default function InicioPage() {
  const { usuario, menus } = useAuth();
  const navigate = useNavigate();
  const firstName = usuario?.nome?.split(' ')[0] || 'Usuário';
  const recordsRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ativo');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [summaryRows, setSummaryRows] = useState([]);
  const [quickNavActive, setQuickNavActive] = useState('inicio');
  const [infoModal, setInfoModal] = useState(null);

  const canOpenPacientes = useMemo(
    () => (menus || []).some((m) => m.rota === '/pacientes'),
    [menus]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/inicio', {
        query: {
          q: q || undefined,
          status: status || undefined,
          tipo: tipoFiltro || undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
      });
      setRows(res.data || []);
      setPagination((p) => ({
        ...p,
        ...(res.pagination || { total: (res.data || []).length }),
      }));
    } catch (err) {
      setError(err.message || 'Erro ao carregar registros.');
    } finally {
      setLoading(false);
    }
  }, [q, status, tipoFiltro, pagination.page, pagination.pageSize]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await apiRequest('/inicio', {
        query: { status: 'ativo', page: 1, pageSize: 100 },
      });
      setSummaryRows(res.data || []);
    } catch {
      setSummaryRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const weekAppointments = useMemo(
    () => summaryRows.filter((r) => r.tipo === 'compromisso' && isInCurrentWeek(r.data_registro)),
    [summaryRows]
  );
  const todayMedicines = useMemo(
    () => summaryRows.filter((r) => r.tipo === 'medicamento' && isSameLocalDay(r.data_registro)),
    [summaryRows]
  );

  function openCreate(preset = {}) {
    setEditing(null);
    setForm({ ...emptyForm(), ...preset });
    setModalOpen(true);
  }

  function scrollToRecords() {
    recordsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleQuickNavAction(item) {
    setQuickNavActive(item.id);

    switch (item.action) {
      case 'focus-inicio':
        setTipoFiltro('');
        setStatus('ativo');
        setPagination((p) => ({ ...p, page: 1 }));
        scrollToRecords();
        break;
      case 'open-eventos':
        setTipoFiltro('saude');
        setStatus('ativo');
        setPagination((p) => ({ ...p, page: 1 }));
        openCreate({ tipo: 'saude' });
        scrollToRecords();
        break;
      case 'open-corpo':
        setInfoModal({
          id: 'corpo',
          title: 'Mapa corporal',
          body: 'No app legado, o mapa corporal refletia as especialidades do perfil do paciente. No VitaLink, acompanhe o vínculo clínico pelo cadastro de pacientes e pela linha do tempo.',
          ctaLabel: canOpenPacientes ? 'Ir para Pacientes' : null,
          ctaTo: '/pacientes',
        });
        break;
      case 'open-docs':
        setInfoModal({
          id: 'docs',
          title: 'Biblioteca médica',
          body: 'A área de documentos do app legado (exames, laudos e receitas) ainda não possui módulo dedicado no VitaLink. Use os registros do Início ou a linha do tempo para organizar o histórico clínico.',
          ctaLabel: (menus || []).some((m) => m.rota === '/timeline')
            ? 'Abrir linha do tempo'
            : null,
          ctaTo: '/timeline',
        });
        break;
      default:
        break;
    }
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      titulo: row.titulo || '',
      descricao: row.descricao || '',
      tipo: row.tipo || 'saude',
      data_registro: row.data_registro
        ? new Date(row.data_registro).toISOString().slice(0, 16)
        : '',
      prioridade: row.prioridade || 'media',
      status: row.status || 'ativo',
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        tipo: form.tipo,
        prioridade: form.prioridade,
        status: form.status,
        data_registro: form.data_registro
          ? new Date(form.data_registro).toISOString()
          : undefined,
      };
      if (editing?.id) {
        await apiRequest(`/inicio/${editing.id}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/inicio', { method: 'POST', body: payload });
      }
      setModalOpen(false);
      await Promise.all([load(), loadSummary()]);
    } catch (err) {
      setError(err.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickSubmit(e) {
    e.preventDefault();
    const text = quickText.trim();
    if (!text) return;
    setQuickSaving(true);
    setError('');
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
        },
      });
      setQuickText('');
      setPagination((p) => ({ ...p, page: 1 }));
      await Promise.all([load(), loadSummary()]);
    } catch (err) {
      setError(err.message || 'Falha ao registrar.');
    } finally {
      setQuickSaving(false);
    }
  }

  async function confirmDeleteAction() {
    if (!confirmDelete?.id) return;
    try {
      await apiRequest(`/inicio/${confirmDelete.id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      await Promise.all([load(), loadSummary()]);
    } catch (err) {
      setError(err.message || 'Falha ao excluir.');
      setConfirmDelete(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageSize));

  return (
    <div className="pb-20">
      <div className="mb-6">
        <p className="text-sm text-slate-health">
          Olá, <span className="font-semibold text-ink">{firstName}</span>
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Como está sua saúde hoje?
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-health">
          Registre sintomas, avisos e destaques do dia. Os dados ficam disponíveis para consulta e gestão.
        </p>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <PlaceholderCard>
          <form className="grid gap-3" onSubmit={handleQuickSubmit}>
            <Field label="Registre como você está hoje" required>
              <TextTextarea
                rows={4}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Ex.: Pressão 12/8 às 8h; temperatura 36,5 °C; dor de cabeça leve."
                required
              />
            </Field>
            <button
              type="submit"
              disabled={quickSaving}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white transition hover:bg-aqua-deep disabled:opacity-60"
            >
              {quickSaving ? 'Registrando...' : 'Registrar evento'}
            </button>
          </form>
        </PlaceholderCard>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <PlaceholderCard>
            <p className="text-xs font-bold uppercase tracking-wider text-aqua">Compromissos da semana</p>
            <div className="mt-2 space-y-2 text-sm text-slate-health">
              {weekAppointments.length === 0 ? (
                <p>Nenhum compromisso nesta semana.</p>
              ) : (
                weekAppointments.slice(0, 4).map((item) => (
                  <p key={item.id} className="font-medium text-ink">
                    {item.titulo}
                    <span className="ml-2 text-xs font-normal text-slate-health">
                      {formatDateTime(item.data_registro)}
                    </span>
                  </p>
                ))
              )}
            </div>
          </PlaceholderCard>
          <PlaceholderCard>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Medicamentos de hoje</p>
            <div className="mt-2 space-y-2 text-sm text-slate-health">
              {todayMedicines.length === 0 ? (
                <p>Nenhum medicamento cadastrado para hoje.</p>
              ) : (
                todayMedicines.slice(0, 4).map((item) => (
                  <p key={item.id} className="font-medium text-ink">
                    {item.titulo}
                  </p>
                ))
              )}
            </div>
          </PlaceholderCard>
        </div>
      </div>

      <div ref={recordsRef}>
        <PageHeader
          title="Registros do Início"
          description="Gerencie destaques, avisos e eventos com busca, paginação e CRUD completo."
        />
      </div>

      <PlaceholderCard>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Buscar">
              <TextInput
                value={q}
                onChange={(e) => {
                  setPagination((p) => ({ ...p, page: 1 }));
                  setQ(e.target.value);
                }}
                placeholder="Título ou descrição..."
              />
            </Field>
            <Field label="Tipo">
              <TextSelect
                value={tipoFiltro}
                onChange={(e) => {
                  setPagination((p) => ({ ...p, page: 1 }));
                  setTipoFiltro(e.target.value);
                }}
              >
                <option value="">Todos</option>
                {Object.entries(TIPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Status">
              <TextSelect
                value={status}
                onChange={(e) => {
                  setPagination((p) => ({ ...p, page: 1 }));
                  setStatus(e.target.value);
                }}
              >
                <option value="ativo">Ativo</option>
                <option value="arquivado">Arquivado</option>
                <option value="">Todos</option>
              </TextSelect>
            </Field>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white transition hover:bg-aqua-deep"
          >
            Novo registro
          </button>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="hidden overflow-x-auto rounded-xl border border-[#e2eeee] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#eaf7f6] text-xs uppercase tracking-wide text-aqua-deep">
              <tr>
                <th className="px-3 py-3 font-bold">Título</th>
                <th className="px-3 py-3 font-bold">Tipo</th>
                <th className="px-3 py-3 font-bold">Prioridade</th>
                <th className="px-3 py-3 font-bold">Data</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-3 py-3 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-health">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-health">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#e8f1f0] hover:bg-[#f8fcfc]">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-ink">{row.titulo}</p>
                      <p className="line-clamp-1 text-xs text-slate-health">{row.descricao}</p>
                    </td>
                    <td className="px-3 py-3 text-ink">{TIPO_LABEL[row.tipo] || row.tipo}</td>
                    <td className="px-3 py-3 text-ink">
                      {PRIORIDADE_LABEL[row.prioridade] || row.prioridade}
                    </td>
                    <td className="px-3 py-3 text-ink">{formatDateTime(row.data_registro)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          row.status === 'ativo'
                            ? 'bg-mint-soft text-aqua-deep'
                            : 'bg-slate-100 text-slate-health'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
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
                          onClick={() => setConfirmDelete(row)}
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

        <div className="grid gap-3 md:hidden">
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-health">Carregando...</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-health">Nenhum registro encontrado.</p>
          ) : (
            rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-[#d7e8e7] bg-[#f8fcfc] p-4">
                <p className="text-sm font-semibold text-ink">{row.titulo}</p>
                <p className="mt-1 text-xs text-slate-health">{row.descricao}</p>
                <p className="mt-2 text-xs text-slate-health">
                  {TIPO_LABEL[row.tipo] || row.tipo} · {formatDateTime(row.data_registro)}
                </p>
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
                    onClick={() => setConfirmDelete(row)}
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
        title={editing ? 'Editar registro' : 'Novo registro'}
        onClose={() => setModalOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleSave}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título" required>
              <TextInput
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </Field>
            <Field label="Tipo" required>
              <TextSelect
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {Object.entries(TIPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Prioridade">
              <TextSelect
                value={form.prioridade}
                onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
              >
                {Object.entries(PRIORIDADE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Data / hora">
              <TextInput
                type="datetime-local"
                value={form.data_registro}
                onChange={(e) => setForm({ ...form, data_registro: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <TextSelect
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ativo">Ativo</option>
                <option value="arquivado">Arquivado</option>
              </TextSelect>
            </Field>
          </div>
          <Field label="Descrição" required>
            <TextTextarea
              rows={4}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
            />
          </Field>
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

      <Modal
        open={Boolean(confirmDelete)}
        title="Confirmar exclusão"
        onClose={() => setConfirmDelete(null)}
      >
        <p className="text-sm text-slate-health">
          Deseja arquivar o registro{' '}
          <span className="font-semibold text-ink">
            &quot;{confirmDelete?.titulo || confirmDelete?.id}&quot;
          </span>
          ? Ele deixará de aparecer na lista de ativos.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setConfirmDelete(null)}
            className="min-h-12 rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmDeleteAction}
            className="min-h-12 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            Confirmar exclusão
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(infoModal)}
        title={infoModal?.title || 'Informação'}
        onClose={() => setInfoModal(null)}
      >
        <p className="text-sm text-slate-health">{infoModal?.body}</p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setInfoModal(null)}
            className="min-h-12 rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink"
          >
            Fechar
          </button>
          {infoModal?.ctaLabel && infoModal?.ctaTo ? (
            <button
              type="button"
              onClick={() => {
                const to = infoModal.ctaTo;
                setInfoModal(null);
                navigate(to);
              }}
              className="min-h-12 rounded-xl bg-aqua px-4 text-sm font-semibold text-white hover:bg-aqua-deep"
            >
              {infoModal.ctaLabel}
            </button>
          ) : null}
        </div>
      </Modal>

      <QuickNavMenu
        activeId={quickNavActive}
        onLocalAction={handleQuickNavAction}
      />
    </div>
  );
}
