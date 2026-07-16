/// <reference lib="webworker" />
import { CacheFirst, NetworkOnly, StaleWhileRevalidate, ExpirationPlugin, type RuntimeCaching } from 'serwist';
import { Serwist } from 'serwist';
import { urlBase64ToUint8Array } from '../lib/push-client-helpers';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<unknown>;
};

/**
 * O Leadflow é um painel autenticado e altamente dinâmico — nenhuma página HTML, RSC ou
 * resposta de API deve ser cacheada (cada uma é específica de sessão/permissão). Usar o
 * `defaultCache` padrão do Serwist (NetworkFirst para páginas/API) causava erros
 * "no-response" no console e respostas eventualmente erradas/obsoletas. Aqui só cacheamos
 * assets realmente estáticos; tudo o resto vai direto pra rede, sem o SW interferir.
 */
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2)$/i,
    handler: new CacheFirst({
      cacheName: 'static-fonts',
      plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 })],
    }),
  },
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'static-images',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    }),
  },
  {
    matcher: /\/_next\/static\/.+\.(?:js|css)$/i,
    handler: new CacheFirst({
      cacheName: 'next-static-assets',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    }),
  },
  // Páginas, RSC payloads e qualquer /api/* — sempre rede, nunca cache.
  { matcher: /.*/i, handler: new NetworkOnly() },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();

// Notificação de novo lead (mirror do public/sw.js do Real-Sales) — o `data.url` já vem pronto
// do servidor (lib/push.ts decide o destino por destinatário), o SW só exibe e abre.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; data?: Record<string, unknown> };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Leadflow', body: event.data.text() };
  }
  const data = payload.data ?? {};

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Leadflow', {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: typeof data.leadId === 'string' ? `lead-${data.leadId}` : 'general',
      renotify: true,
    } as NotificationOptions),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients[0];
      if (existing) {
        existing.focus();
        if ('navigate' in existing) return (existing as WindowClient).navigate(url);
        return undefined;
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Navegador invalidou a subscription (rotação de chave, expiração) — reinscreve sozinho.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch('/api/push/vapid-public-key');
      const { publicKey } = (await res.json()) as { publicKey: string | null };
      if (!publicKey) return;

      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
    })(),
  );
});
