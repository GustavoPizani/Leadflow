import type { NextRequest } from 'next/server';

/**
 * O Leadflow nunca recebe webhook do Meta diretamente (quem recebe é o Real-Sales, que
 * repassa para /api/meta/ingest) — então não há assinatura HMAC do Meta para validar aqui.
 * Em vez disso, o repasse do Real-Sales carrega um segredo compartilhado simples.
 */
export function isValidInternalCall(request: NextRequest): boolean {
  const secret = process.env.LEADFLOW_INTERNAL_SECRET;
  if (!secret) return false;
  return request.headers.get('x-internal-secret') === secret;
}
