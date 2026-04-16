"use client";

import { useState } from "react";
import { saveProject, generateId } from "@/lib/store";
import type { Project, Room, RoomType } from "@/lib/types";

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "primary-bedroom", label: "Primary Bedroom" },
  { value: "bedroom", label: "Bedroom" },
  { value: "loft", label: "Loft" },
  { value: "bonus-room", label: "Bonus Room" },
  { value: "living-room", label: "Living Room" },
  { value: "dining-room", label: "Dining Room" },
  { value: "kitchen", label: "Kitchen" },
  { value: "den", label: "Den" },
  { value: "office", label: "Office" },
  { value: "media-room", label: "Media Room" },
  { value: "game-room", label: "Game Room" },
  { value: "bathroom", label: "Bathroom" },
  { value: "hallway", label: "Hallway" },
  { value: "outdoor", label: "Outdoor Space" },
];

const FEATURES = [
  "Window",
  "Closet",
  "En-suite",
  "Balcony",
  "Fireplace",
  "Vaulted Ceiling",
  "Skylight",
  "Walk-in Closet",
  "Bay Window",
  "Built-in Shelving",
];

interface Props {
  project: Project;
  onUpdate: () => void;
}

export default function RoomPlanner({ project, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return {
      name: "",
      type: "bedroom" as RoomType,
      widthFt: 12,
      lengthFt: 12,
      ceilingHeightFt: 9,
      floor: 1,
      features: [] as string[],
      notes: "",
    };
  }

  function openNew() {
    setEditingRoom(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(room: Room) {
    setEditingRoom(room);
    setForm({
      name: room.name,
      type: room.type,
      widthFt: room.widthFt,
      lengthFt: room.lengthFt,
      ceilingHeightFt: room.ceilingHeightFt,
      floor: room.floor,
      features: [...room.features],
      notes: room.notes,
    });
    setShowForm(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;

    if (editingRoom) {
      const idx = project.rooms.findIndex((r) => r.id === editingRoom.id);
      if (idx >= 0) {
        project.rooms[idx] = {
          ...project.rooms[idx],
          ...form,
        };
      }
    } else {
      const room: Room = {
        id: generateId(),
        ...form,
        selectedBedConfig: null,
        furniture: [],
        accentWall: null,
      };
      project.rooms.push(room);
    }
    saveProject(project);
    setShowForm(false);
    setForm(emptyForm());
    onUpdate();
  }

  function handleDelete(roomId: string) {
    if (!confirm("Delete this room?")) return;
    project.rooms = project.rooms.filter((r) => r.id !== roomId);
    saveProject(project);
    onUpdate();
  }

  function toggleFeature(feat: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feat)
        ? prev.features.filter((f) => f !== feat)
        : [...prev.features, feat],
    }));
  }

  function quickAddRooms() {
    const bedrooms = project.property.bedrooms || 3;
    const bathrooms = project.property.bathrooms || 2;
    const floors = project.property.floors || 1;

    // Primary bedroom
    project.rooms.push({
      id: generateId(),
      name: "Primary Bedroom",
      type: "primary-bedroom",
      widthFt: 14,
      lengthFt: 16,
      ceilingHeightFt: 9,
      floor: 1,
      features: ["En-suite", "Closet", "Window"],
      selectedBedConfig: null,
      furniture: [],
      accentWall: null,
      notes: "",
    });

    // Additional bedrooms
    for (let i = 2; i <= bedrooms; i++) {
      project.rooms.push({
        id: generateId(),
        name: `Bedroom ${i}`,
        type: "bedroom",
        widthFt: 12,
        lengthFt: 12,
        ceilingHeightFt: 9,
        floor: Math.min(i <= Math.ceil(bedrooms / floors) ? 1 : 2, floors),
        features: ["Closet", "Window"],
        selectedBedConfig: null,
        furniture: [],
        accentWall: null,
        notes: "",
      });
    }

    // Living room
    project.rooms.push({
      id: generateId(),
      name: "Living Room",
      type: "living-room",
      widthFt: 18,
      lengthFt: 16,
      ceilingHeightFt: 9,
      floor: 1,
      features: ["Window", "Fireplace"],
      selectedBedConfig: null,
      furniture: [],
      accentWall: null,
      notes: "",
    });

    // Kitchen
    project.rooms.push({
      id: generateId(),
      name: "Kitchen",
      type: "kitchen",
      widthFt: 14,
      lengthFt: 12,
      ceilingHeightFt: 9,
      floor: 1,
      features: [],
      selectedBedConfig: null,
      furniture: [],
      accentWall: null,
      notes: "",
    });

    // Dining
    project.rooms.push({
      id: generateId(),
      name: "Dining Room",
      type: "dining-room",
      widthFt: 14,
      lengthFt: 12,
      ceilingHeightFt: 9,
      floor: 1,
      features: ["Window"],
      selectedBedConfig: null,
      furniture: [],
      accentWall: null,
      notes: "",
    });

    // Bathrooms
    for (let i = 1; i <= Math.floor(bathrooms); i++) {
      project.rooms.push({
        id: generateId(),
        name: i === 1 ? "Primary Bathroom" : `Bathroom ${i}`,
        type: "bathroom",
        widthFt: i === 1 ? 10 : 8,
        lengthFt: i === 1 ? 8 : 6,
        ceilingHeightFt: 9,
        floor: Math.min(i <= Math.ceil(bathrooms / floors) ? 1 : 2, floors),
        features: [],
        selectedBedConfig: null,
        furniture: [],
        accentWall: null,
        notes: "",
      });
    }

    saveProject(project);
    onUpdate();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">
            Rooms ({project.rooms.length})
          </h2>
          <p className="text-sm text-brand-600">
            Define rooms with dimensions for sleeping optimization.
          </p>
        </div>
        <div className="flex gap-2">
          {project.rooms.length === 0 && (
            <button onClick={quickAddRooms} className="btn-secondary btn-sm">
              Quick Setup from Property
            </button>
          )}
          <button onClick={openNew} className="btn-primary btn-sm">
            + Add Room
          </button>
        </div>
      </div>

      {/* Room List */}
      {project.rooms.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-brand-600 mb-4">
            No rooms added yet. Add rooms manually or use Quick Setup.
          </p>
          <button onClick={quickAddRooms} className="btn-secondary">
            Quick Setup
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {project.rooms.map((room) => (
            <div
              key={room.id}
              className="card group cursor-pointer transition hover:border-amber/40"
              onClick={() => openEdit(room)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-brand-900">{room.name}</h3>
                  <p className="text-xs text-brand-600 capitalize">
                    {room.type.replace(/-/g, " ")} &middot; Floor {room.floor}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(room.id);
                  }}
                  className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                >
                  Delete
                </button>
              </div>

              <div className="text-sm text-brand-700 mb-2">
                {room.widthFt}&apos; &times; {room.lengthFt}&apos; &middot;{" "}
                {room.ceilingHeightFt}&apos; ceiling
              </div>

              {room.selectedBedConfig && (
                <div className="text-xs text-amber-dark font-medium">
                  {room.selectedBedConfig.name} — Sleeps{" "}
                  {room.selectedBedConfig.totalSleeps}
                </div>
              )}

              {room.furniture.length > 0 && (
                <div className="text-xs text-brand-600 mt-1">
                  {room.furniture.length} furniture item
                  {room.furniture.length !== 1 ? "s" : ""}
                </div>
              )}

              {room.features.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {room.features.map((f) => (
                    <span key={f} className="badge-neutral text-[10px]">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingRoom ? "Edit Room" : "Add Room"}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Room Name</label>
                  <input
                    className="input"
                    placeholder='e.g. "Primary Bedroom"'
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Room Type</label>
                  <select
                    className="select"
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as RoomType,
                      })
                    }
                  >
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Floor</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    value={form.floor}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        floor: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Width (ft)</label>
                  <input
                    type="number"
                    className="input"
                    min={4}
                    step={0.5}
                    value={form.widthFt}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        widthFt: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Length (ft)</label>
                  <input
                    type="number"
                    className="input"
                    min={4}
                    step={0.5}
                    value={form.lengthFt}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        lengthFt: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Ceiling (ft)</label>
                  <input
                    type="number"
                    className="input"
                    min={7}
                    step={0.5}
                    value={form.ceilingHeightFt}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ceilingHeightFt: parseFloat(e.target.value) || 8,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Room Area</label>
                <div className="text-sm text-brand-700 font-medium">
                  {(form.widthFt * form.lengthFt).toFixed(0)} sqft
                </div>
              </div>

              <div>
                <label className="label">Features</label>
                <div className="flex flex-wrap gap-2">
                  {FEATURES.map((feat) => (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => toggleFeature(feat)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        form.features.includes(feat)
                          ? "bg-amber text-brand-900"
                          : "bg-brand-900/5 text-brand-600 hover:bg-brand-900/10"
                      }`}
                    >
                      {feat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input min-h-[60px] resize-y"
                  placeholder="Any special notes about this room..."
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary btn-sm">
                {editingRoom ? "Save Changes" : "Add Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
