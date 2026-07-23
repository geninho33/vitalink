import { useEffect, useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import { AddressFields, Field, TextInput, TextSelect, TextTextarea } from '../../components/forms/FormControls';
import { apiRequest } from '../../services/api';
import { onlyDigits } from '../../hooks/useCep';

function useOptions(endpoint) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    apiRequest(endpoint, { query: { pageSize: 100, status: 'ativo' } })
      .then((res) => setOptions(res.data || []))
      .catch(() => setOptions([]));
  }, [endpoint]);
  return options;
}

export function MedicosPage() {
  const hospitais = useOptions('/hospitais');

  const empty = () => ({
    hospital_clinica_id: '',
    nome: '',
    crm: '',
    uf_crm: '',
    especialidade: '',
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

  return (
    <EntityCrudPage
      title="Médicos"
      description="Cadastro médico com CRM e vínculo obrigatório a hospital/clínica."
      endpoint="/medicos"
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'crm', label: 'CRM', render: (r) => `${r.crm}/${r.uf_crm}` },
        { key: 'especialidade', label: 'Especialidade' },
        { key: 'hospital_nome', label: 'Hospital/Clínica' },
        { key: 'telefone_principal', label: 'Telefone' },
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
      mapRow={(row) => ({ ...empty(), ...row })}
      renderForm={(form, setForm) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hospital / Clínica" required>
              <TextSelect
                value={form.hospital_clinica_id || ''}
                onChange={(e) => setForm({ ...form, hospital_clinica_id: e.target.value ? Number(e.target.value) : '' })}
              >
                <option value="">Selecione</option>
                {hospitais.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nome_fantasia}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Nome completo" required>
              <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="CRM" required>
              <TextInput value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} />
            </Field>
            <Field label="UF CRM" required>
              <TextInput maxLength={2} value={form.uf_crm} onChange={(e) => setForm({ ...form, uf_crm: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Especialidade">
              <TextInput value={form.especialidade || ''} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} />
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
            <Field label="Status">
              <TextSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </TextSelect>
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-ink">Endereço (opcional)</p>
            <AddressFields values={form} onChange={setForm} required={false} />
          </div>
          <Field label="Observações">
            <TextTextarea rows={3} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Field>
        </>
      )}
      toPayload={(form) => ({
        ...form,
        hospital_clinica_id: Number(form.hospital_clinica_id),
        cep: form.cep ? onlyDigits(form.cep) : null,
      })}
    />
  );
}

function AnamneseFields({ form, setForm }) {
  const a = form.anamnese || {};
  function setA(patch) {
    setForm({ ...form, anamnese: { ...a, ...patch } });
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm font-bold text-aqua-deep">Histórico médico</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Doenças pré-existentes">
          <TextTextarea rows={2} value={a.doencas_preexistentes || ''} onChange={(e) => setA({ doencas_preexistentes: e.target.value })} />
        </Field>
        <Field label="Histórico familiar">
          <TextTextarea rows={2} value={a.historico_familiar || ''} onChange={(e) => setA({ historico_familiar: e.target.value })} />
        </Field>
        <Field label="Cirurgias anteriores">
          <TextTextarea rows={2} value={a.cirurgias_anteriores || ''} onChange={(e) => setA({ cirurgias_anteriores: e.target.value })} />
        </Field>
      </div>
      <p className="text-sm font-bold text-aqua-deep">Hábitos e estilo de vida</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sono"><TextTextarea rows={2} value={a.sono || ''} onChange={(e) => setA({ sono: e.target.value })} /></Field>
        <Field label="Alimentação"><TextTextarea rows={2} value={a.alimentacao || ''} onChange={(e) => setA({ alimentacao: e.target.value })} /></Field>
        <Field label="Mobilidade"><TextTextarea rows={2} value={a.mobilidade || ''} onChange={(e) => setA({ mobilidade: e.target.value })} /></Field>
        <Field label="Autonomia"><TextTextarea rows={2} value={a.autonomia || ''} onChange={(e) => setA({ autonomia: e.target.value })} /></Field>
      </div>
      <p className="text-sm font-bold text-aqua-deep">Alergias e restrições</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Medicamentos contraindicados"><TextTextarea rows={2} value={a.medicamentos_contraindicados || ''} onChange={(e) => setA({ medicamentos_contraindicados: e.target.value })} /></Field>
        <Field label="Alergias alimentares"><TextTextarea rows={2} value={a.alergias_alimentares || ''} onChange={(e) => setA({ alergias_alimentares: e.target.value })} /></Field>
        <Field label="Limitações físicas/cognitivas"><TextTextarea rows={2} value={a.limitacoes_fisicas_cognitivas || ''} onChange={(e) => setA({ limitacoes_fisicas_cognitivas: e.target.value })} /></Field>
      </div>
      <p className="text-sm font-bold text-aqua-deep">Observações para cuidadores</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Instruções especiais"><TextTextarea rows={2} value={a.instrucoes_cuidadores || ''} onChange={(e) => setA({ instrucoes_cuidadores: e.target.value })} /></Field>
        <Field label="Episódios de confusão"><TextTextarea rows={2} value={a.episodios_confusao || ''} onChange={(e) => setA({ episodios_confusao: e.target.value })} /></Field>
        <Field label="Contato emergência (nome)"><TextInput value={a.contato_emergencia_nome || ''} onChange={(e) => setA({ contato_emergencia_nome: e.target.value })} /></Field>
        <Field label="Contato emergência (telefone)"><TextInput value={a.contato_emergencia_telefone || ''} onChange={(e) => setA({ contato_emergencia_telefone: e.target.value })} /></Field>
      </div>
    </div>
  );
}

function PacienteForm({ form, setForm, editing, responsaveis, cuidadores, medicos }) {
  const [tab, setTab] = useState('cadastro');

  useEffect(() => {
    if (!editing?.id) {
      setTab('cadastro');
      return;
    }
    apiRequest(`/pacientes/${editing.id}/anamnese`)
      .then((r) => setForm((prev) => ({ ...prev, anamnese: r.data || {} })))
      .catch(() => {});
  }, [editing?.id]);

  return (
    <>
      {editing?.id ? (
        <div className="mb-3 flex gap-2">
          <button type="button" onClick={() => setTab('cadastro')} className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold ${tab === 'cadastro' ? 'bg-aqua text-white' : 'border border-[#d7e8e7]'}`}>
            Cadastro
          </button>
          <button type="button" onClick={() => setTab('anamnese')} className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold ${tab === 'anamnese' ? 'bg-aqua text-white' : 'border border-[#d7e8e7]'}`}>
            Anamnese
          </button>
        </div>
      ) : null}

      {tab === 'anamnese' && editing?.id ? (
        <AnamneseFields form={form} setForm={setForm} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo" required>
              <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="Data de nascimento" required>
              <TextInput type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
            </Field>
            <Field label="CPF" required>
              <TextInput value={form.cpf} onChange={(e) => setForm({ ...form, cpf: onlyDigits(e.target.value).slice(0, 11) })} />
            </Field>
            <Field label="Diagnóstico principal" required>
              <TextInput value={form.diagnostico_principal} onChange={(e) => setForm({ ...form, diagnostico_principal: e.target.value })} />
            </Field>
            <Field label="Alergias">
              <TextInput value={form.alergias || ''} onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
            </Field>
            <Field label="Tipo sanguíneo">
              <TextSelect value={form.tipo_sanguineo} onChange={(e) => setForm({ ...form, tipo_sanguineo: e.target.value })}>
                {['NI', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Telefone">
              <TextInput value={form.telefone_principal || ''} onChange={(e) => setForm({ ...form, telefone_principal: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <TextInput type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Foto (URL)">
              <TextInput value={form.foto_url || ''} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} />
            </Field>
            <Field label="Convênio">
              <TextInput value={form.convenio_nome || ''} onChange={(e) => setForm({ ...form, convenio_nome: e.target.value })} />
            </Field>
            <Field label="Nº convênio">
              <TextInput value={form.convenio_numero || ''} onChange={(e) => setForm({ ...form, convenio_numero: e.target.value })} />
            </Field>
            <Field label="Validade convênio">
              <TextInput type="date" value={form.convenio_validade || ''} onChange={(e) => setForm({ ...form, convenio_validade: e.target.value })} />
            </Field>
            <Field label="Responsável legal">
              <TextSelect value={form.responsavel_id || ''} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Cuidador principal">
              <TextSelect value={form.cuidador_id || ''} onChange={(e) => setForm({ ...form, cuidador_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {cuidadores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Médico responsável">
              <TextSelect value={form.medico_id || ''} onChange={(e) => setForm({ ...form, medico_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Status">
              <TextSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </TextSelect>
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-ink">Endereço (opcional)</p>
            <AddressFields values={form} onChange={setForm} required={false} />
          </div>
          <Field label="Observações">
            <TextTextarea rows={3} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Field>
        </>
      )}
    </>
  );
}

export function PacientesPage() {
  const responsaveis = useOptions('/responsaveis');
  const cuidadores = useOptions('/cuidadores');
  const medicos = useOptions('/medicos');

  const empty = () => ({
    nome: '',
    data_nascimento: '',
    cpf: '',
    diagnostico_principal: '',
    alergias: '',
    tipo_sanguineo: 'NI',
    foto_url: '',
    telefone_principal: '',
    email: '',
    convenio_nome: '',
    convenio_numero: '',
    convenio_validade: '',
    responsavel_id: '',
    cuidador_id: '',
    medico_id: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    observacoes: '',
    status: 'ativo',
    anamnese: {},
  });

  return (
    <EntityCrudPage
      title="Pacientes"
      description="Perfil clínico, anamnese, vínculos de cuidado e convênio."
      endpoint="/pacientes"
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'cpf', label: 'CPF' },
        { key: 'diagnostico_principal', label: 'Diagnóstico' },
        { key: 'responsavel_nome', label: 'Responsável' },
        { key: 'cuidador_nome', label: 'Cuidador' },
        { key: 'medico_nome', label: 'Médico' },
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
      mapRow={(row) => ({
        ...empty(),
        ...row,
        data_nascimento: row.data_nascimento ? String(row.data_nascimento).slice(0, 10) : '',
        convenio_validade: row.convenio_validade ? String(row.convenio_validade).slice(0, 10) : '',
        anamnese: {},
      })}
      renderForm={(form, setForm, { editing }) => (
        <PacienteForm
          form={form}
          setForm={setForm}
          editing={editing}
          responsaveis={responsaveis}
          cuidadores={cuidadores}
          medicos={medicos}
        />
      )}
      toPayload={(form) => ({
        ...form,
        anamnese: undefined,
        cpf: onlyDigits(form.cpf),
        cep: form.cep ? onlyDigits(form.cep) : null,
        responsavel_id: form.responsavel_id || null,
        cuidador_id: form.cuidador_id || null,
        medico_id: form.medico_id || null,
        convenio_validade: form.convenio_validade || null,
      })}
      onAfterSave={async ({ form, editing, savedId }) => {
        const id = savedId || editing?.id;
        if (id && form.anamnese && Object.keys(form.anamnese).length) {
          await apiRequest(`/pacientes/${id}/anamnese`, {
            method: 'PUT',
            body: form.anamnese,
          });
        }
      }}
    />
  );
}

export function RemediosPage() {
  const empty = () => ({
    nome_comercial: '',
    principio_ativo: '',
    concentracao: '',
    forma_farmaceutica: 'comprimido',
    registro_anvisa: '',
    instrucoes_uso: '',
    status: 'ativo',
  });

  return (
    <EntityCrudPage
      title="Remédios / Medicamentos"
      description="Catálogo farmacêutico para rotinas de cuidado."
      endpoint="/remedios"
      columns={[
        { key: 'nome_comercial', label: 'Nome comercial' },
        { key: 'principio_ativo', label: 'Princípio ativo' },
        { key: 'concentracao', label: 'Concentração' },
        { key: 'forma_farmaceutica', label: 'Forma' },
        { key: 'registro_anvisa', label: 'ANVISA' },
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
      mapRow={(row) => ({ ...empty(), ...row })}
      renderForm={(form, setForm) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome comercial" required>
            <TextInput value={form.nome_comercial} onChange={(e) => setForm({ ...form, nome_comercial: e.target.value })} />
          </Field>
          <Field label="Princípio ativo" required>
            <TextInput value={form.principio_ativo} onChange={(e) => setForm({ ...form, principio_ativo: e.target.value })} />
          </Field>
          <Field label="Dosagem / concentração">
            <TextInput value={form.concentracao || ''} onChange={(e) => setForm({ ...form, concentracao: e.target.value })} />
          </Field>
          <Field label="Forma farmacêutica">
            <TextSelect value={form.forma_farmaceutica} onChange={(e) => setForm({ ...form, forma_farmaceutica: e.target.value })}>
              {['comprimido','capsula','xarope','solucao','injecao','pomada','creme','gotas','inalador','outro'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Registro ANVISA">
            <TextInput value={form.registro_anvisa || ''} onChange={(e) => setForm({ ...form, registro_anvisa: e.target.value })} />
          </Field>
          <Field label="Status">
            <TextSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </TextSelect>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Instruções padrão de uso">
              <TextTextarea rows={3} value={form.instrucoes_uso || ''} onChange={(e) => setForm({ ...form, instrucoes_uso: e.target.value })} />
            </Field>
          </div>
        </div>
      )}
    />
  );
}
