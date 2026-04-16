"use client";

import type { Project } from "@/lib/types";
import { getTotalSleeping } from "@/lib/sleep-optimizer";

interface Props {
  project: Project;
}

/**
 * Client-facing project summary that can be shared.
 * Shows property overview, sleep plan visualization, and budget breakdown.
 */
export default function ProjectSummary({ project }: Props) {
  const sleeping = getTotalSleeping(project.rooms);
  const totalCost = project.rooms.reduce(
    (s, r) => s + r.furniture.reduce((fs, f) => fs + f.item.price * f.quantity, 0),
    0
  );
  const roomsWithBeds = project.rooms.filter(
    (r) => r.selectedBedConfig && r.selectedBedConfig.totalSleeps > 0
  );
  const totalSqft = project.rooms.reduce(
    (s, r) => s + r.widthFt * r.lengthFt,
    0
  );

  // Group rooms by floor
  const floors = Array.from(new Set(project.rooms.map((r) => r.floor))).sort();

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  for (const room of project.rooms) {
    for (const f of room.furniture) {
      const cat = f.item.category.replace(/-/g, " ");
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + f.item.price * f.quantity);
    }
  }
  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div className="card bg-brand-900 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{project.name}</h2>
            <p className="text-white/60 mt-1">
              {project.property.address}, {project.property.city},{" "}
              {project.property.state}
            </p>
            <p className="text-white/40 text-sm mt-1">
              Client: {project.client.name || "—"}
            </p>
          </div>
          <div className="text-right">
            <span className="badge bg-amber/20 text-amber capitalize">
              {project.style.replace(/-/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
          <div>
            <div className="text-2xl font-bold text-amber">{sleeping}</div>
            <div className="text-xs text-white/50">Guests</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber">
              {project.rooms.length}
            </div>
            <div className="text-xs text-white/50">Rooms</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber">
              {totalSqft.toLocaleString()}
            </div>
            <div className="text-xs text-white/50">Total sqft</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber">
              ${totalCost.toLocaleString()}
            </div>
            <div className="text-xs text-white/50">Furniture</div>
          </div>
        </div>
      </div>

      {/* Sleep Plan Visual */}
      <div className="card">
        <h3 className="font-semibold text-brand-900 mb-4">
          Sleep Plan — {sleeping} Guests
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roomsWithBeds.map((room) => (
            <div
              key={room.id}
              className="rounded-lg border border-brand-900/10 p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-brand-900">
                  {room.name}
                </span>
                <span className="text-lg font-bold text-amber">
                  {room.selectedBedConfig!.totalSleeps}
                </span>
              </div>
              <div className="text-xs text-brand-600">
                {room.selectedBedConfig!.name}
              </div>
              <div className="text-[10px] text-brand-600/60">
                {room.widthFt}&apos; &times; {room.lengthFt}&apos; &middot; Floor{" "}
                {room.floor}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floor-by-Floor Layout */}
      <div className="card">
        <h3 className="font-semibold text-brand-900 mb-4">Floor Plan Summary</h3>
        {floors.map((floor) => {
          const floorRooms = project.rooms.filter((r) => r.floor === floor);
          const floorSqft = floorRooms.reduce(
            (s, r) => s + r.widthFt * r.lengthFt,
            0
          );
          return (
            <div key={floor} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  {floor === 0 ? "Basement" : `Floor ${floor}`}
                </span>
                <span className="text-xs text-brand-600">
                  {floorSqft.toLocaleString()} sqft &middot;{" "}
                  {floorRooms.length} rooms
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {floorRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded border border-brand-900/5 bg-cream/50 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-brand-900">
                      {room.name}
                    </span>
                    <span className="text-brand-600 ml-1">
                      {(room.widthFt * room.lengthFt).toFixed(0)} sqft
                    </span>
                    {room.selectedBedConfig &&
                      room.selectedBedConfig.totalSleeps > 0 && (
                        <span className="text-amber-dark ml-1">
                          ({room.selectedBedConfig.totalSleeps} guests)
                        </span>
                      )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Budget Breakdown */}
      {topCategories.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-brand-900 mb-4">
            Budget: ${totalCost.toLocaleString()}
            {project.budget > 0 && (
              <span className="text-brand-600 font-normal">
                {" "}/ ${project.budget.toLocaleString()}
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {topCategories.map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="capitalize text-brand-700">{cat}</span>
                    <span className="font-medium text-brand-900">
                      ${amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-brand-900/5">
                    <div
                      className="h-1.5 rounded-full bg-amber"
                      style={{
                        width: `${totalCost > 0 ? (amount / totalCost) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mood Board Colors */}
      {project.moodBoards.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-brand-900 mb-4">Design Direction</h3>
          {project.moodBoards.map((board) => (
            <div key={board.id} className="mb-3 last:mb-0">
              <div className="text-sm font-medium text-brand-900 mb-2">
                {board.name}
              </div>
              <div className="flex h-10 overflow-hidden rounded-lg">
                {board.colorPalette.map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>
              {board.inspirationNotes && (
                <p className="text-xs text-brand-600 mt-2 italic">
                  {board.inspirationNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
