import { Inbox, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { listLocalUsersByIds } from '@/lib/local-users';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/admin/stat-card';

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default async function AdminDashboardPage() {
  const [total, byStatus, sourceRows, recentLeads] = await Promise.all([
    prisma.leadflowLead.count(),
    prisma.leadflowLead.groupBy({ by: ['status'], _count: true }),
    prisma.leadflowLead.findMany({ select: { source: true, form: { select: { name: true } } } }),
    prisma.leadflowLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { form: { select: { name: true } } },
    }),
  ]);

  const assignedIds = recentLeads.map((l) => l.assignedUserId).filter((id): id is string => !!id);
  const localUsers = await listLocalUsersByIds(assignedIds);
  const localUserById = new Map(localUsers.map((u) => [u.id, u]));

  const statusCount = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

  // Agrupa "por origem" pelo nome do formulário quando existe — só cai no `source` cru
  // (ex: "manual") pra leads sem formulário vinculado.
  const bySourceMap = new Map<string, number>();
  for (const row of sourceRows) {
    const label = row.form?.name ?? row.source;
    bySourceMap.set(label, (bySourceMap.get(label) ?? 0) + 1);
  }
  const bySource = Array.from(bySourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da captura e distribuição de leads.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total de leads" value={total} icon={Inbox} tone="blue" />
        <StatCard label="Atribuídos" value={statusCount.ASSIGNED ?? 0} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Novos" value={statusCount.NEW ?? 0} icon={Sparkles} tone="amber" />
        <StatCard label="Erro" value={statusCount.ERROR ?? 0} icon={AlertTriangle} tone="rose" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por origem</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {bySource.map((s) => (
            <Badge key={s.label} variant="outline">
              {s.label}: {s.count}
            </Badge>
          ))}
          {bySource.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 20 leads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Recebido em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLeads.map((lead) => {
                const user = lead.assignedUserId ? localUserById.get(lead.assignedUserId) : null;
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.fullName ?? '—'}</TableCell>
                    <TableCell>{lead.form?.name ?? lead.source}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.status === 'ASSIGNED'
                            ? 'default'
                            : lead.status === 'ERROR'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user ? user.name : lead.errorReason ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {recentLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum lead ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
