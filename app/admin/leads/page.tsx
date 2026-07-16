import Link from 'next/link';
import { Search } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { listLocalUsersByIds } from '@/lib/local-users';
import { ReassignLead } from '@/components/admin/reassign-lead';
import { LeadDeepLink } from '@/components/lead-deep-link';
import { MiniAvatar } from '@/components/mini-avatar';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Prisma } from '@prisma/client';

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

const STATUS_LABEL: Record<string, string> = { NEW: 'Novo', ASSIGNED: 'Atribuído', ERROR: 'Erro' };

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { status?: string; roletaId?: string; q?: string };
}) {
  const { status, roletaId, q } = searchParams;

  const where: Prisma.LeadflowLeadWhereInput = {
    ...(status ? { status: status as 'NEW' | 'ASSIGNED' | 'ERROR' } : {}),
    ...(roletaId ? { roletaId } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [leads, roulettes] = await Promise.all([
    prisma.leadflowLead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.leadflowRoulette.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const assignedIds = leads.map((l) => l.assignedUserId).filter((id): id is string => !!id);
  const localUsers = await listLocalUsersByIds(assignedIds);
  const localUserById = new Map(localUsers.map((u) => [u.id, u]));

  function leadHref(leadId: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (roletaId) params.set('roletaId', roletaId);
    if (q) params.set('q', q);
    params.set('lead', leadId);
    return `/admin/leads?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">{leads.length} lead(s) encontrados.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Busca</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input name="q" defaultValue={q} placeholder="Nome, e-mail ou telefone" className="pl-8" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <NativeSelect name="status" defaultValue={status ?? ''} className="w-36">
                <option value="">Todos</option>
                <option value="NEW">Novo</option>
                <option value="ASSIGNED">Atribuído</option>
                <option value="ERROR">Erro</option>
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Roleta</label>
              <NativeSelect name="roletaId" defaultValue={roletaId ?? ''} className="w-44">
                <option value="">Todas</option>
                {roulettes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Nome</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Contato</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Origem</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Responsável</TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Recebido em</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const user = lead.assignedUserId ? localUserById.get(lead.assignedUserId) : null;
              return (
                <TableRow key={lead.id}>
                  <TableCell className="max-w-[220px] font-medium">
                    <Link
                      href={leadHref(lead.id)}
                      scroll={false}
                      className="block truncate hover:underline"
                      title={lead.fullName ?? undefined}
                    >
                      {lead.fullName ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                    <div className="truncate" title={lead.email ?? undefined}>
                      {lead.email ?? '—'}
                    </div>
                    <div className="truncate">{lead.phone ?? '—'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.source}</Badge>
                  </TableCell>
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
                      {STATUS_LABEL[lead.status] ?? lead.status}
                    </Badge>
                    {lead.errorReason && (
                      <p className="mt-1 max-w-[160px] truncate text-xs text-muted-foreground" title={lead.errorReason}>
                        {lead.errorReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {user ? (
                      <div className="flex items-center gap-2">
                        <MiniAvatar name={user.name} />
                        <span className="max-w-[120px] truncate text-sm">{user.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <ReassignLead leadId={lead.id} leadName={lead.fullName} />
                  </TableCell>
                </TableRow>
              );
            })}
            {leads.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <LeadDeepLink variant="simple" />
    </div>
  );
}
