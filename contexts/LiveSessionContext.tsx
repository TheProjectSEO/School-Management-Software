'use client';

/**
 * LiveSessionContext
 * Stores the active video session state at the layout level so the
 * floating iframe persists across Next.js client-side navigation.
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface ActiveSession {
  sessionId: string;
  roomUrl: string;
  token: string;
  title: string;
}

interface LiveSessionContextValue {
  session: ActiveSession | null;
  isFloating: boolean;
  setSession: (s: ActiveSession) => void;
  clearSession: () => void;
  setFloating: (v: boolean) => void;
}

const LiveSessionContext = createContext<LiveSessionContextValue>({
  session: null,
  isFloating: false,
  setSession: () => {},
  clearSession: () => {},
  setFloating: () => {},
});

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<ActiveSession | null>(null);
  const [isFloating, setFloating] = useState(false);

  const setSession = (s: ActiveSession) => {
    setSessionState(s);
    // Don't auto-float — start inline
  };

  const clearSession = () => {
    setSessionState(null);
    setFloating(false);
  };

  return (
    <LiveSessionContext.Provider value={{ session, isFloating, setSession, clearSession, setFloating }}>
      {children}
    </LiveSessionContext.Provider>
  );
}

export function useLiveSession() {
  return useContext(LiveSessionContext);
}
