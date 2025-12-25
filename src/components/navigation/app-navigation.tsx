'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/chat') {
      return pathname.startsWith('/chat');
    }
    return pathname === href;
  };

  return (
    <header className="hidden md:block border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex p-4 items-center">
        <div className="mr-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg text-4xl font-bold text-gradient hover:opacity-80 transition-opacity"
          >
            Running Tracker
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={isActive('/chat') ? 'secondary' : 'ghost'}
            onClick={() => router.push('/chat')}
            className={isActive('/chat') ? 'bg-muted' : ''}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Coach IA
          </Button>

          <Button
            variant={isActive('/profile') ? 'secondary' : 'ghost'}
            onClick={() => router.push('/profile')}
            className={isActive('/profile') ? 'bg-muted' : ''}
          >
            <User className="h-4 w-4 mr-2" />
            Profil
          </Button>
        </div>
      </div>
    </header>
  );
}
