import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

const TIPO_LABEL = {
  termos_uso: 'Termos de Uso',
  politica_privacidade: 'Política de Privacidade',
  consentimento_dados_saude: 'Consentimento – dados de saúde (dado sensível)',
};

/**
 * Bloqueia o app até o usuário aceitar a versão vigente de cada documento LGPD obrigatório.
 * /termos continua acessível para leitura.
 */
export default function ConsentGate({ children }) {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [pendentes, setPendentes] = useState(null);
  const [erroCarga, setErroCarga] = useState('');
  const [marcado, setMarcado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = useCallback(async () => {
    setErroCarga('');
    try {
      const res = await apiRequest('/lgpd/pendentes');
      setPendentes(res.data || []);
    } catch (err) {
      setErroCarga(err.message || 'Não foi possível verificar os termos.');
      setPendentes(null);
    }
  }, []);

  useEffect(() => {
    setPendentes(null);
    carregar();
  }, [carregar, usuario?.id]);

  if (location.pathname === '/termos') return children;

  if (erroCarga) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9F6] px-5">
        <div className="max-w-md rounded-2xl border border-[#d0e4ef] bg-white p-6 text-center">
          <p className="text-sm text-red-600">{erroCarga}</p>
          <button type="button" onClick={carregar} className="mt-4 h-11 rounded-xl bg-vita px-5 font-semibold text-white">
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }
  if (pendentes === null) return null;
  if (!pendentes.length) return children;

  const doc = pendentes[0];

  async function aceitar(e) {
    e.preventDefault();
    if (!marcado) {
      setError('Marque a caixa para confirmar que leu e concorda.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiRequest('/lgpd/aceitar', {
        method: 'POST',
        body: { documento_id: doc.id, aceito: true },
      });
      setMarcado(false);
      setPendentes((prev) => prev.slice(1));
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message || 'Não foi possível registrar o aceite.');
      await carregar();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F9F6] px-5 py-8">
      <form
        onSubmit={aceitar}
        className="mx-auto w-full max-w-2xl rounded-3xl border border-[#d0e4ef] bg-white p-6 shadow-panel"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-vita">
          Privacidade e LGPD · etapa {1} de {pendentes.length}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">{doc.titulo}</h1>
        <p className="mt-1 text-xs text-slate-health">
          {TIPO_LABEL[doc.tipo] || doc.tipo} · versão {doc.versao} · vigente desde{' '}
          {new Date(doc.vigente_desde).toLocaleDateString('pt-BR')}
        </p>
        {doc.tipo === 'consentimento_dados_saude' ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Dados de saúde são <strong>dados pessoais sensíveis</strong> pela LGPD. Precisamos do
            seu consentimento específico para tratá-los.
          </p>
        ) : null}
        <div className="mt-4 max-h-[50vh] overflow-y-auto whitespace-pre-line rounded-2xl border border-[#e2eeee] bg-[#f8fcfc] p-4 text-sm leading-relaxed text-ink">
          {doc.conteudo}
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
          />
          <span>
            Li e concordo com <strong>{doc.titulo}</strong> (versão {doc.versao}).
          </span>
        </label>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || !marcado}
            className="h-12 rounded-xl bg-vita px-6 font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Registrando...' : 'Aceitar e continuar'}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="h-12 rounded-xl border border-[#d7e8e7] px-5 text-sm font-semibold text-ink"
          >
            Não aceito / sair
          </button>
          <Link to="/termos" className="text-sm font-semibold text-vita hover:underline">
            Ver todos os documentos
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-health">
          Registramos data, hora, IP, navegador e a versão do texto aceito como comprovação.
        </p>
      </form>
    </main>
  );
}
