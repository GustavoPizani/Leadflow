'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/actions/auth';

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {links.map((link) => {
          const isActive =
            link.href === '/admin' || link.href === '/gestor' || link.href === '/app'
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <DropdownMenuItem
              key={link.href}
              render={<Link href={link.href} />}
              className={cn(isActive && 'bg-accent text-accent-foreground')}
            >
              {link.label}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
