'use client';

import { useContext, useCallback } from 'react';
import { AuthContext } from '@/components/auth/AuthProvider';
import { AuthContextValue, LoginResponse } from '@/types/auth';

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Hook for login functionality
 */
export function useLogin() {
  const { login, isLoading, error } = useAuth();

  const handleLogin = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      return login(email, password);
    },
    [login]
  );

  return {
    login: handleLogin,
    isLoading,
    error,
  };
}

/**
 * Hook for logout functionality
 */
export function useLogout() {
  const { logout, isLoading } = useAuth();

  const handleLogout = useCallback(async (): Promise<void> => {
    return logout();
  }, [logout]);

  return {
    logout: handleLogout,
    isLoading,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  return !isLoading && isAuthenticated;
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return {
    user,
    isAuthenticated,
    isLoading,
  };
}

/**
 * Hook to require authentication
 * Throws an error if user is not authenticated
 */
export function useRequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    throw new Error('Authentication required');
  }

  return { user, isLoading };
}
