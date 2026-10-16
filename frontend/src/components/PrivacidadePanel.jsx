import { useState } from 'react';
import { apiDownload, apiRequest } from '../services/api';
import ExclusaoConta from './ExclusaoConta';
import { PlaceholderCard } from './PageHeader';

export default function PrivacidadePanel() {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function exportar(formato) {
    setBusy(formato);
    setErr('');
    try {
      await apiDownload('/lgpd/exportar', { query: { formato }, filename: `vitalink-meus-dados.${formato}` });
    } catch (e) {
      setErr(e.message || 'Não foi possível exportar.');
    } finally {
      setBusy('');
    }
  }

  async function revogar() {
    if (!window.confirm(
      'Revogar o consentimento para dados de saúde? O app ficará bloqueado para você até aceitar de novo ou pedir a exclusão da conta. Os dados continuam disponíveis para a rede de cuidado do paciente.'
    )) return;
    setBusy('revogar');
    try {
      await apiRequest('/lgpd/revogar', { method: 'POST', body: { tipo: 'consentimento_dados_saude' } });
      window.location.reload();
    } catch (e) {
      setErr(e.message || 'Não foi possível revogar.');
      setBusy('');
    }
  }

  return (
    <PlaceholderCard>
      <p className="text-xs font-bold uppercase tracking-wider text-aqua">Privacidade e meus dados (LGPD)</p>
      <div className="mt-3 grid gap-5 text-sm">
        <section className="grid gap-2">
          <h3 className="font-semibold text-ink">Exportar meus dados</h3>
          <p className="text-slate-health">
            Sua conta, o que você registrou e os pacientes que você gerencia. JSON (completo) ou ZIP com planilhas CSV.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} onClick={() => exportar('json')} className="h-11 rounded-xl bg-aqua px-4 font-semibold text-white disabled:opacity-50">
              {busy === 'json' ? 'Gerando…' : 'Baixar JSON'}
            </button>
            <button type="button" disabled={!!busy} onClick={() => exportar('zip')} className="h-11 rounded-xl border border-aqua px-4 font-semibold text-aqua-deep disabled:opacity-50">
              {busy === 'zip' ? 'Gerando…' : 'Baixar ZIP (planilhas)'}
            </button>
          </div>
        </section>
        <section className="grid gap-2">
          <h3 className="font-semibold text-ink">Consentimento para dados de saúde</h3>
          <p className="text-slate-health">Você pode revogar a qualquer momento. O uso do app fica bloqueado até um novo aceite.</p>
          <button type="button" disabled={!!busy} onClick={revogar} className="h-11 justify-self-start rounded-xl border border-[#cfe0df] px-4 font-semibold text-ink disabled:opacity-50">
            Revogar consentimento
          </button>
        </section>
        <section className="grid gap-2">
          <h3 className="font-semibold text-ink">Excluir minha conta</h3>
          <ExclusaoConta />
        </section>
        {err ? <p className="text-red-600">{err}</p> : null}
      </div>
    </PlaceholderCard>
  );
}
