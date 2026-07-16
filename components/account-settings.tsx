import { redirect } from 'next/navigation';
import { getCurrentUser, getCurrentAccess } from '@/lib/auth-context';
import { getCrmUserById } from '@/lib/crm-users';
import { listLocalUsersByIds } from '@/lib/local-users';
import { ChangePasswordForm } from '@/components/change-password-form';
import { PushSettings } from '@/components/push-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/** Conteúdo da página "Minha conta", reaproveitado nas três áreas (admin/gestor/app). */
export async function AccountSettings() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const access = await getCurrentAccess(user.id);
  const name =
    access.level === 'ADMIN'
      ? ((await getCrmUserById(user.id))?.name ?? user.email ?? '')
      : ((await listLocalUsersByIds([user.id]))[0]?.name ?? user.email ?? '');

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Minha conta</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Nome:</span> {name}
          </p>
          <p>
            <span className="text-muted-foreground">E-mail:</span> {user.email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trocar senha</CardTitle>
          <CardDescription>Você não precisa esperar um reset do admin para trocar sua senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <PushSettings />
    </div>
  );
}
