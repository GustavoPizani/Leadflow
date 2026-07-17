import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getCurrentAccess } from '@/lib/auth-context';
import { leadWhereForAccess, getTeamMemberUserIds } from '@/lib/visibility';
import { listLocalUsersByIds } from '@/lib/local-users';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LeadDeepLink } from '@/components/lead-deep-link';

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default async function GestorDashboardPage() {
  const user = await getCurrentUser();

  const { leads, roulettes, localUserById } = user
    ? await (async () => {
        const access = await getCurrentAccess(user.id);
        const teamIds = access.level === 'GESTOR' ? access.teamIds : [];
        const memberIds = await getTeamMemberUserIds(teamIds);

        const where = await leadWhereForAccess(user.id, access);
        const [leads, roulettes] = await Promise.all([
          prisma.leadflowLead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { form: { select: { name: true } } },
          }),
          prisma.leadflowRoulette.findMany({
            where: { members: { some: { userId: { in: memberIds } } } },
            orderBy: { name: 'asc' },
            include: { members: { orderBy: { lastAssignedAt: 'asc' } } },
          }),
        ]);

        const allIds = Array.from(
          new Set([
            ...leads.map((l) => l.assignedUserId).filter((id): id is string => !!id),
            ...roulettes.flatMap((r) => r.members.map((m) => m.userId)),
          ]),
        );
        const localUsers = await listLocalUsersByIds(allIds);
        return { leads, roulettes, localUserById: new Map(localUsers.map((u) => [u.id, u])) };
      })()
    : { leads: [], roulettes: [], localUserById: new Map<string, { name: string; email: string }>() };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard da equipe</h1>
        <p className="text-sm text-muted-foreground">Leads recebidos pela sua equipe.</p>
      </div>

      {roulettes.map((roulette) => (
        <Card key={roulette.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {roulette.name}
              <Badge variant={roulette.isActive ? 'default' : 'secondary'}>
                {roulette.isActive ? 'Ativa' : 'Inativa'}
              </Badge>
            </CardTitle>
            <CardDescription>Ordem de atendimento — quem está na vez para o próximo lead.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {roulette.members.map((member, index) => {
              const person = localUserById.get(member.userId);
              const isNext = index === 0;
              return (
                <Badge
                  key={member.userId}
                  variant={isNext ? 'default' : 'outline'}
                  className="flex items-center gap-1.5 px-3 py-1"
                >
                  <span className="text-xs opacity-70">#{index + 1}</span>
                  {person?.name ?? member.userId}
                  {isNext && <span className="ml-1 text-xs font-semibold">NA VEZ</span>}
                </Badge>
              );
            })}
            {roulette.members.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum corretor nesta roleta.</p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads da equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leads.map((lead) => {
            const broker = lead.assignedUserId ? localUserById.get(lead.assignedUserId) : null;
            return (
              <Link
                key={lead.id}
                href={`/gestor?lead=${lead.id}`}
                scroll={false}
                className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium">{lead.fullName ?? 'Sem nome'}</span>{' '}
                  <span className="text-muted-foreground">
                    — {lead.form?.name ?? lead.source} — {broker?.name ?? '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={lead.status === 'ASSIGNED' ? 'default' : 'secondary'}>{lead.status}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
                </div>
              </Link>
            );
          })}
          {leads.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lead ainda.</p>}
        </CardContent>
      </Card>

      <LeadDeepLink variant="full" />
    </div>
  );
}
