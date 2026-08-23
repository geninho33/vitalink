import { useEffect, useState } from 'react';
import { Modal } from '../../../components/forms/FormControls';
import { storageGet, storageSet } from '../localStore';
import { EmptyState, PageTitle, Panel } from '../ui';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.addEventListener('error', reject);
    reader.readAsDataURL(file);
  });
}

function printDocument(file) {
  const popup = window.open('', '_blank', 'noopener,width=900,height=700');
  if (!popup) return;
  const isImage = String(file.type || '').startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><title>${file.name}</title>
    <style>html,body{margin:0;height:100%;font-family:Arial,sans-serif}img,iframe{width:100%;height:100%;border:0;object-fit:contain}</style>
    </head><body>`);
  if (isImage) popup.document.write(`<img src="${file.data}" alt="${file.name}">`);
  else if (isPdf) popup.document.write(`<iframe src="${file.data}" title="${file.name}"></iframe>`);
  else popup.document.write(`<p style="padding:24px">Use o visualizador do sistema para este tipo de arquivo.</p>`);
  popup.document.write('</body></html>');
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 400);
}

export default function DocsView() {
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setFiles(storageGet('files', []));
  }, []);

  function persist(next) {
    storageSet('files', next);
    setFiles(next);
  }

  async function handleUpload(e) {
    const selected = [...(e.target.files || [])];
    setMsg('');
    if (selected.some((file) => file.size > 3 * 1024 * 1024)) {
      e.target.value = '';
      setMsg('Cada documento deve ter no máximo 3 MB nesta versão.');
      return;
    }
    try {
      const added = await Promise.all(
        selected.map(async (file) => ({
          id: Date.now() + Math.random(),
          createdAt: new Date().toISOString(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          data: await fileToDataUrl(file),
        }))
      );
      persist([...storageGet('files', []), ...added]);
      e.target.value = '';
      setMsg('Documento adicionado.');
    } catch {
      setMsg('Não foi possível armazenar o documento.');
    }
  }

  function openFile(file) {
    if (!file?.data) {
      setMsg('Este documento precisa ser adicionado novamente.');
      return;
    }
    setPreview(file);
  }

  function remove(id) {
    persist(storageGet('files', []).filter((f) => String(f.id) !== String(id)));
    setConfirmId(null);
    if (preview && String(preview.id) === String(id)) setPreview(null);
  }

  const isImage = String(preview?.type || '').startsWith('image/');
  const isPdf = preview?.type === 'application/pdf';

  return (
    <div>
      <PageTitle
        eyebrow="Arquivos"
        title="Exames/Receitas"
        description="Seus exames, laudos e receitas em um só lugar."
      />

      <Panel className="mb-5 text-center">
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-aqua-soft text-xl text-aqua-deep">
          ↑
        </div>
        <h2 className="font-display text-lg font-bold text-ink">Adicionar documentos</h2>
        <p className="mt-1 text-sm text-slate-health">
          Os arquivos ficam disponíveis neste dispositivo.
        </p>
        <label className="mt-4 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white hover:bg-aqua-deep">
          Selecionar arquivos
          <input
            type="file"
            multiple
            accept=".pdf,image/*,.doc,.docx"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
        {msg ? <p className="mt-3 text-sm text-aqua-deep">{msg}</p> : null}
      </Panel>

      {files.length === 0 ? (
        <EmptyState>Nenhum documento selecionado ainda.</EmptyState>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <article
              key={file.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#d7e8e7] bg-white p-4 sm:flex-row sm:items-center"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efeaff] text-lg text-[#7b6bb8]">
                ▤
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-ink">{file.name}</strong>
                <span className="text-xs text-slate-health">
                  {file.size} · {file.data ? 'Disponível para abrir' : 'Indisponível'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {file.data ? (
                  <button
                    type="button"
                    className="min-h-10 rounded-xl border border-[#d7e8e7] px-3 text-sm font-semibold"
                    onClick={() => openFile(file)}
                  >
                    Abrir
                  </button>
                ) : null}
                {confirmId === file.id ? (
                  <>
                    <button type="button" className="min-h-10 px-2 text-sm" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="min-h-10 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white"
                      onClick={() => remove(file.id)}
                    >
                      Confirmar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="min-h-10 px-2 text-lg text-slate-health hover:text-red-600"
                    aria-label="Excluir documento"
                    onClick={() => setConfirmId(file.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(preview)}
        title={preview?.name || 'Documento'}
        wide
        onClose={() => setPreview(null)}
        footer={
          preview ? (
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white hover:bg-aqua-deep"
              onClick={() => printDocument(preview)}
            >
              Imprimir
            </button>
          ) : null
        }
      >
        {preview ? (
          <div className="min-h-[50vh] overflow-hidden rounded-xl bg-[#f8fcfc]">
            {isImage ? (
              <img src={preview.data} alt={preview.name} className="mx-auto max-h-[70vh] w-full object-contain" />
            ) : isPdf ? (
              <iframe title={preview.name} src={preview.data} className="h-[70vh] w-full border-0" />
            ) : (
              <p className="p-6 text-sm text-slate-health">
                Visualização indisponível para este formato. Use Imprimir se o navegador permitir.
              </p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
