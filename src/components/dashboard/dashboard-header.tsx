import { Plus, User as UserIcon, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { getCurrentUser, getSessions } from '@/lib/services/api-client';

interface DashboardHeaderProps {
  onNewSession?: () => void;
}

export function DashboardHeader({ onNewSession }: DashboardHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-4xl font-bold text-gradient">Running Tracker</h1>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onNewSession}
          className="gradient-violet"
          disabled={!onNewSession}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle séance
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/chat')}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Bob - ton coach IA
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/profile')}
          onMouseEnter={() => {
            queryClient.prefetchQuery({
              queryKey: ['user'],
              queryFn: getCurrentUser,
              staleTime: 10 * 60 * 1000,
            });
            queryClient.prefetchQuery({
              queryKey: ['sessions', 'all'],
              queryFn: () => getSessions(),
              staleTime: 5 * 60 * 1000,
            });
          }}
        >
          <UserIcon className="mr-2 h-4 w-4" />
          Profil
        </Button>
      </div>
    </div>
  );
}
