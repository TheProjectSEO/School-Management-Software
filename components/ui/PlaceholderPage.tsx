"use client";

import { ReactNode } from "react";

interface PlaceholderPageProps {
  /**
   * Title displayed at the top of the placeholder
   */
  title: string;
  /**
   * Description or subtitle text
   */
  description?: string;
  /**
   * Icon to display (Material Symbols icon name)
   */
  icon?: string;
  /**
   * Optional action button or other content
   */
  action?: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * PlaceholderPage Component
 *
 * A simple placeholder page component for features that are
 * under construction or not yet implemented.
 */
export function PlaceholderPage({
  title,
  description,
  icon = "construction",
  action,
  className = "",
}: PlaceholderPageProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[400px] p-8 text-center ${className}`}
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500">
          {icon}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {title}
      </h1>

      {/* Description */}
      {description && (
        <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default PlaceholderPage;
