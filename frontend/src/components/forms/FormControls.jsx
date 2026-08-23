import { useEffect, useState } from 'react';
import { fetchAddressByCep, maskCep, onlyDigits } from '../../hooks/useCep';
import { resolveUploadUrl } from '../../services/api';
import { formatDateBr, maskDateBr, parseDateBr, maskMoneyBr, parseMoneyBr } from '../../utils/validation';

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

/** Abas padrão para formulários de cadastro (Dados Gerais / Endereço / …). */
export function FormTabs({ tabs, active, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist">
      {tabs.map((tab) => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`min-h-10 flex-1 rounded-xl px-3 text-sm font-semibold transition sm:flex-none sm:px-4 ${
              isActive
                ? 'bg-aqua text-white shadow-sm'
                : 'border border-[#d7e8e7] text-ink hover:bg-aqua-soft/60'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Preview miniatura para URL de foto. */
export function PhotoUrlField({ label = 'Foto (URL)', value, onChange }) {
  const src = resolveUploadUrl(String(value || '').trim());
  return (
    <div className="grid gap-2 sm:col-span-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label={label} hint="Cole a URL da imagem">
        <TextInput
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
      </Field>
      <div className="flex h-[4.75rem] w-[4.75rem] items-center justify-center overflow-hidden rounded-xl border border-[#d7e8e7] bg-[#f8fcfc]">
        {src ? (
          <img src={src} alt="Pré-visualização" className="h-full w-full object-cover" />
        ) : (
          <span className="px-1 text-center text-[10px] text-slate-health">Sem foto</span>
        )}
      </div>
    </div>
  );
}

export function Field({ label, required, children, hint, error }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-semibold text-ink">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs text-slate-health">{hint}</span> : null}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export function DateBrInput({ value, onChange, className = '', ...props }) {
  const [text, setText] = useState(formatDateBr(value));
  useEffect(() => {
    setText(formatDateBr(value));
  }, [value]);
  return (
    <TextInput
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      maxLength={10}
      autoComplete="bday"
      className={className}
      {...props}
      value={text}
      onChange={(e) => {
        const masked = maskDateBr(e.target.value);
        setText(masked);
        onChange(parseDateBr(masked) || masked);
      }}
    />
  );
}

export function MoneyInput({ value, onChange, className = '', ...props }) {
  const display =
    value === '' || value == null
      ? ''
      : typeof value === 'number'
        ? maskMoneyBr(String(Math.round(value * 100)))
        : String(value).includes('R$')
          ? value
          : maskMoneyBr(value);
  return (
    <TextInput
      inputMode="numeric"
      placeholder="R$ 0,00"
      className={className}
      {...props}
      value={display}
      onChange={(e) => onChange(parseMoneyBr(e.target.value))}
    />
  );
}

export function TextInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 py-2.5 text-sm outline-none transition focus:border-aqua focus:ring-2 focus:ring-aqua/20 disabled:opacity-60 ${className}`}
    />
  );
}

export function TextSelect({ className = '', children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 py-2.5 text-sm outline-none transition focus:border-aqua focus:ring-2 focus:ring-aqua/20 ${className}`}
    >
      {children}
    </select>
  );
}

export function TextTextarea({ className = '', ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-[#cfe0df] bg-[#f8fcfc] px-3 py-2.5 text-sm outline-none transition focus:border-aqua focus:ring-2 focus:ring-aqua/20 ${className}`}
    />
  );
}

export function AddressFields({ values, onChange, required = true }) {
  const [loading, setLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  async function handleCepBlur() {
    const digits = onlyDigits(values.cep);
    if (digits.length !== 8) return;
    setLoading(true);
    setCepError('');
    try {
      const addr = await fetchAddressByCep(digits);
      onChange({
        ...values,
        cep: addr.cep,
        logradouro: addr.logradouro || values.logradouro,
        bairro: addr.bairro || values.bairro,
        cidade: addr.cidade || values.cidade,
        uf: addr.uf || values.uf,
        complemento: values.complemento || addr.complemento || '',
      });
    } catch (err) {
      setCepError(err.message || 'Falha ao buscar CEP.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label="CEP"
        required={required}
        error={cepError}
        hint={loading ? 'Buscando endereço…' : 'Máscara 00000-000 · ViaCEP'}
      >
        <TextInput
          value={maskCep(values.cep || '')}
          onChange={(e) => onChange({ ...values, cep: onlyDigits(e.target.value).slice(0, 8) })}
          onBlur={handleCepBlur}
          placeholder="00000-000"
          inputMode="numeric"
          autoComplete="postal-code"
        />
      </Field>
      <Field label="Logradouro" required={required}>
        <TextInput
          value={values.logradouro || ''}
          onChange={(e) => onChange({ ...values, logradouro: e.target.value })}
          autoComplete="street-address"
        />
      </Field>
      <Field label="Número" required={required}>
        <TextInput
          value={values.numero || ''}
          onChange={(e) => onChange({ ...values, numero: e.target.value })}
        />
      </Field>
      <Field label="Complemento" hint="Opcional">
        <TextInput
          value={values.complemento || ''}
          onChange={(e) => onChange({ ...values, complemento: e.target.value })}
        />
      </Field>
      <Field label="Bairro" required={required}>
        <TextInput
          value={values.bairro || ''}
          onChange={(e) => onChange({ ...values, bairro: e.target.value })}
        />
      </Field>
      <Field label="Cidade" required={required}>
        <TextInput
          value={values.cidade || ''}
          onChange={(e) => onChange({ ...values, cidade: e.target.value })}
        />
      </Field>
      <Field label="UF" required={required}>
        <TextSelect
          value={values.uf || ''}
          onChange={(e) => onChange({ ...values, uf: e.target.value })}
        >
          <option value="">Selecione</option>
          {UF_OPTIONS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </TextSelect>
      </Field>
    </div>
  );
}

export function Modal({ open, title, onClose, children, wide, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-x-hidden bg-ink/40 p-2 sm:items-center sm:p-3">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar" onClick={onClose} />
      <div
        className={`relative flex max-h-[92vh] w-full max-w-full flex-col overflow-hidden rounded-2xl border border-[#d7e8e7] bg-white shadow-panel ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#e8f1f0] bg-white px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="min-w-0 truncate font-display text-base font-bold text-ink sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 shrink-0 rounded-lg px-3 py-1 text-slate-health hover:bg-aqua-soft hover:text-ink"
          >
            Fechar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">{children}</div>
        {footer ? (
          <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t border-[#e8f1f0] bg-white px-4 py-3 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ComboCreate({
  label,
  required,
  value,
  onChange,
  options = [],
  placeholder = 'Selecione',
  onCreate,
  createLabel = 'Novo',
}) {
  return (
    <Field label={label} required={required}>
      <div className="flex min-w-0 gap-2">
        <TextSelect value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </TextSelect>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-aqua px-3 text-sm font-semibold text-aqua-deep hover:bg-aqua-soft"
        >
          {createLabel}
        </button>
      </div>
    </Field>
  );
}
