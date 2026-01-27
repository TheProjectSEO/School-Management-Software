"use client";

import { clsx } from "clsx";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  onClick?: () => void;
}

export default function StatCard({
  label,
  value,
  icon,
  color = "bg-primary",
  change,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-gray-200"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={clsx(
                  "material-symbols-outlined text-sm",
                  change.type === "increase" ? "text-green-500" : "text-red-500"
                )}
              >
                {change.type === "increase" ? "trending_up" : "trending_down"}
              </span>
              <span
                className={clsx(
                  "text-sm font-medium",
                  change.type === "increase" ? "text-green-600" : "text-red-600"
                )}
              >
                {change.value}%
              </span>
              <span className="text-xs text-gray-400">vs last month</span>
            </div>
          )}
        </div>
        <div
          className={clsx(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            color
          )}
        >
          <span className="material-symbols-outlined text-white text-3xl">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}
