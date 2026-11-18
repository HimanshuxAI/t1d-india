'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AccessibilityProvider } from '@/components/providers/AccessibilityProvider';
import { initializeAccessibility } from '@/lib/accessibility';
import { initializeOfflineSync } from '@/lib/offline-sync';

// Theme provider wrapper
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Initialize accessibility and offline sync on client
  useEffect(() => {
    initializeAccessibility();
    initializeOfflineSync();
  }, []);

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AccessibilityProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
          <Toaster position="bottom-right" richColors />
        </AccessibilityProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}

// Auth hook with user data
export function useUser() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  
  return {
    userId,
    isLoaded,
    isSignedIn,
  };
}