import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StravaBadge } from "@/features/import/components/strava-badge"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { LogOut } from "lucide-react"
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
      <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xl font-bold">Services Connectés</CardTitle>
          <CardDescription>
            Gérez votre connexion avec les applications tierces.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-black text-orange-600 uppercase tracking-widest">Strava</span>
              <span className="text-xs text-muted-foreground font-medium italic">Compte synchronisé</span>
            </div>
            <StravaBadge variant="orange" className="h-6" />
          </div>

          <Button
            variant="destructive-premium"
            size="xl"
            onClick={() => setShowDisconnectDialog(true)}
            disabled={isDisconnectingStrava}
            className="w-full border-destructive/20 hover:border-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnecter Strava
          </Button>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        title="Déconnexion Strava"
        description="Êtes-vous sûr de vouloir déconnecter votre compte Strava ? Vous ne pourrez plus importer vos activités automatiquement."
        confirmLabel="Confirmer la déconnexion"
        onConfirm={handleDisconnectStrava}
        isLoading={isDisconnectingStrava}
      />
    </>
  )
}
