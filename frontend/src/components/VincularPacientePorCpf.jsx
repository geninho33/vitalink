import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { isValidCpf, maskCpf, onlyDigits } from '../hooks/useCep';
import { Field, TextInput } from './forms/FormControls';

export async function buscarPacientePorCpf(cpf) {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || !isValidCpf(digits)) return null;
  try {
    const res = await apiRequest(`/pacientes/por-cpf/${digits}`);
    return res.data || null;
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export function PacienteExistenteAviso({ found, checking }) {
  if (checking) {
    return <p className="text-xs text-slate-health">Consultando CPF no cadastro…</p>;
  }
  if (!found) return null;
  return (
    <div className="rounded-xl border border-aqua/30 bg-aqua-soft px-3 py-2 text-sm text-aqua-deep">
      Paciente já cadastrado: <strong>{found.nome}</strong>. Ao salvar, a ficha existente será
      vinculada — nenhum cadastro duplicado será criado.
    </div>
  );
}

export function VincularPacientePorCpf({ onVinculado, hint, responsavelId }) {
  const [cpf, setCpf] = useState('');
  const [found, setFound] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const digits = onlyDigits(cpf);
    setFound(null);
    setMessage('');
    setError('');
    if (digits.length !== 11) return undefined;
    let cancelled = false;
    setChecking(true);
    buscarPacientePorCpf(digits)
      .then((row) => {
        if (!cancelled) setFound(row);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Falha ao consultar CPF.');
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cpf]);

  async function vincular() {
    if (!found?.id) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest(`/pacientes/${found.id}/vincular-responsavel`, {
        method: 'POST',
        body: responsavelId ? { responsavel_id: Number(responsavelId) } : {},
      });
      setMessage(res.message || 'Paciente vinculado.');
      setCpf('');
      setFound(null);
      onVinculado?.(found);
    } catch (err) {
      setError(err.message || 'Não foi possível vincular.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-2 sm:col-span-2">
      <Field label="Vincular paciente existente (CPF)" hint={hint}>
        <TextInput
          value={maskCpf(cpf)}
          onChange={(e) => setCpf(onlyDigits(e.target.value).slice(0, 11))}
          placeholder="000.000.000-00"
          inputMode="numeric"
        />
      </Field>
      {checking ? <p className="text-xs text-slate-health">Consultando…</p> : null}
      {found ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-aqua/30 bg-aqua-soft px-3 py-2 text-sm">
          <span className="text-aqua-deep">
            Encontrado: <strong>{found.nome}</strong>
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={vincular}
            className="min-h-10 rounded-lg bg-aqua px-3 text-xs font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Vinculando…' : 'Vincular a este responsável'}
          </button>
        </div>
      ) : null}
      {cpf.length === 11 && !checking && !found && !error ? (
        <p className="text-xs text-slate-health">Nenhum paciente com este CPF. Cadastre-o na ficha de pacientes.</p>
      ) : null}
      {message ? <p className="text-sm text-aqua-deep">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
