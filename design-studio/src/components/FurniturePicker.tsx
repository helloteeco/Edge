"use client";

import { useState, useMemo } from "react";
import { saveProject, generateId } from "@/lib/store";
import {
  CATALOG,
  getCategories,
  getSubcategories,
  searchCatalog,
} from "@/lib/furniture-catalog";
import { suggestFurniture } from "@/lib/auto-suggest";
import type { Project, FurnitureItem, SelectedFurniture } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  "beds-mattresses": "Beds & Mattresses",
  seating: "Seating",
  tables: "Tables",
  storage: "Storage",
  lighting: "Lighting",
  decor: "Decor",
  "rugs-textiles": "Rugs & Textiles",
  outdoor: "Outdoor",
  "kitchen-dining": "Kitchen & Dining",
  bathroom: "Bathroom",
};

export default function FurniturePicker({ project, onUpdate }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string>(
    project.rooms[0]?.id ?? ""
  );
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);

  const categories = getCategories();
  const subcategories = category ? getSubcategories(category) : [];

  const filteredItems = useMemo(() => {
    if (search.trim()) return searchCatalog(search);
    return CATALOG.filter((i) => {
      if (category && i.category !== category) return false;
      if (subcategory && i.subcategory !== subcategory) return false;
      return true;
    });
  }, [search, category, subcategory]);

  const currentRoom = project.rooms.find((r) => r.id === selectedRoom);

  const totalCost = project.rooms.reduce(
    (sum, r) =>
      sum +
      r.furniture.reduce((fs, f) => fs + f.item.price * f.quantity, 0),
    0
  );

  function addToRoom(item: FurnitureItem) {
    const room = project.rooms.find((r) => r.id === selectedRoom);
    if (!room) return;

    const existing = room.furniture.find((f) => f.item.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      const selected: SelectedFurniture = {
        item,
        quantity: 1,
        roomId: room.id,
        notes: "",
      };
      room.furniture.push(selected);
    }
    saveProject(project);
    onUpdate();
  }

  function removeFromRoom(itemId: string) {
    const room = project.rooms.find((r) => r.id === selectedRoom);
    if (!room) return;
    room.furniture = room.furniture.filter((f) => f.item.id !== itemId);
    saveProject(project);
    onUpdate();
  }

  function updateQuantity(itemId: string, qty: number) {
    const room = project.rooms.find((r) => r.id === selectedRoom);
    if (!room) return;
    const furn = room.furniture.find((f) => f.item.id === itemId);
    if (furn) {
      furn.quantity = Math.max(1, qty);
      saveProject(project);
      onUpdate();
    }
  }

  if (project.rooms.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-brand-600">
          Add rooms first in the Rooms tab before selecting furniture.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Furniture Selection</h2>
          <p className="text-sm text-brand-600">
            Select furniture items for each room. Running total:{" "}
            <span className="font-semibold text-brand-900">
              ${totalCost.toLocaleString()}
            </span>
            {project.budget > 0 && (
              <span className="text-brand-600">
                {" "}
                / ${project.budget.toLocaleString()} budget
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCatalog(!showCatalog)}
          className={showCatalog ? "btn-secondary btn-sm" : "btn-accent btn-sm"}
        >
          {showCatalog ? "Hide Catalog" : "Browse Catalog"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Room Selector + Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Room Selector */}
          <div className="flex flex-wrap gap-2">
            {project.rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={
                  selectedRoom === room.id ? "tab-active" : "tab"
                }
              >
                {room.name}
                {room.furniture.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">
                    {room.furniture.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Room's Current Furniture */}
          {currentRoom && (
            <div className="card">
              <h3 className="font-semibold mb-3">
                {currentRoom.name} — Items (
                {currentRoom.furniture.length})
              </h3>

              {/* Auto-Suggest */}
              {currentRoom.furniture.length === 0 && (
                <div className="mb-4 rounded-lg bg-amber/5 border border-amber/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-dark">
                      Suggested for {currentRoom.type.replace(/-/g, " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestFurniture(currentRoom, project.style).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addToRoom(item)}
                        className="flex items-center gap-2 rounded-lg border border-amber/20 bg-white px-3 py-1.5 text-xs hover:border-amber/60 transition"
                      >
                        <span className="font-medium text-brand-900">{item.name}</span>
                        <span className="text-brand-600">${item.price}</span>
                        <span className="text-amber-dark font-medium">+ Add</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentRoom.furniture.length === 0 ? (
                <p className="text-sm text-brand-600 py-4 text-center">
                  No items added yet. Use suggestions above or browse the catalog.
                </p>
              ) : (
                <div className="space-y-2">
                  {currentRoom.furniture.map((f) => (
                    <div
                      key={f.item.id}
                      className="flex items-center justify-between rounded-lg border border-brand-900/5 bg-cream/50 px-4 py-3"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-brand-900">
                          {f.item.name}
                        </div>
                        <div className="text-xs text-brand-600">
                          {f.item.vendor} &middot; {f.item.color} &middot;{" "}
                          {f.item.widthIn}&quot;W &times; {f.item.depthIn}
                          &quot;D &times; {f.item.heightIn}&quot;H
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateQuantity(f.item.id, f.quantity - 1)
                            }
                            className="flex h-6 w-6 items-center justify-center rounded border border-brand-900/10 text-xs hover:bg-brand-900/5"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-medium">
                            {f.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(f.item.id, f.quantity + 1)
                            }
                            className="flex h-6 w-6 items-center justify-center rounded border border-brand-900/10 text-xs hover:bg-brand-900/5"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-medium text-brand-900 w-20 text-right">
                          ${(f.item.price * f.quantity).toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeFromRoom(f.item.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Room Total */}
                  <div className="mt-2 flex justify-end border-t border-brand-900/5 pt-2 text-sm">
                    <span className="text-brand-600">Room Total: </span>
                    <span className="ml-2 font-semibold text-brand-900">
                      $
                      {currentRoom.furniture
                        .reduce(
                          (s, f) => s + f.item.price * f.quantity,
                          0
                        )
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Catalog Browser */}
        {showCatalog && (
          <div className="card max-h-[70vh] overflow-y-auto">
            <h3 className="font-semibold mb-3">Catalog</h3>

            {/* Search */}
            <input
              className="input mb-3"
              placeholder="Search furniture..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCategory("");
                setSubcategory("");
              }}
            />

            {/* Category Filters */}
            {!search && (
              <div className="mb-3 space-y-2">
                <select
                  className="select"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory("");
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c] || c}
                    </option>
                  ))}
                </select>
                {subcategories.length > 0 && (
                  <select
                    className="select"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                  >
                    <option value="">All {CATEGORY_LABELS[category]}</option>
                    {subcategories.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-brand-900/5 p-3 hover:border-amber/30 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-brand-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-brand-600">
                        {item.vendor} &middot; {item.color}
                      </div>
                      <div className="text-xs text-brand-600/60">
                        {item.widthIn}&quot;W &times; {item.depthIn}&quot;D &times;{" "}
                        {item.heightIn}&quot;H
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-sm font-semibold text-brand-900">
                        ${item.price}
                      </div>
                      <button
                        onClick={() => addToRoom(item)}
                        disabled={!selectedRoom}
                        className="mt-1 rounded bg-amber/20 px-2 py-0.5 text-[10px] font-semibold text-amber-dark hover:bg-amber/40 transition disabled:opacity-40"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <p className="text-sm text-brand-600 text-center py-4">
                  No items found.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
