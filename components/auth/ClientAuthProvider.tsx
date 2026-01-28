'use client';

import { AuthProvider } from './AuthProvider';

interface ClientAuthProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper that only renders AuthProvider on the client side.
 * This prevents SSG/SSR issues with React context.
 */
export function ClientAuthProvider({ children }: ClientAuthProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
