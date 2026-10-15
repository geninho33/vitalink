import { useEffect, useState } from 'react';
import { apiRequest } from '../../../services/api';
import { origemLabel } from './SinaisGrafico';

const inp = 'h-11 w-full rounded-xl border border-[#cfe0df] px-3 text-center text-base';

function vazio(f) {
  const s = (v) => (v == null ? '' : String(Number(v)).replace('.', ','));
  return {
    valor_min: s(f?.valor_min),
    valor_max: s(f?.valor_max),
    sistolica_min: s(f?.sistolica_min),
    sistolica_max: s(f?.sistolica_max),
    diastolica_min: s(f?.diastolica_min),
    diastolica_max: s(f?.diastolica_max),
  };
}

export default function FaixasPanel({ pacienteId, tipo, label, unidade, decimal, faixa, onChange }) {
  const [form, setForm] = useState(vazio(faixa));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setForm(vazio(faixa));
    setMsg('');
    setErr('');
  }, [faixa, tipo]);

  const campo = (k, ph) => (
    <input
      aria-label={ph}
      placeholder={ph}
      inputMode={decimal ? 'decimal' : 'numeric'}
      className={inp}
      value={form[k]}
      onChange={(e) => setForm({ ...form, [k]: e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, '').slice(0, 6) })}
    />
  );

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const body = { paciente_id: Number(pacienteId), tipo };
      const keys = tipo === 'pressao'
        ? ['sistolica_min', 'sistolica_max', 'diastolica_min', 'diastolica_max']
        : ['valor_min', 'valor_max'];
      for (const k of keys) body[k] = form[k] === '' ? null : form[k];
      await apiRequest('/inicio/sinais-vitais/faixas', { method: 'PUT', body });
      setMsg('Faixa salva.');
      onChange?.();
    } catch (e2) {
      setErr(e2.message || 'Não foi possível salvar a faixa.');
    } finally {
      setSaving(false);
    }
  }

  async function remover() {
    if (!window.confirm(`Remover a faixa de ${label.toLowerCase()}?`)) return;
    setErr('');
    try {
      await apiRequest('/inicio/sinais-vitais/faixas', { method: 'DELETE', query: { paciente_id: pacienteId, tipo } });
      setMsg('Faixa removida.');
      onChange?.();
    } catch (e2) {
      setErr(e2.message || 'Não foi possível remover.');
    }
  }

  return (
    <form onSubmit={salvar} className="grid gap-3">
      <p className="text-sm font-bold text-ink">
        Faixa de {label.toLowerCase()} <span className="font-medium text-slate-health">({unidade})</span>
      </p>
      <p className="rounded-xl border border-[#d0e4ef] bg-[#f8fcfc] px-3 py-2 text-xs text-ink">
        Faixas definidas pela família ou pelo médico. O VitaLink não faz diagnóstico. Combine os valores
        com o médico que acompanha o paciente. Em caso de sintomas, procure atendimento ou ligue 192.
      </p>
      {tipo === 'pressao' ? (
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-health">
          <span>Máxima (sistólica): de</span><span>até</span>
          {campo('sistolica_min', 'mín.')}{campo('sistolica_max', 'máx.')}
          <span>Mínima (diastólica): de</span><span>até</span>
          {campo('diastolica_min', 'mín.')}{campo('diastolica_max', 'máx.')}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-health">
          <span>De</span><span>Até</span>
          {campo('valor_min', 'mín.')}{campo('valor_max', 'máx.')}
        </div>
      )}
      <p className="text-xs text-slate-health">Pode deixar um dos lados em branco.</p>
      {faixa ? (
        <p className="text-xs text-slate-health">
          Definida por {origemLabel(faixa)} em {new Date(faixa.updated_at).toLocaleString('pt-BR')}.
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-aqua-deep">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="h-11 rounded-xl bg-aqua px-5 font-semibold text-white disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar faixa'}
        </button>
        {faixa ? (
          <button type="button" onClick={remover} className="h-11 rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink">
            Remover faixa
          </button>
        ) : null}
      </div>
    </form>
  );
}
