import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { listLocalUsersByIds } from '@/lib/local-users';
import { ReassignLead } from '@/components/admin/reassign-lead';
import { LeadDeepLink } from '@/components/lead-deep-link';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Prisma } from '@prisma/client';

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

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
      <h1 className="text-2xl font-semibold">Leads</h1>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Busca</label>
          <Input name="q" defaultValue={q} placeholder="nome, e-mail ou telefone" className="w-56" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Status</label>
          <NativeSelect name="status" defaultValue={status ?? ''} className="w-40">
            <option value="">Todos</option>
            <option value="NEW">NEW</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="ERROR">ERROR</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Roleta</label>
          <NativeSelect name="roletaId" defaultValue={roletaId ?? ''} className="w-48">
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Recebido em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const user = lead.assignedUserId ? localUserById.get(lead.assignedUserId) : null;
            return (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <Link href={leadHref(lead.id)} scroll={false} className="hover:underline">
                    {lead.fullName ?? '—'}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lead.email ?? '—'}
                  <br />
                  {lead.phone ?? '—'}
                </TableCell>
                <TableCell>{lead.source}</TableCell>
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
                  {lead.errorReason && (
                    <p className="mt-1 text-xs text-muted-foreground">{lead.errorReason}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{user ? `${user.name}` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(lead.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <ReassignLead leadId={lead.id} />
                </TableCell>
              </TableRow>
            );
          })}
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum lead encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <LeadDeepLink variant="simple" />
    </div>
  );
}
