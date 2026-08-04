import { useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import {
  AddressFields,
  Field,
  FormTabs,
  TextInput,
  TextSelect,
  TextTextarea,
} from '../../components/forms/FormControls';
import { maskPhone, onlyDigits } from '../../hooks/useCep';

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

function WhatsAppHint({ value }) {
  const href = toWhatsAppLink(value);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-semibold text-aqua hover:underline"
    >
      Abrir WhatsApp (wa.me)
    </a>
  );
}

function EstablishmentForm({ form, setForm, relaxed = false }) {
  const [tab, setTab] = useState('gerais');
  const waDigits = form.whatsapp || form.telefone_secundario || form.telefone_principal;

  return (
    <>
      <FormTabs
        tabs={[
          { id: 'gerais', label: 'Dados Gerais' },
          { id: 'endereco', label: 'Endereço' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'gerais' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome Fantasia" required={!relaxed}>
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
          <Field
            label="Telefone/WhatsApp"
            required={!relaxed}
            hint="Opcional · link wa.me ao informar número"
          >
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
            <WhatsAppHint value={form.telefone_principal} />
          </Field>
          <Field label="WhatsApp adicional" hint="Link wa.me automático na listagem">
            <TextInput
              value={maskPhone(form.whatsapp || form.telefone_secundario || '')}
              onChange={(e) => {
                const digits = onlyDigits(e.target.value).slice(0, 11);
                setForm({
                  ...form,
                  whatsapp: digits,
                  telefone_secundario: digits,
                });
              }}
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
            <WhatsAppHint value={waDigits} />
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
        <AddressFields values={form} onChange={setForm} required={!relaxed} />
      )}
    </>
  );
}

const columns = [
  { key: 'nome_fantasia', label: 'Nome fantasia' },
  { key: 'documento', label: 'Documento', render: (r) => r.documento || '—' },
  {
    key: 'telefone_principal',
    label: 'Telefone',
    render: (r) => maskPhone(r.telefone_principal),
  },
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
          {maskPhone(wa)}
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

function makePage(title, description, endpoint, { relaxed = false } = {}) {
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
        renderForm={(form, setForm) => (
          <EstablishmentForm form={form} setForm={setForm} relaxed={relaxed} />
        )}
        toPayload={(form) => ({
          ...form,
          documento: form.documento ? onlyDigits(form.documento) : null,
          razao_social: form.razao_social || null,
          whatsapp: form.whatsapp || null,
          telefone_principal: form.telefone_principal ? onlyDigits(form.telefone_principal) : null,
          telefone_secundario: form.whatsapp || form.telefone_secundario || null,
          cep: form.cep ? onlyDigits(form.cep) : null,
        })}
      />
    );
  };
}

export const HospitaisPage = makePage(
  'Estabelecimentos de Saúde',
  'Cadastro de unidades de saúde. Nome fantasia obrigatório; CNPJ e razão social opcionais.',
  '/hospitais'
);

export const FarmaciasPage = makePage(
  'Farmácias',
  'Cadastro de farmácias parceiras com contato WhatsApp e endereço.',
  '/farmacias',
  { relaxed: true }
);
