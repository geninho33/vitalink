import EntityCrudPage from '../../components/EntityCrudPage';
import { AddressFields, Field, TextInput, TextSelect, TextTextarea } from '../../components/forms/FormControls';
import { onlyDigits } from '../../hooks/useCep';

const empty = () => ({
  razao_social: '',
  nome_fantasia: '',
  tipo_documento: 'cnpj',
  documento: '',
  telefone_principal: '',
  telefone_secundario: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
  status: 'ativo',
});

function EstablishmentForm({ form, setForm }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Razão Social" required>
          <TextInput value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
        </Field>
        <Field label="Nome Fantasia" required>
          <TextInput value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
        </Field>
        <Field label="Tipo documento" required>
          <TextSelect value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
          </TextSelect>
        </Field>
        <Field label="CNPJ/CPF" required>
          <TextInput value={form.documento} onChange={(e) => setForm({ ...form, documento: onlyDigits(e.target.value) })} />
        </Field>
        <Field label="Telefone principal" required>
          <TextInput value={form.telefone_principal} onChange={(e) => setForm({ ...form, telefone_principal: e.target.value })} />
        </Field>
        <Field label="Telefone secundário">
          <TextInput value={form.telefone_secundario} onChange={(e) => setForm({ ...form, telefone_secundario: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <TextInput type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Status">
          <TextSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </TextSelect>
        </Field>
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

const columns = [
  { key: 'nome_fantasia', label: 'Nome fantasia' },
  { key: 'documento', label: 'Documento' },
  { key: 'telefone_principal', label: 'Telefone' },
  { key: 'cidade', label: 'Cidade', render: (r) => `${r.cidade || '—'}/${r.uf || '—'}` },
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

function makePage(title, description, endpoint) {
  return function Page() {
    return (
      <EntityCrudPage
        title={title}
        description={description}
        endpoint={endpoint}
        columns={columns}
        emptyForm={empty}
        mapRow={(row) => ({ ...empty(), ...row })}
        renderForm={(form, setForm) => <EstablishmentForm form={form} setForm={setForm} />}
        toPayload={(form) => ({
          ...form,
          documento: onlyDigits(form.documento),
          cep: onlyDigits(form.cep),
        })}
      />
    );
  };
}

export const HospitaisPage = makePage(
  'Hospitais / Clínicas',
  'Cadastro de unidades de saúde com endereço via CEP.',
  '/hospitais'
);

export const FarmaciasPage = makePage(
  'Farmácias',
  'Cadastro de farmácias parceiras com contato e endereço.',
  '/farmacias'
);
