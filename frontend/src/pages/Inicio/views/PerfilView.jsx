import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateBrInput, Field, TextInput, TextSelect, TextTextarea } from '../../../components/forms/FormControls';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { toIsoDate } from '../../../utils/validation';
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
    data_nascimento: toIsoDate(p.data_nascimento),
    tipo_sanguineo: p.tipo_sanguineo || '',
    telefone_principal: p.telefone_principal || '',
    alergias: p.alergias || '',
    observacoes: p.observacoes || '',
    diagnostico_principal: p.diagnostico_principal || '',
  };
}

function unwrapPaciente(res) {
  if (!res) return null;
  const row = res.data && typeof res.data === 'object' ? res.data : res;
  if (row && (row.id != null || row.nome)) return row;
  return null;
}

export default function PerfilView() {
  const { pacienteId, paciente, reload } = usePacienteAtivo();
  const snapshotRef = useRef(null);
  const [form, setForm] = useState(() => mapPaciente(paciente));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(Boolean(pacienteId));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadFicha = useCallback(async () => {
    if (!pacienteId) {
      setForm(emptyForm());
      return null;
    }
    try {
      const res = await apiRequest(`/pacientes/${pacienteId}`);
      return unwrapPaciente(res);
    } catch (err) {
      if (err?.status !== 403) throw err;
      const fallback = await apiRequest('/me/paciente', {
        query: { paciente_id: pacienteId },
      });
      return unwrapPaciente(fallback);
    }
  }, [pacienteId]);

  useEffect(() => {
    setEditing(false);
    setMsg('');
    setError('');
    snapshotRef.current = null;
    setForm(mapPaciente(paciente));
  }, [pacienteId]);

  useEffect(() => {
    let cancelled = false;
    if (!pacienteId) {
      setForm(emptyForm());
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    (async () => {
      try {
        const row = await loadFicha();
        if (!cancelled && row) setForm(mapPaciente(row));
      } catch {
        if (!cancelled) {
          setError('Não foi possível carregar a ficha do paciente.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pacienteId, loadFicha]);

  const age = useMemo(() => calculateAge(form.data_nascimento), [form.data_nascimento]);

  function startEdit() {
    snapshotRef.current = { ...form };
    setError('');
    setMsg('');
    setEditing(true);
  }

  function cancelEdit() {
    if (snapshotRef.current) setForm(snapshotRef.current);
    snapshotRef.current = null;
    setEditing(false);
    setError('');
    setMsg('');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!pacienteId || saving) return;

    const dataNascimento = toIsoDate(form.data_nascimento);
    if (!form.nome.trim()) {
      setError('Informe o nome completo.');
      return;
    }
    if (!dataNascimento) {
      setError('Informe a data de nascimento.');
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      email: form.email || null,
      sexo: form.sexo || null,
      data_nascimento: dataNascimento,
      tipo_sanguineo: form.tipo_sanguineo || 'NI',
      telefone_principal: form.telefone_principal || null,
      alergias: form.alergias || null,
      observacoes: form.observacoes || null,
      diagnostico_principal: form.diagnostico_principal || null,
    };

    setSaving(true);
    setError('');
    setMsg('');
    try {
      let res;
      try {
        res = await apiRequest(`/pacientes/${pacienteId}`, { method: 'PUT', body: payload });
      } catch (err) {
        if (err?.status !== 403) throw err;
        res = await apiRequest('/me/paciente', {
          method: 'PUT',
          query: { paciente_id: pacienteId },
          body: { ...payload, paciente_id: Number(pacienteId) },
        });
      }
      const saved = unwrapPaciente(res);
      if (saved) setForm(mapPaciente(saved));
      snapshotRef.current = null;
      setEditing(false);
      setMsg('Ficha atualizada com sucesso.');
      await reload();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a ficha.');
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
        description="Dados do paciente ativo. Clique em Editar ficha para desbloquear os campos."
      />

      <Panel>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-health">
            {loading ? 'Carregando ficha…' : editing ? 'Modo edição — altere os campos e salve.' : 'Modo leitura'}
          </p>
          {!editing ? (
            <PrimaryButton type="button" disabled={loading} onClick={startEdit}>
              Editar ficha
            </PrimaryButton>
          ) : null}
        </div>

        <form
          className={`grid gap-3 sm:grid-cols-2 ${
            editing
              ? '[&_input]:border-aqua [&_input]:bg-[#fffdf4] [&_input]:ring-2 [&_input]:ring-aqua/20 [&_select]:border-aqua [&_select]:bg-[#fffdf4] [&_select]:ring-2 [&_select]:ring-aqua/20 [&_textarea]:border-aqua [&_textarea]:bg-[#fffdf4] [&_textarea]:ring-2 [&_textarea]:ring-aqua/20'
              : '[&_input]:bg-[#eef2f3] [&_select]:bg-[#eef2f3] [&_textarea]:bg-[#eef2f3]'
          }`}
          onSubmit={handleSave}
        >
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
          <Field label="Data de nascimento" required>
            <DateBrInput
              required
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
          {error ? (
            <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {msg ? (
            <p className="sm:col-span-2 rounded-xl border border-aqua/30 bg-aqua-soft px-3 py-2 text-sm text-aqua-deep">
              {msg}
            </p>
          ) : null}
          {editing ? (
            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
              <PrimaryButton type="submit" disabled={saving} className="sm:flex-1">
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </PrimaryButton>
              <SecondaryButton type="button" disabled={saving} onClick={cancelEdit}>
                Cancelar
              </SecondaryButton>
            </div>
          ) : null}
        </form>
      </Panel>
    </div>
  );
}
