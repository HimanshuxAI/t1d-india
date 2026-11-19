'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Syringe, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand/logo';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);

    try {
      // In production, this would redirect to Clerk's hosted login
      // For demo, simulate login
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!email || !password) {
        setFormError('Please enter both email and password');
        return;
      }

      if (!email.includes('@')) {
        setFormError('Please enter a valid email');
        return;
      }

      // Simulate successful login
      localStorage.setItem('t1d-auth', JSON.stringify({
        user: { email, name: email.split('@')[0] },
        token: 'demo-token-' + Date.now(),
      }));

      toast.success('Welcome back!');
      router.push(callbackUrl);
    } catch (error) {
      setFormError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClerkLogin = () => {
    // In production: window.location.href = '/api/auth/clerk?redirect=' + callbackUrl
    toast.info('Redirecting to Clerk... (demo mode)');
    setTimeout(() => {
      localStorage.setItem('t1d-auth', JSON.stringify({
        user: { email: 'demo@t1d-india.example.com', name: 'Demo User' },
        token: 'demo-token-' + Date.now(),
      }));
      router.push(callbackUrl);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" />
          </div>
          <p className="text-muted-foreground mt-2">Sign in to your clinical passport</p>
        </div>

        {/* Error from URL */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Authentication Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form Error */}
        {formError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
          </div>
        )}

        {/* Clerk Login Button */}
        <button
          onClick={handleClerkLogin}
          disabled={isLoading}
          className="w-full btn-primary py-3 mb-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Continue with Clerk
            </>
          )}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 dark:bg-gray-950 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input pl-10"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input pl-10 pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>
            <a href="/auth/forgot-password" className="text-sm text-primary-600 hover:underline">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{' '}
          <a href="/auth/register" className="text-primary-600 hover:underline font-medium">
            Sign up
          </a>
        </p>

        {/* Demo accounts */}
        <div className="mt-8 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
          <p className="text-sm font-medium mb-3">Demo Accounts (for testing):</p>
          <div className="space-y-2">
            <button
              onClick={() => { setEmail('patient@demo.com'); setPassword('demo123'); }}
              className="w-full text-left p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
            >
              Patient: patient@demo.com / demo123
            </button>
            <button
              onClick={() => { setEmail('caregiver@demo.com'); setPassword('demo123'); }}
              className="w-full text-left p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
            >
              Caregiver: caregiver@demo.com / demo123
            </button>
            <button
              onClick={() => { setEmail('clinician@demo.com'); setPassword('demo123'); }}
              className="w-full text-left p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
            >
              Clinician: clinician@demo.com / demo123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}