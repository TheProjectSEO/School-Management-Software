'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLogin } from '@/hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const { login, isLoading, error } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic validation
    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }

    if (!password) {
      setFormError('Password is required');
      return;
    }

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      // Error is already set in auth context
      const message = err instanceof Error ? err.message : 'Login failed';
      setFormError(message);
    }
  };

  const displayError = formError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {displayError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-500 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm font-medium text-red-800">{displayError}</p>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          placeholder="you@msugensan.edu.ph"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          placeholder="Enter your password"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="ml-2 text-sm text-gray-600">Remember me</span>
        </label>

        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center rounded-lg bg-primary py-3 px-4 text-sm font-semibold text-white shadow-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-primary/60 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
