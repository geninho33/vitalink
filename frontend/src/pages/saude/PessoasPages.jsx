import { useEffect, useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import {
  AddressFields,
  Field,
  FormTabs,
  PhotoUrlField,
  TextInput,
  TextSelect,
  TextTextarea,
} from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';
import {
  isValidCpf,
  isValidEmail,
  maskCpf,
  maskPhone,
  onlyDigits,
  TURNO_OPTIONS,
} from '../../hooks/useCep';

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

function PersonForm({ form, setForm, usuarios, extraFields, showTurnoEspecialidade }) {
  const [tab, setTab] = useState('gerais');
  const [cpfError, setCpfError] = useState('');
  const [emailError, setEmailError] = useState('');

  const tabs = [
    { id: 'gerais', label: 'Dados Gerais' },
    { id: 'endereco', label: 'Endereço' },
  ];

  return (
    <>
      <FormTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'gerais' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Usuário do sistema" required hint="Vínculo obrigatório para acesso ao painel">
            <TextSelect
              value={form.usuario_id || ''}
              onChange={(e) =>
                setForm({ ...form, usuario_id: e.target.value ? Number(e.target.value) : '' })
              }
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
          <Field label="CPF" required error={cpfError}>
            <TextInput
              value={maskCpf(form.cpf)}
              onChange={(e) => {
                setCpfError('');
                setForm({ ...form, cpf: onlyDigits(e.target.value).slice(0, 11) });
              }}
              onBlur={() => {
                if (form.cpf && !isValidCpf(form.cpf)) {
                  setCpfError('CPF inválido.');
                }
              }}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </Field>
          <Field label="Telefone Principal" required>
            <TextInput
              value={maskPhone(form.telefone_principal)}
              onChange={(e) =>
                setForm({
                  ...form,
                  telefone_principal: onlyDigits(e.target.value).slice(0, 11),
                })
              }
              placeholder="(00) 00000-0000"
              inputMode="tel"
            />
          </Field>
          <Field label="Telefone Adicional" hint="Opcional">
            <TextInput
              value={maskPhone(form.telefone_secundario || '')}
              onChange={(e) =>
                setForm({
                  ...form,
                  telefone_secundario: onlyDigits(e.target.value).slice(0, 11),
                })
              }
              placeholder="(00) 00000-0000"
              inputMode="tel"
            />
          </Field>
          <Field label="E-mail" error={emailError}>
            <TextInput
              type="email"
              value={form.email || ''}
              onChange={(e) => {
                setEmailError('');
                setForm({ ...form, email: e.target.value });
              }}
              onBlur={() => {
                if (form.email && !isValidEmail(form.email)) {
                  setEmailError('E-mail inválido.');
                }
              }}
            />
          </Field>
          <PhotoUrlField
            value={form.foto_url}
            onChange={(v) => setForm({ ...form, foto_url: v })}
          />
          <Field label="Status">
            <TextSelect
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </TextSelect>
          </Field>
          {showTurnoEspecialidade ? (
            <>
              <Field label="Turno">
                <TextSelect
                  value={form.turno || ''}
                  onChange={(e) => setForm({ ...form, turno: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {TURNO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Especialidade">
                <TextInput
                  value={form.especialidade || ''}
                  onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          {extraFields}
          <div className="sm:col-span-2">
            <Field label="Observações">
              <TextTextarea
                rows={3}
                value={form.observacoes || ''}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ) : (
        <AddressFields values={form} onChange={setForm} required />
      )}
    </>
  );
}

const baseColumns = [
  { key: 'nome', label: 'Nome' },
  { key: 'cpf', label: 'CPF', render: (r) => maskCpf(r.cpf) },
  { key: 'telefone_principal', label: 'Telefone', render: (r) => maskPhone(r.telefone_principal) },
  { key: 'usuario_email', label: 'Usuário' },
  {
    key: 'status',
    label: 'Status',
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          r.status === 'ativo' ? 'bg-mint-soft text-aqua-deep' : 'bg-slate-100 text-slate-health'
        }`}
      >
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
      columns={[
        ...baseColumns,
        {
          key: 'turno',
          label: 'Turno',
          render: (r) => TURNO_OPTIONS.find((o) => o.value === r.turno)?.label || r.turno || '—',
        },
      ]}
      emptyForm={() => personEmpty({ turno: '', especialidade: '' })}
      mapRow={(row) => ({ ...personEmpty({ turno: '', especialidade: '' }), ...row })}
      renderForm={(form, setForm) => (
        <PersonForm
          form={form}
          setForm={setForm}
          usuarios={usuarios}
          showTurnoEspecialidade
        />
      )}
      toPayload={(form) => ({
        ...form,
        usuario_id: Number(form.usuario_id),
        cpf: onlyDigits(form.cpf),
        telefone_principal: onlyDigits(form.telefone_principal),
        telefone_secundario: form.telefone_secundario
          ? onlyDigits(form.telefone_secundario)
          : null,
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
              <TextInput
                value={form.grau_parentesco || ''}
                onChange={(e) => setForm({ ...form, grau_parentesco: e.target.value })}
              />
            </Field>
          }
        />
      )}
      toPayload={(form) => ({
        ...form,
        usuario_id: Number(form.usuario_id),
        cpf: onlyDigits(form.cpf),
        telefone_principal: onlyDigits(form.telefone_principal),
        telefone_secundario: form.telefone_secundario
          ? onlyDigits(form.telefone_secundario)
          : null,
        cep: onlyDigits(form.cep),
      })}
    />
  );
}
