import { useState, useEffect } from 'react';
import { fetchProtectedFile, revokeProtectedFile } from '../services/api';

/**
 * Hook para carregar arquivos protegidos de /uploads com autenticação.
 * Retorna uma blob URL que pode ser usada em <img>, <a>, etc.
 * 
 * @param {string} caminho - Caminho do arquivo (ex.: /uploads/123-arquivo.pdf)
 * @returns {{ blobUrl: string|null, loading: boolean, error: Error|null }}
 * 
 * Exemplo:
 *   const { blobUrl, loading, error } = useProtectedFile('/uploads/123.jpg');
 *   if (loading) return <Spinner />;
 *   if (error) return <div>Erro: {error.message}</div>;
 *   return <img src={blobUrl} alt="Imagem" />;
 */
export function useProtectedFile(caminho) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!caminho) {
      setBlobUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Se já for blob ou URL externa, usar direto
    if (caminho.startsWith('blob:') || /^https?:\/\//i.test(caminho)) {
      setBlobUrl(caminho);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const url = await fetchProtectedFile(caminho);
        if (!cancelled) {
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      // Revogar blob URL antiga ao desmontar ou trocar de arquivo
      if (blobUrl && blobUrl.startsWith('blob:')) {
        revokeProtectedFile(blobUrl);
      }
    };
  }, [caminho]);

  return { blobUrl, loading, error };
}

/**
 * Hook para carregar múltiplos arquivos protegidos.
 * 
 * @param {string[]} caminhos - Array de caminhos de arquivos
 * @returns {{ blobUrls: Record<string, string>, loading: boolean, errors: Record<string, Error> }}
 * 
 * Exemplo:
 *   const { blobUrls, loading } = useProtectedFiles(['/uploads/1.jpg', '/uploads/2.jpg']);
 *   return (
 *     <div>
 *       {Object.entries(blobUrls).map(([path, url]) => (
 *         <img key={path} src={url} />
 *       ))}
 *     </div>
 *   );
 */
export function useProtectedFiles(caminhos = []) {
  const [blobUrls, setBlobUrls] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!caminhos || caminhos.length === 0) {
      setBlobUrls({});
      setLoading(false);
      setErrors({});
      return;
    }

    let cancelled = false;
    const oldUrls = { ...blobUrls };

    async function loadAll() {
      setLoading(true);
      setErrors({});

      const results = {};
      const errs = {};

      await Promise.all(
        caminhos.map(async (caminho) => {
          if (!caminho) return;
          
          try {
            const url = await fetchProtectedFile(caminho);
            if (!cancelled) {
              results[caminho] = url;
            }
          } catch (err) {
            if (!cancelled) {
              errs[caminho] = err;
            }
          }
        })
      );

      if (!cancelled) {
        setBlobUrls(results);
        setErrors(errs);
        setLoading(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
      // Revogar blob URLs antigas
      Object.keys(oldUrls).forEach((path) => {
        if (oldUrls[path] && oldUrls[path].startsWith('blob:')) {
          revokeProtectedFile(oldUrls[path]);
        }
      });
    };
  }, [JSON.stringify(caminhos)]);

  return { blobUrls, loading, errors };
}
