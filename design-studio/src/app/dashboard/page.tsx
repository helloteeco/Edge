"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getProjects, deleteProject, getUser } from "@/lib/store";
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setProjects(getProjects());
    setLoaded(true);
  }, [router]);

  function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    deleteProject(id);
    setProjects(getProjects());
  }

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-8 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Projects</h1>
            <p className="mt-1 text-sm text-brand-600">
              {projects.length === 0
                ? "Create your first design project to get started."
                : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={() => router.push("/projects/new")}
            className="btn-primary"
          >
            + New Project
          </button>
        </div>

        {/* Project Grid */}
        {projects.length === 0 ? (
          <EmptyState onCreateClick={() => router.push("/projects/new")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => router.push(`/projects/${p.id}`)}
                onDelete={() => handleDelete(p.id)}
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
}: {
  project: Project;
  onClick: () => void;
  onDelete: () => void;
}) {
  const sleeping = getTotalSleeping(project.rooms);
  const totalFurniture = project.rooms.reduce(
    (sum, r) => sum + r.furniture.length,
    0
  );
  const totalCost = project.rooms.reduce(
    (sum, r) =>
      sum +
      r.furniture.reduce((fs, f) => fs + f.item.price * f.quantity, 0),
    0
  );

  return (
    <div
      className="card group cursor-pointer transition hover:border-amber/40 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-brand-900 group-hover:text-amber-dark transition">
            {project.name || "Untitled Project"}
          </h3>
          <p className="text-xs text-brand-600 mt-0.5">
            {project.property.address || "No address set"}
          </p>
        </div>
        <span className={STATUS_BADGE[project.status]}>
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
          Est. budget: ${totalCost.toLocaleString()}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-brand-600/60">
        <span>
          Updated {new Date(project.updatedAt).toLocaleDateString()}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-400 hover:text-red-600 transition"
        >
          Delete
        </button>
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
      <h2 className="text-lg font-semibold text-brand-900">
        No projects yet
      </h2>
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
