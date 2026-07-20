import { prisma } from '../lib/prisma';
import webpush from 'web-push';

/** Dispara uma notificação de teste direto pro terminal, sem depender da UI — pra diagnosticar
 * problemas de push (ex: iOS exige o PWA instalado na tela de início, não só aberto no Safari). */
async function main() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !vapidEmail) {
    throw new Error('VAPID não configurado no .env.local');
  }
  webpush.setVapidDetails(`mailto:${vapidEmail}`, publicKey, privateKey);

  const subs = await prisma.leadflowPushSubscription.findMany();
  console.log(`enviando para ${subs.length} inscrição(ões)...`);

  for (const sub of subs) {
    try {
      const res = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: '🔔 Teste manual', body: 'Disparado direto do terminal.', data: { url: '/' } }),
      );
      console.log(`OK sub=${sub.id} status=${res.statusCode}`);
    } catch (err) {
      const e = err as { statusCode?: number; body?: string };
      console.error(`FALHOU sub=${sub.id} statusCode=${e.statusCode} body=${e.body}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
