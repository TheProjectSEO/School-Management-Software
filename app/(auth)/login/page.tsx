'use client';

import React, { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-center text-xl font-semibold text-gray-900 mb-6">
        Sign in to your account
      </h2>

      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
