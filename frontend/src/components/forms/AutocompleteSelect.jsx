import { useEffect, useRef, useState } from 'react';
import { Field, TextInput } from './FormControls';

export default function AutocompleteSelect({
  label,
  required,
  hint,
  value = '',
  selectedLabel = '',
  onChange,
  fetchOptions,
  placeholder = 'Buscar…',
  debounceMs = 300,
  disabled,
  allowClear = true,
  onCreate,
  createLabel = 'Novo',
  allowFreeText = false,
}) {
  const [text, setText] = useState(selectedLabel || '');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const timerRef = useRef(null);
  const seqRef = useRef(0);

  useEffect(() => {
    setText(selectedLabel || '');
  }, [selectedLabel, value]);

  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function runSearch(q) {
    const seq = ++seqRef.current;
    setLoading(true);
    Promise.resolve(fetchOptions(q))
      .then((rows) => {
        if (seq !== seqRef.current) return;
        setItems(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (seq !== seqRef.current) return;
        setItems([]);
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }

  function scheduleSearch(q) {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => runSearch(q), debounceMs);
  }

  function handleFocus() {
    if (disabled) return;
    setOpen(true);
    runSearch(text.trim());
  }

  function handleType(next) {
    setText(next);
    setOpen(true);
    scheduleSearch(next.trim());
    if (allowFreeText) onChange(next, null);
    else if (!next) onChange('', null);
  }

  function pick(opt) {
    onChange(opt.value, opt);
    setText(opt.label);
    setOpen(false);
  }

  function clear() {
    setText('');
    onChange('', null);
    setItems([]);
    setOpen(false);
  }

  return (
    <Field label={label} required={required} hint={hint}>
      <div ref={boxRef} className="relative flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <TextInput
            disabled={disabled}
            required={required}
            value={text}
            placeholder={placeholder}
            autoComplete="off"
            onFocus={handleFocus}
            onChange={(e) => handleType(e.target.value)}
          />
          {allowClear && (text || value) && !disabled ? (
            <button
              type="button"
              aria-label="Limpar"
              className="absolute inset-y-0 right-2 text-sm text-slate-health hover:text-ink"
              onClick={clear}
            >
              ×
            </button>
          ) : null}
          {open ? (
            <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#cfe0df] bg-white py-1 shadow-panel">
              {loading ? (
                <li className="px-3 py-2 text-sm text-slate-health">Buscando…</li>
              ) : null}
              {!loading && items.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-health">Nenhum resultado.</li>
              ) : null}
              {items.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-aqua-soft/60"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(opt)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-aqua px-3 text-sm font-semibold text-aqua-deep hover:bg-aqua-soft"
          >
            {createLabel}
          </button>
        ) : null}
      </div>
    </Field>
  );
}

export function AutocompleteMulti({
  label,
  hint,
  valueIds = [],
  selectedItems = [],
  onChangeIds,
  fetchOptions,
  placeholder = 'Buscar e adicionar…',
  footer,
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState([]);
  const boxRef = useRef(null);
  const timerRef = useRef(null);
  const seqRef = useRef(0);
  const selected = new Set((valueIds || []).map(String));

  const chips = [
    ...selectedItems.filter((s) => selected.has(String(s.value))),
    ...extra.filter((s) => selected.has(String(s.value))),
  ].filter((s, i, arr) => arr.findIndex((x) => String(x.value) === String(s.value)) === i);

  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function runSearch(q) {
    const seq = ++seqRef.current;
    setLoading(true);
    Promise.resolve(fetchOptions(q))
      .then((rows) => {
        if (seq !== seqRef.current) return;
        setItems(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (seq !== seqRef.current) return;
        setItems([]);
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }

  function add(opt) {
    const id = Number(opt.value) || opt.value;
    if (selected.has(String(opt.value))) return;
    setExtra((list) => [...list, opt]);
    onChangeIds([...(valueIds || []), id]);
    setText('');
    setOpen(false);
  }

  function remove(id) {
    onChangeIds((valueIds || []).filter((v) => String(v) !== String(id)));
  }

  return (
    <Field label={label} hint={hint}>
      <div ref={boxRef} className="grid gap-2">
        {chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c.value}
                className="inline-flex items-center gap-1 rounded-full bg-aqua-soft px-2.5 py-1 text-xs font-semibold text-aqua-deep"
              >
                {c.label}
                <button type="button" aria-label="Remover" onClick={() => remove(c.value)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="relative">
          <TextInput
            value={text}
            placeholder={placeholder}
            autoComplete="off"
            onFocus={() => {
              setOpen(true);
              runSearch(text.trim());
            }}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              window.clearTimeout(timerRef.current);
              timerRef.current = window.setTimeout(() => runSearch(e.target.value.trim()), 300);
            }}
          />
          {open ? (
            <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#cfe0df] bg-white py-1 shadow-panel">
              {loading ? <li className="px-3 py-2 text-sm text-slate-health">Buscando…</li> : null}
              {!loading && items.filter((o) => !selected.has(String(o.value))).length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-health">Nenhum resultado.</li>
              ) : null}
              {items
                .filter((o) => !selected.has(String(o.value)))
                .map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-aqua-soft/60"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => add(opt)}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
        {footer}
      </div>
    </Field>
  );
}
