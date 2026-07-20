import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidSheetsExportCall } from '@/lib/sheets-export-auth';
import { listFormLeadsExtended, getObjectName, type FbLeadExtended, type FbLeadField } from '@/lib/meta-graph';

/**
 * Busca os leads de um formulário do Meta direto na Graph API (usando o token de página que o
 * Leadflow já tem via OAuth) e devolve linhas já no formato exato da planilha de leads
 * (mesma ordem de colunas: id, created_time, ad_id, ad_name, adset_id, adset_name,
 * campaign_id, campaign_name, form_id, form_name, is_organic, platform,
 * quanto_você_pretende_investir?, nome_completo, telefone, email, lead_status).
 *
 * Existe porque a automação de sincronização do próprio Meta (fora do Leadflow) não está
 * trazendo os leads de todo formulário pra planilha — isso é um jeito de puxar os que faltam
 * direto da fonte, formulário por formulário, sob demanda do Apps Script.
 */
function extractField(fieldData: FbLeadField[], keys: string[]): string {
  for (const key of keys) {
    const found = fieldData.find((f) => f.name === key);
    if (found?.values?.[0]) return found.values[0];
  }
  return '';
}

function extractCustomQuestion(fieldData: FbLeadField[], knownKeys: Set<string>): string {
  const other = fieldData.find((f) => !knownKeys.has(f.name));
  return other?.values?.[0] ?? '';
}

const KNOWN_KEYS = new Set(['full_name', 'nome_completo', 'name', 'phone_number', 'telefone', 'phone', 'email']);

export async function GET(request: NextRequest) {
  if (!isValidSheetsExportCall(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const externalFormId = request.nextUrl.searchParams.get('externalFormId');
  if (!externalFormId) {
    return NextResponse.json({ error: 'missing_external_form_id' }, { status: 400 });
  }

  const form = await prisma.leadflowForm.findUnique({
    where: { externalFormId },
    include: { metaConnection: true },
  });
  if (!form || !form.metaConnection) {
    return NextResponse.json({ error: 'form_not_found_or_not_connected' }, { status: 404 });
  }
  const pageToken = form.metaConnection.pageAccessToken;

  const allLeads: FbLeadExtended[] = [];
  let after: string | undefined;
  do {
    const { data, nextAfter } = await listFormLeadsExtended(externalFormId, pageToken, after);
    allLeads.push(...data);
    after = nextAfter ?? undefined;
  } while (after);

  const nameCache = new Map<string, string>();
  async function nameFor(id: string | undefined): Promise<string> {
    if (!id) return '';
    if (!nameCache.has(id)) nameCache.set(id, await getObjectName(id, pageToken));
    return nameCache.get(id)!;
  }

  const rows: (string | boolean)[][] = [];
  for (const lead of allLeads) {
    const fieldData = lead.field_data ?? [];
    const nomeCompleto = extractField(fieldData, ['full_name', 'nome_completo', 'name']);
    const telefone = extractField(fieldData, ['phone_number', 'telefone', 'phone']);
    const email = extractField(fieldData, ['email']);
    const pergunta = extractCustomQuestion(fieldData, KNOWN_KEYS);

    rows.push([
      `l:${lead.id}`,
      lead.created_time,
      lead.ad_id ? `ag:${lead.ad_id}` : '',
      await nameFor(lead.ad_id),
      lead.adset_id ? `as:${lead.adset_id}` : '',
      await nameFor(lead.adset_id),
      lead.campaign_id ? `c:${lead.campaign_id}` : '',
      await nameFor(lead.campaign_id),
      `f:${externalFormId}`,
      form.name,
      lead.is_organic ?? false,
      lead.platform ?? '',
      pergunta,
      nomeCompleto,
      telefone ? `p:${telefone}` : '',
      email,
      'CREATED',
    ]);
  }

  return NextResponse.json({ rows });
}
