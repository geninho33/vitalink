import { useEffect, useMemo, useState } from 'react';
import { ComboCreate, DateBrInput, Field, Modal, TextInput } from '../../../components/forms/FormControls';
import GoogleCalendarButton from '../../../components/GoogleCalendarButton';
import { consultaToCalendarEvent } from '../../../utils/googleCalendar';
import { apiRequest } from '../../../services/api';
import { addCatalogItem, loadCatalog, optionize } from '../catalog';
import { formatDateBr, storageGet, storageSet } from '../localStore';
import { EmptyState, PageTitle, Panel, PrimaryButton } from '../ui';

const empty = () => ({
  title: '',
  specialty: '',
  doctor: '',
  date: '',
  time: '',
  location: '',
  contact: '',
});

export default function AgendaView() {
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [medicos, setMedicos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [especialidades, setEspecialidades] = useState(loadCatalog('especialidades'));
  const [quick, setQuick] = useState(null);
  const [quickValue, setQuickValue] = useState('');

  useEffect(() => {
    setList(
      storageGet('appointments', []).sort((a, b) =>
        `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
      )
    );
    apiRequest('/medicos', { query: { pageSize: 200, status: 'ativo' } })
      .then((res) => setMedicos(res.data || []))
      .catch(() => setMedicos([]));
    apiRequest('/hospitais', { query: { pageSize: 200, status: 'ativo' } })
      .then((res) => setLocais(res.data || []))
      .catch(() => setLocais([]));
  }, []);

  const doctorOptions = useMemo(() => {
    const api = optionize(medicos, 'nome', 'nome');
    return [...api, ...loadCatalog('medicos-locais')];
  }, [medicos]);

  const specialtyOptions = useMemo(() => {
    const fromMedicos = [...new Set(medicos.map((m) => m.especialidade).filter(Boolean))].map((s) => ({
      value: s,
      label: s,
    }));
    return [...fromMedicos, ...especialidades];
  }, [medicos, especialidades]);

  const locationOptions = useMemo(() => {
    const api = optionize(locais, 'nome_fantasia', 'nome_fantasia');
    return [...api, ...loadCatalog('locais')];
  }, [locais]);

  function persist(next) {
    storageSet('appointments', next);
    setList(
      [...next].sort((a, b) =>
        `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
      )
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    persist([
      ...storageGet('appointments', []),
      {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        title: form.title.trim(),
        specialty: form.specialty.trim(),
        doctor: form.doctor.trim(),
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        contact: form.contact.trim(),
      },
    ]);
    setForm(empty());
  }

  function remove(id) {
    persist(storageGet('appointments', []).filter((a) => a.id !== id));
    setConfirmId(null);
  }

  function openQuick(kind) {
    setQuick(kind);
    setQuickValue('');
  }

  function saveQuick(e) {
    e.preventDefault();
    const value = quickValue.trim();
    if (!value) return;
    if (quick === 'doctor') {
      addCatalogItem('medicos-locais', { value, label: value });
      setForm((f) => ({ ...f, doctor: value }));
    }
    if (quick === 'specialty') {
      const next = addCatalogItem('especialidades', { value, label: value });
      setEspecialidades(next);
      setForm((f) => ({ ...f, specialty: value }));
    }
    if (quick === 'location') {
      addCatalogItem('locais', { value, label: value });
      setForm((f) => ({ ...f, location: value }));
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
          <ComboCreate
            label="Especialidade"
            value={form.specialty}
            onChange={(specialty) => setForm({ ...form, specialty })}
            options={specialtyOptions}
            placeholder="Selecione"
            onCreate={() => openQuick('specialty')}
          />
          <ComboCreate
            label="Médico"
            value={form.doctor}
            onChange={(doctor) => setForm({ ...form, doctor })}
            options={doctorOptions}
            placeholder="Selecione"
            onCreate={() => openQuick('doctor')}
          />
          <Field label="Data" required>
            <DateBrInput required value={form.date} onChange={(date) => setForm({ ...form, date })} />
          </Field>
          <Field label="Horário">
            <TextInput type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
          <ComboCreate
            label="Local"
            value={form.location}
            onChange={(location) => setForm({ ...form, location })}
            options={locationOptions}
            placeholder="Selecione"
            onCreate={() => openQuick('location')}
          />
          <Field label="Contato do local">
            <TextInput
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Telefone, WhatsApp ou e-mail"
            />
          </Field>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" className="w-full">
              Adicionar especialista / consulta
            </PrimaryButton>
          </div>
        </form>
      </Panel>

      {list.length === 0 ? (
        <EmptyState>Nenhuma consulta ou exame cadastrado.</EmptyState>
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
                  <GoogleCalendarButton compact event={consultaToCalendarEvent(a)} />
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
          <PrimaryButton type="submit">Salvar e selecionar</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
