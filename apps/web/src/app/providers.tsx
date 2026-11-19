'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import {
  initializeOfflineSync,
  getOnlineStatus,
  getSyncStatus,
  onOnlineChange,
} from '@/lib/offline-sync';

// ---------------------------------------------------------------------------
// Demo auth
//
// The real deployment uses Clerk. For local demos we keep the same `useAuth()`
// shape backed by a local context so the app runs with no external service.
// Swap `DemoAuthProvider` for `ClerkProvider` when real keys are configured.
// ---------------------------------------------------------------------------

interface AuthState {
  userId: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signOut: () => void;
}

const DEMO_USER_ID = 'demo-user';

const AuthContext = createContext<AuthState>({
  userId: DEMO_USER_ID,
  isLoaded: true,
  isSignedIn: true,
  signOut: () => {},
});

function DemoAuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(DEMO_USER_ID);
  const [isLoaded, setIsLoaded] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('t1d-demo-user');
      setUserId(stored ?? DEMO_USER_ID);
      window.localStorage.setItem('t1d-demo-user', stored ?? DEMO_USER_ID);
    } catch {
      setUserId(DEMO_USER_ID);
    }
  }, []);

  const signOut = () => {
    try {
      window.localStorage.removeItem('t1d-demo-user');
    } catch {
      // ignore storage failures
    }
    setUserId(null);
  };

  return (
    <AuthContext.Provider
      value={{ userId, isLoaded, isSignedIn: Boolean(userId), signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
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

// ---------------------------------------------------------------------------
// Online / offline sync status
// ---------------------------------------------------------------------------

export function useSyncStatus() {
  const [status, setStatus] = useState<{
    isOnline: boolean;
    pendingCount: number;
    lastSynced: Date | null;
  }>({
    isOnline: getOnlineStatus(),
    pendingCount: 0,
    lastSynced: null,
  });

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const next = await getSyncStatus();
        if (active) {
          setStatus({
            isOnline: next.isOnline,
            pendingCount: next.pendingCount,
            lastSynced: next.lastSynced,
          });
        }
      } catch {
        // IndexedDB may be unavailable (private mode); fall back to online flag
        if (active) setStatus((prev) => ({ ...prev, isOnline: getOnlineStatus() }));
      }
    };

    refresh();

    const unsubscribe = onOnlineChange((online) => {
      setStatus((prev) => ({ ...prev, isOnline: online }));
      refresh();
    });
    const timer = setInterval(refresh, 30000);

    return () => {
      active = false;
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  return status;
}

// ---------------------------------------------------------------------------
// App providers
// ---------------------------------------------------------------------------

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

  // Initialize offline sync on client
  useEffect(() => {
    initializeOfflineSync();
  }, []);

  return (
    <DemoAuthProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
    </DemoAuthProvider>
  );
}
