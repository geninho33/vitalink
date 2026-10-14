import { useEffect, useState } from 'react';
import PageHeader, { PlaceholderCard } from '../components/PageHeader';
import { apiRequest } from '../services/api';

export default function TermosPage() {
  const [docs, setDocs] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    apiRequest('/lgpd/documentos')
      .then((res) => setDocs(res.data || []))
      .catch((err) => setErro(err.message || 'Não foi possível carregar os documentos.'));
    apiRequest('/lgpd/meus-consentimentos')
      .then((res) => setHistorico(res.data || []))
      .catch(() => setHistorico([]));
  }, []);

  return (
    <div>
      <PageHeader
        title="Termos de Uso, Privacidade e Consentimento (LGPD)"
        description="Versões vigentes dos documentos do VitaLink e o histórico dos seus aceites."
      />
      <PlaceholderCard>
        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        {docs === null && !erro ? <p className="text-sm text-slate-health">Carregando...</p> : null}
        {(docs || []).map((d) => (
          <article key={d.id} className="mb-8">
            <h2 className="font-display text-xl font-bold text-aqua-deep">{d.titulo}</h2>
            <p className="text-xs text-slate-health">
              Versão {d.versao} · vigente desde {new Date(d.vigente_desde).toLocaleDateString('pt-BR')}
            </p>
            <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{d.conteudo}</div>
          </article>
        ))}
        <h2 className="font-display text-lg font-bold text-aqua-deep">Seus aceites</h2>
        {historico.length ? (
          <ul className="mt-2 text-sm text-ink">
            {historico.map((h) => (
              <li key={h.id}>
                {h.titulo} · versão {h.versao} · {new Date(h.aceito_em).toLocaleString('pt-BR')}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-health">Nenhum aceite registrado.</p>
        )}
        <p className="mt-4 text-xs text-slate-health">
          Para exercer seus direitos (acesso, correção, exclusão, revogação do consentimento), use o
          canal de suporte em www.vitalink.app.br.
        </p>
      </PlaceholderCard>
    </div>
  );
}
