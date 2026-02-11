'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { getClassroomTheme, type ClassroomThemeConfig } from '@/lib/utils/classroom/theme';

interface StudentThemeContextValue {
  gradeLevel: string | null;
  theme: ClassroomThemeConfig;
  isPlayful: boolean;
}

const StudentThemeContext = createContext<StudentThemeContextValue | null>(null);

interface StudentThemeProviderProps {
  gradeLevel?: string | null;
  children: React.ReactNode;
}

export function StudentThemeProvider({ gradeLevel, children }: StudentThemeProviderProps) {
  const value = useMemo<StudentThemeContextValue>(() => {
    const theme = getClassroomTheme(gradeLevel || '12');
    return {
      gradeLevel: gradeLevel ?? null,
      theme,
      isPlayful: theme.type === 'playful',
    };
  }, [gradeLevel]);

  return (
    <StudentThemeContext.Provider value={value}>
      {children}
    </StudentThemeContext.Provider>
  );
}

export function useStudentTheme(): StudentThemeContextValue {
  const ctx = useContext(StudentThemeContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (e.g. server components)
    const theme = getClassroomTheme('12');
    return { gradeLevel: null, theme, isPlayful: false };
  }
  return ctx;
}
