import { prisma } from '@/lib/prisma';
import { listLocalUsersByIds } from '@/lib/local-users';
import { deleteTeam, removeTeamMember } from '@/lib/actions/teams';
import { NewTeamForm } from '@/components/admin/new-team-form';
import { AddTeamMemberForm } from '@/components/admin/add-team-member-form';
import { ResetPasswordButton } from '@/components/admin/reset-password-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function EquipesPage() {
  const teams = await prisma.leadflowTeam.findMany({
    orderBy: { createdAt: 'desc' },
    include: { members: true },
  });

  const allUserIds = Array.from(
    new Set([...teams.map((t) => t.managerId), ...teams.flatMap((t) => t.members.map((m) => m.userId))]),
  );
  const localUsers = await listLocalUsersByIds(allUserIds);
  const localUserById = new Map(localUsers.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipes</h1>
        <p className="text-sm text-muted-foreground">
          Gestor e corretores são contas novas, criadas exclusivamente para o Leadflow.
        </p>
      </div>

      <NewTeamForm />

      <div className="space-y-4">
        {teams.map((team) => {
          const manager = localUserById.get(team.managerId);
          return (
            <Card key={team.id}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <p className="break-words text-sm text-muted-foreground">
                    Gestor: {manager ? `${manager.name} (${manager.email})` : team.managerId}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {manager && (
                    <ResetPasswordButton userId={manager.id} name={manager.name} email={manager.email} />
                  )}
                  <form action={deleteTeam}>
                    <input type="hidden" name="id" value={team.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Excluir equipe
                    </Button>
                  </form>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Corretores</p>
                  <div className="space-y-1">
                    {team.members.map((m) => {
                      const user = localUserById.get(m.userId);
                      return (
                        <div
                          key={m.userId}
                          className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="break-words">{user ? `${user.name} (${user.email})` : m.userId}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {user && <ResetPasswordButton userId={user.id} name={user.name} email={user.email} />}
                            <form action={removeTeamMember}>
                              <input type="hidden" name="teamId" value={team.id} />
                              <input type="hidden" name="userId" value={m.userId} />
                              <Button type="submit" size="sm" variant="ghost">
                                Remover
                              </Button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                    {team.members.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhum corretor ainda.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Adicionar corretor</p>
                  <AddTeamMemberForm teamId={team.id} />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {teams.length === 0 && <p className="text-muted-foreground">Nenhuma equipe ainda.</p>}
      </div>
    </div>
  );
}
