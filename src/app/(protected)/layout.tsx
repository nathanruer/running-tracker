import { AppNavigation } from '@/components/navigation/app-navigation';
import { BottomNavigation } from '@/components/navigation/bottom-navigation';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <AppNavigation />

      <main className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0">
        {children}
      </main>

      <BottomNavigation />
    </div>
  );
}
