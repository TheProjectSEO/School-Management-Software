"use client";

import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";

interface Activity {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  admin_name: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

const actionIcons: Record<string, { icon: string; color: string }> = {
  create: { icon: "add_circle", color: "text-green-500" },
  update: { icon: "edit", color: "text-blue-500" },
  delete: { icon: "delete", color: "text-red-500" },
  login: { icon: "login", color: "text-purple-500" },
  logout: { icon: "logout", color: "text-gray-500" },
  import: { icon: "upload", color: "text-orange-500" },
  export: { icon: "download", color: "text-cyan-500" },
  enroll: { icon: "person_add", color: "text-green-500" },
  drop: { icon: "person_remove", color: "text-red-500" },
};

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">
          history
        </span>
        <p className="text-sm text-gray-500">No recent activity</p>
      </div>
    );
  }

  const getActionDisplay = (activity: Activity) => {
    const { action, entity_type } = activity;
    const actionConfig = actionIcons[action] || {
      icon: "info",
      color: "text-gray-500",
    };

    let description = "";
    switch (action) {
      case "create":
        description = `Created a new ${entity_type}`;
        break;
      case "update":
        description = `Updated ${entity_type}`;
        break;
      case "delete":
        description = `Deleted ${entity_type}`;
        break;
      case "login":
        description = "Logged in";
        break;
      case "logout":
        description = "Logged out";
        break;
      case "import":
        description = `Imported ${entity_type}`;
        break;
      case "export":
        description = `Exported ${entity_type} report`;
        break;
      case "enroll":
        description = `Enrolled student in course`;
        break;
      case "drop":
        description = `Dropped student from course`;
        break;
      default:
        description = `${action} on ${entity_type}`;
    }

    return { ...actionConfig, description };
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const { icon, color, description } = getActionDisplay(activity);
        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div
              className={clsx(
                "w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0",
                color
              )}
            >
              <span className="material-symbols-outlined text-lg">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{activity.admin_name}</span>{" "}
                {description}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
