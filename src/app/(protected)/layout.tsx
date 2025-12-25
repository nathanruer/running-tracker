import { AppNavigation } from '@/components/navigation/app-navigation';
import { BottomNavigation } from '@/components/navigation/bottom-navigation';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppNavigation />

      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>

      <BottomNavigation />
    </div>
  );
}
