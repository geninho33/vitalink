import { useEffect, useState } from 'react';
import {
  currentSubscription,
  disablePush,
  enablePush,
  isIos,
  isStandalone,
  onInstallAvailable,
  promptInstall,
  pushSupported,
  sendTestPush,
} from '../services/pwa';

export default function AppPwaPanel() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const ios = isIos();

  useEffect(() => {
    setInstalled(isStandalone());
    const off = onInstallAvailable(setCanInstall);
    currentSubscription()
      .then((s) => setPushOn(Boolean(s)))
      .catch(() => {});
    return off;
  }, []);

  async function run(fn, okMsg) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await fn();
      if (okMsg) setMsg(okMsg);
    } catch (e) {
      setErr(e.message || 'Não foi possível concluir.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[#d0e4ef] bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">Aplicativo e notificações</h2>

      <div className="mt-3 text-sm text-slate-health">
        {installed ? (
          <p>O VitaLink já está instalado neste aparelho.</p>
        ) : canInstall ? (
          <button
            type="button"
            className="h-11 rounded-xl bg-vita px-5 font-semibold text-white"
            onClick={() => run(promptInstall)}
          >
            Instalar app
          </button>
        ) : ios ? (
          <p>
            No iPhone/iPad (Safari): toque em <strong>Compartilhar</strong> e depois em{' '}
            <strong>Adicionar à Tela de Início</strong>. As notificações no iPhone só funcionam com o
            app instalado (iOS 16.4 ou superior).
          </p>
        ) : (
          <p>
            Para instalar, use o menu do navegador (Chrome: ⋮ &gt; <strong>Instalar app</strong> ou{' '}
            <strong>Adicionar à tela inicial</strong>).
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {!pushSupported() ? (
          <p className="text-slate-health">
            Este navegador não suporta notificações push
            {ios ? ' fora do app instalado na Tela de Início' : ''}.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={busy}
                checked={pushOn}
                onChange={(e) =>
                  e.target.checked
                    ? run(async () => {
                        await enablePush();
                        setPushOn(true);
                      }, 'Notificações ativadas neste aparelho.')
                    : run(async () => {
                        await disablePush();
                        setPushOn(false);
                      }, 'Notificações desativadas neste aparelho.')
                }
              />
              <span className="font-semibold text-ink">Ativar notificações</span>
            </label>
            <button
              type="button"
              disabled={busy || !pushOn}
              className="h-10 rounded-xl border border-[#d7e8e7] px-4 font-semibold text-ink disabled:opacity-50"
              onClick={() => run(sendTestPush, 'Notificação de teste enviada.')}
            >
              Enviar notificação de teste
            </button>
          </>
        )}
      </div>
      {msg ? <p className="mt-2 text-sm text-aqua-deep">{msg}</p> : null}
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
      <p className="mt-3 text-xs text-slate-health">
        As notificações não exibem dados de saúde; abra o app para ver os detalhes.
      </p>
    </section>
  );
}
