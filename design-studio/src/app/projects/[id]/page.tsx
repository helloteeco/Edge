"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import RoomPlanner from "@/components/RoomPlanner";
import SleepOptimizer from "@/components/SleepOptimizer";
import FurniturePicker from "@/components/FurniturePicker";
import MoodBoardPanel from "@/components/MoodBoardPanel";
import ExportPanel from "@/components/ExportPanel";
import TeamChat from "@/components/TeamChat";
import ScanViewer from "@/components/ScanViewer";
import ActivityFeed from "@/components/ActivityFeed";
import AIRenderingPanel from "@/components/AIRenderingPanel";
import {
  getProject,
  saveProject,
  getUser,
  loadProjectFromDatabase,
  logActivity,
} from "@/lib/store";
import { isConfigured, subscribeToProject } from "@/lib/supabase";
import { getTotalSleeping } from "@/lib/sleep-optimizer";
import type { Project, ProjectStatus } from "@/lib/types";

type Tab =
  | "overview"
  | "scans"
  | "rooms"
  | "sleep"
  | "furniture"
  | "mood"
  | "render"
  | "export"
  | "chat";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "scans", label: "3D Scans" },
  { id: "rooms", label: "Rooms" },
  { id: "sleep", label: "Sleep Plan" },
  { id: "furniture", label: "Furniture" },
  { id: "mood", label: "Mood Board" },
  { id: "render", label: "AI Renders" },
  { id: "export", label: "Export" },
  { id: "chat", label: "Team Chat" },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "delivered", label: "Delivered" },
];

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setProject(getProject(projectId));
  }, [projectId]);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    async function load() {
      if (isConfigured()) {
        await loadProjectFromDatabase(projectId);
      }
      const p = getProject(projectId);
      if (!p) {
        router.replace("/dashboard");
        return;
      }
      setProject(p);
      setLoading(false);
    }
    load();

    // Subscribe to realtime project updates from other team members
    if (isConfigured()) {
      const unsub = subscribeToProject(projectId, () => {
        // Another user updated this project — reload from DB
        loadProjectFromDatabase(projectId).then(() => reload());
      });
      return () => unsub();
    }
  }, [projectId, router, reload]);

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-1/3 rounded bg-brand-900/10" />
            <div className="h-4 w-1/2 rounded bg-brand-900/5" />
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card py-3 px-4">
                  <div className="h-3 w-12 rounded bg-brand-900/10 mb-2" />
                  <div className="h-5 w-8 rounded bg-brand-900/10" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const sleeping = getTotalSleeping(project.rooms);
  const totalItems = project.rooms.reduce((s, r) => s + r.furniture.length, 0);
  const totalCost = project.rooms.reduce(
    (s, r) => s + r.furniture.reduce((fs, f) => fs + f.item.price * f.quantity, 0),
    0
  );

  function updateStatus(status: ProjectStatus) {
    const p = getProject(projectId);
    if (!p) return;
    p.status = status;
    saveProject(p);
    logActivity(projectId, "status_changed", `Status → ${status}`);
    reload();
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-6 animate-in">
        {/* Back + Title */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-3 text-sm text-brand-600 hover:text-brand-900 transition"
          >
            &larr; All Projects
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-brand-900">
                {project.name || "Untitled"}
              </h1>
              <p className="text-sm text-brand-600 mt-0.5">
                {project.property.address || "No address"} &middot;{" "}
                {project.client.name || "No client"}
              </p>
            </div>
            <select
              className="select w-auto text-xs"
              value={project.status}
              onChange={(e) => updateStatus(e.target.value as ProjectStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStat label="Rooms" value={project.rooms.length} />
          <QuickStat
            label="Sleeps"
            value={sleeping}
            target={project.targetGuests}
          />
          <QuickStat label="Items" value={totalItems} />
          <QuickStat
            label="Budget"
            value={`$${totalCost.toLocaleString()}`}
            target={
              project.budget ? `$${project.budget.toLocaleString()}` : undefined
            }
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-white border border-brand-900/10 p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 ${tab === t.id ? "tab-active" : "tab"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in">
          {tab === "overview" && <OverviewTab project={project} />}
          {tab === "scans" && <ScanViewer property={project.property} />}
          {tab === "rooms" && <RoomPlanner project={project} onUpdate={reload} />}
          {tab === "sleep" && <SleepOptimizer project={project} onUpdate={reload} />}
          {tab === "furniture" && <FurniturePicker project={project} onUpdate={reload} />}
          {tab === "mood" && <MoodBoardPanel project={project} onUpdate={reload} />}
          {tab === "render" && <AIRenderingPanel project={project} />}
          {tab === "export" && <ExportPanel project={project} />}
          {tab === "chat" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TeamChat projectId={projectId} />
              </div>
              <div>
                <ActivityFeed projectId={projectId} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function QuickStat({
  label,
  value,
  target,
}: {
  label: string;
  value: number | string;
  target?: number | string;
}) {
  return (
    <div className="card py-3 px-4">
      <div className="text-[10px] uppercase tracking-wider text-brand-600 mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-brand-900">{value}</span>
        {target !== undefined && target !== 0 && (
          <span className="text-xs text-brand-600/60">/ {target}</span>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Property */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Property</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Address" value={project.property.address} />
          <Field
            label="Location"
            value={`${project.property.city}, ${project.property.state}`}
          />
          <Field
            label="Size"
            value={
              project.property.squareFootage
                ? `${project.property.squareFootage.toLocaleString()} sqft`
                : "—"
            }
          />
          <Field
            label="Layout"
            value={`${project.property.bedrooms} bd / ${project.property.bathrooms} ba`}
          />
          <Field label="Floors" value={project.property.floors || "—"} />
        </dl>

        <div className="mt-4 pt-4 border-t border-brand-900/5 space-y-2">
          <ScanLink label="Matterport" url={project.property.matterportLink} />
          <ScanLink label="Polycam" url={project.property.polycamLink} />
          <ScanLink label="Spoak" url={project.property.spoakLink} />
        </div>
      </div>

      {/* Client */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Client</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Name" value={project.client.name} />
          <Field label="Email" value={project.client.email} />
          <Field label="Phone" value={project.client.phone} />
        </dl>
        {project.client.preferences && (
          <div className="mt-4 pt-4 border-t border-brand-900/5">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
              Preferences
            </div>
            <p className="text-sm text-brand-700 whitespace-pre-wrap">
              {project.client.preferences}
            </p>
          </div>
        )}
      </div>

      {/* Design */}
      <div className="card lg:col-span-2">
        <h2 className="text-lg font-semibold mb-4">Design Settings</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="Style" value={project.style} />
          <Field label="Target Guests" value={project.targetGuests} />
          <Field
            label="Budget"
            value={project.budget ? `$${project.budget.toLocaleString()}` : "Not set"}
          />
          <Field label="Status" value={project.status} />
        </dl>
        {project.notes && (
          <div className="mt-4 pt-4 border-t border-brand-900/5">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
              Notes
            </div>
            <p className="text-sm text-brand-700 whitespace-pre-wrap">
              {project.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-brand-600">{label}</dt>
      <dd className="font-medium text-brand-900">{value || "—"}</dd>
    </div>
  );
}

function ScanLink({ label, url }: { label: string; url: string }) {
  if (!url) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-brand-600">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-dark hover:underline"
      >
        Open Link &rarr;
      </a>
    </div>
  );
}
