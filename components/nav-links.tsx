'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm">
      {links.map((link) => {
        const isActive = link.href === '/admin' || link.href === '/gestor' || link.href === '/app'
          ? pathname === link.href
          : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-full px-3 py-1.5 transition-colors',
              isActive
                ? 'bg-gradient-to-r from-blue-600/80 to-sky-500/80 text-white shadow-[0_0_16px_-2px_rgb(33_181_234/0.55)]'
                : 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
