"use client";

import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  action,
  className = "",
}: ChartCardProps) {
  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
