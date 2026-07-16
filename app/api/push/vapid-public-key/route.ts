import { NextResponse } from 'next/server';

/**
 * O service worker (app/sw.ts) não tem acesso a `process.env` — ele é compilado pelo Serwist
 * fora do pipeline normal do Next, então as env vars `NEXT_PUBLIC_*` não são inlinadas nele.
 * Este endpoint existe só para o listener `pushsubscriptionchange` do SW conseguir se
 * reinscrever sozinho quando o navegador invalida a subscription antiga.
 */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null });
}
