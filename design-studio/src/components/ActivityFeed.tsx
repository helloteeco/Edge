"use client";

import { useEffect, useState } from "react";
import { isConfigured, dbGetActivity } from "@/lib/supabase";
import type { ActivityEntry } from "@/lib/types";

interface Props {
  projectId: string;
}

const ACTION_ICONS: Record<string, string> = {
  created: "🆕",
  updated: "✏️",
  room_added: "🏠",
  room_deleted: "🗑️",
  sleep_optimized: "🛏️",
  furniture_added: "🪑",
  furniture_removed: "❌",
  mood_board_created: "🎨",
  exported: "📊",
  status_changed: "📋",
};

export default function ActivityFeed({ projectId }: Props) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured()) {
      setLoading(false);
      return;
    }

    dbGetActivity(projectId)
      .then((data) => setActivities(data as ActivityEntry[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!isConfigured()) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-brand-600">
          Connect Supabase to track project activity.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-900/10" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 rounded bg-brand-900/10" />
                <div className="h-2 w-1/2 rounded bg-brand-900/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-brand-900 mb-4">Activity</h3>

      {activities.length === 0 ? (
        <p className="text-sm text-brand-600 text-center py-4">
          No activity yet.
        </p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((entry) => (
            <div key={entry.id} className="flex gap-3 text-sm">
              <div className="mt-0.5 text-base">
                {ACTION_ICONS[entry.action] ?? "📝"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-brand-900">
                  <span className="font-medium">
                    {entry.profiles?.full_name ?? "Someone"}
                  </span>{" "}
                  <span className="text-brand-600">
                    {formatAction(entry.action)}
                  </span>
                </div>
                {entry.details && (
                  <div className="text-xs text-brand-600/60 truncate">
                    {entry.details}
                  </div>
                )}
                <div className="text-[10px] text-brand-600/40 mt-0.5">
                  {formatTimeAgo(entry.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    created: "created the project",
    updated: "updated the project",
    room_added: "added a room",
    room_deleted: "removed a room",
    sleep_optimized: "ran sleep optimization",
    furniture_added: "added furniture",
    furniture_removed: "removed furniture",
    mood_board_created: "created a mood board",
    exported: "exported deliverables",
    status_changed: "changed project status",
  };
  return map[action] ?? action.replace(/_/g, " ");
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
