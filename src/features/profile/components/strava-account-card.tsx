import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StravaBadge } from "@/components/ui/strava-badge"
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
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Compte Strava connecté</CardTitle>
          <CardDescription>
            Votre compte Strava est actuellement lié à ce profil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="destructive"
            onClick={() => setShowDisconnectDialog(true)}
            disabled={isDisconnectingStrava}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnecter Strava
          </Button>
          <div className="flex justify-end">
            <StravaBadge variant="orange" />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déconnexion Strava</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir déconnecter votre compte Strava ? Vous ne pourrez plus importer vos activités depuis Strava.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnectingStrava}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectStrava}
              disabled={isDisconnectingStrava}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnectingStrava ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Déconnexion...
                </>
              ) : (
                'Déconnecter Strava'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
