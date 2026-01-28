/**
 * Environment Variable Validation
 *
 * This module validates required environment variables at build time
 * and provides type-safe access to environment configuration.
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/**
 * Validates that all required environment variables are set.
 * Call this during app initialization to catch missing vars early.
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}`;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn(`⚠️ ${message}`);
    }
  }

  // Warn about production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
      console.warn('⚠️ NEXT_PUBLIC_APP_URL should be set to your production domain');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      console.warn('⚠️ JWT_SECRET should be at least 32 characters for security');
    }
  }
}

/**
 * Type-safe environment variable access
 */
export const env = {
  // Required
  get JWT_SECRET(): string {
    return process.env.JWT_SECRET!;
  },
  get SUPABASE_URL(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_URL!;
  },
  get SUPABASE_ANON_KEY(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return process.env.SUPABASE_SERVICE_ROLE_KEY!;
  },

  // Optional with defaults
  get APP_URL(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  },
  get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },

  // Optional APIs
  get DAILY_API_KEY(): string | undefined {
    return process.env.DAILY_API_KEY;
  },
  get OPENAI_API_KEY(): string | undefined {
    return process.env.OPENAI_API_KEY;
  },
  get RESEND_API_KEY(): string | undefined {
    return process.env.RESEND_API_KEY;
  },
  get PAYMONGO_SECRET_KEY(): string | undefined {
    return process.env.PAYMONGO_SECRET_KEY;
  },
  get PAYMONGO_PUBLIC_KEY(): string | undefined {
    return process.env.PAYMONGO_PUBLIC_KEY;
  },
};
