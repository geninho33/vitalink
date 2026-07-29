import { useEffect, useState } from 'react';
import EntityCrudPage from '../../components/EntityCrudPage';
import FileUploadField, { extractConvenioHints } from '../../components/FileUploadField';
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
  PERIODO_HORARIO_OPTIONS,
  TURNO_OPTIONS,
} from '../../hooks/useCep';

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
    cpf: '',
    crm: '',
    uf_crm: '',
    especialidade: '',
    turno: '',
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
  });

  function MedicoForm({ form, setForm }) {
    const [tab, setTab] = useState('gerais');
    const [cpfError, setCpfError] = useState('');
    const [emailError, setEmailError] = useState('');

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
            <Field label="Hospital / Clínica" required>
              <TextSelect
                value={form.hospital_clinica_id || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hospital_clinica_id: e.target.value ? Number(e.target.value) : '',
                  })
                }
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
            <Field label="CPF" required error={cpfError}>
              <TextInput
                value={maskCpf(form.cpf || '')}
                onChange={(e) => {
                  setCpfError('');
                  setForm({ ...form, cpf: onlyDigits(e.target.value).slice(0, 11) });
                }}
                onBlur={() => {
                  if (form.cpf && !isValidCpf(form.cpf)) setCpfError('CPF inválido.');
                }}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </Field>
            <Field label="CRM" required>
              <TextInput value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} />
            </Field>
            <Field label="UF CRM" required>
              <TextInput
                maxLength={2}
                value={form.uf_crm}
                onChange={(e) => setForm({ ...form, uf_crm: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Especialidade">
              <TextInput
                value={form.especialidade || ''}
                onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
              />
            </Field>
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
                  if (form.email && !isValidEmail(form.email)) setEmailError('E-mail inválido.');
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
          <AddressFields values={form} onChange={setForm} required={false} />
        )}
      </>
    );
  }

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
        {
          key: 'telefone_principal',
          label: 'Telefone',
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
      ]}
      emptyForm={empty}
      mapRow={(row) => ({ ...empty(), ...row })}
      renderForm={(form, setForm) => <MedicoForm form={form} setForm={setForm} />}
      toPayload={(form) => ({
        ...form,
        hospital_clinica_id: Number(form.hospital_clinica_id),
        cpf: form.cpf ? onlyDigits(form.cpf) : null,
        telefone_principal: onlyDigits(form.telefone_principal),
        telefone_secundario: form.telefone_secundario
          ? onlyDigits(form.telefone_secundario)
          : null,
        cep: form.cep ? onlyDigits(form.cep) : null,
        turno: form.turno || null,
        foto_url: form.foto_url || null,
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
          <TextTextarea
            rows={2}
            value={a.doencas_preexistentes || ''}
            onChange={(e) => setA({ doencas_preexistentes: e.target.value })}
          />
        </Field>
        <Field label="Histórico familiar">
          <TextTextarea
            rows={2}
            value={a.historico_familiar || ''}
            onChange={(e) => setA({ historico_familiar: e.target.value })}
          />
        </Field>
        <Field label="Cirurgias anteriores">
          <TextTextarea
            rows={2}
            value={a.cirurgias_anteriores || ''}
            onChange={(e) => setA({ cirurgias_anteriores: e.target.value })}
          />
        </Field>
      </div>
      <p className="text-sm font-bold text-aqua-deep">Hábitos e estilo de vida</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sono">
          <TextTextarea rows={2} value={a.sono || ''} onChange={(e) => setA({ sono: e.target.value })} />
        </Field>
        <Field label="Alimentação">
          <TextTextarea
            rows={2}
            value={a.alimentacao || ''}
            onChange={(e) => setA({ alimentacao: e.target.value })}
          />
        </Field>
        <Field label="Mobilidade">
          <TextTextarea
            rows={2}
            value={a.mobilidade || ''}
            onChange={(e) => setA({ mobilidade: e.target.value })}
          />
        </Field>
        <Field label="Autonomia">
          <TextTextarea
            rows={2}
            value={a.autonomia || ''}
            onChange={(e) => setA({ autonomia: e.target.value })}
          />
        </Field>
      </div>
      <p className="text-sm font-bold text-aqua-deep">Alergias e restrições</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Medicamentos contraindicados">
          <TextTextarea
            rows={2}
            value={a.medicamentos_contraindicados || ''}
            onChange={(e) => setA({ medicamentos_contraindicados: e.target.value })}
          />
        </Field>
        <Field label="Alergias alimentares">
          <TextTextarea
            rows={2}
            value={a.alergias_alimentares || ''}
            onChange={(e) => setA({ alergias_alimentares: e.target.value })}
          />
        </Field>
        <Field label="Limitações físicas/cognitivas">
          <TextTextarea
            rows={2}
            value={a.limitacoes_fisicas_cognitivas || ''}
            onChange={(e) => setA({ limitacoes_fisicas_cognitivas: e.target.value })}
          />
        </Field>
      </div>
      <p className="text-sm font-bold text-aqua-deep">Observações para cuidadores</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Instruções especiais">
          <TextTextarea
            rows={2}
            value={a.instrucoes_cuidadores || ''}
            onChange={(e) => setA({ instrucoes_cuidadores: e.target.value })}
          />
        </Field>
        <Field label="Episódios de confusão">
          <TextTextarea
            rows={2}
            value={a.episodios_confusao || ''}
            onChange={(e) => setA({ episodios_confusao: e.target.value })}
          />
        </Field>
        <Field label="Contato emergência (nome)">
          <TextInput
            value={a.contato_emergencia_nome || ''}
            onChange={(e) => setA({ contato_emergencia_nome: e.target.value })}
          />
        </Field>
        <Field label="Contato emergência (telefone)">
          <TextInput
            value={a.contato_emergencia_telefone || ''}
            onChange={(e) => setA({ contato_emergencia_telefone: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

function PacienteForm({ form, setForm, editing, responsaveis, cuidadores, medicos }) {
  const [tab, setTab] = useState('gerais');
  const [cpfError, setCpfError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (!editing?.id) {
      setTab('gerais');
      return;
    }
    apiRequest(`/pacientes/${editing.id}/anamnese`)
      .then((r) => setForm((prev) => ({ ...prev, anamnese: r.data || {} })))
      .catch(() => {});
  }, [editing?.id]);

  const tabs = [
    { id: 'gerais', label: 'Dados Gerais' },
    { id: 'endereco', label: 'Endereço' },
    ...(editing?.id ? [{ id: 'anamnese', label: 'Anamnese' }] : []),
  ];

  return (
    <>
      <FormTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'anamnese' && editing?.id ? (
        <AnamneseFields form={form} setForm={setForm} />
      ) : null}

      {tab === 'endereco' ? (
        <AddressFields values={form} onChange={setForm} required={false} />
      ) : null}

      {tab === 'gerais' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo" required>
            <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="Data de nascimento" required>
            <TextInput
              type="date"
              value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
            />
          </Field>
          <Field label="CPF" required error={cpfError}>
            <TextInput
              value={maskCpf(form.cpf)}
              onChange={(e) => {
                setCpfError('');
                setForm({ ...form, cpf: onlyDigits(e.target.value).slice(0, 11) });
              }}
              onBlur={() => {
                if (form.cpf && !isValidCpf(form.cpf)) setCpfError('CPF inválido.');
              }}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </Field>
          <Field label="Alergias">
            <TextInput
              value={form.alergias || ''}
              onChange={(e) => setForm({ ...form, alergias: e.target.value })}
            />
          </Field>
          <Field label="Tipo sanguíneo">
            <TextSelect
              value={form.tipo_sanguineo}
              onChange={(e) => setForm({ ...form, tipo_sanguineo: e.target.value })}
            >
              {['NI', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Telefone Principal">
            <TextInput
              value={maskPhone(form.telefone_principal || '')}
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
          <Field label="E-mail" error={emailError}>
            <TextInput
              type="email"
              value={form.email || ''}
              onChange={(e) => {
                setEmailError('');
                setForm({ ...form, email: e.target.value });
              }}
              onBlur={() => {
                if (form.email && !isValidEmail(form.email)) setEmailError('E-mail inválido.');
              }}
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
            <FileUploadField
              label="Foto do paciente"
              accept="image/*"
              valueId={form.foto_arquivo_id}
              valuePath={form.foto_caminho || form.foto_url}
              onUploaded={({ id, caminho }) =>
                setForm({
                  ...form,
                  foto_arquivo_id: id,
                  foto_caminho: caminho,
                  foto_url: caminho,
                })
              }
              onCleared={() =>
                setForm({
                  ...form,
                  foto_arquivo_id: null,
                  foto_caminho: '',
                  foto_url: '',
                })
              }
            />
          </div>
          <Field label="Convênio">
            <TextInput
              value={form.convenio_nome || ''}
              onChange={(e) => setForm({ ...form, convenio_nome: e.target.value })}
            />
          </Field>
          <Field label="Nº convênio" hint="Pode ser preenchido automaticamente após o upload">
            <TextInput
              value={form.convenio_numero || ''}
              onChange={(e) => setForm({ ...form, convenio_numero: e.target.value })}
            />
          </Field>
          <Field label="Validade convênio">
            <TextInput
              type="date"
              value={form.convenio_validade || ''}
              onChange={(e) => setForm({ ...form, convenio_validade: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <FileUploadField
              label="Carteirinha — frente"
              accept="image/*"
              valueId={form.convenio_frente_arquivo_id}
              valuePath={form.convenio_frente_caminho}
              onUploaded={({ id, caminho, nome_original }) => {
                const hints = extractConvenioHints(nome_original || '');
                setForm({
                  ...form,
                  convenio_frente_arquivo_id: id,
                  convenio_frente_caminho: caminho,
                  convenio_numero: form.convenio_numero || hints.numero || form.convenio_numero,
                  convenio_validade:
                    form.convenio_validade || hints.validade || form.convenio_validade,
                });
              }}
              onCleared={() =>
                setForm({
                  ...form,
                  convenio_frente_arquivo_id: null,
                  convenio_frente_caminho: '',
                })
              }
            />
            <FileUploadField
              label="Carteirinha — verso"
              accept="image/*"
              valueId={form.convenio_verso_arquivo_id}
              valuePath={form.convenio_verso_caminho}
              onUploaded={({ id, caminho, nome_original }) => {
                const hints = extractConvenioHints(nome_original || '');
                setForm({
                  ...form,
                  convenio_verso_arquivo_id: id,
                  convenio_verso_caminho: caminho,
                  convenio_numero: form.convenio_numero || hints.numero || form.convenio_numero,
                  convenio_validade:
                    form.convenio_validade || hints.validade || form.convenio_validade,
                });
              }}
              onCleared={() =>
                setForm({
                  ...form,
                  convenio_verso_arquivo_id: null,
                  convenio_verso_caminho: '',
                })
              }
            />
          </div>
          <Field label="Responsável legal">
            <TextSelect
              value={form.responsavel_id || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  responsavel_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">—</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Cuidador principal">
            <TextSelect
              value={form.cuidador_id || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  cuidador_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">—</option>
              {cuidadores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Médico responsável">
            <TextSelect
              value={form.medico_id || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  medico_id: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">—</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
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
      ) : null}
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
    alergias: '',
    tipo_sanguineo: 'NI',
    foto_url: '',
    foto_arquivo_id: null,
    foto_caminho: '',
    telefone_principal: '',
    email: '',
    convenio_nome: '',
    convenio_numero: '',
    convenio_validade: '',
    convenio_frente_arquivo_id: null,
    convenio_verso_arquivo_id: null,
    convenio_frente_caminho: '',
    convenio_verso_caminho: '',
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
      description="Perfil clínico, anamnese, vínculos de cuidado, foto e carteirinha do convênio."
      endpoint="/pacientes"
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'cpf', label: 'CPF', render: (r) => maskCpf(r.cpf) },
        { key: 'convenio_nome', label: 'Convênio' },
        { key: 'responsavel_nome', label: 'Responsável' },
        { key: 'cuidador_nome', label: 'Cuidador' },
        { key: 'medico_nome', label: 'Médico' },
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
      mapRow={(row) => ({
        ...empty(),
        ...row,
        data_nascimento: row.data_nascimento ? String(row.data_nascimento).slice(0, 10) : '',
        convenio_validade: row.convenio_validade
          ? String(row.convenio_validade).slice(0, 10)
          : '',
        foto_caminho: row.foto_caminho || row.foto_url || '',
        convenio_frente_caminho: row.convenio_frente_caminho || '',
        convenio_verso_caminho: row.convenio_verso_caminho || '',
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
        foto_caminho: undefined,
        convenio_frente_caminho: undefined,
        convenio_verso_caminho: undefined,
        cpf: onlyDigits(form.cpf),
        telefone_principal: form.telefone_principal
          ? onlyDigits(form.telefone_principal)
          : null,
        cep: form.cep ? onlyDigits(form.cep) : null,
        responsavel_id: form.responsavel_id || null,
        cuidador_id: form.cuidador_id || null,
        medico_id: form.medico_id || null,
        foto_arquivo_id: form.foto_arquivo_id || null,
        convenio_frente_arquivo_id: form.convenio_frente_arquivo_id || null,
        convenio_verso_arquivo_id: form.convenio_verso_arquivo_id || null,
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
    uso_continuo: false,
    periodo_horario: 'manha',
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
        {
          key: 'uso_continuo',
          label: 'Uso contínuo',
          render: (r) => (r.uso_continuo ? 'Sim' : 'Não'),
        },
        {
          key: 'periodo_horario',
          label: 'Período',
          render: (r) =>
            PERIODO_HORARIO_OPTIONS.find((o) => o.value === r.periodo_horario)?.label ||
            r.periodo_horario ||
            '—',
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
      ]}
      emptyForm={empty}
      mapRow={(row) => ({
        ...empty(),
        ...row,
        uso_continuo: Boolean(row.uso_continuo),
        periodo_horario: row.periodo_horario || 'manha',
      })}
      renderForm={(form, setForm) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome comercial" required>
            <TextInput
              value={form.nome_comercial}
              onChange={(e) => setForm({ ...form, nome_comercial: e.target.value })}
            />
          </Field>
          <Field label="Princípio ativo" required>
            <TextInput
              value={form.principio_ativo}
              onChange={(e) => setForm({ ...form, principio_ativo: e.target.value })}
            />
          </Field>
          <Field label="Dosagem / concentração">
            <TextInput
              value={form.concentracao || ''}
              onChange={(e) => setForm({ ...form, concentracao: e.target.value })}
            />
          </Field>
          <Field label="Forma farmacêutica">
            <TextSelect
              value={form.forma_farmaceutica}
              onChange={(e) => setForm({ ...form, forma_farmaceutica: e.target.value })}
            >
              {[
                'comprimido',
                'capsula',
                'xarope',
                'solucao',
                'injecao',
                'pomada',
                'creme',
                'gotas',
                'inalador',
                'outro',
              ].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Registro ANVISA">
            <TextInput
              value={form.registro_anvisa || ''}
              onChange={(e) => setForm({ ...form, registro_anvisa: e.target.value })}
            />
          </Field>
          <Field label="Uso Contínuo">
            <TextSelect
              value={form.uso_continuo ? 'sim' : 'nao'}
              onChange={(e) => setForm({ ...form, uso_continuo: e.target.value === 'sim' })}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </TextSelect>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Período / Horário" hint="Quando o medicamento costuma ser administrado">
              <div className="flex flex-wrap gap-2 pt-1">
                {PERIODO_HORARIO_OPTIONS.map((o) => {
                  const active = form.periodo_horario === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setForm({ ...form, periodo_horario: o.value })}
                      className={`min-h-10 rounded-xl px-3 text-sm font-semibold transition ${
                        active
                          ? 'bg-aqua text-white'
                          : 'border border-[#d7e8e7] text-ink hover:bg-aqua-soft/60'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>
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
          <div className="sm:col-span-2">
            <Field label="Instruções padrão de uso">
              <TextTextarea
                rows={3}
                value={form.instrucoes_uso || ''}
                onChange={(e) => setForm({ ...form, instrucoes_uso: e.target.value })}
              />
            </Field>
          </div>
        </div>
      )}
      toPayload={(form) => ({
        ...form,
        uso_continuo: Boolean(form.uso_continuo),
        periodo_horario: form.periodo_horario || 'manha',
      })}
    />
  );
}
