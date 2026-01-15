import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StravaBadge } from "@/features/import/components/strava-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LogOut, Loader2 } from "lucide-react"
import { disconnectStrava } from "@/lib/services/api-client/auth"
import { type User } from "@/lib/types"

interface StravaAccountCardProps {
  stravaId: string | null | undefined
}

export function StravaAccountCard({ stravaId }: StravaAccountCardProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDisconnectingStrava, setIsDisconnectingStrava] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  const handleDisconnectStrava = async () => {
    if (!stravaId) return

    setIsDisconnectingStrava(true)
    try {
      await disconnectStrava()
      toast({
        title: "Succès",
        description: "Votre compte Strava a été déconnecté avec succès.",
        variant: "default",
      })
      
      queryClient.setQueryData<User>(['user'], (oldUser) => {
        if (oldUser) {
          return {
            ...oldUser,
            stravaId: null,
            stravaAccessToken: null,
            stravaRefreshToken: null,
            stravaTokenExpiresAt: null
          }
        }
        return oldUser
      })
      
      setShowDisconnectDialog(false)

    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion de Strava.",
        variant: "destructive",
      })
    } finally {
      setIsDisconnectingStrava(false)
    }
  }

  if (!stravaId) {
    return null
  }

  return (
    <>
      <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Services Connectés</CardTitle>
          <CardDescription>
            Gérez votre connexion avec les applications tierces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-black text-orange-600 uppercase tracking-widest">Strava</span>
              <span className="text-xs text-muted-foreground font-medium italic">Compte synchronisé</span>
            </div>
            <StravaBadge variant="orange" className="h-6" />
          </div>

          <Button
            variant="outline"
            onClick={() => setShowDisconnectDialog(true)}
            disabled={isDisconnectingStrava}
            className="w-full px-5 text-sm font-semibold text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnecter Strava
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent className="border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Déconnexion Strava</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Êtes-vous sûr de vouloir déconnecter votre compte Strava ? Vous ne pourrez plus importer vos activités automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={isDisconnectingStrava} className="px-6 active:scale-95 transition-all">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectStrava}
              disabled={isDisconnectingStrava}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 font-bold active:scale-95 transition-all"
            >
              {isDisconnectingStrava ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Déconnexion...
                </>
              ) : (
                'Confirmer la déconnexion'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
