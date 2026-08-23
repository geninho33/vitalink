import { useEffect, useMemo, useRef, useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import PageHeader, { PlaceholderCard } from '../../components/PageHeader';
import { DateBrInput, Field, TextInput, TextSelect, TextTextarea } from '../../components/forms/FormControls';
import { isValidCpf, isValidEmail, maskCpf, onlyDigits } from '../../hooks/useCep';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PASSWORD_HINT, isAdult, validateStrongPassword } from '../../utils/validation';

export function UsuariosPage() {
  const [perfis, setPerfis] = useState([]);
  const { usuario, refreshSession } = useAuth();
  const isResponsavel = Number(usuario?.perfil?.id || usuario?.perfil_id) === 5;

  useEffect(() => {
    apiRequest('/perfis').then((r) => setPerfis(r.data || [])).catch(() => setPerfis([]));
  }, []);

  const perfisAtivos = perfis.filter((p) => {
    if (p.ativo === false) return false;
    if (isResponsavel) return [4, 5, 6].includes(Number(p.id));
    return true;
  });

  const empty = () => ({
    nome: '',
    email: '',
    senha: '',
    perfil_id: '',
    status: 'ativo',
    cpf: '',
    data_nascimento: '',
  });

  return (
    <EntityCrudPage
      title="Usuários"
      description="Cadastro, edição, inativação e redefinição de senha."
      endpoint="/usuarios"
      statusFilter={false}
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'email', label: 'E-mail' },
        { key: 'perfil_nome', label: 'Perfil' },
        {
          key: 'status',
          label: 'Status',
          render: (r) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.status === 'ativo' ? 'bg-mint-soft text-aqua-deep' : 'bg-slate-100 text-slate-health'}`}>
              {r.status}
            </span>
          ),
        },
      ]}
      emptyForm={empty}
      mapRow={(row) => ({ ...empty(), ...row, senha: '' })}
      onAfterSave={async ({ editing }) => {
        // Se editou o próprio usuário, atualiza AuthContext sem perder o token
        if (editing?.id != null && usuario?.id != null && Number(editing.id) === Number(usuario.id)) {
          try {
            await refreshSession();
          } catch {
            /* interceptor 401 cuida se necessário */
          }
        }
      }}
      renderForm={(form, setForm, { editing }) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" required>
            <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="E-mail" required>
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="CPF" required>
            <TextInput
              inputMode="numeric"
              value={maskCpf(form.cpf)}
              onChange={(e) => setForm({ ...form, cpf: onlyDigits(e.target.value).slice(0, 11) })}
            />
          </Field>
          <Field label="Data de nascimento" required>
            <DateBrInput
              value={form.data_nascimento}
              onChange={(data_nascimento) => setForm({ ...form, data_nascimento })}
            />
          </Field>
          <Field
            label={editing ? 'Nova senha (opcional)' : 'Senha'}
            required={!editing}
            hint={PASSWORD_HINT}
          >
            <TextInput type="password" value={form.senha || ''} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          </Field>
          <Field label="Perfil" required>
            <TextSelect value={form.perfil_id || ''} onChange={(e) => setForm({ ...form, perfil_id: Number(e.target.value) })}>
              <option value="">Selecione</option>
              {perfisAtivos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Status">
            <TextSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="bloqueado">Bloqueado</option>
            </TextSelect>
          </Field>
        </div>
      )}
      toPayload={(form, editing) => {
        if (form.email && !isValidEmail(form.email)) {
          throw new Error('E-mail inválido.');
        }
        if (form.cpf && !isValidCpf(form.cpf)) {
          throw new Error('CPF inválido.');
        }
        if (form.data_nascimento && !isAdult(form.data_nascimento)) {
          throw new Error('Cadastro restrito a maiores de 18 anos. Menores de idade não podem criar conta.');
        }
        if (form.senha && validateStrongPassword(form.senha)) {
          throw new Error(validateStrongPassword(form.senha));
        }
        if (!editing && !form.senha) {
          throw new Error('Informe a senha.');
        }
        const payload = {
          nome: form.nome,
          email: form.email,
          perfil_id: Number(form.perfil_id),
          status: form.status,
          cpf: onlyDigits(form.cpf),
          data_nascimento: form.data_nascimento,
        };
        if (form.senha) payload.senha = form.senha;
        return payload;
      }}
    />
  );
}

export function PerfisPage() {
  const extra = useRef({ menus: [], permissoes: [] });
  const [, setTick] = useState(0);

  useEffect(() => {
    apiRequest('/perfis')
      .then((res) => {
        extra.current = { menus: res.menus || [], permissoes: res.permissoes || [] };
        setTick((n) => n + 1);
      })
      .catch(() => {});
  }, []);

  function matrixFor(perfilId) {
    return extra.current.menus.map((m) => {
      const p = extra.current.permissoes.find(
        (x) => Number(x.perfil_id) === Number(perfilId) && Number(x.menu_id) === Number(m.id)
      );
      return {
        menu_id: m.id,
        menu_titulo: m.titulo,
        rota: m.rota || '—',
        pode_ler: p?.pode_ler ? 1 : 0,
        pode_criar: p?.pode_criar ? 1 : 0,
        pode_editar: p?.pode_editar ? 1 : 0,
        pode_deletar: p?.pode_deletar ? 1 : 0,
      };
    });
  }

  const empty = () => ({
    nome: '',
    descricao: '',
    permissoes: matrixFor(null),
  });

  return (
    <EntityCrudPage
      title="Perfis"
      description="Papéis do sistema com acesso granular por item de menu."
      endpoint="/perfis"
      statusFilter={false}
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'descricao', label: 'Descrição' },
      ]}
      emptyForm={empty}
      mapRow={(row) => ({
        nome: row.nome || '',
        descricao: row.descricao || '',
        permissoes: matrixFor(row.id),
      })}
      toPayload={(form) => ({
        nome: form.nome,
        descricao: form.descricao || null,
        ...(form.permissoes?.length ? { permissoes: form.permissoes } : {}),
      })}
      renderForm={(form, setForm) => (
        <div className="grid gap-3">
          <Field label="Nome" required>
            <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <TextTextarea rows={2} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <div className="overflow-x-auto rounded-xl border border-[#e2eeee]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#eaf7f6] uppercase text-aqua-deep">
                <tr>
                  <th className="px-3 py-2">Menu</th>
                  <th className="px-3 py-2">Rota</th>
                  <th className="px-3 py-2">Ler</th>
                  <th className="px-3 py-2">Criar</th>
                  <th className="px-3 py-2">Editar</th>
                  <th className="px-3 py-2">Deletar</th>
                </tr>
              </thead>
              <tbody>
                {(form.permissoes || []).map((m, idx) => (
                  <tr key={m.menu_id} className="border-t border-[#e8f1f0]">
                    <td className="px-3 py-2 font-semibold text-ink">{m.menu_titulo}</td>
                    <td className="px-3 py-2 text-slate-health">{m.rota}</td>
                    {['pode_ler', 'pode_criar', 'pode_editar', 'pode_deletar'].map((field) => (
                      <td key={field} className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(m[field])}
                          onChange={() =>
                            setForm({
                              ...form,
                              permissoes: form.permissoes.map((x, i) =>
                                i === idx ? { ...x, [field]: x[field] ? 0 : 1 } : x
                              ),
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    />
  );
}

export function AcessosPage() {
  const [perfis, setPerfis] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [perfilId, setPerfilId] = useState('');
  const [matrix, setMatrix] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const { refreshSession } = useAuth();

  async function load() {
    const res = await apiRequest('/perfis');
    setPerfis((res.data || []).filter((p) => p.ativo !== false));
    setPermissoes(res.permissoes || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    if (!perfilId) {
      setMatrix([]);
      return;
    }
    const menusMap = new Map();
    permissoes.forEach((p) => {
      if (!menusMap.has(p.menu_id)) {
        menusMap.set(p.menu_id, {
          menu_id: p.menu_id,
          menu_titulo: p.menu_titulo,
          rota: p.rota,
          pode_ler: 0,
          pode_criar: 0,
          pode_editar: 0,
          pode_deletar: 0,
        });
      }
    });
    permissoes
      .filter((p) => String(p.perfil_id) === String(perfilId))
      .forEach((p) => {
        menusMap.set(p.menu_id, {
          menu_id: p.menu_id,
          menu_titulo: p.menu_titulo,
          rota: p.rota,
          pode_ler: p.pode_ler ? 1 : 0,
          pode_criar: p.pode_criar ? 1 : 0,
          pode_editar: p.pode_editar ? 1 : 0,
          pode_deletar: p.pode_deletar ? 1 : 0,
        });
      });
    setMatrix([...menusMap.values()]);
  }, [perfilId, permissoes]);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await apiRequest(`/perfis/${perfilId}`, {
        method: 'PUT',
        body: { permissoes: matrix },
      });
      setMsg('Permissões salvas.');
      await load();
      // Atualiza menus do usuário logado sem invalidar o JWT
      try {
        await refreshSession();
      } catch {
        /* ignore */
      }
    } catch (err) {
      setMsg(err.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  function toggle(menuId, field) {
    setMatrix((prev) =>
      prev.map((m) => (m.menu_id === menuId ? { ...m, [field]: m[field] ? 0 : 1 } : m))
    );
  }

  return (
    <div>
      <PageHeader title="Acessos (RBAC)" description="Matriz de permissões por perfil e menu." />
      <PlaceholderCard>
        <label className="mb-4 grid max-w-md gap-1 text-sm">
          <span className="font-semibold text-ink">Perfil</span>
          <TextSelect value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
            <option value="">Selecione</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </TextSelect>
        </label>

        {perfilId ? (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-[#e2eeee] md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[#eaf7f6] text-xs uppercase text-aqua-deep">
                  <tr>
                    <th className="px-3 py-3 text-left">Menu</th>
                    {['Ler', 'Criar', 'Editar', 'Deletar'].map((h) => (
                      <th key={h} className="px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((m) => (
                    <tr key={m.menu_id} className="border-t border-[#e8f1f0]">
                      <td className="px-3 py-3 font-semibold">{m.menu_titulo}</td>
                      {['pode_ler', 'pode_criar', 'pode_editar', 'pode_deletar'].map((f) => (
                        <td key={f} className="px-3 py-3 text-center">
                          <input type="checkbox" checked={!!m[f]} onChange={() => toggle(m.menu_id, f)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {matrix.map((m) => (
                <article key={m.menu_id} className="rounded-2xl border border-[#d7e8e7] p-4">
                  <p className="mb-3 font-semibold text-ink">{m.menu_titulo}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[['pode_ler','Ler'],['pode_criar','Criar'],['pode_editar','Editar'],['pode_deletar','Deletar']].map(([f,l]) => (
                      <label key={f} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#f8fcfc] px-3">
                        <input type="checkbox" checked={!!m[f]} onChange={() => toggle(m.menu_id, f)} />
                        {l}
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="mt-4 min-h-12 rounded-xl bg-aqua px-5 font-semibold text-white hover:bg-aqua-deep"
            >
              {saving ? 'Salvando...' : 'Salvar permissões'}
            </button>
            {msg ? <p className="mt-2 text-sm text-aqua-deep">{msg}</p> : null}
          </>
        ) : null}
      </PlaceholderCard>
    </div>
  );
}

export function AuditoriaPage() {
  const [rows, setRows] = useState([]);
  const [acao, setAcao] = useState('');
  const [usuarioBusca, setUsuarioBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest('/auditoria', { query: { acao: acao || undefined, pageSize: 50 } })
      .then((r) => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [acao]);

  const filtered = useMemo(() => {
    const q = usuarioBusca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.usuario_nome || '').toLowerCase().includes(q));
  }, [rows, usuarioBusca]);

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Trilha de rastreabilidade com diff sanitizado — sem dados clínicos sensíveis."
      />
      <PlaceholderCard>
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Field label="Filtrar ação">
            <TextInput
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              placeholder="login_sucesso, criar, editar…"
            />
          </Field>
          <Field label="Buscar usuário">
            <TextInput
              value={usuarioBusca}
              onChange={(e) => setUsuarioBusca(e.target.value)}
              placeholder="Nome do usuário"
            />
          </Field>
        </div>

        {loading ? <p className="text-sm text-slate-health">Carregando...</p> : null}

        <div className="relative mx-auto max-w-3xl py-2">
          <div
            className="pointer-events-none absolute bottom-0 left-[17px] top-0 w-0.5 bg-gradient-to-b from-[#0077B6] via-[#00B4D8] to-[#48CAE4]"
            aria-hidden
          />
          <ol className="relative space-y-5">
            {filtered.map((r) => (
              <AuditoriaTimelineItem key={r.id} row={r} />
            ))}
          </ol>
          {!loading && !filtered.length ? (
            <p className="text-sm text-slate-health">Nenhum log encontrado.</p>
          ) : null}
        </div>
      </PlaceholderCard>
    </div>
  );
}

function acaoBadgeClass(acao) {
  const a = String(acao || '').toLowerCase();
  if (a.includes('login') || a.includes('logout')) return 'bg-sky-100 text-sky-900 border-sky-200';
  if (a.includes('criar') || a.includes('create')) return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  if (a.includes('editar') || a.includes('update')) return 'bg-amber-100 text-amber-950 border-amber-200';
  if (a.includes('delet') || a.includes('exclu')) return 'bg-red-100 text-red-900 border-red-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

function formatDiffObject(obj) {
  if (!obj || typeof obj !== 'object') return '—';
  const entries = Object.entries(obj);
  if (!entries.length) return '(vazio)';
  return entries.map(([k, v]) => (
    <div key={k} className="border-b border-[#eef4f3] py-1.5 last:border-0">
      <span className="font-semibold text-aqua-deep">{k}</span>
      <span className="text-slate-health">: </span>
      <span className="text-ink">{v == null ? '—' : String(v)}</span>
    </div>
  ));
}

function AuditoriaTimelineItem({ row: r }) {
  const [openDiff, setOpenDiff] = useState(false);
  const meta = r.metadados_json || r.metadados || null;
  const diff = meta?.diff;
  const when = r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—';

  return (
    <li className="relative pl-10">
      <span
        className="absolute left-2 top-4 z-10 h-4 w-4 rounded-full border-[3px] border-white bg-aqua shadow-md"
        aria-hidden
      />
      <article className="rounded-2xl border border-[#d7e8e7] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-ink">{r.usuario_nome || 'sistema'}</p>
            <p className="mt-0.5 text-xs text-slate-health">{when}</p>
          </div>
          <span
            className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${acaoBadgeClass(r.acao)}`}
          >
            {r.acao}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink">
          <span className="font-semibold">{r.recurso}</span>
          {r.recurso_id ? (
            <span className="text-slate-health"> #{r.recurso_id}</span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-slate-health">IP {r.ip || '—'}</p>

        {diff ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setOpenDiff((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-[#e2eeee] bg-[#f8fcfc] px-3 py-2 text-left text-sm font-semibold text-aqua-deep hover:bg-aqua-soft/30"
              aria-expanded={openDiff}
            >
              Ver alteração
              <span className="text-xs text-slate-health">{openDiff ? '▲' : '▼'}</span>
            </button>
            {openDiff ? (
              <div className="mt-2 grid gap-3 rounded-xl border border-[#e2eeee] bg-white p-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-health">
                    Antes
                  </p>
                  <div className="rounded-lg bg-red-50/40 p-2 text-sm">{formatDiffObject(diff.antes)}</div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-health">
                    Depois
                  </p>
                  <div className="rounded-lg bg-emerald-50/40 p-2 text-sm">
                    {formatDiffObject(diff.depois)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  );
}
