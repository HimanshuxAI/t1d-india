'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Syringe, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing sign in...');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setMessage('Authentication failed');
        setError(errorDescription || error);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        setError('Missing authorization code');
        return;
      }

      try {
        // Exchange code for tokens
        const res = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Token exchange failed');
        }

        const data = await res.json();

        // Store tokens
        localStorage.setItem('t1d-auth', JSON.stringify({
          user: data.user,
          token: data.accessToken,
          refreshToken: data.refreshToken,
        }));

        setStatus('success');
        setMessage('Sign in successful! Redirecting...');

        // Redirect after short delay
        setTimeout(() => {
          const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
          router.push(callbackUrl);
        }, 1500);
      } catch (error) {
        setStatus('error');
        setMessage('Sign in failed');
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    handleCallback();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-6">
            <Syringe className="w-10 h-10 text-primary-600" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="text-lg font-medium text-gray-900 dark:text-white">{message}</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign In Successful!</h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Redirecting to dashboard...</span>
            <ArrowRight className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign In Failed</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-left">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        <div className="space-y-3">
          <a href="/auth/login" className="btn-primary w-full block text-center">
            Try Again
          </a>
          <a href="/" className="btn-outline w-full block text-center">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}