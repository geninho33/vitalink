import { useEffect, useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import PageHeader, { PlaceholderCard } from '../../components/PageHeader';
import { Field, TextInput, TextSelect, TextTextarea } from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';

export function UsuariosPage() {
  const [perfis, setPerfis] = useState([]);
  useEffect(() => {
    apiRequest('/perfis').then((r) => setPerfis(r.data || [])).catch(() => setPerfis([]));
  }, []);

  const empty = () => ({
    nome: '',
    email: '',
    senha: '',
    perfil_id: '',
    status: 'ativo',
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
      renderForm={(form, setForm, { editing }) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome" required>
            <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="E-mail" required>
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={editing ? 'Nova senha (opcional)' : 'Senha'} required={!editing}>
            <TextInput type="password" value={form.senha || ''} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          </Field>
          <Field label="Perfil" required>
            <TextSelect value={form.perfil_id || ''} onChange={(e) => setForm({ ...form, perfil_id: Number(e.target.value) })}>
              <option value="">Selecione</option>
              {perfis.map((p) => (
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
      toPayload={(form) => {
        const payload = {
          nome: form.nome,
          email: form.email,
          perfil_id: Number(form.perfil_id),
          status: form.status,
        };
        if (form.senha) payload.senha = form.senha;
        return payload;
      }}
    />
  );
}

export function PerfisPage() {
  const [menus, setMenus] = useState([]);
  useEffect(() => {
    // menus vêm do login; para admin listamos via perfil payload
    apiRequest('/perfis').then((r) => {
      const unique = [];
      const seen = new Set();
      (r.permissoes || []).forEach((p) => {
        if (!seen.has(p.menu_id)) {
          seen.add(p.menu_id);
          unique.push({ id: p.menu_id, titulo: p.menu_titulo, rota: p.rota });
        }
      });
      setMenus(unique);
    }).catch(() => setMenus([]));
  }, []);

  const empty = () => ({ nome: '', descricao: '', permissoes: [] });

  return (
    <EntityCrudPage
      title="Perfis"
      description="Papéis do sistema e menus associados."
      endpoint="/perfis"
      statusFilter={false}
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'descricao', label: 'Descrição' },
      ]}
      emptyForm={empty}
      mapRow={(row) => ({ ...empty(), ...row, permissoes: [] })}
      renderForm={(form, setForm) => (
        <div className="grid gap-3">
          <Field label="Nome" required>
            <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <TextTextarea rows={2} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          {menus.length ? (
            <div>
              <p className="mb-2 text-sm font-bold text-ink">Menus iniciais (leitura)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {menus.map((m) => {
                  const checked = (form.permissoes || []).some((p) => p.menu_id === m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 rounded-xl border border-[#d7e8e7] px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const list = form.permissoes || [];
                          setForm({
                            ...form,
                            permissoes: e.target.checked
                              ? [...list, { menu_id: m.id, pode_ler: 1, pode_criar: 0, pode_editar: 0, pode_deletar: 0 }]
                              : list.filter((p) => p.menu_id !== m.id),
                          });
                        }}
                      />
                      {m.titulo}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
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

  async function load() {
    const res = await apiRequest('/perfis');
    setPerfis(res.data || []);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest('/auditoria', { query: { acao: acao || undefined, pageSize: 50 } })
      .then((r) => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [acao]);

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Trilha sanitizada de ações (sem dados clínicos sensíveis)."
      />
      <PlaceholderCard>
        <label className="mb-4 grid max-w-xs gap-1 text-sm">
          <span className="font-semibold">Filtrar ação</span>
          <TextInput value={acao} onChange={(e) => setAcao(e.target.value)} placeholder="login_sucesso, criar..." />
        </label>
        {loading ? <p className="text-sm text-slate-health">Carregando...</p> : null}
        <div className="grid gap-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-xl border border-[#d7e8e7] bg-[#f8fcfc] p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-ink">{r.acao}</strong>
                <span className="text-xs text-slate-health">
                  {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : ''}
                </span>
              </div>
              <p className="mt-1 text-slate-health">
                {r.usuario_nome || 'sistema'} · {r.recurso}
                {r.recurso_id ? ` #${r.recurso_id}` : ''} · IP {r.ip || '—'}
              </p>
            </article>
          ))}
          {!loading && !rows.length ? (
            <p className="text-sm text-slate-health">Nenhum log encontrado.</p>
          ) : null}
        </div>
      </PlaceholderCard>
    </div>
  );
}
