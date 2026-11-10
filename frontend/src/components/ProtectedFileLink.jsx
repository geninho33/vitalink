import { useState } from 'react';
import { fetchProtectedFile } from '../services/api';
import { useProtectedFile } from '../hooks/useProtectedFile';

async function abrirArquivo(caminho) {
  const url = await fetchProtectedFile(caminho);
  const w = window.open(url, '_blank', 'noopener');
  if (!w) {
    // popup bloqueado: dispara download/navegação na mesma aba
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/** Link/botão que abre um arquivo de /uploads enviando o token de sessão. */
export default function ProtectedFileLink({ caminho, className, children, disabled }) {
  const [busy, setBusy] = useState(false);
  if (!caminho) return null;

  async function onClick(e) {
    e.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    try {
      await abrirArquivo(caminho);
    } catch (err) {
      window.alert(err.message || 'Não foi possível abrir o documento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={busy || disabled} className={className}>
      {busy ? 'Abrindo…' : children}
    </button>
  );
}

export function ProtectedFilePreview({ caminho, title }) {
  const { blobUrl, loading, error } = useProtectedFile(caminho);
  if (!caminho) return <p className="text-sm text-slate-health">Sem arquivo.</p>;
  if (loading) return <p className="text-sm text-slate-health">Carregando documento…</p>;
  if (error || !blobUrl) {
    return <p className="text-sm text-red-600">Não foi possível abrir o documento. Tente novamente.</p>;
  }
  const isPdf = /\.pdf($|\?)/i.test(caminho) || /\.pdf($|\?)/i.test(title || '');
  if (isPdf) {
    return <iframe title={title || 'Documento'} src={blobUrl} className="h-[70vh] w-full rounded-xl border-0" />;
  }
  return <img src={blobUrl} alt={title || 'Documento'} className="mx-auto max-h-[70vh] object-contain" />;
}

export async function printProtectedFile(file) {
  if (!file?.caminho) return;
  const href = await fetchProtectedFile(file.caminho);
  const popup = window.open('', '_blank', 'noopener,width=900,height=700');
  if (!popup) {
    window.open(href, '_blank', 'noopener');
    return;
  }
  const name = file.name || 'Documento';
  const isImage =
    String(file.mime || file.type || '').startsWith('image/') ||
    /\.(png|jpe?g|gif|webp)$/i.test(file.caminho || '');
  const isPdf = file.mime === 'application/pdf' || /\.pdf$/i.test(file.caminho || '');
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><title>${name}</title>
    <style>html,body{margin:0;height:100%;font-family:Arial,sans-serif}img,iframe{width:100%;height:100%;border:0;object-fit:contain}</style>
    </head><body>`);
  if (isImage) popup.document.write(`<img src="${href}" alt="${name}">`);
  else if (isPdf) popup.document.write(`<iframe src="${href}" title="${name}"></iframe>`);
  else popup.document.write(`<p style="padding:24px"><a href="${href}" target="_blank" rel="noopener">Abrir documento</a></p>`);
  popup.document.write('</body></html>');
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 400);
}

export { abrirArquivo };
