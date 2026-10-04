'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { signUpWithEmailAction } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/client';
import { Github, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = React.useState(false);

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      const result = await signUpWithEmailAction({ fullName, email, password });
      if (!result.success) {
        setErrorMessage(result.error.message);
        if (result.error.details) {
          setFieldErrors(result.error.details);
        }
      } else {
        setSuccessMessage('Account created! Routing you to developer onboarding...');
        setTimeout(() => {
          router.push('/onboarding');
          router.refresh();
        }, 1200);
      }
    } catch {
      setErrorMessage('An unexpected error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGitHubSignUp() {
    setIsOAuthLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsOAuthLoading(false);
      }
    } catch {
      setErrorMessage('Could not initialize GitHub registration.');
      setIsOAuthLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Join Build Together to find contributors and turn your ideas into products.
          </CardDescription>
        </CardHeader>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-status-danger/20 bg-status-danger/10 p-3 text-xs text-status-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-status-success/20 bg-status-success/10 p-3 text-xs text-status-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full gap-2 border-border-subtle hover:bg-app-surface-2"
            onClick={handleGitHubSignUp}
            isLoading={isOAuthLoading}
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>

          <div className="relative flex items-center justify-center text-xs uppercase">
            <div className="w-full border-t border-border-subtle" />
            <span className="bg-app-surface-1 px-2 text-content-muted">Or sign up with email</span>
            <div className="w-full border-t border-border-subtle" />
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-3">
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              required
              placeholder="Ada Lovelace"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fieldErrors.fullName?.[0]}
            />

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email?.[0]}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password?.[0]}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-xs text-content-secondary pt-2">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-accent-primary underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
