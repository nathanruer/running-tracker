'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { loginUser, registerUser } from '@/lib/services/api-client';

const LoginCard = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim();

    try {
      if (isLogin) {
        await loginUser(cleanEmail, password);
        toast({
          title: 'Connexion réussie',
          description: 'Bienvenue !',
        });
      } else {
        await registerUser(cleanEmail, password);
        toast({
          title: 'Compte créé',
          description: 'Votre compte a été créé avec succès !',
        });
      }
      
      router.replace('/dashboard');
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue, veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/50 shadow-xl">
      <CardHeader className="space-y-4 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-500/30">
          <Zap className="h-8 w-8 text-white fill-white" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-3xl font-bold text-gradient">
            Running Tracker
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Connectez-vous à votre compte'
              : 'Créez votre compte'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              data-testid="login-email"
              id="email"
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              data-testid="login-password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button
            data-testid="login-submit"
            type="submit"
            className="w-full h-10 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all"
            disabled={loading}
          >
            {loading
              ? 'Chargement...'
              : isLogin
                ? 'Se connecter'
                : "S'inscrire"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <button
            data-testid="login-switch"
            type="button"
            onClick={() => setIsLogin((prev) => !prev)}
            className="text-primary hover:underline"
          >
            {isLogin
              ? "Pas encore de compte ? S'inscrire"
              : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginCard;

