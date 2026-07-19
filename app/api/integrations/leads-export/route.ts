import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listLocalUsersByIds } from '@/lib/local-users';
import { isValidSheetsExportCall } from '@/lib/sheets-export-auth';

/**
 * Exportação somente-leitura de leads + corretor atribuído, pro Apps Script da planilha de
 * feedback consultar (é assim que a planilha "base" sabe quem é o corretor de cada linha,
 * já que a roleta que decide isso vive só no banco do Leadflow). Não expõe nada além do que
 * já aparece nas telas /admin/leads para o admin.
 */
export async function GET(request: NextRequest) {
  if (!isValidSheetsExportCall(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const leads = await prisma.leadflowLead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2000,
    include: { form: { select: { name: true } } },
  });

  const assignedIds = leads.map((l) => l.assignedUserId).filter((id): id is string => !!id);
  const localUsers = await listLocalUsersByIds(assignedIds);
  const nameById = new Map(localUsers.map((u) => [u.id, u.name]));

  const data = leads.map((lead) => ({
    id: lead.id,
    externalLeadId: (lead.rawPayload as Record<string, unknown> | null)?.id ?? null,
    createdAt: lead.createdAt.toISOString(),
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    notes: lead.notes,
    status: lead.status,
    formName: lead.form?.name ?? lead.source,
    assignedUserName: lead.assignedUserId ? (nameById.get(lead.assignedUserId) ?? null) : null,
  }));

  return NextResponse.json({ leads: data });
}
