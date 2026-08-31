import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CuidadorVinculosPanel from '../../components/CuidadorVinculosPanel';
import EntityCrudPage from '../../components/EntityCrudPage';
import FileUploadField, { extractConvenioHints } from '../../components/FileUploadField';
import {
  AddressFields,
  DateBrInput,
  Field,
  FormTabs,
  MoneyInput,
  TextInput,
  TextSelect,
  TextTextarea,
} from '../../components/forms/FormControls';
import AutocompleteSelect, { AutocompleteMulti } from '../../components/forms/AutocompleteSelect';
import { formatLocalLabel, formatMedicoLabel, searchEspecialidades, searchLocais, searchMedicos, searchFarmacias } from '../../utils/redeSaude';
import { isValidCrm, isValidUf, UF_LIST } from '../../utils/validation';
import { apiRequest } from '../../services/api';
import { printMedicamentosFromLoader } from '../../utils/printMedicamentos';
import {
  buscarPacientePorCpf,
  PacienteExistenteAviso,
} from '../../components/VincularPacientePorCpf';
import {
  isValidCpf,
  isValidEmail,
  maskCpf,
  maskPhone,
  onlyDigits,
  PERIODO_HORARIO_OPTIONS,
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

function parseJsonIds(value) {
  if (Array.isArray(value)) return value.map(Number).filter((id) => id > 0);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(Number).filter((id) => id > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseEstabelecimentoIds(row) {
  let est = row.estabelecimentos;
  if (typeof est === 'string') {
    try {
      est = JSON.parse(est);
    } catch {
      est = [];
    }
  }
  if (Array.isArray(est) && est.length) {
    return est.map((e) => Number(e.id)).filter((id) => id > 0);
  }
  if (row.hospital_clinica_id) return [Number(row.hospital_clinica_id)];
  return [];
}

function parseEstabelecimentoItems(row) {
  let est = row?.estabelecimentos;
  if (typeof est === 'string') {
    try {
      est = JSON.parse(est);
    } catch {
      est = [];
    }
  }
  if (Array.isArray(est) && est.length) {
    return est.map((e) => ({
      value: String(e.id),
      label: formatLocalLabel(e) || e.nome_fantasia || String(e.id),
    }));
  }
  return (row?.estabelecimento_ids || []).map((id) => ({
    value: String(id),
    label: `Local #${id}`,
  }));
}

function normalizeSpecialty(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const SPECIALTY_HOTSPOTS = {
  cardiologia: { top: '38%', left: '50%' },
  urologia: { top: '72%', left: '50%' },
  neurologia: { top: '18%', left: '50%' },
  ortopedia: { top: '58%', left: '35%' },
  dermatologia: { top: '42%', left: '68%' },
  oftalmologia: { top: '14%', left: '42%' },
  ginecologia: { top: '68%', left: '50%' },
  gastroenterologia: { top: '52%', left: '50%' },
  pneumologia: { top: '40%', left: '45%' },
  endocrinologia: { top: '48%', left: '55%' },
};

function MultiCheckboxField({ label, hint, options, valueIds, onChange, footer }) {
  const set = new Set(valueIds || []);
  return (
    <Field label={label} hint={hint}>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-[#d7e8e7] bg-[#f8fcfc]">
        {options.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-health">Nenhum registro disponível.</p>
        ) : (
          options.map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-2 border-b border-[#e8f1f0] px-3 py-2 last:border-0 hover:bg-white"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#cfe0df] text-aqua"
                checked={set.has(o.id)}
                onChange={(e) => {
                  const next = new Set(set);
                  if (e.target.checked) next.add(o.id);
                  else next.delete(o.id);
                  onChange([...next]);
                }}
              />
              <span className="text-sm text-ink">{o.nome || o.nome_fantasia}</span>
            </label>
          ))
        )}
      </div>
      {footer}
    </Field>
  );
}

function SexoBodyPreview({ sexo, medicos, medicoIds }) {
  if (sexo !== 'masculino' && sexo !== 'feminino') return null;
  const imgSrc = sexo === 'masculino' ? '/Sexo Masculino.png' : '/Sexo Feminino.png';
  const linked = (medicos || []).filter((m) => (medicoIds || []).includes(m.id));
  const hotspots = useMemo(() => {
    const seen = new Set();
    return linked
      .map((m) => {
        const key = Object.keys(SPECIALTY_HOTSPOTS).find((k) =>
          normalizeSpecialty(m.especialidade).includes(k)
        );
        if (!key || seen.has(key)) return null;
        seen.add(key);
        return { key, label: m.especialidade, pos: SPECIALTY_HOTSPOTS[key] };
      })
      .filter(Boolean);
  }, [medicos, medicoIds]);

  return (
    <div className="sm:col-span-2">
      <Field label="Mapa por especialidade" hint="Áreas dos médicos vinculados">
        <div className="relative mx-auto max-w-xs">
          <img src={imgSrc} alt="" className="w-full rounded-xl border border-[#d7e8e7]" />
          {hotspots.map((h) => (
            <span
              key={h.key}
              title={h.label}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-aqua shadow-md"
              style={{ top: h.pos.top, left: h.pos.left }}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

export function MedicosPage() {
  const empty = () => ({
    estabelecimento_ids: [],
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
    const [emailError, setEmailError] = useState('');

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome completo" required>
          <TextInput value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Field>
        <AutocompleteSelect
          label="Especialidade"
          required
          value={form.especialidade}
          selectedLabel={form.especialidade}
          allowFreeText
          fetchOptions={searchEspecialidades}
          placeholder="Buscar especialidade…"
          onChange={(value) => setForm({ ...form, especialidade: value })}
        />
        <Field label="CRM" required hint="Somente números">
          <TextInput
            required
            inputMode="numeric"
            value={form.crm}
            onChange={(e) => setForm({ ...form, crm: onlyDigits(e.target.value).slice(0, 10) })}
            placeholder="000000"
          />
        </Field>
        <Field label="UF CRM" required>
          <TextSelect
            required
            value={form.uf_crm}
            onChange={(e) => setForm({ ...form, uf_crm: e.target.value.toUpperCase() })}
          >
            <option value="">Selecione</option>
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </TextSelect>
        </Field>
        <Field label="Telefone pessoal/WhatsApp" hint="Opcional">
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
        <Field label="E-mail pessoal" hint="Opcional" error={emailError}>
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
        <div className="sm:col-span-2">
          <AutocompleteMulti
            label="Local(is) de atendimento"
            hint="Hospital/Clínica — busque por nome, bairro ou cidade"
            valueIds={form.estabelecimento_ids || []}
            selectedItems={parseEstabelecimentoItems(form)}
            onChangeIds={(ids) => setForm({ ...form, estabelecimento_ids: ids })}
            fetchOptions={searchLocais}
            footer={
              <Link
                to="/hospitais"
                className="mt-1 inline-block text-sm font-semibold text-aqua hover:underline"
              >
                + Novo estabelecimento
              </Link>
            }
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
      </div>
    );
  }

  return (
    <EntityCrudPage
      title="Profissionais da Saúde"
      description="Cadastro de profissionais com CRM, especialidade e estabelecimentos vinculados."
      endpoint="/medicos"
      columns={[
        { key: 'nome', label: 'Nome' },
        { key: 'crm', label: 'CRM', render: (r) => `${r.crm}/${r.uf_crm}` },
        { key: 'especialidade', label: 'Especialidade' },
        {
          key: 'estabelecimentos',
          label: 'Estabelecimentos',
          render: (r) => {
            let est = r.estabelecimentos;
            if (typeof est === 'string') {
              try {
                est = JSON.parse(est);
              } catch {
                est = [];
              }
            }
            if (Array.isArray(est) && est.length) {
              return est.map((e) => e.nome_fantasia).join(', ');
            }
            return r.hospital_nome || '—';
          },
        },
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
      mapRow={(row) => ({
        ...empty(),
        ...row,
        estabelecimento_ids: parseEstabelecimentoIds(row),
      })}
      validateForm={(form) => {
        if (!String(form.nome || '').trim()) return 'Informe o nome completo.';
        if (!String(form.especialidade || '').trim()) return 'Informe a especialidade.';
        if (!isValidCrm(form.crm)) return 'Informe um CRM válido (4 a 10 dígitos).';
        if (!isValidUf(form.uf_crm)) return 'Informe a UF do CRM.';
        return null;
      }}
      renderForm={(form, setForm) => <MedicoForm form={form} setForm={setForm} />}
      toPayload={(form) => ({
        ...form,
        estabelecimento_ids: form.estabelecimento_ids || [],
        hospital_clinica_id: form.estabelecimento_ids?.[0]
          ? Number(form.estabelecimento_ids[0])
          : null,
        cpf: form.cpf ? onlyDigits(form.cpf) : null,
        telefone_principal: form.telefone_principal
          ? onlyDigits(form.telefone_principal)
          : null,
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

function PacienteForm({ form, setForm, editing, responsaveis, medicos }) {
  const [tab, setTab] = useState('gerais');
  const [cpfError, setCpfError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cpfExistente, setCpfExistente] = useState(null);
  const [cpfChecking, setCpfChecking] = useState(false);

  useEffect(() => {
    if (!editing?.id) {
      setTab('gerais');
      return;
    }
    apiRequest(`/pacientes/${editing.id}/anamnese`)
      .then((r) => setForm((prev) => ({ ...prev, anamnese: r.data || {} })))
      .catch(() => {});
  }, [editing?.id]);

  useEffect(() => {
    const digits = onlyDigits(form.cpf);
    if (editing?.id || digits.length !== 11 || !isValidCpf(digits)) {
      setCpfExistente(null);
      setCpfChecking(false);
      return undefined;
    }
    let cancelled = false;
    setCpfChecking(true);
    buscarPacientePorCpf(digits)
      .then((row) => {
        if (cancelled) return;
        setCpfExistente(row);
        if (row) {
          setForm((prev) => ({
            ...prev,
            nome: prev.nome || row.nome || '',
            data_nascimento: prev.data_nascimento || (row.data_nascimento ? String(row.data_nascimento).slice(0, 10) : ''),
            telefone_principal: prev.telefone_principal || row.telefone_principal || '',
          }));
        }
      })
      .catch(() => {
        if (!cancelled) setCpfExistente(null);
      })
      .finally(() => {
        if (!cancelled) setCpfChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.cpf, editing?.id]);

  const tabs = [
    { id: 'gerais', label: 'Dados Gerais' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'cuidadores', label: 'Cuidadores' },
    { id: 'anamnese', label: 'Anamnese' },
  ];

  return (
    <>
      <FormTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'anamnese' ? (
        editing?.id ? (
          <AnamneseFields form={form} setForm={setForm} />
        ) : (
          <p className="text-sm text-slate-health">
            Salve o paciente para registrar a anamnese completa.
          </p>
        )
      ) : null}

      {tab === 'cuidadores' ? (
        <CuidadorVinculosPanel pacienteId={editing?.id} />
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
            <DateBrInput
              value={form.data_nascimento}
              onChange={(data_nascimento) => setForm({ ...form, data_nascimento })}
            />
          </Field>
          <Field label="Sexo">
            <TextSelect
              value={form.sexo || ''}
              onChange={(e) => setForm({ ...form, sexo: e.target.value })}
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
              <option value="nao_informado">Não informado</option>
            </TextSelect>
          </Field>
          <SexoBodyPreview
            sexo={form.sexo}
            medicos={medicos}
            medicoIds={form.medico_ids || []}
          />
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
          {!editing?.id ? (
            <div className="sm:col-span-2">
              <PacienteExistenteAviso found={cpfExistente} checking={cpfChecking} />
            </div>
          ) : null}
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
            <DateBrInput
              value={form.convenio_validade || ''}
              onChange={(convenio_validade) => setForm({ ...form, convenio_validade })}
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
          <div className="sm:col-span-2">
            <MultiCheckboxField
              label="Responsável(eis)"
              options={responsaveis}
              valueIds={form.responsavel_ids || []}
              onChange={(ids) => setForm({ ...form, responsavel_ids: ids })}
            />
          </div>
          <div className="sm:col-span-2">
            <AutocompleteMulti
              label="Médico(s) principal(is)"
              hint="Busque por nome ou CRM"
              valueIds={form.medico_ids || []}
              selectedItems={(form.medico_ids || []).map((id) => {
                const m = (medicos || []).find((x) => Number(x.id) === Number(id));
                return m
                  ? { value: String(m.id), label: formatMedicoLabel(m) }
                  : { value: String(id), label: `Médico #${id}` };
              })}
              onChangeIds={(ids) => setForm({ ...form, medico_ids: ids })}
              fetchOptions={searchMedicos}
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              className="font-semibold text-vita hover:underline"
              onClick={() => setTab('cuidadores')}
            >
              Histórico de vínculos de cuidador →
            </button>
            <Link to="/cuidadores" className="font-semibold text-aqua hover:underline">
              + Novo cuidador
            </Link>
            <Link
              to="/empresas-cuidadoras"
              className="font-semibold text-aqua hover:underline"
            >
              Empresas cuidadoras
            </Link>
          </div>
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
  const medicos = useOptions('/medicos');

  const empty = () => ({
    nome: '',
    data_nascimento: '',
    sexo: '',
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
    responsavel_ids: [],
    medico_ids: [],
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
        { key: 'responsaveis_nomes', label: 'Responsáveis' },
        { key: 'medicos_nomes', label: 'Médicos' },
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
        sexo: row.sexo || '',
        convenio_validade: row.convenio_validade
          ? String(row.convenio_validade).slice(0, 10)
          : '',
        foto_caminho: row.foto_caminho || row.foto_url || '',
        convenio_frente_caminho: row.convenio_frente_caminho || '',
        convenio_verso_caminho: row.convenio_verso_caminho || '',
        medico_ids: parseJsonIds(row.medico_ids).length
          ? parseJsonIds(row.medico_ids)
          : row.medico_id
            ? [Number(row.medico_id)]
            : [],
        responsavel_ids: parseJsonIds(row.responsavel_ids).length
          ? parseJsonIds(row.responsavel_ids)
          : row.responsavel_id
            ? [Number(row.responsavel_id)]
            : [],
        anamnese: {},
      })}
      renderForm={(form, setForm, { editing }) => (
        <PacienteForm
          form={form}
          setForm={setForm}
          editing={editing}
          responsaveis={responsaveis}
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
        sexo: form.sexo || null,
        telefone_principal: form.telefone_principal
          ? onlyDigits(form.telefone_principal)
          : null,
        cep: form.cep ? onlyDigits(form.cep) : null,
        medico_ids: form.medico_ids || [],
        responsavel_ids: form.responsavel_ids || [],
        responsavel_id: form.responsavel_ids?.[0] ?? null,
        medico_id: form.medico_ids?.[0] ?? null,
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

function PrintRemediosButtons() {
  const [busy, setBusy] = useState(null);

  async function run(mode) {
    setBusy(mode);
    try {
      await printMedicamentosFromLoader(async () => {
        const res = await apiRequest('/remedios', { query: { pageSize: 100, status: 'ativo' } });
        return res.data || [];
      }, { mode });
    } catch (err) {
      window.alert(err.message || 'Falha ao preparar impressão.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => run('lista')}
        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-aqua px-5 text-sm font-semibold text-aqua transition hover:bg-aqua-soft disabled:opacity-60"
      >
        {busy === 'lista' ? 'Preparando…' : 'Imprimir Lista'}
      </button>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => run('estoque')}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white transition hover:bg-aqua-deep disabled:opacity-60"
      >
        {busy === 'estoque' ? 'Preparando…' : 'Imprimir estoque'}
      </button>
    </div>
  );
}

export function RemediosPage() {
  const empty = () => ({
    nome_comercial: '',
    principio_ativo: '',
    laboratorio: '',
    numero_controle_pessoal: '',
    quantidade_administrar: '',
    quantidade_estoque: '',
    indicacao: '',
    medico_prescritor_id: '',
    concentracao: '',
    forma_farmaceutica: 'comprimido',
    registro_anvisa: '',
    instrucoes_uso: '',
    uso_continuo: false,
    periodo_horario: 'manha',
    hora_exata: '',
    status: 'ativo',
    farmacia_id: '',
    valor: null,
    consumo_diario: '',
  });

  return (
    <EntityCrudPage
      title="Medicamentos"
      description="Controle de medicamentos, estoque e administração."
      endpoint="/remedios"
      extraActions={<PrintRemediosButtons />}
      extraRowActions={(row, { reload }) => (
        <button
          type="button"
          className="min-h-10 rounded-lg border border-mint px-3 text-xs font-semibold text-aqua-deep hover:bg-mint-soft"
          onClick={async () => {
            if (!window.confirm(`Registrar administração de "${row.nome_comercial}"?`)) return;
            try {
              await apiRequest(`/remedios/${row.id}/administrar`, { method: 'POST', body: {} });
              await reload();
            } catch (err) {
              window.alert(err.message || 'Falha ao dar baixa.');
            }
          }}
        >
          Dar baixa
        </button>
      )}
      columns={[
        { key: 'nome_comercial', label: 'Nome comercial' },
        { key: 'farmacia_nome', label: 'Farmácia', render: (r) => r.farmacia_nome || '—' },
        {
          key: 'valor',
          label: 'Valor',
          render: (r) =>
            r.valor != null
              ? Number(r.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : '—',
        },
        { key: 'laboratorio', label: 'Laboratório', render: (r) => r.laboratorio || '—' },
        { key: 'quantidade_administrar', label: 'Qtd. administrar' },
        { key: 'quantidade_estoque', label: 'Total de comprimidos / Total em mL' },
        { key: 'indicacao', label: 'Indicação', render: (r) => r.indicacao || '—' },
        { key: 'medico_prescritor_nome', label: 'Prescritor' },
        {
          key: 'uso_continuo',
          label: 'Uso contínuo',
          render: (r) => (r.uso_continuo ? 'Sim' : 'Não'),
        },
        {
          key: 'periodo_horario',
          label: 'Período',
          render: (r) => {
            const label =
              PERIODO_HORARIO_OPTIONS.find((o) => o.value === r.periodo_horario)?.label ||
              r.periodo_horario ||
              '—';
            if (r.periodo_horario === 'personalizado' && r.hora_exata) {
              return `${label} (${r.hora_exata})`;
            }
            return label;
          },
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
        medico_prescritor_id: row.medico_prescritor_id ?? '',
        medico_prescritor_label: row.medico_prescritor_nome
          ? formatMedicoLabel({
              nome: row.medico_prescritor_nome,
              crm: row.medico_prescritor_crm,
              uf_crm: row.medico_prescritor_uf,
            })
          : row.medico_prescritor_nome || '',
        hora_exata: row.hora_exata || '',
        farmacia_id: row.farmacia_id ?? '',
        farmacia_label: row.farmacia_nome ? formatLocalLabel({
          nome_fantasia: row.farmacia_nome,
          bairro: row.farmacia_bairro,
          cidade: row.farmacia_cidade,
          uf: row.farmacia_uf,
        }) : row.farmacia_nome || '',
        valor: row.valor != null ? Number(row.valor) : null,
        consumo_diario: row.consumo_diario ?? '',
      })}
      renderForm={(form, setForm) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <AutocompleteSelect
            label="Farmácia"
            required
            hint={
              <Link to="/farmacias" className="text-aqua-deep underline">
                Cadastrar nova farmácia
              </Link>
            }
            value={form.farmacia_id ? String(form.farmacia_id) : ''}
            selectedLabel={form.farmacia_label || ''}
            fetchOptions={searchFarmacias}
            placeholder="Buscar farmácia…"
            onChange={(value, opt) =>
              setForm({
                ...form,
                farmacia_id: value ? Number(value) : '',
                farmacia_label: opt?.label || '',
              })
            }
          />
          <Field label="Valor do medicamento" required>
            <MoneyInput
              required
              value={form.valor}
              onChange={(valor) => setForm({ ...form, valor })}
            />
          </Field>
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
          <Field label="Laboratório">
            <TextInput
              value={form.laboratorio || ''}
              onChange={(e) => setForm({ ...form, laboratorio: e.target.value })}
            />
          </Field>
          <Field label="Nº controle pessoal">
            <TextInput
              value={form.numero_controle_pessoal || ''}
              onChange={(e) => setForm({ ...form, numero_controle_pessoal: e.target.value })}
            />
          </Field>
          <Field label="Quantidade a administrar" required>
            <TextInput
              value={form.quantidade_administrar ?? ''}
              onChange={(e) => setForm({ ...form, quantidade_administrar: e.target.value })}
              placeholder="Ex.: 1 comprimido"
            />
          </Field>
          <Field label="Total de comprimidos / Total em mL" required>
            <TextInput
              type="number"
              min={0}
              value={form.quantidade_estoque ?? ''}
              onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })}
            />
          </Field>
          <Field label="Consumo por dia">
            <TextInput
              type="number"
              min={0.25}
              step={0.25}
              value={form.consumo_diario ?? ''}
              onChange={(e) => setForm({ ...form, consumo_diario: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Indicação" required>
              <TextTextarea
                rows={2}
                value={form.indicacao || ''}
                onChange={(e) => setForm({ ...form, indicacao: e.target.value })}
              />
            </Field>
          </div>
          <AutocompleteSelect
            label="Médico prescritor"
            hint="Opcional — busque por nome ou CRM"
            value={form.medico_prescritor_id ? String(form.medico_prescritor_id) : ''}
            selectedLabel={form.medico_prescritor_label || ''}
            fetchOptions={searchMedicos}
            placeholder="Buscar médico…"
            onChange={(value, opt) =>
              setForm({
                ...form,
                medico_prescritor_id: value ? Number(value) : '',
                medico_prescritor_label: opt?.label || '',
              })
            }
          />
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
          {form.periodo_horario === 'personalizado' ? (
            <Field label="Hora exata" required>
              <TextInput
                type="time"
                value={form.hora_exata || ''}
                onChange={(e) => setForm({ ...form, hora_exata: e.target.value })}
              />
            </Field>
          ) : null}
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
        hora_exata:
          form.periodo_horario === 'personalizado' ? form.hora_exata || null : null,
        quantidade_estoque:
          form.quantidade_estoque !== '' && form.quantidade_estoque != null
            ? Number(form.quantidade_estoque)
            : null,
        medico_prescritor_id: form.medico_prescritor_id
          ? Number(form.medico_prescritor_id)
          : null,
        farmacia_id: form.farmacia_id ? Number(form.farmacia_id) : null,
        valor: form.valor != null && form.valor !== '' ? Number(form.valor) : null,
        consumo_diario:
          form.consumo_diario !== '' && form.consumo_diario != null
            ? Number(form.consumo_diario)
            : null,
        laboratorio: form.laboratorio || null,
        numero_controle_pessoal: form.numero_controle_pessoal || null,
      })}
    />
  );
}
