"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  getProjects,
  deleteProject,
  saveProject,
  generateId,
  getUser,
  loadFromDatabase,
  getProfile,
} from "@/lib/store";
import { isConfigured } from "@/lib/supabase";
import { getTotalSleeping } from "@/lib/sleep-optimizer";
import type { Project, ProjectStatus } from "@/lib/types";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  draft: "badge-neutral",
  "in-progress": "badge-warning",
  review: "badge-info",
  delivered: "badge-success",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  "in-progress": "In Progress",
  review: "In Review",
  delivered: "Delivered",
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    async function load() {
      if (isConfigured()) {
        await loadFromDatabase();
      }
      setProjects(getProjects());
      setLoading(false);
    }
    load();
  }, [router]);

  function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    deleteProject(id);
    setProjects(getProjects());
  }

  function handleDuplicate(project: Project) {
    const now = new Date().toISOString();
    const copy: Project = {
      ...structuredClone(project),
      id: generateId(),
      name: `${project.name} (Copy)`,
      status: "draft" as const,
      createdAt: now,
      updatedAt: now,
    };
    saveProject(copy);
    setProjects(getProjects());
  }

  const filtered =
    filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const profile = getProfile();

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8 animate-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Projects</h1>
            <p className="mt-1 text-sm text-brand-600">
              {loading
                ? "Loading..."
                : projects.length === 0
                  ? "Create your first design project to get started."
                  : `${projects.length} project${projects.length === 1 ? "" : "s"}${
                      profile?.companyName ? ` at ${profile.companyName}` : ""
                    }`}
            </p>
          </div>
          <button
            onClick={() => router.push("/projects/new")}
            className="btn-primary"
          >
            + New Project
          </button>
        </div>

        {/* Status Filters */}
        {projects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-6 rounded-xl bg-white border border-brand-900/10 p-1 w-fit">
            {(
              [
                { value: "all", label: "All" },
                { value: "draft", label: "Draft" },
                { value: "in-progress", label: "Active" },
                { value: "review", label: "Review" },
                { value: "delivered", label: "Delivered" },
              ] as const
            ).map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={filter === f.value ? "tab-active" : "tab"}
              >
                {f.label}
                {f.value !== "all" && (
                  <span className="ml-1 text-[10px] opacity-60">
                    {projects.filter((p) => p.status === f.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 w-2/3 rounded bg-brand-900/10 mb-3" />
                <div className="h-3 w-1/2 rounded bg-brand-900/5 mb-4" />
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-brand-900/5">
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      <div className="h-5 w-8 rounded bg-brand-900/10 mb-1" />
                      <div className="h-2 w-10 rounded bg-brand-900/5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          filter === "all" ? (
            <EmptyState onCreateClick={() => router.push("/projects/new")} />
          ) : (
            <div className="card text-center py-8">
              <p className="text-sm text-brand-600">
                No {filter} projects.
              </p>
            </div>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => router.push(`/projects/${p.id}`)}
                onDelete={() => handleDelete(p.id)}
                onDuplicate={() => handleDuplicate(p)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
  onDelete,
  onDuplicate,
}: {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const sleeping = getTotalSleeping(project.rooms);
  const totalFurniture = project.rooms.reduce(
    (sum, r) => sum + r.furniture.length,
    0
  );
  const totalCost = project.rooms.reduce(
    (sum, r) =>
      sum + r.furniture.reduce((fs, f) => fs + f.item.price * f.quantity, 0),
    0
  );

  return (
    <div
      className="card group cursor-pointer transition hover:border-amber/40 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-brand-900 group-hover:text-amber-dark transition truncate">
            {project.name || "Untitled Project"}
          </h3>
          <p className="text-xs text-brand-600 mt-0.5 truncate">
            {project.property.address || "No address set"}
          </p>
        </div>
        <span className={STATUS_BADGE[project.status] + " ml-2 shrink-0"}>
          {STATUS_LABEL[project.status]}
        </span>
      </div>

      <div className="mb-4 text-xs text-brand-600">
        {project.client.name || "No client"} &middot;{" "}
        {project.property.city || "City"}, {project.property.state || "ST"}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-brand-900/5 pt-3">
        <Stat label="Rooms" value={project.rooms.length} />
        <Stat label="Sleeps" value={sleeping} />
        <Stat label="Items" value={totalFurniture} />
      </div>

      {totalCost > 0 && (
        <div className="mt-3 text-xs text-brand-600">
          Budget: ${totalCost.toLocaleString()}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-brand-600/60">
        <span>
          Updated {new Date(project.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="text-brand-600 hover:text-brand-900"
          >
            Duplicate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-bold text-brand-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-brand-600">
        {label}
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="card mx-auto max-w-md text-center py-16">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber/20 text-3xl">
        🏠
      </div>
      <h2 className="text-lg font-semibold text-brand-900">No projects yet</h2>
      <p className="mt-2 text-sm text-brand-600 max-w-xs mx-auto">
        Create your first project to start automating your design workflow.
        You&apos;ll set up rooms, optimize sleeping, and select furniture.
      </p>
      <button onClick={onCreateClick} className="btn-primary mt-6">
        + Create First Project
      </button>
    </div>
  );
}
