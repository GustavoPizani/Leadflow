'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createLocalUser, resetLocalUserPassword } from '@/lib/local-users';
import { requireAdmin } from './guards';

export async function createTeamWithNewManager(params: { teamName: string; managerName: string; managerEmail: string }) {
  await requireAdmin();

  const { teamName, managerName, managerEmail } = params;
  if (!teamName.trim() || !managerName.trim() || !managerEmail.trim()) {
    throw new Error('Nome da equipe, nome e e-mail do gestor são obrigatórios.');
  }

  const { localUser, tempPassword } = await createLocalUser({
    name: managerName,
    email: managerEmail,
    role: 'GESTOR',
  });

  const team = await prisma.leadflowTeam.create({
    data: { name: teamName, managerId: localUser.id },
  });

  revalidatePath('/admin/equipes');
  return { team, manager: localUser, tempPassword };
}

export async function deleteTeam(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  if (!id) throw new Error('Id inválido.');

  await prisma.leadflowTeam.delete({ where: { id } });
  revalidatePath('/admin/equipes');
}

export async function addNewTeamMember(params: { teamId: string; name: string; email: string }) {
  await requireAdmin();

  const { teamId, name, email } = params;
  if (!teamId || !name.trim() || !email.trim()) throw new Error('Dados inválidos.');

  const { localUser, tempPassword } = await createLocalUser({ name, email, role: 'CORRETOR' });

  await prisma.leadflowTeamMember.create({ data: { teamId, userId: localUser.id } });

  revalidatePath('/admin/equipes');
  return { member: localUser, tempPassword };
}

export async function addExistingTeamMember(formData: FormData) {
  await requireAdmin();

  const teamId = String(formData.get('teamId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  if (!teamId || !userId) throw new Error('Dados inválidos.');

  await prisma.leadflowTeamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId },
    update: {},
  });
  revalidatePath('/admin/equipes');
}

export async function removeTeamMember(formData: FormData) {
  await requireAdmin();

  const teamId = String(formData.get('teamId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  if (!teamId || !userId) throw new Error('Dados inválidos.');

  await prisma.leadflowTeamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  revalidatePath('/admin/equipes');
}

/** Gera senha temporária nova e força troca no próximo login — para gestor ou corretor já existentes. */
export async function resetTeamMemberPassword(userId: string) {
  await requireAdmin();
  if (!userId) throw new Error('Id inválido.');

  return resetLocalUserPassword(userId);
}
