"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createEmptyProject, saveProject, logActivity, generateId } from "@/lib/store";
import { TEMPLATES } from "@/lib/project-templates";
import type { DesignStyle, Room } from "@/lib/types";

const STYLES: { value: DesignStyle; label: string }[] = [
  { value: "modern", label: "Modern" },
  { value: "farmhouse", label: "Farmhouse" },
  { value: "coastal", label: "Coastal" },
  { value: "bohemian", label: "Bohemian" },
  { value: "industrial", label: "Industrial" },
  { value: "mid-century", label: "Mid-Century" },
  { value: "scandinavian", label: "Scandinavian" },
  { value: "rustic", label: "Rustic" },
  { value: "contemporary", label: "Contemporary" },
  { value: "transitional", label: "Transitional" },
  { value: "mountain-lodge", label: "Mountain Lodge" },
  { value: "traditional", label: "Traditional" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [project, setProject] = useState(() => createEmptyProject());
  const [error, setError] = useState("");

  function update(path: string, value: string | number) {
    setProject((prev) => {
      // Use JSON parse/stringify for safe deep clone (broader browser support)
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      if (keys.length === 0 || !keys[0]) return prev;
      let obj: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]] || typeof obj[keys[i]] !== "object") return prev;
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!project.name.trim()) {
      setError("Please enter a project name.");
      return;
    }
    saveProject(project);
    logActivity(project.id, "created", `Created project: ${project.name}`);
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-8 animate-in">
        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-brand-600 hover:text-brand-900 transition"
        >
          &larr; Back to Projects
        </button>

        <h1 className="text-2xl font-bold text-brand-900 mb-4">
          New Design Project
        </h1>

        {/* Templates */}
        <div className="mb-8">
          <p className="text-sm text-brand-600 mb-3">
            Start from a template or create from scratch:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  const rooms: Room[] = tpl.rooms.map((r) => ({
                    id: generateId(),
                    ...r,
                    selectedBedConfig: null,
                    furniture: [],
                    accentWall: null,
                    notes: "",
                  }));
                  setProject((prev) => ({
                    ...prev,
                    name: prev.name || tpl.name,
                    style: tpl.style,
                    targetGuests: tpl.targetGuests,
                    rooms,
                    property: {
                      ...prev.property,
                      bedrooms: tpl.rooms.filter((r) =>
                        ["primary-bedroom", "bedroom", "loft", "bonus-room"].includes(r.type)
                      ).length,
                      bathrooms: tpl.rooms.filter((r) => r.type === "bathroom").length,
                      floors: Math.max(...tpl.rooms.map((r) => r.floor), 1),
                    },
                  }));
                }}
                className="card text-left hover:border-amber/40 transition group"
              >
                <h3 className="font-semibold text-brand-900 group-hover:text-amber-dark text-sm">
                  {tpl.name}
                </h3>
                <p className="text-xs text-brand-600 mt-1">{tpl.description}</p>
                <div className="mt-2 flex gap-2 text-[10px]">
                  <span className="badge-neutral">{tpl.targetGuests} guests</span>
                  <span className="badge-neutral capitalize">{tpl.style.replace(/-/g, " ")}</span>
                  <span className="badge-neutral">{tpl.rooms.length} rooms</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-8">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Project Info */}
          <section className="card">
            <h2 className="text-lg font-semibold mb-4">Project Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Project Name</label>
                <input
                  className="input"
                  placeholder='e.g., "Lakehouse Retreat Design"'
                  value={project.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Design Style</label>
                <select
                  className="select"
                  value={project.style}
                  onChange={(e) => update("style", e.target.value)}
                >
                  {STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Target Guests</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={project.targetGuests || ""}
                  onChange={(e) =>
                    update("targetGuests", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className="label">Budget ($)</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  placeholder="Optional"
                  value={project.budget || ""}
                  onChange={(e) =>
                    update("budget", parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </section>

          {/* Client Info */}
          <section className="card">
            <h2 className="text-lg font-semibold mb-4">Client Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Client Name</label>
                <input
                  className="input"
                  placeholder="John Doe"
                  value={project.client.name}
                  onChange={(e) => update("client.name", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="john@example.com"
                  value={project.client.email}
                  onChange={(e) => update("client.email", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  placeholder="(555) 123-4567"
                  value={project.client.phone}
                  onChange={(e) => update("client.phone", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Client Preferences / Notes</label>
                <textarea
                  className="input min-h-[80px] resize-y"
                  placeholder="Style preferences, color likes/dislikes, special requests..."
                  value={project.client.preferences}
                  onChange={(e) =>
                    update("client.preferences", e.target.value)
                  }
                />
              </div>
            </div>
          </section>

          {/* Property Info */}
          <section className="card">
            <h2 className="text-lg font-semibold mb-4">Property Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input
                  className="input"
                  placeholder="123 Mountain View Dr"
                  value={project.property.address}
                  onChange={(e) => update("property.address", e.target.value)}
                />
              </div>
              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  placeholder="Gatlinburg"
                  value={project.property.city}
                  onChange={(e) => update("property.city", e.target.value)}
                />
              </div>
              <div>
                <label className="label">State</label>
                <input
                  className="input"
                  placeholder="TN"
                  value={project.property.state}
                  onChange={(e) => update("property.state", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Square Footage</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={project.property.squareFootage || ""}
                  onChange={(e) =>
                    update(
                      "property.squareFootage",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <label className="label">Bedrooms</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={project.property.bedrooms || ""}
                  onChange={(e) =>
                    update(
                      "property.bedrooms",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <label className="label">Bathrooms</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step={0.5}
                  value={project.property.bathrooms || ""}
                  onChange={(e) =>
                    update(
                      "property.bathrooms",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div>
                <label className="label">Floors</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  value={project.property.floors || ""}
                  onChange={(e) =>
                    update("property.floors", parseInt(e.target.value) || 1)
                  }
                />
              </div>
            </div>
          </section>

          {/* Scan Links */}
          <section className="card">
            <h2 className="text-lg font-semibold mb-2">3D Scan Links</h2>
            <p className="text-sm text-brand-600 mb-4">
              Link your Matterport, Polycam, or Spoak project.
            </p>
            <div className="grid gap-4">
              <div>
                <label className="label">Matterport Link</label>
                <input
                  className="input"
                  placeholder="https://my.matterport.com/show/?m=..."
                  value={project.property.matterportLink}
                  onChange={(e) =>
                    update("property.matterportLink", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="label">Polycam Link</label>
                <input
                  className="input"
                  placeholder="https://poly.cam/capture/..."
                  value={project.property.polycamLink}
                  onChange={(e) =>
                    update("property.polycamLink", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="label">Spoak Link</label>
                <input
                  className="input"
                  placeholder="https://spoak.com/project/..."
                  value={project.property.spoakLink}
                  onChange={(e) =>
                    update("property.spoakLink", e.target.value)
                  }
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
