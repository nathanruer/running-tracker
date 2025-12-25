'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, MessageSquare, User } from 'lucide-react';

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/chat', label: 'Coach IA', icon: MessageSquare },
    { href: '/profile', label: 'Profil', icon: User },
  ];

  const isActive = (href: string) => {
    if (href === '/chat') {
      return pathname.startsWith('/chat');
    }
    return pathname === href;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-around px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'fill-primary/20' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
