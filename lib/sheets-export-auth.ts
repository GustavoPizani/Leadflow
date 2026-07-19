import type { NextRequest } from 'next/server';

/**
 * Segredo dedicado pra integração de planilhas (Apps Script chamando de fora) — separado do
 * LEADFLOW_INTERNAL_SECRET (que é só entre Real-Sales e Leadflow) pra manter o menor
 * privilégio possível: vazar esse aqui só expõe leitura de leads, não o caminho de ingest.
 */
export function isValidSheetsExportCall(request: NextRequest): boolean {
  const secret = process.env.SHEETS_EXPORT_SECRET;
  if (!secret) return false;
  return request.headers.get('x-internal-secret') === secret;
}
