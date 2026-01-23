'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Zap, Eye, EyeOff } from 'lucide-react';

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
import { loginUser, registerUser } from '@/lib/services/api-client';
import { CACHE_STORAGE_KEY } from '@/lib/constants';
import { ErrorCode, AppError } from '@/lib/errors';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { ErrorMessage } from '@/components/ui/error-message';

const LoginCard = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { error: formError, clearError, setLocalError, wrapAsync } = useErrorHandler({ scope: 'local' });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = wrapAsync(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setLoading(true);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setFieldErrors({ email: 'L\'email est requis' });
      setLoading(false);
      return;
    }

    if (!password) {
      setFieldErrors({ password: 'Le mot de passe est requis' });
      setLoading(false);
      return;
    }

    if (isLogin) {
      await loginUser(cleanEmail, password);
    } else {
      await registerUser(cleanEmail, password);
    }

    queryClient.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    }

    router.replace('/dashboard');
  }, (error) => {
    setLoading(false);
    if (error.code === ErrorCode.AUTH_EMAIL_TAKEN) {
      setFieldErrors({ email: 'Cette adresse email est déjà utilisée' });
      setLocalError(null); 
    } else if (error.code === ErrorCode.AUTH_INVALID_CREDENTIALS || error.code === ErrorCode.AUTH_UNAUTHORIZED) {
      setLocalError(new AppError({ 
        code: ErrorCode.AUTH_INVALID_CREDENTIALS, 
        message: 'Email ou mot de passe incorrect' 
      }));
    }
  });

  const handleModeSwitch = () => {
    setIsLogin((prev) => !prev);
    clearError();
    setFieldErrors({});
  };

  return (
    <Card className="w-full max-w-md border-border/50 shadow-xl transition-all duration-300">
      <CardHeader className="space-y-4 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600">
          <Zap className="h-8 w-8 text-white fill-white" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-3xl font-bold text-primary">
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
          <ErrorMessage error={formError} className="mb-4" hideTitle />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              data-testid="login-email"
              id="email"
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={fieldErrors.email ? 'border-destructive' : ''}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-xs text-destructive font-medium">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                data-testid="login-password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`pr-10 ${fieldErrors.password ? 'border-destructive' : ''}`}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted/50 text-muted-foreground/60 hover:text-foreground transition-all active:scale-95"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="text-xs text-destructive font-medium">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <Button
            data-testid="login-submit"
            type="submit"
            className="w-full font-bold bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all"
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
            onClick={handleModeSwitch}
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
