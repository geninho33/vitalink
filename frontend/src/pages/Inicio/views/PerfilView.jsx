import { useEffect, useMemo, useState } from 'react';
import { DateBrInput, Field, TextInput, TextSelect, TextTextarea } from '../../../components/forms/FormControls';
import { calculateAge, storageGet, storageSet } from '../localStore';
import { PageTitle, Panel, PrimaryButton, SecondaryButton } from '../ui';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CFM_SPECIALTIES = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia e metabologia',
  'Geriatria',
  'Neurologia',
  'Ortopedia e traumatologia',
  'Psiquiatria',
  'Urologia',
  'Clínica médica',
  'Oftalmologia',
  'Pneumologia',
  'Reumatologia',
];

const emptyProfile = () => ({
  name: '',
  email: '',
  gender: '',
  birthDate: '',
  blood: '',
  notes: '',
  specialties: [],
  specialtyDetails: [],
});

export default function PerfilView() {
  const [form, setForm] = useState(emptyProfile);
  const [specialtySelect, setSpecialtySelect] = useState('');
  const [details, setDetails] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const saved = storageGet('profile', {});
    setForm({ ...emptyProfile(), ...saved });
    const list = Array.isArray(saved.specialtyDetails)
      ? saved.specialtyDetails
      : (saved.specialties || []).map((name) => ({ name, doctor: '', clinic: '', contact: '' }));
    setDetails(list);
  }, []);

  const age = useMemo(() => calculateAge(form.birthDate), [form.birthDate]);

  function addSpecialty() {
    if (!specialtySelect || details.some((d) => d.name === specialtySelect)) return;
    setDetails((prev) => [{ name: specialtySelect, doctor: '', clinic: '', contact: '' }, ...prev]);
    setSpecialtySelect('');
  }

  function removeSpecialty(name) {
    setDetails((prev) => prev.filter((d) => d.name !== name));
  }

  function updateDetail(name, field, value) {
    setDetails((prev) =>
      prev.map((d) => (d.name === name ? { ...d, [field]: value } : d))
    );
  }

  function handleSave(e) {
    e.preventDefault();
    const payload = {
      ...form,
      specialties: details.map((d) => d.name),
      specialtyDetails: details,
    };
    storageSet('profile', payload);
    setMsg('Informações salvas neste dispositivo.');
  }

  return (
    <div>
      <PageTitle
        eyebrow="Dados pessoais"
        title="Ficha do paciente"
        description="Informações importantes para o seu cuidado."
      />

      <Panel>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
          <Field label="Nome completo">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome completo"
            />
          </Field>
          <Field label="E-mail">
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
            />
          </Field>
          <Field label="Sexo">
            <TextSelect
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Selecione</option>
              <option value="Feminino">Feminino</option>
              <option value="Masculino">Masculino</option>
            </TextSelect>
          </Field>
          <Field label="Data de nascimento">
            <DateBrInput
              value={form.birthDate}
              onChange={(birthDate) => setForm({ ...form, birthDate })}
            />
          </Field>
          <div className="rounded-xl bg-[#f4fbfa] px-3 py-2.5 sm:col-span-2">
            <span className="text-xs text-slate-health">Idade calculada</span>
            <p className="font-semibold text-ink">
              {age === null ? 'Não informada' : `${age} anos`}
            </p>
          </div>
          <Field label="Tipo sanguíneo">
            <TextSelect
              value={form.blood}
              onChange={(e) => setForm({ ...form, blood: e.target.value })}
            >
              <option value="">Selecione</option>
              {BLOOD.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </TextSelect>
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-semibold text-ink">Especialidades em acompanhamento</p>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <TextSelect
                value={specialtySelect}
                onChange={(e) => setSpecialtySelect(e.target.value)}
              >
                <option value="">Selecione uma especialidade</option>
                {CFM_SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </TextSelect>
              <SecondaryButton type="button" onClick={addSpecialty}>
                Adicionar
              </SecondaryButton>
            </div>
            <div className="space-y-3">
              {details.length === 0 ? (
                <p className="text-sm text-slate-health">Nenhuma especialidade selecionada.</p>
              ) : (
                details.map((item) => (
                  <article
                    key={item.name}
                    className="rounded-xl border border-[#e2eeee] bg-[#f8fcfc] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <strong className="text-ink">{item.name}</strong>
                      <button
                        type="button"
                        className="text-lg text-slate-health hover:text-red-600"
                        onClick={() => removeSpecialty(item.name)}
                        aria-label={`Remover ${item.name}`}
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Nome do médico">
                        <TextInput
                          value={item.doctor || ''}
                          onChange={(e) => updateDetail(item.name, 'doctor', e.target.value)}
                          placeholder="Ex.: Dra. Ana Silva"
                        />
                      </Field>
                      <Field label="Clínica / local">
                        <TextInput
                          value={item.clinic || ''}
                          onChange={(e) => updateDetail(item.name, 'clinic', e.target.value)}
                          placeholder="Ex.: Clínica Vita"
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Contato">
                          <TextInput
                            value={item.contact || ''}
                            onChange={(e) => updateDetail(item.name, 'contact', e.target.value)}
                            placeholder="Telefone, WhatsApp ou e-mail"
                          />
                        </Field>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Field label="Observações médicas">
              <TextTextarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex.: Alérgico a dipirona; condições, cuidados e outras informações relevantes."
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <PrimaryButton type="submit" className="w-full">
              Salvar informações
            </PrimaryButton>
            {msg ? <p className="mt-2 text-sm text-aqua-deep">{msg}</p> : null}
          </div>
        </form>
      </Panel>
    </div>
  );
}
