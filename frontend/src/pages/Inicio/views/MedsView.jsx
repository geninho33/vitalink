import { useEffect, useState } from 'react';
import { Field, TextInput, TextSelect } from '../../../components/forms/FormControls';
import { storageGet, storageSet } from '../localStore';
import { EmptyState, PageTitle, Panel, PrimaryButton, SecondaryButton } from '../ui';

const empty = () => ({
  period: 'Manhã',
  name: '',
  dosage: '',
  quantity: '',
  stockQty: '',
  dailyUse: '',
  stockDate: '',
  purchaseLead: '7',
  purpose: '',
  doctor: '',
});

function getInventoryStatus(medicine) {
  const stock = Number(medicine.stockQty);
  const daily = Number(medicine.dailyUse);
  if (
    medicine.stockQty === '' ||
    medicine.stockQty === undefined ||
    !Number.isFinite(stock) ||
    !Number.isFinite(daily) ||
    stock < 0 ||
    daily <= 0
  ) {
    return null;
  }
  const start = medicine.stockDate
    ? new Date(`${medicine.stockDate}T12:00:00`)
    : new Date();
  const days = Math.ceil(stock / daily);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const buy = new Date(end);
  buy.setDate(buy.getDate() - Number(medicine.purchaseLead ?? 7));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(week.getDate() + 7);
  const status = buy <= today ? 'Comprar agora' : buy <= week ? 'Comprar esta semana' : 'Em dia';
  return { end, buy, status, stock, daily };
}

function fmt(date) {
  return date ? date.toLocaleDateString('pt-BR') : '—';
}

export default function MedsView() {
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  function refresh() {
    setList(storageGet('medicines', []));
  }

  useEffect(() => {
    refresh();
  }, []);

  function persist(next) {
    storageSet('medicines', next);
    setList(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const next = [
      ...storageGet('medicines', []),
      {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        ...form,
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        quantity: form.quantity.trim(),
        purpose: form.purpose.trim(),
        doctor: form.doctor.trim(),
      },
    ];
    persist(next);
    setForm(empty());
  }

  function updateField(id, field, value) {
    const next = storageGet('medicines', []).map((m) =>
      String(m.id) === String(id) ? { ...m, [field]: value } : m
    );
    persist(next);
  }

  function remove(id) {
    persist(storageGet('medicines', []).filter((m) => m.id !== id));
    setConfirmId(null);
  }

  function printShopping() {
    const week = storageGet('medicines', []).filter((m) => {
      const inv = getInventoryStatus(m);
      return inv && inv.status !== 'Em dia';
    });
    const rows = week.length
      ? week
          .map((m) => {
            const inv = getInventoryStatus(m);
            return `<tr><td>${m.name}</td><td>${fmt(inv.buy)}</td><td>${inv.stock} un.</td><td>${inv.daily} un./dia</td></tr>`;
          })
          .join('')
      : '<tr><td colspan="4">Nenhum medicamento precisa ser comprado nesta semana.</td></tr>';
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.document.write(
      `<!doctype html><html lang="pt-BR"><head><title>VitaLink - Lista de compras</title><style>body{font-family:Arial,sans-serif;padding:32px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #cfe0e0}th{background:#e7f7f5}</style></head><body><h1>VitaLink · Compras da semana</h1><table><thead><tr><th>Medicamento</th><th>Data para compra</th><th>Estoque</th><th>Consumo</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    );
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div>
      <PageTitle
        eyebrow="Rotina"
        title="Medicamentos"
        description="Controle os medicamentos, doses e responsáveis pela prescrição."
      />

      <Panel className="mb-5">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Field label="Período">
            <TextSelect
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            >
              <option>Manhã</option>
              <option>Tarde</option>
              <option>Noite</option>
              <option>Conforme necessário</option>
            </TextSelect>
          </Field>
          <div className="sm:col-span-2 sm:col-start-1">
            <Field label="Medicamento" required>
              <TextInput
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do medicamento"
              />
            </Field>
          </div>
          <Field label="Dosagem">
            <TextInput
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              placeholder="Ex.: 500 mg"
            />
          </Field>
          <Field label="Quantidade por dose">
            <TextInput
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="Ex.: 1 comprimido"
            />
          </Field>
          <Field label="Estoque disponível">
            <TextInput
              type="number"
              min="0"
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
            />
          </Field>
          <Field label="Consumo por dia">
            <TextInput
              type="number"
              min="0.25"
              step="0.25"
              value={form.dailyUse}
              onChange={(e) => setForm({ ...form, dailyUse: e.target.value })}
            />
          </Field>
          <Field label="Data do estoque">
            <TextInput
              type="date"
              value={form.stockDate}
              onChange={(e) => setForm({ ...form, stockDate: e.target.value })}
            />
          </Field>
          <Field label="Antecedência para compra (dias)">
            <TextInput
              type="number"
              min="0"
              value={form.purchaseLead}
              onChange={(e) => setForm({ ...form, purchaseLead: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Indicação">
              <TextInput
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Ex.: Controle da pressão"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Médico(a)">
              <TextInput
                value={form.doctor}
                onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                placeholder="Nome do profissional"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" className="w-full">
              Adicionar medicamento
            </PrimaryButton>
          </div>
        </form>
      </Panel>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SecondaryButton type="button" onClick={printShopping}>
          Imprimir compras da semana
        </SecondaryButton>
        <span className="text-xs text-slate-health">
          Itens com compra prevista para os próximos 7 dias.
        </span>
      </div>

      {list.length === 0 ? (
        <EmptyState>Nenhum medicamento cadastrado.</EmptyState>
      ) : (
        <div className="space-y-3 md:hidden">
          {list.map((m) => {
            const inv = getInventoryStatus(m);
            return (
              <article key={m.id} className="rounded-2xl border border-[#d7e8e7] bg-white p-4">
                <span className="rounded-full bg-aqua-soft px-2 py-0.5 text-[11px] font-bold text-aqua-deep">
                  {m.period}
                </span>
                <strong className="mt-2 block text-ink">{m.name}</strong>
                <p className="text-sm text-slate-health">
                  {m.dosage || '—'} · {m.quantity || '—'}
                </p>
                <p className="text-xs text-slate-health">{m.purpose || 'Sem indicação'}</p>
                {inv ? (
                  <p className="mt-2 text-xs font-semibold text-aqua-deep">{inv.status}</p>
                ) : null}
                {confirmId === m.id ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="text-sm" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-600"
                      onClick={() => remove(m.id)}
                    >
                      Confirmar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-red-600"
                    onClick={() => setConfirmId(m.id)}
                  >
                    Excluir
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {list.length > 0 ? (
        <div className="hidden overflow-x-auto rounded-2xl border border-[#e2eeee] md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#eaf7f6] text-xs uppercase text-aqua-deep">
              <tr>
                <th className="px-3 py-3">Período</th>
                <th className="px-3 py-3">Medicamento</th>
                <th className="px-3 py-3">Dosagem</th>
                <th className="px-3 py-3">Estoque</th>
                <th className="px-3 py-3">Consumo/dia</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const inv = getInventoryStatus(m);
                return (
                  <tr key={m.id} className="border-t border-[#e8f1f0]">
                    <td className="px-3 py-2">{m.period}</td>
                    <td className="px-3 py-2 font-semibold">{m.name}</td>
                    <td className="px-3 py-2">{m.dosage || '—'}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className="w-20 rounded-lg border border-[#cfe0df] px-2 py-1"
                        value={m.stockQty ?? ''}
                        onChange={(e) => updateField(m.id, 'stockQty', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        className="w-20 rounded-lg border border-[#cfe0df] px-2 py-1"
                        value={m.dailyUse ?? ''}
                        onChange={(e) => updateField(m.id, 'dailyUse', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold">
                      {inv ? inv.status : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {confirmId === m.id ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600"
                          onClick={() => remove(m.id)}
                        >
                          Confirmar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-lg text-slate-health"
                          onClick={() => setConfirmId(m.id)}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
