import { useEffect, useState } from 'react';
import { Field, TextInput } from '../../../components/forms/FormControls';
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

  useEffect(() => {
    setList(
      storageGet('appointments', []).sort((a, b) =>
        `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)
      )
    );
  }, []);

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
    const next = [
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
    ];
    persist(next);
    setForm(empty());
  }

  function remove(id) {
    persist(storageGet('appointments', []).filter((a) => a.id !== id));
    setConfirmId(null);
  }

  return (
    <div>
      <PageTitle
        eyebrow="Planejamento"
        title="Agenda médica"
        description="Tenha seus cuidados sempre à vista."
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
          <Field label="Especialidade">
            <TextInput
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="Ex.: Cardiologia"
            />
          </Field>
          <Field label="Nome do médico">
            <TextInput
              value={form.doctor}
              onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              placeholder="Ex.: Dra. Ana Silva"
            />
          </Field>
          <Field label="Data" required>
            <TextInput
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label="Horário">
            <TextInput
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </Field>
          <Field label="Local">
            <TextInput
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ex.: Clínica Vita"
            />
          </Field>
          <Field label="Contato do local">
            <TextInput
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Telefone, WhatsApp ou e-mail"
            />
          </Field>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" className="w-full">
              Adicionar à agenda
            </PrimaryButton>
          </div>
        </form>
      </Panel>

      {list.length === 0 ? (
        <EmptyState>Nenhuma consulta ou exame cadastrado.</EmptyState>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <article
              key={a.id}
              className="flex gap-3 rounded-2xl border border-[#d7e8e7] bg-white p-4"
            >
              <div className="shrink-0 rounded-xl bg-aqua-soft px-3 py-2 text-center text-xs font-semibold text-aqua-deep">
                {formatDateBr(a.date).replace(' de ', '\n')}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-ink">{a.title}</strong>
                <p className="text-sm text-slate-health">
                  {a.time || 'Horário a definir'}
                  {a.specialty ? ` · ${a.specialty}` : ''}
                </p>
                {a.doctor ? (
                  <p className="text-xs text-slate-health">Médico(a): {a.doctor}</p>
                ) : null}
                {a.location || a.contact ? (
                  <p className="text-xs text-slate-health">
                    {a.location || 'Contato'}
                    {a.contact ? ` · ${a.contact}` : ''}
                  </p>
                ) : null}
                {confirmId === a.id ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="text-sm font-semibold text-slate-health"
                      onClick={() => setConfirmId(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-600"
                      onClick={() => remove(a.id)}
                    >
                      Confirmar exclusão
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 text-lg leading-none text-slate-health hover:text-red-600"
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
    </div>
  );
}
