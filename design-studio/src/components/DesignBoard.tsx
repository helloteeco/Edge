"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { saveProject, getProject as getProjectFromStore, logActivity } from "@/lib/store";
import { CATALOG, getCategories, getSubcategories, searchCatalog } from "@/lib/furniture-catalog";
import { suggestFurniture } from "@/lib/auto-suggest";
import type { Project, Room, FurnitureItem, SelectedFurniture } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: () => void;
}

// Furniture items with position on the room canvas
interface PlacedItem extends SelectedFurniture {
  x: number; // 0-100 percentage of room width
  y: number; // 0-100 percentage of room length
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

const ROOM_COLORS: Record<string, string> = {
  "primary-bedroom": "#E8D5C4",
  bedroom: "#D4C5B5",
  loft: "#C9BBA8",
  "bonus-room": "#D4C5B5",
  "living-room": "#C4CEB5",
  "dining-room": "#C4CEB5",
  kitchen: "#D4D4C4",
  den: "#C9BBA8",
  office: "#B5C5D4",
  "media-room": "#B5B5C4",
  "game-room": "#B5C5B5",
  bathroom: "#B5D4D4",
  outdoor: "#B5D4B5",
  hallway: "#D4D4D4",
};

const ITEM_COLORS: Record<string, string> = {
  "beds-mattresses": "#8B7355",
  seating: "#6B8E6B",
  tables: "#7B6B5B",
  storage: "#8B7B6B",
  lighting: "#C4A56B",
  decor: "#A08070",
  "rugs-textiles": "#9B8B7B",
  outdoor: "#6B8B5B",
  "kitchen-dining": "#7B8B9B",
  bathroom: "#6B9BAB",
};

export default function DesignBoard({ project, onUpdate }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string>(
    project.rooms[0]?.id ?? ""
  );
  const [showCatalog, setShowCatalog] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [draggingItem, setDraggingItem] = useState<FurnitureItem | null>(null);
  const [selectedPlaced, setSelectedPlaced] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const currentRoom = project.rooms.find((r) => r.id === selectedRoom);

  const categories = getCategories();
  const subcategories = category ? getSubcategories(category) : [];
  const filteredItems = search.trim()
    ? searchCatalog(search)
    : CATALOG.filter((i) => (!category || i.category === category));

  const totalCost = project.rooms.reduce(
    (sum, r) =>
      sum + r.furniture.reduce((fs, f) => fs + f.item.price * f.quantity, 0),
    0
  );

  // Calculate room scale
  const CANVAS_WIDTH = 600;
  const maxDim = Math.max(currentRoom?.widthFt ?? 12, currentRoom?.lengthFt ?? 12);
  const scale = CANVAS_WIDTH / maxDim; // px per foot
  const canvasHeight = currentRoom ? currentRoom.lengthFt * scale : 400;
  const canvasW = currentRoom ? currentRoom.widthFt * scale : CANVAS_WIDTH;

  function getItemDimsPx(item: FurnitureItem) {
    return {
      w: Math.max(20, (item.widthIn / 12) * scale),
      h: Math.max(20, (item.depthIn / 12) * scale),
    };
  }

  function handleCanvasDrop(e: React.MouseEvent) {
    if (!draggingItem || !currentRoom || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / canvasW) * 100;
    const y = ((e.clientY - rect.top) / canvasHeight) * 100;

    const fresh = getProjectFromStore(project.id);
    if (!fresh) return;
    const room = fresh.rooms.find((r) => r.id === selectedRoom);
    if (!room) return;

    const existing = room.furniture.find((f) => f.item.id === draggingItem.id);
    if (existing) {
      // Move existing item
      (existing as PlacedItem).x = Math.max(0, Math.min(100, x));
      (existing as PlacedItem).y = Math.max(0, Math.min(100, y));
    } else {
      // Add new item
      const placed: PlacedItem = {
        item: draggingItem,
        quantity: 1,
        roomId: room.id,
        notes: "",
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
      room.furniture.push(placed);
    }

    saveProject(fresh);
    setDraggingItem(null);
    onUpdate();
  }

  function removeItem(itemId: string) {
    const fresh = getProjectFromStore(project.id);
    if (!fresh) return;
    const room = fresh.rooms.find((r) => r.id === selectedRoom);
    if (!room) return;
    room.furniture = room.furniture.filter((f) => f.item.id !== itemId);
    saveProject(fresh);
    setSelectedPlaced(null);
    onUpdate();
  }

  function addFromCatalog(item: FurnitureItem) {
    const fresh = getProjectFromStore(project.id);
    if (!fresh) return;
    const room = fresh.rooms.find((r) => r.id === selectedRoom);
    if (!room) return;

    const existing = room.furniture.find((f) => f.item.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      // Auto-place: find an open spot
      const placed: PlacedItem = {
        item,
        quantity: 1,
        roomId: room.id,
        notes: "",
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      };
      room.furniture.push(placed);
    }

    saveProject(fresh);
    onUpdate();
  }

  function addAllSuggestions() {
    if (!currentRoom) return;
    const fresh = getProjectFromStore(project.id);
    if (!fresh) return;
    const room = fresh.rooms.find((r) => r.id === selectedRoom);
    if (!room) return;

    const suggestions = suggestFurniture(room, fresh.style);
    let offsetY = 15;
    for (const item of suggestions) {
      if (!room.furniture.find((f) => f.item.id === item.id)) {
        const placed: PlacedItem = {
          item,
          quantity: 1,
          roomId: room.id,
          notes: "",
          x: 30 + Math.random() * 40,
          y: offsetY,
        };
        room.furniture.push(placed);
        offsetY = (offsetY + 15) % 85;
      }
    }

    saveProject(fresh);
    logActivity(project.id, "furniture_added", `Auto-added suggestions to ${room.name}`);
    onUpdate();
  }

  if (project.rooms.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-3">🎨</div>
        <p className="text-brand-600">
          Add rooms first in the Rooms tab to start designing.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Design Board</h2>
          <p className="text-sm text-brand-600">
            Place furniture in your rooms visually. Drag from the catalog or
            click to add.{" "}
            <span className="font-medium text-brand-900">
              ${totalCost.toLocaleString()}
            </span>
            {project.budget > 0 && (
              <span
                className={
                  totalCost > project.budget ? " text-red-500" : ""
                }
              >
                {" "}/ ${project.budget.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCatalog(!showCatalog)}
          className={showCatalog ? "btn-secondary btn-sm" : "btn-accent btn-sm"}
        >
          {showCatalog ? "Hide Catalog" : "Show Catalog"}
        </button>
      </div>

      {/* Room selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => {
              setSelectedRoom(room.id);
              setSelectedPlaced(null);
            }}
            className={selectedRoom === room.id ? "tab-active" : "tab"}
          >
            {room.name}
            {room.furniture.length > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">
                {room.furniture.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Main canvas area */}
        <div className="flex-1">
          {currentRoom && (
            <div className="card p-3">
              {/* Room info bar */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-brand-900">
                  {currentRoom.name}
                  <span className="text-brand-600 font-normal ml-2">
                    {currentRoom.widthFt}&apos; &times; {currentRoom.lengthFt}&apos;
                    &middot; {(currentRoom.widthFt * currentRoom.lengthFt).toFixed(0)} sqft
                  </span>
                </div>
                <div className="flex gap-2">
                  {currentRoom.furniture.length === 0 && (
                    <button
                      onClick={addAllSuggestions}
                      className="text-xs text-amber-dark hover:underline font-medium"
                    >
                      Auto-Furnish Room
                    </button>
                  )}
                  <span className="text-xs text-brand-600">
                    {currentRoom.furniture.length} items &middot; $
                    {currentRoom.furniture
                      .reduce((s, f) => s + f.item.price * f.quantity, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 2D Room Canvas */}
              <div
                ref={canvasRef}
                className="relative mx-auto border-2 border-brand-900/20 rounded-lg overflow-hidden"
                style={{
                  width: canvasW,
                  height: canvasHeight,
                  backgroundColor: ROOM_COLORS[currentRoom.type] ?? "#E8E4DC",
                  cursor: draggingItem ? "crosshair" : "default",
                }}
                onClick={handleCanvasDrop}
              >
                {/* Room dimensions */}
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <span className="bg-white/80 px-2 py-0.5 text-[10px] font-medium text-brand-700 rounded-b">
                    {currentRoom.widthFt}&apos;
                  </span>
                </div>
                <div className="absolute top-0 bottom-0 right-0 flex items-center">
                  <span className="bg-white/80 px-1 py-0.5 text-[10px] font-medium text-brand-700 rounded-l -rotate-90 origin-center">
                    {currentRoom.lengthFt}&apos;
                  </span>
                </div>

                {/* Grid lines */}
                {Array.from({ length: Math.floor(currentRoom.widthFt) - 1 }).map(
                  (_, i) => (
                    <div
                      key={`v${i}`}
                      className="absolute top-0 bottom-0 border-l border-brand-900/5"
                      style={{ left: (i + 1) * scale }}
                    />
                  )
                )}
                {Array.from({
                  length: Math.floor(currentRoom.lengthFt) - 1,
                }).map((_, i) => (
                  <div
                    key={`h${i}`}
                    className="absolute left-0 right-0 border-t border-brand-900/5"
                    style={{ top: (i + 1) * scale }}
                  />
                ))}

                {/* Features */}
                {currentRoom.features.includes("Window") && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-blue-300/60" />
                )}
                {currentRoom.features.includes("Fireplace") && (
                  <div className="absolute bottom-0 left-1/3 w-16 h-2 bg-orange-300/60 rounded-t" />
                )}
                {currentRoom.features.includes("Closet") && (
                  <div className="absolute top-0 right-0 w-10 h-12 bg-brand-900/10 rounded-bl border-l border-b border-brand-900/10">
                    <span className="text-[7px] text-brand-600/60 p-0.5 block">closet</span>
                  </div>
                )}
                {currentRoom.features.includes("En-suite") && (
                  <div className="absolute bottom-0 right-0 w-16 h-12 bg-blue-100/40 rounded-tl border-l border-t border-blue-200/40">
                    <span className="text-[7px] text-blue-400/60 p-0.5 block">en-suite</span>
                  </div>
                )}

                {/* Accent wall */}
                {currentRoom.accentWall && (
                  <div
                    className="absolute"
                    style={{
                      backgroundColor: currentRoom.accentWall.color + "40",
                      borderColor: currentRoom.accentWall.color,
                      ...(currentRoom.accentWall.wall === "north"
                        ? { top: 0, left: 0, right: 0, height: 4, borderBottomWidth: 2 }
                        : currentRoom.accentWall.wall === "south"
                          ? { bottom: 0, left: 0, right: 0, height: 4, borderTopWidth: 2 }
                          : currentRoom.accentWall.wall === "east"
                            ? { top: 0, bottom: 0, right: 0, width: 4, borderLeftWidth: 2 }
                            : { top: 0, bottom: 0, left: 0, width: 4, borderRightWidth: 2 }),
                    }}
                  />
                )}

                {/* Placed furniture items */}
                {currentRoom.furniture.map((f) => {
                  const placed = f as PlacedItem;
                  const dims = getItemDimsPx(f.item);
                  const isSelected = selectedPlaced === f.item.id;
                  const xPx = ((placed.x ?? 50) / 100) * canvasW - dims.w / 2;
                  const yPx = ((placed.y ?? 50) / 100) * canvasHeight - dims.h / 2;

                  return (
                    <div
                      key={f.item.id}
                      className={`absolute rounded shadow-sm flex items-center justify-center cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-amber ring-offset-1 z-10"
                          : "hover:ring-1 hover:ring-amber/50"
                      }`}
                      style={{
                        left: Math.max(0, Math.min(canvasW - dims.w, xPx)),
                        top: Math.max(0, Math.min(canvasHeight - dims.h, yPx)),
                        width: dims.w,
                        height: dims.h,
                        backgroundColor:
                          (ITEM_COLORS[f.item.category] ?? "#8B7B6B") + "CC",
                        borderWidth: 1,
                        borderColor:
                          (ITEM_COLORS[f.item.category] ?? "#8B7B6B") + "FF",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlaced(
                          isSelected ? null : f.item.id
                        );
                        setDraggingItem(null);
                      }}
                    >
                      <span
                        className="text-white text-center leading-tight font-medium drop-shadow-sm"
                        style={{ fontSize: Math.max(8, Math.min(11, dims.w / 8)) }}
                      >
                        {f.item.name.length > 20
                          ? f.item.name.slice(0, 18) + "..."
                          : f.item.name}
                      </span>
                    </div>
                  );
                })}

                {/* Drag indicator */}
                {draggingItem && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-amber/20 border-2 border-amber border-dashed rounded-lg px-4 py-2 text-sm font-medium text-amber-dark">
                      Click to place: {draggingItem.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected item detail bar */}
              {selectedPlaced && currentRoom.furniture.find((f) => f.item.id === selectedPlaced) && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-900/5 px-4 py-2">
                  {(() => {
                    const f = currentRoom.furniture.find(
                      (f) => f.item.id === selectedPlaced
                    )!;
                    return (
                      <>
                        <div className="text-sm">
                          <span className="font-medium text-brand-900">
                            {f.item.name}
                          </span>
                          <span className="text-brand-600 ml-2">
                            {f.item.vendor} &middot; {f.item.color} &middot; $
                            {f.item.price}
                          </span>
                          <span className="text-brand-600/60 ml-2">
                            {f.item.widthIn}&quot;W &times; {f.item.depthIn}
                            &quot;D &times; {f.item.heightIn}&quot;H
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setDraggingItem(f.item);
                              setSelectedPlaced(null);
                            }}
                            className="text-xs text-amber-dark hover:underline"
                          >
                            Move
                          </button>
                          <button
                            onClick={() => removeItem(f.item.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Furniture list for this room */}
              {currentRoom.furniture.length > 0 && (
                <div className="mt-3 border-t border-brand-900/5 pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-2">
                    Room Items ({currentRoom.furniture.length})
                  </div>
                  <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                    {currentRoom.furniture.map((f) => (
                      <div
                        key={f.item.id}
                        className={`flex items-center justify-between rounded px-2 py-1.5 text-xs cursor-pointer transition ${
                          selectedPlaced === f.item.id
                            ? "bg-amber/10 text-brand-900"
                            : "bg-cream/50 text-brand-700 hover:bg-cream"
                        }`}
                        onClick={() =>
                          setSelectedPlaced(
                            selectedPlaced === f.item.id ? null : f.item.id
                          )
                        }
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                ITEM_COLORS[f.item.category] ?? "#8B7B6B",
                            }}
                          />
                          <span className="truncate">{f.item.name}</span>
                        </div>
                        <span className="text-brand-600 shrink-0 ml-2">
                          ${f.item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Catalog sidebar */}
        {showCatalog && (
          <div className="w-72 shrink-0">
            <div className="card max-h-[80vh] overflow-y-auto sticky top-4">
              <h3 className="font-semibold mb-3 text-sm">Furniture Catalog</h3>

              {/* Search */}
              <input
                className="input mb-2 text-xs"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCategory("");
                }}
              />

              {!search && (
                <select
                  className="select mb-2 text-xs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c] || c}
                    </option>
                  ))}
                </select>
              )}

              {/* Suggestions */}
              {currentRoom && currentRoom.furniture.length === 0 && (
                <div className="mb-3 rounded bg-amber/5 border border-amber/20 p-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-dark mb-1.5">
                    Suggested
                  </div>
                  {suggestFurniture(currentRoom, project.style)
                    .slice(0, 5)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addFromCatalog(item)}
                        className="flex w-full items-center justify-between rounded px-2 py-1 text-xs hover:bg-amber/10 transition"
                      >
                        <span className="truncate text-brand-900">
                          {item.name}
                        </span>
                        <span className="text-amber-dark shrink-0 ml-1">
                          +
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {/* Items */}
              <div className="text-[10px] text-brand-600 mb-1.5">
                {filteredItems.length} items
              </div>
              <div className="space-y-1">
                {filteredItems.slice(0, 50).map((item) => {
                  const isAdded = currentRoom?.furniture.some(
                    (f) => f.item.id === item.id
                  );
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded border px-2 py-1.5 text-xs transition cursor-pointer ${
                        draggingItem?.id === item.id
                          ? "border-amber bg-amber/10"
                          : isAdded
                            ? "border-amber/30 bg-amber/5"
                            : "border-brand-900/5 hover:border-amber/30"
                      }`}
                      onClick={() => {
                        if (isAdded) {
                          // Select it on canvas
                          setSelectedPlaced(item.id);
                        } else {
                          addFromCatalog(item);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-brand-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-brand-600/60 truncate">
                          {item.vendor} &middot; {item.color}
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <div className="font-medium text-brand-900">
                          ${item.price}
                        </div>
                        {isAdded ? (
                          <span className="text-[9px] text-amber-dark">
                            Added
                          </span>
                        ) : (
                          <span className="text-[9px] text-brand-600">
                            + Add
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
