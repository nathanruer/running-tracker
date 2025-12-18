import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Compte Strava connecté</CardTitle>
        <CardDescription>
          Votre compte Strava est actuellement lié à ce profil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={handleDisconnectStrava}
          disabled={isDisconnectingStrava}
          className="w-full"
        >
          {isDisconnectingStrava ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Déconnexion...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnecter Strava
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
