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
  memberIds: string[];
}) {
  await requireAdmin();

  const name = params.name.trim();
  if (!name) throw new Error('Nome é obrigatório.');

  const validFrom = params.constante || !params.validFrom ? null : new Date(params.validFrom);
  const validUntil = params.constante || !params.validUntil ? null : new Date(params.validUntil);
  const memberIds = Array.from(new Set(params.memberIds));

  const roulette = params.id
    ? await prisma.leadflowRoulette.update({
        where: { id: params.id },
        data: { name, isActive: params.isActive, validFrom, validUntil },
      })
    : await prisma.leadflowRoulette.create({
        data: { name, isActive: params.isActive, validFrom, validUntil },
      });

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
