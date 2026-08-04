import { useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import {
  AddressFields,
  Field,
  FormTabs,
  TextInput,
  TextSelect,
} from '../../components/forms/FormControls';
import { maskPhone, onlyDigits } from '../../hooks/useCep';

const empty = () => ({
  nome_fantasia: '',
  razao_social: '',
  cnpj: '',
  telefone: '',
  email: '',
  pessoa_responsavel: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  status: 'ativo',
});

function EmpresaForm({ form, setForm }) {
  const [tab, setTab] = useState('gerais');
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
          <Field label="Nome Fantasia" required>
            <TextInput
              value={form.nome_fantasia}
              onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
            />
          </Field>
          <Field label="Razão Social">
            <TextInput
              value={form.razao_social || ''}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
            />
          </Field>
          <Field label="CNPJ">
            <TextInput
              value={form.cnpj || ''}
              onChange={(e) => setForm({ ...form, cnpj: onlyDigits(e.target.value).slice(0, 14) })}
              placeholder="00.000.000/0000-00"
            />
          </Field>
          <Field label="Telefone / WhatsApp">
            <TextInput
              value={maskPhone(form.telefone || '')}
              onChange={(e) =>
                setForm({ ...form, telefone: onlyDigits(e.target.value).slice(0, 11) })
              }
              placeholder="(00) 00000-0000"
            />
          </Field>
          <Field label="E-mail">
            <TextInput
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Pessoa Responsável">
            <TextInput
              value={form.pessoa_responsavel || ''}
              onChange={(e) => setForm({ ...form, pessoa_responsavel: e.target.value })}
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
      ) : (
        <AddressFields values={form} onChange={setForm} required={false} />
      )}
    </>
  );
}

export default function EmpresasCuidadorasPage() {
  return (
    <EntityCrudPage
      title="Empresas Cuidadoras"
      description="Cadastro PJ de empresas de cuidado (CNPJ, contato e endereço)."
      endpoint="/empresas-cuidadoras"
      columns={[
        { key: 'nome_fantasia', label: 'Nome fantasia' },
        { key: 'cnpj', label: 'CNPJ', render: (r) => r.cnpj || '—' },
        {
          key: 'telefone',
          label: 'Telefone',
          render: (r) => (r.telefone ? maskPhone(r.telefone) : '—'),
        },
        { key: 'pessoa_responsavel', label: 'Responsável' },
        { key: 'cidade', label: 'Cidade', render: (r) => (r.cidade ? `${r.cidade}/${r.uf || ''}` : '—') },
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
      ]}
      emptyForm={empty}
      mapRow={(row) => ({ ...empty(), ...row })}
      renderForm={(form, setForm) => <EmpresaForm form={form} setForm={setForm} />}
      toPayload={(form) => ({
        ...form,
        cnpj: form.cnpj ? onlyDigits(form.cnpj) : null,
        telefone: form.telefone ? onlyDigits(form.telefone) : null,
        cep: form.cep ? onlyDigits(form.cep) : null,
        razao_social: form.razao_social || null,
      })}
    />
  );
}
