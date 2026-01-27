import React from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-primary to-primary-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Image
            src="/brand/logo.png"
            alt="Mindanao State University Logo"
            width={80}
            height={80}
            priority
            className="drop-shadow-lg w-auto h-auto"
          />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-white">
          Mindanao State University
        </h1>
        <p className="mt-1 text-center text-sm text-msu-gold font-medium">
          School Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
