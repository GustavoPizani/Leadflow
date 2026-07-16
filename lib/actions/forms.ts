'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { listFormLeads } from '@/lib/meta-graph';
import { intakeLead } from '@/lib/lead-intake';
import { requireAdmin } from './guards';

function parseFieldMappings(raw: string): Record<string, string> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error('fieldMappings precisa ser um JSON de objeto válido, ex: {"email":"lead.email"}');
  }
}

export async function createForm(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const source = String(formData.get('source') ?? '').trim();
  const roletaId = String(formData.get('roletaId') ?? '') || null;
  const defaultUserId = String(formData.get('defaultUserId') ?? '').trim() || null;
  const fieldMappings = parseFieldMappings(String(formData.get('fieldMappings') ?? ''));
  if (!name || !source) throw new Error('Nome e origem são obrigatórios.');

  await prisma.leadflowForm.create({
    data: {
      name,
      source,
      roletaId,
      defaultUserId,
      fieldMappings,
      webhookSecret: randomBytes(24).toString('hex'),
    },
  });

  revalidatePath('/admin/formularios');
}

export async function updateForm(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const source = String(formData.get('source') ?? '').trim();
  const roletaId = String(formData.get('roletaId') ?? '') || null;
  const defaultUserId = String(formData.get('defaultUserId') ?? '').trim() || null;
  const fieldMappings = parseFieldMappings(String(formData.get('fieldMappings') ?? ''));
  if (!id || !name || !source) throw new Error('Dados inválidos.');

  await prisma.leadflowForm.update({
    where: { id },
    data: { name, source, roletaId, defaultUserId, fieldMappings },
  });

  revalidatePath('/admin/formularios');
}

export async function toggleFormActive(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const isActive = String(formData.get('isActive') ?? '') === 'true';
  if (!id) throw new Error('Id inválido.');

  await prisma.leadflowForm.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath('/admin/formularios');
}

export async function regenerateWebhookSecret(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Id inválido.');

  await prisma.leadflowForm.update({
    where: { id },
    data: { webhookSecret: randomBytes(24).toString('hex') },
  });
  revalidatePath('/admin/formularios');
}

export async function deleteForm(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Id inválido.');

  await prisma.leadflowForm.delete({ where: { id } });
  revalidatePath('/admin/formularios');
}

/**
 * Vincula um leadgen form do Meta ao Leadflow: cria ou atualiza o LeadflowForm identificado
 * por `externalFormId` (form_id do Meta). `fieldMappings` vem da UI de mapeamento por
 * pergunta (mesmo padrão do Real-Sales): { fullName: 'question_key', email: 'question_key',
 * phone: 'question_key' } — perguntas marcadas como "Ignorar" simplesmente não entram aqui.
 * Se vier vazio, lib/lead-intake.ts já cai no auto-detect por nome de campo.
 */
export async function linkMetaForm(params: {
  metaConnectionId: string;
  externalFormId: string;
  name: string;
  roletaId?: string | null;
  defaultUserId?: string | null;
  fieldMappings?: Record<string, string>;
}) {
  await requireAdmin();

  const { metaConnectionId, externalFormId, name } = params;
  if (!metaConnectionId || !externalFormId || !name.trim()) {
    throw new Error('Dados inválidos para vincular o formulário do Meta.');
  }
  const fieldMappings = params.fieldMappings ?? {};

  await prisma.leadflowForm.upsert({
    where: { externalFormId },
    create: {
      name,
      source: 'meta',
      externalFormId,
      metaConnectionId,
      roletaId: params.roletaId || null,
      defaultUserId: params.defaultUserId || null,
      fieldMappings,
      webhookSecret: randomBytes(24).toString('hex'),
    },
    update: {
      name,
      metaConnectionId,
      roletaId: params.roletaId || null,
      defaultUserId: params.defaultUserId || null,
      fieldMappings,
    },
  });

  revalidatePath('/admin/formularios');
}

/**
 * Backfill manual: pagina os leads do formulário direto na Graph API e roda cada um pela
 * mesma esteira de intake/roleta. Serve de rede de segurança se algum push de webhook do
 * Real-Sales -> /api/meta/ingest falhar.
 */
export async function syncMetaFormNow(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Id inválido.');

  const form = await prisma.leadflowForm.findUnique({
    where: { id },
    include: { metaConnection: true },
  });
  if (!form || !form.externalFormId || !form.metaConnection) {
    throw new Error('Este formulário não está vinculado a uma página do Meta.');
  }

  let after: string | undefined;
  let processed = 0;

  do {
    const { data, nextAfter } = await listFormLeads(
      form.externalFormId,
      form.metaConnection.pageAccessToken,
      after,
    );
    if (data.length === 0) break;

    for (const lead of data) {
      await intakeLead({ form, rawPayload: lead });
      processed++;
    }
    after = nextAfter ?? undefined;
  } while (after);

  console.log(`[syncMetaFormNow] form ${id}: ${processed} lead(s) processados`);
  revalidatePath('/admin/formularios');
}
