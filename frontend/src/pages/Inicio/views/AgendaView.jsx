import { useCallback, useEffect, useState } from 'react';
import { DateBrInput, Field, Modal, TextInput } from '../../../components/forms/FormControls';
import AutocompleteSelect from '../../../components/forms/AutocompleteSelect';
import { searchEspecialidades, searchLocais, searchMedicos } from '../../../utils/redeSaude';
import GoogleCalendarButton from '../../../components/GoogleCalendarButton';
import { consultaToCalendarEvent } from '../../../utils/googleCalendar';
import { apiRequest } from '../../../services/api';
import { addCatalogItem, loadCatalog } from '../catalog';
import { formatDateBr } from '../localStore';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { useAuth } from '../../../context/AuthContext';
import { isPacienteOuAutocuidado } from '../../../utils/perfis';
import { EmptyState, PageTitle, Panel, PrimaryButton } from '../ui';

const empty = () => ({
  title: '',
  specialty: '',
  doctor: '',
  medico_id: '',
  date: '',
  time: '',
  location: '',
  contact: '',
});

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseMedicoIds(paciente) {
  const raw = paciente?.medico_ids;
  if (Array.isArray(raw)) return raw.map(Number).filter((id) => id > 0);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(Number).filter((id) => id > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapConsulta(row) {
  const d = row.data_hora ? new Date(row.data_hora) : null;
  const valid = d && !Number.isNaN(d.getTime());
  return {
    id: row.id,
    title: row.observacoes || [row.especialidade, row.profissional_nome].filter(Boolean).join(' · ') || 'Consulta',
    specialty: row.especialidade || '',
    doctor: row.profissional_nome || '',
    date: valid ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '',
    time: valid ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '',
    location: row.local_descricao || row.hospital_nome || '',
    contact: '',
    raw: row,
  };
}

export default function AgendaView() {
  const { usuario } = useAuth();
  const { pacienteId, paciente } = usePacienteAtivo();
  const selfCare = isPacienteOuAutocuidado(usuario);
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [especialidades, setEspecialidades] = useState(() => loadCatalog('especialidades'));
  const [quick, setQuick] = useState(null);
  const [quickValue, setQuickValue] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [medicoIds, setMedicoIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!selfCare || !pacienteId) {
      setMedicoIds([]);
      return undefined;
    }
    apiRequest(`/pacientes/${pacienteId}`)
      .then((res) => {
        if (!cancelled) setMedicoIds(parseMedicoIds(res.data || res));
      })
      .catch(() => {
        if (!cancelled) setMedicoIds(parseMedicoIds(paciente));
      });
    return () => {
      cancelled = true;
    };
  }, [selfCare, pacienteId, paciente]);

  const refresh = useCallback(async () => {
    if (!pacienteId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/consultas', {
        query: { paciente_id: pacienteId, pageSize: 200 },
      });
      const rows = (res.data || []).map(mapConsulta).sort((a, b) =>
        `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
      );
      setList(rows);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os especialistas.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function fetchMedicos(q) {
    const opts = await searchMedicos(q);
    const filtered = selfCare
      ? medicoIds.length
        ? opts.filter((o) => medicoIds.includes(Number(o.raw?.id)))
        : []
      : opts;
    return filtered.map((o) => ({
      ...o,
      value: o.raw?.nome || o.label,
    }));
  }

  async function fetchLocais(q) {
    const opts = await searchLocais(q);
    return opts.map((o) => ({
      ...o,
      value: o.raw?.nome_fantasia || o.label,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pacienteId || !form.title.trim() || !form.date) return;
    setSaving(true);
    setError('');
    try {
      const time = form.time || '08:00';
      await apiRequest('/consultas', {
        method: 'POST',
        body: {
          paciente_id: Number(pacienteId),
          medico_id: form.medico_id ? Number(form.medico_id) : null,
          profissional_nome: form.doctor.trim() || form.title.trim(),
          especialidade: form.specialty.trim() || 'Clínica geral',
          local_tipo: 'clinica',
          local_descricao: [form.location.trim(), form.contact.trim()].filter(Boolean).join(' · ') || null,
          data_hora: `${form.date}T${time}:00`,
          observacoes: form.title.trim(),
          status: 'pendente',
        },
      });
      setForm(empty());
      await refresh();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await apiRequest(`/consultas/${id}`, { method: 'DELETE' });
      setConfirmId(null);
      await refresh();
    } catch (err) {
      setError(err.message || 'Não foi possível excluir.');
      setConfirmId(null);
    }
  }

  function openQuick(kind) {
    if (selfCare && (kind === 'doctor' || kind === 'location')) return;
    setQuick(kind);
    setQuickValue('');
  }

  async function saveQuick(e) {
    e.preventDefault();
    const value = quickValue.trim();
    if (!value || quickSaving) return;
    if (quick === 'doctor') {
      addCatalogItem('medicos-locais', { value, label: value });
      setForm((f) => ({ ...f, doctor: value, medico_id: '' }));
    }
    if (quick === 'specialty') {
      const next = addCatalogItem('especialidades', { value, label: value });
      setEspecialidades(next);
      setForm((f) => ({ ...f, specialty: value }));
    }
    if (quick === 'location') {
      setQuickSaving(true);
      try {
        const created = await apiRequest('/hospitais', {
          method: 'POST',
          body: {
            nome_fantasia: value,
            telefone_principal: '00000000000',
            cep: '00000000',
            logradouro: 'A definir',
            numero: 's/n',
            bairro: 'A definir',
            cidade: 'A definir',
            uf: 'SP',
            status: 'ativo',
          },
        });
        setForm((f) => ({ ...f, location: created?.nome_fantasia || value }));
      } catch {
        addCatalogItem('locais', { value, label: value });
        setForm((f) => ({ ...f, location: value }));
      } finally {
        setQuickSaving(false);
      }
    }
    setQuick(null);
  }

  return (
    <div>
      <PageTitle
        eyebrow="Especialistas"
        title="Especialistas"
        description="Consultas, exames e profissionais de saúde do paciente."
      />

      {!pacienteId ? (
        <EmptyState>Selecione um paciente no topo para ver os especialistas vinculados.</EmptyState>
      ) : (
        <>
      <Panel className="mb-5">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="sm:col-span-2">
            <Field label="Consulta, exame ou atendimento" required>
              <TextInput
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Consulta de acompanhamento"
              />
            </Field>
          </div>
          <AutocompleteSelect
            label="Especialidade"
            value={form.specialty}
            selectedLabel={form.specialty}
            allowFreeText
            fetchOptions={searchEspecialidades}
            placeholder="Buscar especialidade…"
            onCreate={() => openQuick('specialty')}
            onChange={(specialty) => setForm({ ...form, specialty })}
          />
          <AutocompleteSelect
            label="Médico"
            value={form.doctor}
            selectedLabel={form.doctor}
            allowFreeText={!selfCare}
            fetchOptions={fetchMedicos}
            placeholder={
              selfCare
                ? 'Profissionais vinculados ao seu atendimento…'
                : 'Buscar por nome…'
            }
            onCreate={selfCare ? undefined : () => openQuick('doctor')}
            onChange={(doctor, opt) =>
              setForm({
                ...form,
                doctor,
                medico_id: opt?.raw?.id || '',
                specialty: opt?.raw?.especialidade || form.specialty,
                contact: opt?.raw?.telefone_principal || form.contact,
              })
            }
          />
          <Field label="Data" required>
            <DateBrInput required value={form.date} onChange={(date) => setForm({ ...form, date })} />
          </Field>
          <Field label="Horário">
            <TextInput type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
          <AutocompleteSelect
            label="Local"
            value={form.location}
            selectedLabel={form.location}
            allowFreeText={!selfCare}
            fetchOptions={fetchLocais}
            placeholder="Buscar por nome, bairro ou cidade…"
            onCreate={selfCare ? undefined : () => openQuick('location')}
            onChange={(location, opt) =>
              setForm({
                ...form,
                location,
                contact: opt?.raw?.telefone_principal || form.contact,
              })
            }
          />
          <Field label="Contato do local">
            <TextInput
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Telefone, WhatsApp ou e-mail"
            />
          </Field>
          {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" className="w-full" disabled={saving}>
              {saving ? 'Salvando…' : 'Adicionar especialista / consulta'}
            </PrimaryButton>
          </div>
        </form>
      </Panel>

      {loading ? (
        <p className="text-sm text-slate-health">Carregando especialistas…</p>
      ) : list.length === 0 ? (
        <EmptyState>
          {selfCare && !medicoIds.length
            ? 'Nenhum profissional vinculado ao seu atendimento ainda.'
            : 'Nenhuma consulta ou exame cadastrado para este paciente.'}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <article key={a.id} className="flex gap-3 rounded-2xl border border-[#d7e8e7] bg-white p-4">
              <div className="shrink-0 rounded-xl bg-aqua-soft px-3 py-2 text-center text-xs font-semibold text-aqua-deep">
                {formatDateBr(a.date).replace(' de ', '\n')}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-ink">{a.title}</strong>
                <p className="text-sm text-slate-health">
                  {a.time || 'Horário a definir'}
                  {a.specialty ? ` · ${a.specialty}` : ''}
                </p>
                {a.doctor ? <p className="text-xs text-slate-health">Médico(a): {a.doctor}</p> : null}
                {a.location || a.contact ? (
                  <p className="text-xs text-slate-health">
                    {a.location || 'Contato'}
                    {a.contact ? ` · ${a.contact}` : ''}
                  </p>
                ) : null}
                <div className="mt-2">
                  <GoogleCalendarButton compact event={consultaToCalendarEvent(a.raw || a)} />
                </div>
                {confirmId === a.id ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="text-sm font-semibold text-slate-health" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </button>
                    <button type="button" className="text-sm font-semibold text-red-600" onClick={() => remove(a.id)}>
                      Confirmar exclusão
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 min-h-10 text-lg leading-none text-slate-health hover:text-red-600"
                    aria-label="Excluir"
                    onClick={() => setConfirmId(a.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
        </>
      )}

      <Modal
        open={Boolean(quick)}
        title={
          quick === 'doctor' ? 'Novo médico' : quick === 'specialty' ? 'Nova especialidade' : 'Novo local'
        }
        onClose={() => setQuick(null)}
      >
        <form className="grid gap-3" onSubmit={saveQuick}>
          <Field label="Nome" required>
            <TextInput required value={quickValue} onChange={(e) => setQuickValue(e.target.value)} />
          </Field>
          <PrimaryButton type="submit" disabled={quickSaving}>
            {quickSaving ? 'Salvando...' : 'Salvar e selecionar'}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
