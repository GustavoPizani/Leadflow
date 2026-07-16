'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getAccessLevel } from '@/lib/access-level';
import { leadWhereForAccess } from '@/lib/visibility';
import { listLocalUsersByIds } from '@/lib/local-users';
import { flattenMetaFieldData } from '@/lib/lead-intake';
import { requireAdmin } from './guards';

export async function reassignLead(formData: FormData) {
  await requireAdmin();

  const leadId = String(formData.get('leadId') ?? '');
  const userId = String(formData.get('userId') ?? '').trim();
  if (!leadId || !userId) throw new Error('Dados inválidos.');

  const isAdmin = await prisma.leadflowAdminUser.findUnique({ where: { userId } });
  if (isAdmin) throw new Error('Não é possível atribuir um lead ao admin oculto.');

  await prisma.leadflowLead.update({
    where: { id: leadId },
    data: { assignedUserId: userId, status: 'ASSIGNED', assignedAt: new Date(), errorReason: null },
  });
  revalidatePath('/admin/leads');
}

const NOISE_KEYS = new Set([
  'entry',
  'object',
  'id',
  'created_time',
  'field_data',
  'form_id',
  'page_id',
  'leadgen_id',
]);

/**
 * Busca um lead pro modal (simples ou completo), respeitando o mesmo filtro de visibilidade
 * usado nas listagens (lib/visibility.ts) — admin vê qualquer um, gestor só da própria equipe,
 * corretor só o que é dele. Usado tanto pelo deep-link da notificação quanto por clique direto
 * na lista.
 */
export async function getLeadForModal(leadId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const access = await getAccessLevel(user.id);
  const where = await leadWhereForAccess(user.id, access);

  const lead = await prisma.leadflowLead.findFirst({
    where: { id: leadId, ...where },
    include: { form: { select: { name: true } } },
  });
  if (!lead) throw new Error('Lead não encontrado ou sem permissão para vê-lo.');

  const assignedUser = lead.assignedUserId ? (await listLocalUsersByIds([lead.assignedUserId]))[0] : null;

  const flat = flattenMetaFieldData(
    typeof lead.rawPayload === 'object' && lead.rawPayload !== null
      ? (lead.rawPayload as Record<string, unknown>)
      : {},
  );
  const responses: Record<string, string> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (NOISE_KEYS.has(key) || value == null || value === '') continue;
    responses[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }

  return {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    formName: lead.form?.name ?? null,
    status: lead.status,
    createdAt: lead.createdAt.toISOString(),
    assignedAt: lead.assignedAt?.toISOString() ?? null,
    assignedUserName: assignedUser?.name ?? null,
    assignedUserEmail: assignedUser?.email ?? null,
    responses,
  };
}
