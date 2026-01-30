import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { useToast } from '@/hooks/use-toast';
import { changePassword } from '@/lib/services/api-client/auth';

const securitySchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
  confirmPassword: z.string().min(1, 'La confirmation est requise'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type SecurityFormValues = z.infer<typeof securitySchema>;

export function SecurityForm() {
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: SecurityFormValues) => 
      changePassword(currentPassword, newPassword),
    onSuccess: (data) => {
      toast({
        title: 'Succès',
        description: data.message || 'Votre mot de passe a été mis à jour.',
      });
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le mot de passe.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SecurityFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-xl font-bold">Sécurité</CardTitle>
        <CardDescription>
          Mettez à jour vos identifiants pour sécuriser votre compte.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label 
              htmlFor="currentPassword" 
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
            >
              Mot de passe actuel
            </Label>
            <div className="relative group">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                {...register('currentPassword')}
                className="bg-muted/30 border-border/50 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors group-hover:text-muted-foreground/80 focus:outline-none"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <ErrorMessage error={errors.currentPassword?.message} variant="inline" className="ml-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label 
                htmlFor="newPassword" 
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
              >
                Nouveau mot de passe
              </Label>
              <div className="relative group">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  {...register('newPassword')}
                  className="bg-muted/30 border-border/50 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors group-hover:text-muted-foreground/80 focus:outline-none"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <ErrorMessage error={errors.newPassword?.message} variant="inline" className="ml-1" />
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="confirmPassword" 
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
              >
                Confirmer
              </Label>
              <div className="relative group">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register('confirmPassword')}
                  className="bg-muted/30 border-border/50 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors group-hover:text-muted-foreground/80 focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <ErrorMessage error={errors.confirmPassword?.message} variant="inline" className="ml-1" />
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              variant="action" 
              size="lg" 
              className="w-full" 
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Modifier le mot de passe
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
