import { Prisma, type LeadflowForm } from '@prisma/client';
import { prisma } from './prisma';
import { assignLead } from './roulette';
import { notifyLeadAssigned, notifyLeadReregistered } from './lead-notifications';

type ExtractedLead = { fullName: string | null; email: string | null; phone: string | null; notes: string | null };

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = Number(key);
      return Number.isInteger(idx) ? acc[idx] : undefined;
    }
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Achata o formato de field_data do Meta Lead Ads (`[{ name, values: [v] }]`,
 * seja no payload direto ou dentro de `entry[].changes[].value.field_data`,
 * como sistemas tipo Zapier/n8n costumam repassar) para `{ name: value }`,
 * mesclado no payload original — assim `fieldMappings` pode apontar direto
 * pro nome do campo do Meta sem tratamento especial na UI.
 */
export function flattenMetaFieldData(payload: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...payload };

  const entryChange = getByPath(payload, 'entry.0.changes.0.value.field_data');
  const candidates = [payload.field_data, entryChange];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const field of candidate) {
      if (field && typeof field === 'object' && 'name' in field) {
        const name = String((field as Record<string, unknown>).name);
        const values = (field as Record<string, unknown>).values;
        flat[name] = Array.isArray(values) ? values[0] : values;
      }
    }
  }

  return flat;
}

const DEFAULT_GUESSES: Record<keyof ExtractedLead, string[]> = {
  fullName: ['full_name', 'fullName', 'name', 'nome'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'phone_number', 'telefone', 'celular', 'whatsapp'],
  notes: ['observacoes', 'observações', 'observations', 'message', 'mensagem', 'comentario', 'comentário'],
};

export function extractLeadFields(
  rawPayload: unknown,
  fieldMappings: Record<string, string> | null,
): ExtractedLead {
  const payload = flattenMetaFieldData(
    typeof rawPayload === 'object' && rawPayload !== null
      ? (rawPayload as Record<string, unknown>)
      : {},
  );

  function resolve(field: keyof ExtractedLead): string | null {
    const mappedPath = fieldMappings?.[field];
    if (mappedPath) {
      const value = getByPath(payload, mappedPath);
      if (value != null && value !== '') return String(value);
    }
    for (const guess of DEFAULT_GUESSES[field]) {
      const value = getByPath(payload, guess);
      if (value != null && value !== '') return String(value);
    }
    return null;
  }

  return {
    fullName: resolve('fullName'),
    email: resolve('email'),
    phone: resolve('phone'),
    notes: resolve('notes'),
  };
}

const DEDUP_WINDOW_DAYS = 30;

export async function findRecentDuplicate(email: string | null, phone: string | null) {
  if (!email && !phone) return null;
  const since = new Date(Date.now() - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  return prisma.leadflowLead.findFirst({
    where: {
      createdAt: { gte: since },
      OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function createAssignedLead(params: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  source: string;
  rawPayload: unknown;
  formId: string | null;
  formName: string | null;
  rouletteId: string | null;
  defaultUserId: string | null;
  /** Quando o formulário externo informa a data real do cadastro (ex: `created_time` do Meta),
   * usamos ela como `createdAt` em vez do momento em que processamos o webhook — evita que um
   * atraso na entrega (ou um backfill/sync) mostre um horário de recebimento errado. */
  occurredAt?: Date | null;
}) {
  const { fullName, email, phone, notes, source, rawPayload, formId, formName, rouletteId, defaultUserId, occurredAt } =
    params;
  const rawPayloadJson = (rawPayload ?? {}) as Prisma.InputJsonValue;
  const createdAt = occurredAt ?? undefined;

  const duplicate = await findRecentDuplicate(email, phone);
  if (duplicate?.assignedUserId) {
    // Recadastro: mesmo e-mail/telefone nos últimos 30 dias E já tinha corretor — cai sempre
    // pro mesmo corretor (não roda a roleta de novo) e dispara uma notificação diferente da de
    // lead novo, pra deixar claro que é um contato que já existia.
    const lead = await prisma.leadflowLead.create({
      data: {
        fullName,
        email,
        phone,
        notes,
        source,
        rawPayload: rawPayloadJson,
        formId,
        roletaId: duplicate.roletaId,
        assignedUserId: duplicate.assignedUserId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        errorReason: `recadastro:${duplicate.id}`,
        createdAt,
      },
    });

    await notifyLeadReregistered({
      leadId: lead.id,
      assignedUserId: duplicate.assignedUserId,
      leadName: fullName,
      formName,
      source,
    });

    return { status: 'REREGISTERED' as const, lead };
  }

  const assignment = await assignLead({ rouletteId, defaultUserId });

  const lead = await prisma.leadflowLead.create({
    data: {
      fullName,
      email,
      phone,
      notes,
      source,
      rawPayload: rawPayloadJson,
      formId,
      roletaId: rouletteId,
      assignedUserId: assignment.status === 'ASSIGNED' ? assignment.userId : null,
      status: assignment.status === 'ASSIGNED' ? 'ASSIGNED' : 'ERROR',
      errorReason: assignment.status === 'ERROR' ? assignment.errorReason : null,
      assignedAt: assignment.status === 'ASSIGNED' ? new Date() : null,
      createdAt,
    },
  });

  if (assignment.status === 'ASSIGNED') {
    await notifyLeadAssigned({
      leadId: lead.id,
      assignedUserId: assignment.userId,
      leadName: fullName,
      formName,
      source,
    });
  }

  return { status: 'CREATED' as const, lead };
}

/** Extrai a data real de cadastro quando o payload traz (`created_time` do Meta Lead Ads). */
function extractOccurredAt(rawPayload: unknown): Date | null {
  if (typeof rawPayload !== 'object' || rawPayload === null) return null;
  const value = (rawPayload as Record<string, unknown>).created_time;
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Captura via webhook: extrai campos do payload cru usando os fieldMappings do form. */
export async function intakeLead(params: { form: LeadflowForm; rawPayload: unknown }) {
  const { form, rawPayload } = params;
  const fieldMappings = (form.fieldMappings as Record<string, string> | null) ?? {};
  const { fullName, email, phone, notes } = extractLeadFields(rawPayload, fieldMappings);

  return createAssignedLead({
    fullName,
    email,
    phone,
    notes,
    source: form.source,
    rawPayload,
    formId: form.id,
    formName: form.name,
    rouletteId: form.roletaId,
    defaultUserId: form.defaultUserId,
    occurredAt: extractOccurredAt(rawPayload),
  });
}

/** Criação manual pelo admin oculto (testes/leads offline) — campos já estruturados. */
export async function createManualLead(params: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  source: string;
  rouletteId: string | null;
  defaultUserId: string | null;
}) {
  return createAssignedLead({
    ...params,
    notes: params.notes ?? null,
    rawPayload: params,
    formId: null,
    formName: null,
  });
}
