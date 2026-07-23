import { useState } from 'react';
import { fetchAddressByCep, maskCep, onlyDigits } from '../../hooks/useCep';

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

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
      <Field label="CEP" required={required} error={cepError} hint={loading ? 'Buscando endereço...' : 'ViaCEP / AwesomeAPI'}>
        <TextInput
          value={maskCep(values.cep || '')}
          onChange={(e) => onChange({ ...values, cep: onlyDigits(e.target.value).slice(0, 8) })}
          onBlur={handleCepBlur}
          placeholder="00000-000"
        />
      </Field>
      <Field label="Número" required={required}>
        <TextInput
          value={values.numero || ''}
          onChange={(e) => onChange({ ...values, numero: e.target.value })}
        />
      </Field>
      <Field label="Logradouro" required={required}>
        <TextInput
          value={values.logradouro || ''}
          onChange={(e) => onChange({ ...values, logradouro: e.target.value })}
        />
      </Field>
      <Field label="Complemento">
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

export function Modal({ open, title, onClose, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-3 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar" onClick={onClose} />
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-[#d7e8e7] bg-white shadow-panel ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8f1f0] bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-health hover:bg-aqua-soft hover:text-ink"
          >
            Fechar
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
