import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Field, TextTextarea } from '../../../components/forms/FormControls';
import { apiRequest } from '../../../services/api';
import { formatDateBr, storageGet, todayKey } from '../localStore';
import { EmptyState, Panel, PrimaryButton } from '../ui';

function isInNextDays(dateStr, days = 7) {
  if (!dateStr) return false;
  const d = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return d >= today && d < end;
}

export default function VistaGeralView() {
  const { usuario } = useAuth();
  const firstName = usuario?.nome?.split(' ')[0] || 'Usuário';
  const [quickText, setQuickText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [taken, setTaken] = useState([]);

  const refreshLocal = useCallback(() => {
    setAppointments(storageGet('appointments', []));
    setMedicines(storageGet('medicines', []));
    setTaken(storageGet(`medicine-taken-${todayKey()}`, []));
  }, []);

  useEffect(() => {
    refreshLocal();
  }, [refreshLocal]);

  const weekAppointments = useMemo(
    () => appointments.filter((a) => isInNextDays(a.date, 7)),
    [appointments]
  );

  async function handleQuickSubmit(e) {
    e.preventDefault();
    const text = quickText.trim();
    if (!text) return;
    setSaving(true);
    setMsg('');
    try {
      const firstLine = text.split('\n')[0].slice(0, 80);
      await apiRequest('/inicio', {
        method: 'POST',
        body: {
          titulo: firstLine || 'Registro rápido',
          descricao: text,
          tipo: 'saude',
          prioridade: 'media',
          status: 'ativo',
        },
      });
      // Espelha também no prontuário local (eventos) para a linha do tempo
      const events = storageGet('health-events', []);
      events.push({
        id: Date.now(),
        createdAt: new Date().toISOString(),
        date: todayKey(),
        type: 'Monitoramento diário',
        description: text,
        doctor: '',
        diagnosis: '',
        exams: '',
        documents: [],
      });
      localStorage.setItem('vitalink-health-events', JSON.stringify(events));
      setQuickText('');
      setMsg('Registrado em Eventos.');
    } catch (err) {
      setMsg(err.message || 'Falha ao registrar.');
    } finally {
      setSaving(false);
    }
  }

  function toggleTaken(id) {
    const key = `medicine-taken-${todayKey()}`;
    const current = storageGet(key, []).map(String);
    const sid = String(id);
    const next = current.includes(sid)
      ? current.filter((x) => x !== sid)
      : [...new Set([...current, sid])];
    localStorage.setItem(`vitalink-${key}`, JSON.stringify(next));
    setTaken(next);
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-slate-health">
          Olá, <span className="font-semibold text-ink">{firstName}</span>
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Como está sua saúde hoje?
        </h1>
      </div>

      <Panel className="mb-4">
        <form className="grid gap-3" onSubmit={handleQuickSubmit}>
          <Field label="Registre como você está hoje" required>
            <TextTextarea
              rows={4}
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Ex.: Pressão 12/8 às 8h; temperatura 36,5 °C; dor de cabeça leve."
              required
            />
          </Field>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Registrando...' : 'Registrar em Eventos'}
          </PrimaryButton>
          {msg ? <p className="text-sm text-aqua-deep">{msg}</p> : null}
        </form>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-aqua-soft text-aqua-deep">▣</span>
            <small className="text-xs font-bold uppercase tracking-wider text-slate-health">
              Compromissos da semana
            </small>
          </div>
          {weekAppointments.length === 0 ? (
            <p className="text-sm text-slate-health">Nenhum compromisso nesta semana.</p>
          ) : (
            <ul className="space-y-2">
              {weekAppointments.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    to="/inicio/agenda"
                    className="block rounded-xl bg-[#f4fbfa] px-3 py-2 text-sm hover:bg-aqua-soft"
                  >
                    <strong className="text-ink">{item.title}</strong>
                    <span className="mt-0.5 block text-xs text-slate-health">
                      {formatDateBr(item.date, item.time)}
                      {item.specialty ? ` · ${item.specialty}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff1ed] text-[#e07a5f]">✦</span>
            <small className="text-xs font-bold uppercase tracking-wider text-slate-health">
              Medicamentos de hoje
            </small>
          </div>
          {medicines.length === 0 ? (
            <p className="text-sm text-slate-health">Nenhum medicamento cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {medicines.map((m) => {
                const checked = taken.map(String).includes(String(m.id));
                return (
                  <li key={m.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                        checked ? 'bg-mint-soft/60 opacity-80' : 'bg-[#f4fbfa]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleTaken(m.id)}
                      />
                      <span>
                        <strong className="text-ink">{m.name}</strong>
                        <small className="mt-0.5 block text-xs text-slate-health">
                          {m.period || 'Horário não informado'}
                          {m.dosage ? ` · ${m.dosage}` : ''}
                        </small>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {medicines.length === 0 ? <EmptyState>Cadastre em Meds</EmptyState> : null}
        </Panel>
      </div>
    </div>
  );
}
