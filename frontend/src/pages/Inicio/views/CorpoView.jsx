import { useCallback, useEffect, useMemo, useState } from 'react';
import { Field, Modal, TextInput, TextTextarea } from '../../../components/forms/FormControls';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest } from '../../../services/api';
import { EmptyState, PageTitle, Panel, PrimaryButton, SecondaryButton } from '../ui';

function isMale(sexo) {
  const s = String(sexo || '').toLowerCase();
  return s === 'm' || s === 'masculino' || s === 'male';
}

export default function CorpoView() {
  const { pacienteId, paciente } = usePacienteAtivo();
  const [marcas, setMarcas] = useState([]);
  const [pending, setPending] = useState(null);
  const [form, setForm] = useState({ titulo: '', descricao: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const male = isMale(paciente?.sexo);
  const bodySrc = male
    ? `${import.meta.env.BASE_URL}Sexo%20Masculino.png`
    : `${import.meta.env.BASE_URL}Sexo%20Feminino.png`;

  const load = useCallback(async () => {
    if (!pacienteId) {
      setMarcas([]);
      return;
    }
    try {
      const res = await apiRequest('/inicio/corpo-marcas', {
        query: { paciente_id: pacienteId },
      });
      setMarcas(res.data || []);
    } catch {
      setMarcas([]);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleMapClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos_x = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const pos_y = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
    setPending({ pos_x, pos_y });
    setForm({ titulo: '', descricao: '' });
    setError('');
  }

  async function saveMarca(e) {
    e.preventDefault();
    if (!pending || !pacienteId) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest('/inicio/corpo-marcas', {
        method: 'POST',
        body: {
          paciente_id: Number(pacienteId),
          pos_x: pending.pos_x,
          pos_y: pending.pos_y,
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim(),
        },
      });
      setPending(null);
      await load();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a marca.');
    } finally {
      setSaving(false);
    }
  }

  async function removeMarca(id) {
    try {
      await apiRequest(`/inicio/corpo-marcas/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      window.alert(err.message || 'Não foi possível excluir.');
    }
  }

  const mapped = useMemo(() => marcas, [marcas]);

  return (
    <div>
      <PageTitle
        eyebrow="Visão geral"
        title="Mapa corporal"
        description="Toque no desenho para marcar a região afetada e vincular o sintoma ou a doença."
      />

      <Panel>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleMapClick}
              className="relative w-full max-w-[220px] cursor-crosshair overflow-hidden rounded-2xl border border-[#cfe0df] bg-white p-0"
              aria-label="Mapa corporal — clique para marcar"
            >
              <img
                src={bodySrc}
                alt={male ? 'Mapa corporal masculino' : 'Mapa corporal feminino'}
                className="pointer-events-none mx-auto block h-auto w-full object-contain object-top"
              />
              {mapped.map((item) => (
                <span
                  key={item.id}
                  title={item.titulo}
                  className="pointer-events-none absolute z-10 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-vita text-[10px] font-bold text-white shadow"
                  style={{ top: `${item.pos_y}%`, left: `${item.pos_x}%` }}
                >
                  ●
                </span>
              ))}
            </button>
            <span className="mt-2 text-xs text-slate-health">
              Mapa {male ? 'masculino' : 'feminino'} · vista frontal
            </span>
          </div>

          <div>
            {mapped.length === 0 ? (
              <EmptyState>Nenhuma região marcada. Toque no corpo para registrar um sintoma.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {mapped.map((item) => (
                  <li key={item.id} className="rounded-xl border border-[#e2eeee] bg-[#f8fcfc] px-3 py-2">
                    <strong className="text-ink">{item.titulo}</strong>
                    {item.descricao ? (
                      <p className="text-sm text-slate-health">{item.descricao}</p>
                    ) : null}
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-red-600"
                      onClick={() => removeMarca(item.id)}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>

      <Modal
        open={Boolean(pending)}
        title="Marcar região afetada"
        onClose={() => setPending(null)}
      >
        <form className="grid gap-3" onSubmit={saveMarca}>
          <Field label="Doença ou sintoma" required>
            <TextInput
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Dor lombar, hipertensão, ferida"
            />
          </Field>
          <Field label="Descrição">
            <TextTextarea
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Observações sobre o local e a intensidade"
            />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <PrimaryButton type="submit" disabled={saving} className="flex-1">
              {saving ? 'Salvando...' : 'Vincular ao paciente'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setPending(null)}>
              Cancelar
            </SecondaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
