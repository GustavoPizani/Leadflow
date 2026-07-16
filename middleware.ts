import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Só cuida de sessão (autenticado ou não). A checagem de nível de acesso
 * (ADMIN/GESTOR/USUARIO) usa Prisma e roda nos layouts de cada seção
 * (app/admin/layout.tsx etc), que executam em runtime Node — o middleware
 * roda em Edge runtime, onde o Prisma Client não funciona.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login');
  const isChangePasswordRoute = pathname.startsWith('/trocar-senha');
  const isProtectedRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/gestor') || pathname.startsWith('/app');

  if (!user && (isProtectedRoute || isChangePasswordRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Conta com senha temporária (recém-criada ou resetada pelo admin) — barra o resto do
  // app até trocar a senha em /trocar-senha, que zera essa flag no user_metadata.
  const mustChangePassword = user?.user_metadata?.must_change_password === true;

  if (user && mustChangePassword && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/trocar-senha';
    return NextResponse.redirect(url);
  }

  if (user && !mustChangePassword && isChangePasswordRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
