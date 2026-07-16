import { prisma } from './prisma';
import { sendPushToUser } from './push';
import { listLocalUsersByIds } from './local-users';
import { getAdminUserIds } from './visibility';

/**
 * Dispara as notificações de um lead recém-atribuído: uma pro corretor (abre o modal completo
 * em /app) e uma pros gestores da(s) equipe(s) dele + admin oculto (abre o modal simples em
 * /gestor e /admin/leads). Nunca lança — quem chama não precisa se preocupar em não quebrar a
 * criação do lead por causa de uma falha de push.
 */
export async function notifyLeadAssigned(params: {
  leadId: string;
  assignedUserId: string;
  leadName: string | null;
  formName: string | null;
  source: string;
}) {
  try {
    const { leadId, assignedUserId, leadName, formName, source } = params;
    const originLabel = formName ?? source;
    const displayName = leadName ?? 'Novo lead';

    const [brokers, teamMemberships, adminIds] = await Promise.all([
      listLocalUsersByIds([assignedUserId]),
      prisma.leadflowTeamMember.findMany({ where: { userId: assignedUserId }, select: { teamId: true } }),
      getAdminUserIds(),
    ]);
    const brokerName = brokers[0]?.name ?? 'Um corretor';

    const teamIds = teamMemberships.map((m) => m.teamId);
    const teams =
      teamIds.length > 0
        ? await prisma.leadflowTeam.findMany({ where: { id: { in: teamIds } }, select: { managerId: true } })
        : [];
    const managerIds = Array.from(new Set(teams.map((t) => t.managerId)));

    const distributedBody = `${brokerName} recebeu ${displayName} via ${originLabel}.`;

    await Promise.allSettled([
      sendPushToUser(assignedUserId, {
        title: '🔔 Novo lead recebido',
        body: `${displayName} chegou via ${originLabel}.`,
        data: { leadId, url: `/app?lead=${leadId}` },
      }),
      ...managerIds.map((managerId) =>
        sendPushToUser(managerId, {
          title: '📊 Novo lead distribuído',
          body: distributedBody,
          data: { leadId, url: `/gestor?lead=${leadId}` },
        }),
      ),
      ...adminIds.map((adminId) =>
        sendPushToUser(adminId, {
          title: '📊 Novo lead distribuído',
          body: distributedBody,
          data: { leadId, url: `/admin/leads?lead=${leadId}` },
        }),
      ),
    ]);
  } catch (err) {
    console.error('[notifyLeadAssigned] falha ao notificar', err);
  }
}
