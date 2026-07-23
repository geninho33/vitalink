import { useEffect, useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import { AddressFields, Field, TextInput, TextSelect, TextTextarea } from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';
import { onlyDigits } from '../../hooks/useCep';

function useUsuariosOptions() {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    apiRequest('/usuarios')
      .then((res) => setOptions(res.data || []))
      .catch(() => setOptions([]));
  }, []);
  return options;
}

const personEmpty = (extra = {}) => ({
  usuario_id: '',
  nome: '',
  cpf: '',
  telefone_principal: '',
  telefone_secundario: '',
  email: '',
  foto_url: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
  status: 'ativo',
  ...extra,
});

function PersonForm({ form, setForm, usuarios, extraFields }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Usuário do sistema" required hint="Vínculo obrigatório para acesso ao painel">
          <TextSelect
            value={form.usuario_id || ''}
            onChange={(e) => setForm({ ...form, usuario_id: e.target.value ? Number(e.target.value) : '' })}
          >
            <option value="">Selecione</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.email})
              </option>
            ))}
          </TextSelect>
        </Field>
        <Field label="Nome completo" required>
          <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Field>
        <Field label="CPF" required>
          <TextInput value={form.cpf} onChange={(e) => setForm({ ...form, cpf: onlyDigits(e.target.value).slice(0, 11) })} />
        </Field>
        <Field label="Telefone principal" required>
          <TextInput value={form.telefone_principal} onChange={(e) => setForm({ ...form, telefone_principal: e.target.value })} />
        </Field>
        <Field label="Telefone adicional">
          <TextInput value={form.telefone_secundario || ''} onChange={(e) => setForm({ ...form, telefone_secundario: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <TextInput type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Foto (URL)">
          <TextInput value={form.foto_url || ''} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} />
        </Field>
        <Field label="Status">
          <TextSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </TextSelect>
        </Field>
        {extraFields}
      </div>
      <div>
        <p className="mb-2 text-sm font-bold text-ink">Endereço</p>
        <AddressFields values={form} onChange={setForm} required />
      </div>
      <Field label="Observações">
        <TextTextarea rows={3} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
      </Field>
    </>
  );
}

const baseColumns = [
  { key: 'nome', label: 'Nome' },
  { key: 'cpf', label: 'CPF' },
  { key: 'telefone_principal', label: 'Telefone' },
  { key: 'usuario_email', label: 'Usuário' },
  {
    key: 'status',
    label: 'Status',
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.status === 'ativo' ? 'bg-mint-soft text-aqua-deep' : 'bg-slate-100 text-slate-health'}`}>
        {r.status}
      </span>
    ),
  },
];

export function CuidadoresPage() {
  const usuarios = useUsuariosOptions();
  return (
    <EntityCrudPage
      title="Cuidadores"
      description="Profissionais de cuidado com usuário vinculado ao sistema."
      endpoint="/cuidadores"
      columns={[...baseColumns, { key: 'turno', label: 'Turno' }]}
      emptyForm={() => personEmpty({ turno: '', especialidade: '' })}
      mapRow={(row) => ({ ...personEmpty({ turno: '', especialidade: '' }), ...row })}
      renderForm={(form, setForm) => (
        <PersonForm
          form={form}
          setForm={setForm}
          usuarios={usuarios}
          extraFields={
            <>
              <Field label="Turno">
                <TextInput value={form.turno || ''} onChange={(e) => setForm({ ...form, turno: e.target.value })} />
              </Field>
              <Field label="Especialidade">
                <TextInput value={form.especialidade || ''} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} />
              </Field>
            </>
          }
        />
      )}
      toPayload={(form) => ({
        ...form,
        usuario_id: Number(form.usuario_id),
        cpf: onlyDigits(form.cpf),
        cep: onlyDigits(form.cep),
      })}
    />
  );
}

export function ResponsaveisPage() {
  const usuarios = useUsuariosOptions();
  return (
    <EntityCrudPage
      title="Responsáveis"
      description="Familiares/responsáveis legais com acesso vinculado a usuário."
      endpoint="/responsaveis"
      columns={[...baseColumns, { key: 'grau_parentesco', label: 'Parentesco' }]}
      emptyForm={() => personEmpty({ grau_parentesco: '' })}
      mapRow={(row) => ({ ...personEmpty({ grau_parentesco: '' }), ...row })}
      renderForm={(form, setForm) => (
        <PersonForm
          form={form}
          setForm={setForm}
          usuarios={usuarios}
          extraFields={
            <Field label="Grau de parentesco">
              <TextInput value={form.grau_parentesco || ''} onChange={(e) => setForm({ ...form, grau_parentesco: e.target.value })} />
            </Field>
          }
        />
      )}
      toPayload={(form) => ({
        ...form,
        usuario_id: Number(form.usuario_id),
        cpf: onlyDigits(form.cpf),
        cep: onlyDigits(form.cep),
      })}
    />
  );
}
