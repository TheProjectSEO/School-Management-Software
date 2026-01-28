"use client";

interface Stat {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
}

interface StatsWidgetProps {
  stats: Stat[];
  title?: string;
  columns?: 2 | 3 | 4;
}

export default function StatsWidget({
  stats,
  title,
  columns = 4,
}: StatsWidgetProps) {
  const getGridCols = () => {
    switch (columns) {
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid-cols-1 md:grid-cols-3";
      case 4:
        return "grid-cols-2 md:grid-cols-4";
      default:
        return "grid-cols-2 md:grid-cols-4";
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      {title && (
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
      )}

      <div className={`grid gap-4 ${getGridCols()}`}>
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.change !== undefined && (
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className={`text-xs font-medium ${
                        stat.change >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {stat.change >= 0 ? "+" : ""}
                      {stat.change}%
                    </span>
                    {stat.changeLabel && (
                      <span className="text-xs text-slate-400">
                        {stat.changeLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {stat.icon && (
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {stat.icon}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
