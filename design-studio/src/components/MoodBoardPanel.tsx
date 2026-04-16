"use client";

import { useState } from "react";
import { saveProject, generateId, getProject as getProjectFromStore, logActivity } from "@/lib/store";
import type { Project, MoodBoard, DesignStyle } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: () => void;
}

const STYLE_OPTIONS: { value: DesignStyle; label: string }[] = [
  { value: "modern", label: "Modern" },
  { value: "farmhouse", label: "Farmhouse" },
  { value: "coastal", label: "Coastal" },
  { value: "bohemian", label: "Bohemian" },
  { value: "industrial", label: "Industrial" },
  { value: "mid-century", label: "Mid-Century" },
  { value: "scandinavian", label: "Scandinavian" },
  { value: "rustic", label: "Rustic" },
  { value: "contemporary", label: "Contemporary" },
  { value: "mountain-lodge", label: "Mountain Lodge" },
];

const PRESET_PALETTES: { name: string; colors: string[] }[] = [
  {
    name: "Warm Neutrals",
    colors: ["#f5f0eb", "#d4a574", "#8b7355", "#3d3022", "#1a1a2e"],
  },
  {
    name: "Coastal Blue",
    colors: ["#f0f7fa", "#87ceeb", "#4a90a4", "#2c5f6e", "#1a3a4a"],
  },
  {
    name: "Forest Retreat",
    colors: ["#f2f5f0", "#a8b5a0", "#5a6b50", "#3a4a32", "#1a2a1a"],
  },
  {
    name: "Desert Sand",
    colors: ["#faf5ef", "#e8c9a8", "#c4956a", "#8b5e3c", "#4a2f1a"],
  },
  {
    name: "Modern Mono",
    colors: ["#ffffff", "#d4d4d4", "#737373", "#404040", "#0a0a0a"],
  },
  {
    name: "Sunset Warmth",
    colors: ["#fef3e2", "#f4a261", "#e76f51", "#264653", "#2a9d8f"],
  },
  {
    name: "Lavender Dream",
    colors: ["#f8f4ff", "#c9b1ff", "#8b6bbf", "#4a3766", "#1a1030"],
  },
  {
    name: "Earthy Terracotta",
    colors: ["#faf0e6", "#d4856c", "#a0522d", "#5c3317", "#2d1b0e"],
  },
];

export default function MoodBoardPanel({ project, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    style: project.style,
    colorPalette: PRESET_PALETTES[0].colors,
    inspirationNotes: "",
  });

  function createBoard(e: React.FormEvent) {
    e.preventDefault();
    const fresh = getProjectFromStore(project.id);
    if (!fresh) return;
    const board: MoodBoard = {
      id: generateId(),
      name: form.name || `${form.style} Board`,
      style: form.style as DesignStyle,
      colorPalette: [...form.colorPalette],
      inspirationNotes: form.inspirationNotes,
      imageUrls: [],
    };
    if (!fresh.moodBoards) fresh.moodBoards = [];
    fresh.moodBoards.push(board);
    saveProject(fresh);
    logActivity(project.id, "mood_board_created", `Created mood board: ${board.name}`);
    setShowForm(false);
    setForm({
      name: "",
      style: project.style,
      colorPalette: PRESET_PALETTES[0].colors,
      inspirationNotes: "",
    });
    onUpdate();
  }

  function deleteBoard(id: string) {
    if (!confirm("Delete this mood board?")) return;
    const fresh = getProjectFromStore(project.id);
    if (!fresh) return;
    fresh.moodBoards = (fresh.moodBoards || []).filter((b) => b.id !== id);
    saveProject(fresh);
    onUpdate();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Mood Boards</h2>
          <p className="text-sm text-brand-600">
            Create visual mood boards with color palettes and style notes to
            share with clients.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary btn-sm"
        >
          + New Board
        </button>
      </div>

      {/* Boards Grid */}
      {project.moodBoards.length === 0 && !showForm ? (
        <div className="card text-center py-12">
          <div className="mx-auto mb-3 text-4xl">🎨</div>
          <p className="text-brand-600 mb-4">
            No mood boards yet. Create one to define the design direction.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-secondary"
          >
            Create Mood Board
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {project.moodBoards.map((board) => (
            <div key={board.id} className="card">
              {/* Color Bar */}
              <div className="mb-4 flex h-16 overflow-hidden rounded-lg">
                {board.colorPalette.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-brand-900">
                    {board.name}
                  </h3>
                  <span className="badge-neutral text-[10px] capitalize">
                    {board.style.replace(/-/g, " ")}
                  </span>
                </div>
                <button
                  onClick={() => deleteBoard(board.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>

              {/* Colors */}
              <div className="mt-3 flex gap-2">
                {board.colorPalette.map((color, i) => (
                  <div key={i} className="text-center">
                    <div
                      className="h-8 w-8 rounded-full border border-brand-900/10"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[9px] text-brand-600 mt-1 block">
                      {color}
                    </span>
                  </div>
                ))}
              </div>

              {board.inspirationNotes && (
                <p className="mt-3 text-sm text-brand-700 whitespace-pre-wrap border-t border-brand-900/5 pt-3">
                  {board.inspirationNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Board Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              Create Mood Board
            </h2>

            <form onSubmit={createBoard} className="space-y-4">
              <div>
                <label className="label">Board Name</label>
                <input
                  className="input"
                  placeholder='e.g. "Primary Suite Vibes"'
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Design Style</label>
                <select
                  className="select"
                  value={form.style}
                  onChange={(e) =>
                    setForm({ ...form, style: e.target.value as DesignStyle })
                  }
                >
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Color Palette</label>
                <div className="space-y-2">
                  {PRESET_PALETTES.map((palette) => {
                    const isSelected =
                      JSON.stringify(form.colorPalette) ===
                      JSON.stringify(palette.colors);
                    return (
                      <button
                        key={palette.name}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            colorPalette: palette.colors,
                          })
                        }
                        className={`flex w-full items-center gap-3 rounded-lg border p-2 transition ${
                          isSelected
                            ? "border-amber bg-amber/5"
                            : "border-brand-900/10 hover:border-amber/30"
                        }`}
                      >
                        <div className="flex overflow-hidden rounded">
                          {palette.colors.map((c, i) => (
                            <div
                              key={i}
                              className="h-6 w-6"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-brand-900">
                          {palette.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Inspiration Notes</label>
                <textarea
                  className="input min-h-[100px] resize-y"
                  placeholder="Describe the vibe, reference images, textures, materials..."
                  value={form.inspirationNotes}
                  onChange={(e) =>
                    setForm({ ...form, inspirationNotes: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm">
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
