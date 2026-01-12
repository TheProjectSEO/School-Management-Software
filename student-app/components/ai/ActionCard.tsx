"use client";

import Link from "next/link";

export interface ActionCardItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "red" | "orange" | "green" | "blue" | "purple";
  link: string;
  icon?: string;
  meta?: string;
}

export type ActionCardType = "assessment" | "module" | "course" | "notification";

interface ActionCardProps {
  item: ActionCardItem;
  type: ActionCardType;
}

const badgeColorClasses: Record<string, string> = {
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const typeIconDefaults: Record<ActionCardType, string> = {
  assessment: "assignment",
  module: "menu_book",
  course: "school",
  notification: "notifications",
};

const typeGradients: Record<ActionCardType, string> = {
  assessment: "from-orange-500 to-red-500",
  module: "from-blue-500 to-indigo-500",
  course: "from-purple-500 to-pink-500",
  notification: "from-emerald-500 to-teal-500",
};

export function ActionCard({ item, type }: ActionCardProps) {
  const icon = item.icon || typeIconDefaults[type];
  const gradient = typeGradients[type];

  return (
    <Link
      href={item.link}
      className="group flex flex-col min-w-[200px] max-w-[240px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg hover:border-[#7B1113]/30 dark:hover:border-[#7B1113]/50 transition-all duration-200 overflow-hidden hover:scale-[1.02]"
    >
      {/* Top colored bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-3 flex-1 flex flex-col">
        {/* Header with icon and badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white flex-shrink-0`}>
            <span className="material-symbols-outlined text-lg">{icon}</span>
          </div>
          {item.badge && (
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                badgeColorClasses[item.badgeColor || "blue"]
              }`}
            >
              {item.badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#7B1113] dark:group-hover:text-[#e07a7c] transition-colors">
          {item.title}
        </h4>

        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
            {item.subtitle}
          </p>
        )}

        {/* Meta info (like due date) */}
        {item.meta && (
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">schedule</span>
            {item.meta}
          </p>
        )}

        {/* Hover arrow */}
        <div className="mt-auto pt-2 flex items-center justify-end text-slate-400 dark:text-slate-500 group-hover:text-[#7B1113] dark:group-hover:text-[#e07a7c] transition-colors">
          <span className="material-symbols-outlined text-sm transform group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </div>
      </div>
    </Link>
  );
}

interface ActionCardsContainerProps {
  type: ActionCardType;
  items: ActionCardItem[];
  title?: string;
}

export function ActionCardsContainer({ type, items, title }: ActionCardsContainerProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-4">
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-sm text-[#7B1113] dark:text-[#e07a7c]">
            {typeIconDefaults[type]}
          </span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            {title}
          </span>
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        {items.map((item) => (
          <ActionCard key={item.id} item={item} type={type} />
        ))}
      </div>
    </div>
  );
}

export default ActionCard;
