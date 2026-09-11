'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from './guards';

/**
 * Cria ou atualiza uma roleta e sincroniza a lista de membros num único save, igual ao
 * fluxo do Real-Sales (diálogo único de criar/editar, sem add/remove ponto a ponto na tela).
 * `constante` (roleta 24h) manda `validFrom`/`validUntil` como null — a roleta vale "desde
 * sempre"/"para sempre", sem janela de validade.
 */
export async function saveRoulette(params: {
  id?: string;
  name: string;
  isActive: boolean;
  constante: boolean;
  validFrom: string | null;
  validUntil: string | null;
  startTime?: string | null;
  endTime?: string | null;
  holdingStartTime?: string | null;
  holdingEndTime?: string | null;
  drawTimes?: string | null;
  drawCountPerDay?: number | null;
  joinSlug?: string | null;
  joinLinkActive?: boolean | null;
  joinWindowMinutes?: number | null;
  joinExpiresAt?: string | null;
  memberIds: string[];
}) {
  await requireAdmin();

  const name = params.name.trim();
  if (!name) throw new Error('Nome é obrigatório.');

  const validFrom = params.constante || !params.validFrom ? null : new Date(params.validFrom);
  const validUntil = params.constante || !params.validUntil ? null : new Date(params.validUntil);
  const startTime = params.startTime?.trim() || '08:00';
  const endTime = params.endTime?.trim() || '20:00';
  const holdingStartTime = params.holdingStartTime?.trim() || '20:00';
  const holdingEndTime = params.holdingEndTime?.trim() || '08:00';
  const drawTimes = params.drawTimes?.trim() || '09:00,14:00,18:00';
  const drawCountPerDay = params.drawCountPerDay ?? 3;
  const joinWindowMinutes = params.joinWindowMinutes ?? 30;
  const joinSlug = params.joinSlug?.trim() || null;
  const joinLinkActive = params.joinLinkActive ?? false;
  const joinExpiresAt = params.joinExpiresAt ? new Date(params.joinExpiresAt) : null;
  const memberIds = Array.from(new Set(params.memberIds));

  const data = {
    name,
    isActive: params.isActive,
    validFrom,
    validUntil,
    startTime,
    endTime,
    holdingStartTime,
    holdingEndTime,
    drawTimes,
    drawCountPerDay,
    joinSlug,
    joinLinkActive,
    joinWindowMinutes,
    joinExpiresAt,
  };

  const roulette = params.id
    ? await prisma.leadflowRoulette.update({
        where: { id: params.id },
        data,
      })
    : await prisma.leadflowRoulette.create({ data });

  const existing = await prisma.leadflowRouletteMember.findMany({
    where: { rouletteId: roulette.id },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((m) => m.userId));
  const toAdd = memberIds.filter((id) => !existingIds.has(id));
  const toRemove = Array.from(existingIds).filter((id) => !memberIds.includes(id));

  await prisma.$transaction([
    ...(toAdd.length > 0
      ? [
          prisma.leadflowRouletteMember.createMany({
            data: toAdd.map((userId) => ({ rouletteId: roulette.id, userId })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(toRemove.length > 0
      ? [
          prisma.leadflowRouletteMember.deleteMany({
            where: { rouletteId: roulette.id, userId: { in: toRemove } },
          }),
        ]
      : []),
  ]);

  revalidatePath('/admin/roletas');
  return { id: roulette.id };
}

/** Liga/desliga sem mexer em membros ou período de validade — usado no Switch inline da tabela. */
export async function toggleRouletteActive(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const isActive = String(formData.get('isActive') ?? '') === 'true';
  if (!id) throw new Error('Id inválido.');

  await prisma.leadflowRoulette.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath('/admin/roletas');
}

export async function deleteRoulette(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Id inválido.');

  await prisma.leadflowRoulette.delete({ where: { id } });
  revalidatePath('/admin/roletas');
}
