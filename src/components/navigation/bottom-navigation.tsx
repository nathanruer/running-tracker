'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, User, LayoutDashboard } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchDataForRoute } from '@/lib/services/prefetch';

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isActive = (href: string) => {
    if (href === '/chat') {
      return pathname.startsWith('/chat');
    }
    return pathname === href;
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/chat', label: 'Coach IA', icon: MessageSquare },
    { href: '/profile', label: 'Profil', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              onMouseEnter={() => {
                prefetchDataForRoute(queryClient, item.href);
                router.prefetch(item.href);
              }}
              onTouchStart={() => {
                prefetchDataForRoute(queryClient, item.href);
                router.prefetch(item.href);
              }}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full active:scale-95 transition-all ${
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
