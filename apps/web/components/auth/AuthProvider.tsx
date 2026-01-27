'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AuthContextValue,
  AuthUser,
  SessionState,
  LoginResponse,
  MeResponse,
} from '@/types/auth';
import { isTokenExpired, decodeToken, AccessTokenPayload } from '@/lib/auth/jwt';

// Create context
export const AuthContext = createContext<AuthContextValue | null>(null);

// Cookie names (must match server)
const ACCESS_TOKEN_COOKIE = 'access_token';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // These hooks are safe to call but may return null during SSR
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're running on the client
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [state, setState] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check session on mount
  const checkSession = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      const data: MeResponse = await response.json();

      setState({
        user: data.user,
        isAuthenticated: data.isAuthenticated,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Session check error:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to check session',
      });
    }
  }, []);

  // Login
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: data.error || 'Login failed',
          }));
          throw new Error(data.error || 'Login failed');
        }

        setState({
          user: data.user as AuthUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Redirect to dashboard
        router.push(data.redirectTo);

        return data as LoginResponse;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [router]
  );

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    router.push('/login');
  }, [router]);

  // Refresh token
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        // Refresh failed, logout
        await logout();
        return;
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        user: data.user as AuthUser,
        isAuthenticated: true,
      }));
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
    }
  }, [logout]);

  // Auto-refresh token before expiry (only on client)
  useEffect(() => {
    if (!isClient || !state.isAuthenticated) return;

    // Get token from cookie to check expiry
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find((c) => c.trim().startsWith(`${ACCESS_TOKEN_COOKIE}=`));

    if (!tokenCookie) return;

    const token = tokenCookie.split('=')[1];
    const payload = decodeToken<AccessTokenPayload>(token);

    if (!payload?.exp) return;

    // Calculate time until expiry (refresh 1 minute before)
    const expiresIn = payload.exp * 1000 - Date.now() - 60000;

    if (expiresIn <= 0) {
      // Token already expired or about to expire
      refresh();
      return;
    }

    // Set timer to refresh before expiry
    const refreshTimer = setTimeout(() => {
      refresh();
    }, expiresIn);

    return () => clearTimeout(refreshTimer);
  }, [state.isAuthenticated, refresh]);

  // Check session on mount (only on client)
  useEffect(() => {
    if (isClient) {
      checkSession();
    }
  }, [isClient, checkSession]);

  // Context value
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refresh,
      checkSession,
    }),
    [state, login, logout, refresh, checkSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
