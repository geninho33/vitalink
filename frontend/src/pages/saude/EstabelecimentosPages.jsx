import EntityCrudPage from '../../components/EntityCrudPage';
import { AddressFields, Field, TextInput, TextSelect, TextTextarea } from '../../components/forms/FormControls';
import { onlyDigits } from '../../hooks/useCep';

function toWhatsAppLink(value) {
  const digits = onlyDigits(value);
  if (!digits) return null;
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

const empty = () => ({
  razao_social: '',
  nome_fantasia: '',
  tipo_documento: 'cnpj',
  documento: '',
  telefone_principal: '',
  telefone_secundario: '',
  whatsapp: '',
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
        <Field label="Nome Fantasia" required>
          <TextInput
            value={form.nome_fantasia}
            onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
          />
        </Field>
        <Field label="Razão Social" hint="Opcional">
          <TextInput
            value={form.razao_social || ''}
            onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
          />
        </Field>
        <Field label="Tipo documento">
          <TextSelect
            value={form.tipo_documento || 'cnpj'}
            onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
          >
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
          </TextSelect>
        </Field>
        <Field label="CNPJ/CPF" hint="Opcional">
          <TextInput
            value={form.documento || ''}
            onChange={(e) => setForm({ ...form, documento: onlyDigits(e.target.value) })}
          />
        </Field>
        <Field label="Telefone principal" required>
          <TextInput
            value={form.telefone_principal}
            onChange={(e) => setForm({ ...form, telefone_principal: e.target.value })}
          />
        </Field>
        <Field label="WhatsApp" hint="Link wa.me automático">
          <TextInput
            value={form.whatsapp || form.telefone_secundario || ''}
            onChange={(e) =>
              setForm({
                ...form,
                whatsapp: e.target.value,
                telefone_secundario: e.target.value,
              })
            }
            placeholder="(11) 99999-9999"
          />
        </Field>
        <Field label="E-mail">
          <TextInput
            type="email"
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <TextSelect
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
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
        <TextTextarea
          rows={3}
          value={form.observacoes || ''}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
        />
      </Field>
    </>
  );
}

const columns = [
  { key: 'nome_fantasia', label: 'Nome fantasia' },
  { key: 'documento', label: 'Documento', render: (r) => r.documento || '—' },
  { key: 'telefone_principal', label: 'Telefone' },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    render: (r) => {
      const wa = r.whatsapp || r.telefone_secundario;
      const href = toWhatsAppLink(wa);
      if (!href) return '—';
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-aqua hover:underline"
        >
          {wa}
        </a>
      );
    },
  },
  { key: 'cidade', label: 'Cidade', render: (r) => `${r.cidade || '—'}/${r.uf || '—'}` },
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

function makePage(title, description, endpoint) {
  return function Page() {
    return (
      <EntityCrudPage
        title={title}
        description={description}
        endpoint={endpoint}
        columns={columns}
        emptyForm={empty}
        mapRow={(row) => ({
          ...empty(),
          ...row,
          whatsapp: row.whatsapp || row.telefone_secundario || '',
        })}
        renderForm={(form, setForm) => <EstablishmentForm form={form} setForm={setForm} />}
        toPayload={(form) => ({
          ...form,
          documento: form.documento ? onlyDigits(form.documento) : null,
          razao_social: form.razao_social || null,
          whatsapp: form.whatsapp || null,
          telefone_secundario: form.whatsapp || form.telefone_secundario || null,
          cep: onlyDigits(form.cep),
        })}
      />
    );
  };
}

export const HospitaisPage = makePage(
  'Hospitais / Clínicas',
  'Cadastro de unidades de saúde. Nome fantasia obrigatório; CNPJ e razão social opcionais.',
  '/hospitais'
);

export const FarmaciasPage = makePage(
  'Farmácias',
  'Cadastro de farmácias parceiras com contato WhatsApp e endereço.',
  '/farmacias'
);
