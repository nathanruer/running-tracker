'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, User, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchProfileData, prefetchDashboardData, prefetchChatData } from '@/lib/services/prefetch';

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isActive = (href: string) => {
    if (href === '/chat') {
      return pathname.startsWith('/chat');
    }
    return pathname === href;
  };

  return (
    <header className="hidden md:block border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-20 items-center px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            onMouseEnter={() => {
              prefetchDashboardData(queryClient);
              router.prefetch('/dashboard');
            }}
            className="group flex items-center gap-3 active:scale-95 transition-all text-left"
          >
            <span className="text-2xl font-black text-primary tracking-tight">
              Running Tracker
            </span>
          </button>
        </div>

        <nav className="ml-auto flex items-center gap-1.5">
          <Button
            data-testid="nav-dashboard"
            variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
            onClick={() => router.push('/dashboard')}
            onMouseEnter={() => {
              prefetchDashboardData(queryClient);
              router.prefetch('/dashboard');
            }}
            className={`h-11 px-5 rounded-xl font-bold active:scale-95 transition-all border-none ${isActive('/dashboard') ? 'bg-violet-600/10 text-violet-600' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>

          <Button
            data-testid="nav-chat"
            variant={isActive('/chat') ? 'secondary' : 'ghost'}
            onClick={() => router.push('/chat')}
            onMouseEnter={() => {
              prefetchChatData(queryClient);
              router.prefetch('/chat');
            }}
            className={`h-11 px-5 rounded-xl font-bold active:scale-95 transition-all border-none ${isActive('/chat') ? 'bg-violet-600/10 text-violet-600' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Coach IA
          </Button>

          <Button
            data-testid="nav-profile"
            variant={isActive('/profile') ? 'secondary' : 'ghost'}
            onClick={() => router.push('/profile')}
            onMouseEnter={() => {
              prefetchProfileData(queryClient);
              router.prefetch('/profile');
            }}
            className={`h-11 px-5 rounded-xl font-bold active:scale-95 transition-all border-none ${isActive('/profile') ? 'bg-violet-600/10 text-violet-600' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            <User className="h-4 w-4 mr-2" />
            Profil
          </Button>
        </nav>
      </div>
    </header>
  );
}
