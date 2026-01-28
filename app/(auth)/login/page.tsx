'use client';

import React from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-center text-xl font-semibold text-gray-900 mb-6">
        Sign in to your account
      </h2>

      <LoginForm />

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gray-500">
              New to the system?
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/register"
            className="flex justify-center items-center rounded-lg border-2 border-gray-200 bg-white py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            Student Registration
          </Link>
          <Link
            href="/teacher-register"
            className="flex justify-center items-center rounded-lg border-2 border-gray-200 bg-white py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            Teacher Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
