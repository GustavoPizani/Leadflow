import { signOut } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { NavLinks } from '@/components/nav-links';
import { MobileNav } from '@/components/mobile-nav';

export function NavShell({
  title,
  links,
  children,
}: {
  title: string;
  links: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-grid">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <span className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_12px_2px_rgb(33_181_234/0.6)]" />
              <span className="text-gradient">{title}</span>
            </span>
            <div className="hidden md:block">
              <NavLinks links={links} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <form action={signOut} className="hidden md:block">
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
            <MobileNav links={links} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
