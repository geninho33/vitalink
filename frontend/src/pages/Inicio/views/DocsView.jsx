import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../../components/forms/FormControls';
import FileUploadField from '../../../components/FileUploadField';
import { usePacienteAtivo } from '../../../context/PacienteAtivoContext';
import { apiRequest, assetUrl } from '../../../services/api';
import { EmptyState, PageTitle, Panel } from '../ui';

function printDocument(file) {
  const popup = window.open('', '_blank', 'noopener,width=900,height=700');
  if (!popup) return;
  const href = file.href;
  const isImage = String(file.mime || file.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(href || '');
  const isPdf = file.mime === 'application/pdf' || /\.pdf$/i.test(href || '');
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><title>${file.name}</title>
    <style>html,body{margin:0;height:100%;font-family:Arial,sans-serif}img,iframe{width:100%;height:100%;border:0;object-fit:contain}</style>
    </head><body>`);
  if (isImage) popup.document.write(`<img src="${href}" alt="${file.name}">`);
  else if (isPdf) popup.document.write(`<iframe src="${href}" title="${file.name}"></iframe>`);
  else popup.document.write(`<p style="padding:24px"><a href="${href}" target="_blank" rel="noopener">Abrir documento</a></p>`);
  popup.document.write('</body></html>');
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 400);
}

function mapDoc(row) {
  return {
    id: row.id,
    name: row.titulo,
    tipo: row.tipo,
    date: row.data_documento,
    href: row.arquivo_caminho ? assetUrl(row.arquivo_caminho) : '',
    mime: '',
    especialidade: row.especialidade,
  };
}

export default function DocsView() {
  const { pacienteId } = usePacienteAtivo();
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState({ arquivo_id: '', caminho: '', titulo: '' });

  const load = useCallback(async () => {
    if (!pacienteId) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest('/exames-receitas', {
        query: { paciente_id: pacienteId, pageSize: 200 },
      });
      setFiles((res.data || []).map(mapDoc));
    } catch (err) {
      setMsg(err.message || 'Não foi possível carregar os documentos.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUploaded({ id, caminho, nome_original }) {
    setPending({
      arquivo_id: id,
      caminho: caminho || '',
      titulo: nome_original || 'Documento',
    });
    setMsg('');
  }

  async function savePending() {
    if (!pacienteId || !pending.arquivo_id) return;
    try {
      await apiRequest('/exames-receitas', {
        method: 'POST',
        body: {
          paciente_id: Number(pacienteId),
          especialidade: 'Geral',
          tipo: 'outro',
          titulo: pending.titulo || 'Documento',
          data_documento: new Date().toISOString().slice(0, 10),
          arquivo_id: pending.arquivo_id,
        },
      });
      setPending({ arquivo_id: '', caminho: '', titulo: '' });
      setMsg('Documento adicionado.');
      await load();
    } catch (err) {
      setMsg(err.message || 'Não foi possível salvar o documento.');
    }
  }

  return (
    <div>
      <PageTitle
        eyebrow="Arquivos"
        title="Exames/Receitas"
        description="Exames, laudos e receitas do paciente, inclusive as anexadas em Medicamentos."
      />

      {!pacienteId ? (
        <EmptyState>Selecione um paciente no topo para ver os documentos.</EmptyState>
      ) : (
        <>
      <Panel className="mb-5 text-center">
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-aqua-soft text-xl text-aqua-deep">
          ↑
        </div>
        <h2 className="font-display text-lg font-bold text-ink">Adicionar documentos</h2>
        <p className="mt-1 text-sm text-slate-health">
          Receitas de medicamentos também aparecem nesta lista.
        </p>
        <div className="mx-auto mt-4 max-w-md text-left">
          <FileUploadField
            label="Arquivo"
            accept="image/*,.pdf,application/pdf,.doc,.docx"
            valueId={pending.arquivo_id}
            valuePath={pending.caminho}
            onUploaded={handleUploaded}
            onCleared={() => setPending({ arquivo_id: '', caminho: '', titulo: '' })}
          />
        </div>
        {pending.arquivo_id ? (
          <button
            type="button"
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white"
            onClick={savePending}
          >
            Salvar documento
          </button>
        ) : null}
        {msg ? <p className="mt-3 text-sm text-aqua-deep">{msg}</p> : null}
      </Panel>

      {loading ? (
        <p className="text-sm text-slate-health">Carregando documentos…</p>
      ) : files.length === 0 ? (
        <EmptyState>Nenhum documento cadastrado ainda.</EmptyState>
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
                  {file.tipo || 'documento'}
                  {file.especialidade ? ` · ${file.especialidade}` : ''}
                  {file.date ? ` · ${String(file.date).slice(0, 10)}` : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {file.href ? (
                  <>
                    <a
                      href={file.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center rounded-xl border border-[#d7e8e7] px-3 text-sm font-semibold"
                    >
                      Abrir
                    </a>
                    <button
                      type="button"
                      className="min-h-10 rounded-xl border border-[#d7e8e7] px-3 text-sm font-semibold"
                      onClick={() => setPreview(file)}
                    >
                      Visualizar
                    </button>
                    <button
                      type="button"
                      className="min-h-10 rounded-xl border border-[#d7e8e7] px-3 text-sm font-semibold"
                      onClick={() => printDocument(file)}
                    >
                      Imprimir
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-health">Sem arquivo</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
        </>
      )}

      <Modal open={Boolean(preview)} title={preview?.name || 'Documento'} onClose={() => setPreview(null)}>
        {preview?.href ? (
          /\.pdf$/i.test(preview.href) ? (
            <iframe title={preview.name} src={preview.href} className="h-[70vh] w-full rounded-xl border-0" />
          ) : (
            <img src={preview.href} alt={preview.name} className="mx-auto max-h-[70vh] object-contain" />
          )
        ) : null}
      </Modal>
    </div>
  );
}
