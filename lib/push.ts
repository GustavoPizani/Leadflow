import webpush from 'web-push';
import { prisma } from './prisma';

/**
 * Envio de push (Web Push API), mirror do lib/notifications.ts do Real-Sales: busca todas as
 * inscrições do usuário (multi-dispositivo), manda pra cada uma via `web-push`, e limpa do
 * banco qualquer inscrição que o navegador já não reconhece mais (404/410).
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> },
) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !vapidEmail) {
    console.warn('[push] VAPID não configurado — pulando envio.');
    return;
  }

  const subs = await prisma.leadflowPushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  webpush.setVapidDetails(`mailto:${vapidEmail}`, publicKey, privateKey);

  const body = JSON.stringify({ title: payload.title, body: payload.body, data: payload.data ?? {} });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.leadflowPushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
        } else {
          console.error('[push] falha ao enviar', err);
        }
      }
    }),
  );
}
