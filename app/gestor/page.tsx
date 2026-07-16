import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getAccessLevel } from '@/lib/access-level';
import { leadWhereForAccess } from '@/lib/visibility';
import { listLocalUsersByIds } from '@/lib/local-users';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadDeepLink } from '@/components/lead-deep-link';

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default async function GestorDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const leads = user
    ? await (async () => {
        const access = await getAccessLevel(user.id);
        const where = await leadWhereForAccess(user.id, access);
        return prisma.leadflowLead.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { form: { select: { name: true } } },
        });
      })()
    : [];

  const assignedIds = leads.map((l) => l.assignedUserId).filter((id): id is string => !!id);
  const localUsers = await listLocalUsersByIds(assignedIds);
  const localUserById = new Map(localUsers.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard da equipe</h1>
        <p className="text-sm text-muted-foreground">Leads recebidos pelos corretores da sua equipe.</p>
      </div>

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

      <LeadDeepLink variant="simple" />
    </div>
  );
}
