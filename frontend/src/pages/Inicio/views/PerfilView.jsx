import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateBrInput, Field, TextInput, TextSelect, TextTextarea } from '../../../components/forms/FormControls';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { calculateAge } from '../localStore';
import { EmptyState, PageTitle, Panel, PrimaryButton, SecondaryButton } from '../ui';

const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'NI'];

function emptyForm() {
  return {
    nome: '',
    email: '',
    sexo: '',
    data_nascimento: '',
    tipo_sanguineo: '',
    telefone_principal: '',
    alergias: '',
    observacoes: '',
    diagnostico_principal: '',
  };
}

function mapPaciente(p) {
  if (!p) return emptyForm();
  return {
    nome: p.nome || '',
    email: p.email || '',
    sexo: p.sexo || '',
    data_nascimento: p.data_nascimento ? String(p.data_nascimento).slice(0, 10) : '',
    tipo_sanguineo: p.tipo_sanguineo || '',
    telefone_principal: p.telefone_principal || '',
    alergias: p.alergias || '',
    observacoes: p.observacoes || '',
    diagnostico_principal: p.diagnostico_principal || '',
  };
}

export default function PerfilView() {
  const { pacienteId, paciente, reload } = usePacienteAtivo();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fill = useCallback(async () => {
    if (!pacienteId) {
      setForm(emptyForm());
      return;
    }
    try {
      const res = await apiRequest('/me/paciente').catch(() =>
        apiRequest(`/pacientes/${pacienteId}`)
      );
      setForm(mapPaciente(res.data || res));
    } catch {
      setForm(mapPaciente(paciente));
    }
  }, [pacienteId, paciente]);

  useEffect(() => {
    fill();
    setEditing(false);
    setMsg('');
  }, [fill]);

  const age = useMemo(() => calculateAge(form.data_nascimento), [form.data_nascimento]);

  async function handleSave(e) {
    e.preventDefault();
    if (!pacienteId) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await apiRequest('/me/paciente', {
        method: 'PUT',
        body: {
          nome: form.nome,
          email: form.email || null,
          sexo: form.sexo || null,
          data_nascimento: form.data_nascimento,
          tipo_sanguineo: form.tipo_sanguineo || 'NI',
          telefone_principal: form.telefone_principal || null,
          alergias: form.alergias || null,
          observacoes: form.observacoes || null,
          diagnostico_principal: form.diagnostico_principal || null,
        },
      });
      await reload();
      await fill();
      setEditing(false);
      setMsg('Ficha atualizada.');
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (!pacienteId) {
    return (
      <div>
        <PageTitle eyebrow="Dados pessoais" title="Ficha do paciente" />
        <EmptyState>Cadastre um paciente para visualizar a ficha.</EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        eyebrow="Dados pessoais"
        title="Ficha do paciente"
        description="Dados do paciente ativo, carregados automaticamente."
      />

      <Panel>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
          <Field label="Nome completo" required>
            <TextInput
              required
              disabled={!editing}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </Field>
          <Field label="E-mail">
            <TextInput
              type="email"
              disabled={!editing}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Sexo">
            <TextSelect
              disabled={!editing}
              value={form.sexo}
              onChange={(e) => setForm({ ...form, sexo: e.target.value })}
            >
              <option value="">Selecione</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="outro">Outro</option>
              <option value="nao_informado">Não informado</option>
            </TextSelect>
          </Field>
          <Field label="Data de nascimento">
            <DateBrInput
              disabled={!editing}
              value={form.data_nascimento}
              onChange={(data_nascimento) => setForm({ ...form, data_nascimento })}
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
              disabled={!editing}
              value={form.tipo_sanguineo}
              onChange={(e) => setForm({ ...form, tipo_sanguineo: e.target.value })}
            >
              <option value="">Selecione</option>
              {BLOOD.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </TextSelect>
          </Field>
          <Field label="Telefone">
            <TextInput
              disabled={!editing}
              value={form.telefone_principal}
              onChange={(e) => setForm({ ...form, telefone_principal: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Diagnóstico principal">
              <TextInput
                disabled={!editing}
                value={form.diagnostico_principal}
                onChange={(e) => setForm({ ...form, diagnostico_principal: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Alergias">
              <TextTextarea
                rows={2}
                disabled={!editing}
                value={form.alergias}
                onChange={(e) => setForm({ ...form, alergias: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Observações médicas">
              <TextTextarea
                rows={3}
                disabled={!editing}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </Field>
          </div>
          {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}
          {msg ? <p className="sm:col-span-2 text-sm text-aqua-deep">{msg}</p> : null}
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            {editing ? (
              <>
                <PrimaryButton type="submit" disabled={saving} className="sm:flex-1">
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    fill();
                  }}
                >
                  Cancelar
                </SecondaryButton>
              </>
            ) : (
              <PrimaryButton type="button" className="sm:flex-1" onClick={() => setEditing(true)}>
                Editar ficha
              </PrimaryButton>
            )}
          </div>
        </form>
      </Panel>
    </div>
  );
}
