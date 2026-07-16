import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-context';
import { ChangePasswordForm } from '@/components/change-password-form';

export default async function TrocarSenhaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Troque sua senha</h1>
          <p className="text-sm text-muted-foreground">
            Esta é uma senha temporária. Defina uma senha nova para continuar.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
