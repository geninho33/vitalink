/* eslint-disable no-restricted-globals */
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

// Só o app shell (JS/CSS/HTML/ícones do build). Respostas da API e /uploads
// (dados de saúde) NUNCA são cacheadas: não há runtime caching aqui.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//, /^\/api-health/, /^\/uploads\//, /^\/healthz/],
  })
);

// Push: o payload não deve conter dados de saúde (trafega pelos serviços do navegador).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'VitaLink';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || undefined,
      // Botões (Android/Chrome). iOS ignora e o toque abre o app.
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 3) : undefined,
      requireInteraction: Boolean(data.acao_token),
      data: { url: data.url || '/inicio', acao_token: data.acao_token || null },
    })
  );
});

async function executarAcaoDose(token, acao) {
  const res = await fetch('/api/v1/lembretes/acao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, acao }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`HTTP ${res.status}`);
  const texto = { tomei: 'Dose registrada como tomada.', pular: 'Dose registrada como pulada.', adiar: 'Lembrete adiado 15 min.' };
  await self.registration.showNotification('VitaLink', {
    body: res.status === 409 ? 'Esta dose já tinha sido registrada.' : texto[acao],
    icon: '/icons/icon-192.png',
    tag: 'vitalink-acao-dose',
  });
}

self.addEventListener('notificationclick', (event) => {
  const acao = event.action;
  const token = event.notification.data?.acao_token;
  if (token && ['tomei', 'pular', 'adiar'].includes(acao)) {
    event.notification.close();
    event.waitUntil(
      executarAcaoDose(token, acao).catch(() =>
        self.clients.openWindow(new URL(event.notification.data?.url || '/inicio/doses', self.location.origin).href)
      )
    );
    return;
  }
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/inicio', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
