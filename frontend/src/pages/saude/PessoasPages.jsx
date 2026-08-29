import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EntityCrudPage from '../../components/EntityCrudPage';
import FileUploadField from '../../components/FileUploadField';
import {
  AddressFields,
  Field,
  FormTabs,
  TextInput,
  TextSelect,
  TextTextarea,
} from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';
import { VincularPacientePorCpf } from '../../components/VincularPacientePorCpf';
import {
  isValidCpf,
  isValidEmail,
  maskCpf,
  maskPhone,
  onlyDigits,
  TURNO_OPTIONS,
} from '../../hooks/useCep';

function useEmpresasCuidadoras() {
  const [list, setList] = useState([]);
  useEffect(() => {
    apiRequest('/empresas-cuidadoras', { query: { pageSize: 100, status: 'ativo' } })
      .then((r) => setList(r.data || []))
      .catch(() => setList([]));
  }, []);
  return list;
}

const personEmpty = (extra = {}) => ({
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

function PersonForm({ form, setForm, extraFields, showTurnoEspecialidade }) {
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
          <Field label="Telefone/WhatsApp" required>
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
          <div className="sm:col-span-2">
            <FileUploadField
              label="Foto"
              accept="image/*"
              valueId={form.foto_url ? 1 : null}
              valuePath={form.foto_url}
              onUploaded={({ caminho }) =>
                setForm({
                  ...form,
                  foto_url: caminho,
                })
              }
              onCleared={() => setForm({ ...form, foto_url: '' })}
            />
          </div>
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
  {
    key: 'telefone_principal',
    label: 'Telefone/WhatsApp',
    render: (r) => maskPhone(r.telefone_principal),
  },
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

function personToPayload(form, extra = {}) {
  return {
    ...form,
    usuario_id: null,
    cpf: onlyDigits(form.cpf),
    telefone_principal: onlyDigits(form.telefone_principal),
    telefone_secundario: form.telefone_secundario ? onlyDigits(form.telefone_secundario) : null,
    cep: onlyDigits(form.cep),
    foto_url: form.foto_url || null,
    ...extra,
  };
}

export function CuidadoresPage() {
  const empresas = useEmpresasCuidadoras();
  return (
    <EntityCrudPage
      title="Cuidadores"
      description="Profissionais de cuidado vinculados ao paciente e/ou empresa."
      endpoint="/cuidadores"
      columns={[
        ...baseColumns,
        {
          key: 'turno',
          label: 'Turno',
          render: (r) => TURNO_OPTIONS.find((o) => o.value === r.turno)?.label || r.turno || '—',
        },
        {
          key: 'empresa_cuidadora_id',
          label: 'Empresa',
          render: (r) =>
            empresas.find((e) => e.id === r.empresa_cuidadora_id)?.nome_fantasia || '—',
        },
      ]}
      emptyForm={() => personEmpty({ turno: '', especialidade: '', empresa_cuidadora_id: '' })}
      mapRow={(row) => ({
        ...personEmpty({ turno: '', especialidade: '', empresa_cuidadora_id: '' }),
        ...row,
        empresa_cuidadora_id: row.empresa_cuidadora_id ?? '',
      })}
      renderForm={(form, setForm) => (
        <PersonForm
          form={form}
          setForm={setForm}
          showTurnoEspecialidade
          extraFields={
            <div className="sm:col-span-2 grid gap-1">
              <Field label="Empresa cuidadora">
                <TextSelect
                  value={form.empresa_cuidadora_id ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      empresa_cuidadora_id: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                >
                  <option value="">Nenhuma (PF independente)</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Link
                to="/empresas-cuidadoras"
                className="text-xs font-semibold text-vita hover:underline"
              >
                Cadastrar nova empresa cuidadora
              </Link>
            </div>
          }
        />
      )}
      toPayload={(form) =>
        personToPayload(form, {
          turno: form.turno || null,
          especialidade: form.especialidade || null,
          empresa_cuidadora_id: form.empresa_cuidadora_id
            ? Number(form.empresa_cuidadora_id)
            : null,
        })
      }
    />
  );
}

export function ResponsaveisPage() {
  return (
    <EntityCrudPage
      title="Responsáveis"
      description="Familiares e responsáveis legais do paciente."
      endpoint="/responsaveis"
      columns={[...baseColumns, { key: 'grau_parentesco', label: 'Parentesco' }]}
      emptyForm={() => personEmpty({ grau_parentesco: '' })}
      mapRow={(row) => ({ ...personEmpty({ grau_parentesco: '' }), ...row })}
      renderForm={(form, setForm, { editing }) => (
        <PersonForm
          form={form}
          setForm={setForm}
          extraFields={
            <>
              <Field label="Grau de parentesco">
                <TextInput
                  value={form.grau_parentesco || ''}
                  onChange={(e) => setForm({ ...form, grau_parentesco: e.target.value })}
                />
              </Field>
              {editing?.id ? (
                <VincularPacientePorCpf
                  responsavelId={editing.id}
                  hint="Informe o CPF de um paciente já cadastrado (ex.: Juarez) para associá-lo a este responsável, sem criar um novo registro."
                />
              ) : (
                <p className="sm:col-span-2 text-xs text-slate-health">
                  Depois de salvar o responsável, você poderá vincular pacientes já existentes pelo CPF.
                </p>
              )}
            </>
          }
        />
      )}
      toPayload={(form) =>
        personToPayload(form, {
          grau_parentesco: form.grau_parentesco || null,
        })
      }
    />
  );
}
