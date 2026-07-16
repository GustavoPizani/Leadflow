import { prisma } from '@/lib/prisma';
import { listAllLocalUsers, listLocalUsersByIds } from '@/lib/local-users';
import { RouletteDialog } from '@/components/admin/roulette-dialog';
import { RouletteActiveSwitch } from '@/components/admin/roulette-active-switch';
import { DeleteRouletteButton } from '@/components/admin/delete-roulette-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RotateCcw, Users, Pencil } from 'lucide-react';

function formatDate(d: Date | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default async function RoletasPage() {
  const [roulettes, allUsers] = await Promise.all([
    prisma.leadflowRoulette.findMany({
      orderBy: { createdAt: 'desc' },
      include: { members: true },
    }),
    listAllLocalUsers(),
  ]);

  const allUserIds = Array.from(new Set(roulettes.flatMap((r) => r.members.map((m) => m.userId))));
  const localUsers = await listLocalUsersByIds(allUserIds);
  const localUserById = new Map(localUsers.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Roletas</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Roletas configuradas</CardTitle>
              <CardDescription>Distribuição round-robin de leads entre corretores.</CardDescription>
            </div>
          </div>
          <RouletteDialog
            allUsers={allUsers}
            trigger={
              <Button type="button" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Nova roleta
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {roulettes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma roleta configurada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Corretores</TableHead>
                  <TableHead>Período de validade</TableHead>
                  <TableHead>Último atribuído</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roulettes.map((roulette) => {
                  const members = roulette.members
                    .map((m) => localUserById.get(m.userId))
                    .filter((u): u is NonNullable<typeof u> => !!u);
                  const lastAssigned = [...roulette.members].sort((a, b) => {
                    const at = a.lastAssignedAt?.getTime() ?? 0;
                    const bt = b.lastAssignedAt?.getTime() ?? 0;
                    return bt - at;
                  })[0];
                  const lastAssignedUser = lastAssigned?.lastAssignedAt
                    ? localUserById.get(lastAssigned.userId)
                    : null;

                  return (
                    <TableRow key={roulette.id}>
                      <TableCell className="font-medium">{roulette.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RouletteActiveSwitch id={roulette.id} isActive={roulette.isActive} />
                          <Badge variant={roulette.isActive ? 'default' : 'secondary'}>
                            {roulette.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="mr-1 text-xs text-muted-foreground">{members.length}</span>
                          {members.slice(0, 3).map((u) => (
                            <Badge key={u.id} variant="outline" className="text-xs">
                              {u.name}
                            </Badge>
                          ))}
                          {members.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{members.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {roulette.validFrom || roulette.validUntil ? (
                          <>
                            De: {roulette.validFrom ? formatDate(roulette.validFrom) : 'desde sempre'}
                            <br />
                            Até: {roulette.validUntil ? formatDate(roulette.validUntil) : 'para sempre'}
                          </>
                        ) : (
                          'Constante (24h)'
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lastAssignedUser ? lastAssignedUser.name : 'Nenhum'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(roulette.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <RouletteDialog
                            allUsers={allUsers}
                            roulette={{
                              id: roulette.id,
                              name: roulette.name,
                              isActive: roulette.isActive,
                              validFrom: roulette.validFrom,
                              validUntil: roulette.validUntil,
                              memberIds: roulette.members.map((m) => m.userId),
                            }}
                            trigger={
                              <Button type="button" variant="ghost" size="icon-sm">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DeleteRouletteButton id={roulette.id} name={roulette.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
