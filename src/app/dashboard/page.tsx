'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, LogOut, Plus, Trash2 } from 'lucide-react';

import SessionDialog from '@/components/session-dialog';
import { StravaImportDialog } from '@/components/strava-import-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  deleteSession,
  getCurrentUser,
  getSessions,
  logoutUser,
  type TrainingSession,
  type User,
} from '@/lib/api';

const DashboardPage = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] =
    useState<TrainingSession | null>(null);
  const [isStravaDialogOpen, setIsStravaDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les séances',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.replace('/');
        return;
      }
      setUser(currentUser);
      await loadSessions();
      setLoading(false);
    };

    init();
  }, [loadSessions, router]);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      await loadSessions();
      setDeletingId(null);
      toast({
        title: 'Séance supprimée',
        description: 'La séance a été supprimée avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (session: TrainingSession) => {
    setEditingSession(session);
    setIsDialogOpen(true);
  };

  const handleDialogClose = async () => {
    setIsDialogOpen(false);
    setEditingSession(null);
    setImportedData(null);
    await loadSessions();
  };

  const handleStravaImport = (data: any) => {
    setImportedData(data);
    setIsDialogOpen(true);
  };

  const handleRequestStravaImport = () => {
    setIsStravaDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient">Running Tracker</h1>
            <p className="mt-2 text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="gradient-violet"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle séance
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Historique des séances</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="mb-4">Aucune séance enregistrée</p>
                <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter votre première séance
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="w-20">Semaine</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Séance</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Allure</TableHead>
                      <TableHead>FC moy</TableHead>
                      <TableHead>Commentaires</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          {session.sessionNumber}
                        </TableCell>
                        <TableCell>{session.week}</TableCell>
                        <TableCell>
                          {new Date(session.date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>{session.sessionType}</TableCell>
                        <TableCell>{session.duration}</TableCell>
                        <TableCell>{session.distance} km</TableCell>
                        <TableCell>{session.avgPace}</TableCell>
                        <TableCell>{session.avgHeartRate} bpm</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {session.comments}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(session)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(session.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SessionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onClose={handleDialogClose}
        session={editingSession}
        initialData={importedData}
        onRequestStravaImport={handleRequestStravaImport}
      />

      <StravaImportDialog
        open={isStravaDialogOpen}
        onOpenChange={setIsStravaDialogOpen}
        onImport={handleStravaImport}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardPage;

