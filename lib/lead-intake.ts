import { Prisma, type LeadflowForm } from '@prisma/client';
import { prisma } from './prisma';
import { assignLead } from './roulette';
import { notifyLeadAssigned } from './lead-notifications';

type ExtractedLead = { fullName: string | null; email: string | null; phone: string | null };

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

  return { fullName: resolve('fullName'), email: resolve('email'), phone: resolve('phone') };
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
  source: string;
  rawPayload: unknown;
  formId: string | null;
  formName: string | null;
  rouletteId: string | null;
  defaultUserId: string | null;
}) {
  const { fullName, email, phone, source, rawPayload, formId, formName, rouletteId, defaultUserId } = params;
  const rawPayloadJson = (rawPayload ?? {}) as Prisma.InputJsonValue;

  const duplicate = await findRecentDuplicate(email, phone);
  if (duplicate) {
    // Loga a tentativa mesmo sendo duplicata, mas não dispara a roleta de novo.
    await prisma.leadflowLead.create({
      data: {
        fullName,
        email,
        phone,
        source,
        rawPayload: rawPayloadJson,
        formId,
        status: 'NEW',
        errorReason: `duplicado_30_dias:${duplicate.id}`,
      },
    });
    return { status: 'DUPLICATE' as const, existingLeadId: duplicate.id };
  }

  const assignment = await assignLead({ rouletteId, defaultUserId });

  const lead = await prisma.leadflowLead.create({
    data: {
      fullName,
      email,
      phone,
      source,
      rawPayload: rawPayloadJson,
      formId,
      roletaId: rouletteId,
      assignedUserId: assignment.status === 'ASSIGNED' ? assignment.userId : null,
      status: assignment.status === 'ASSIGNED' ? 'ASSIGNED' : 'ERROR',
      errorReason: assignment.status === 'ERROR' ? assignment.errorReason : null,
      assignedAt: assignment.status === 'ASSIGNED' ? new Date() : null,
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

/** Captura via webhook: extrai campos do payload cru usando os fieldMappings do form. */
export async function intakeLead(params: { form: LeadflowForm; rawPayload: unknown }) {
  const { form, rawPayload } = params;
  const fieldMappings = (form.fieldMappings as Record<string, string> | null) ?? {};
  const { fullName, email, phone } = extractLeadFields(rawPayload, fieldMappings);

  return createAssignedLead({
    fullName,
    email,
    phone,
    source: form.source,
    rawPayload,
    formId: form.id,
    formName: form.name,
    rouletteId: form.roletaId,
    defaultUserId: form.defaultUserId,
  });
}

/** Criação manual pelo admin oculto (testes/leads offline) — campos já estruturados. */
export async function createManualLead(params: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  rouletteId: string | null;
  defaultUserId: string | null;
}) {
  return createAssignedLead({ ...params, rawPayload: params, formId: null, formName: null });
}
