/**
 * Login page — shown when the user is not authenticated.
 * Provides Google OAuth sign-in or API key status display.
 */

import { Bot, LogIn, Shield, Key } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login, oauthConfigured, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Bot className="h-9 w-9 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">DevBot</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personal AI Development Assistant
            </p>
          </div>
        </div>

        {/* Sign in */}
        <div className="space-y-4">
          {oauthConfigured ? (
            <>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={login}
              >
                <LogIn className="h-4 w-4" />
                Sign in with Google
              </Button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Single-user access — authorized email only</span>
              </div>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-left">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="h-4 w-4" />
                API Key Authentication
              </div>
              <p className="text-xs text-muted-foreground">
                Google OAuth is not configured. The app is using API key
                authentication. Add <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code> and{' '}
                <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code> to your{' '}
                <code className="rounded bg-muted px-1">.env</code> file to enable OAuth.
              </p>
              <p className="text-xs text-muted-foreground">
                If you&apos;re seeing this page, the API key may be missing or incorrect.
                Check that DevBot was started with <code className="rounded bg-muted px-1">make start</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
