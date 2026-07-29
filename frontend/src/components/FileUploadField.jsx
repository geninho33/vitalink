import { useState } from 'react';
import { apiUpload, assetUrl } from '../services/api';
import { Field } from './forms/FormControls';

/**
 * Upload de imagem/documento com preview.
 * onUploaded({ id, caminho, url })
 */
export default function FileUploadField({
  label,
  hint,
  accept = 'image/*',
  valueId,
  valuePath,
  onUploaded,
  onCleared,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = valuePath ? assetUrl(valuePath) : '';

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiUpload('/arquivos', file);
      onUploaded?.({
        id: res.id,
        caminho: res.caminho || res.url,
        url: res.url || res.caminho,
        nome_original: res.nome_original,
      });
    } catch (err) {
      setError(err.message || 'Falha no upload.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label={label} hint={hint} error={error}>
      <div className="flex flex-col gap-2">
        {preview ? (
          <div className="overflow-hidden rounded-xl border border-[#d7e8e7] bg-[#f8fcfc]">
            {/\.pdf$/i.test(preview) || preview.includes('application/pdf') ? (
              <p className="px-3 py-6 text-center text-sm text-slate-health">Arquivo anexado</p>
            ) : (
              <img src={preview} alt="" className="mx-auto max-h-40 object-contain" />
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-aqua px-4 text-sm font-semibold text-aqua hover:bg-aqua-soft">
            {busy ? 'Enviando...' : valueId ? 'Trocar arquivo' : 'Selecionar arquivo'}
            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={busy}
              onChange={handleChange}
            />
          </label>
          {valueId ? (
            <button
              type="button"
              className="min-h-11 rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink"
              onClick={() => onCleared?.()}
            >
              Remover
            </button>
          ) : null}
        </div>
      </div>
    </Field>
  );
}

/** Extrai número/validade aproximados de texto OCR/manual (assistido). */
export function extractConvenioHints(text = '') {
  const digits = String(text).replace(/\D/g, '');
  const numero = digits.length >= 6 ? digits.slice(0, 20) : '';
  const validadeMatch = String(text).match(
    /(\d{2})[\/.\-](\d{2})[\/.\-](\d{2,4})|(\d{4})-(\d{2})-(\d{2})/
  );
  let validade = '';
  if (validadeMatch) {
    if (validadeMatch[4]) {
      validade = `${validadeMatch[4]}-${validadeMatch[5]}-${validadeMatch[6]}`;
    } else {
      const y = validadeMatch[3].length === 2 ? `20${validadeMatch[3]}` : validadeMatch[3];
      validade = `${y}-${validadeMatch[2]}-${validadeMatch[1]}`;
    }
  }
  return { numero, validade };
}
