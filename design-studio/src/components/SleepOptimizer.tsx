"use client";

import { useState } from "react";
import { saveProject } from "@/lib/store";
import {
  optimizeSleeping,
  getConfigsForRoom,
  getTotalSleeping,
} from "@/lib/sleep-optimizer";
import type { Project, BedConfiguration, SleepOptimizationResult } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: () => void;
}

export default function SleepOptimizer({ project, onUpdate }: Props) {
  const [result, setResult] = useState<SleepOptimizationResult | null>(null);
  const currentSleeping = getTotalSleeping(project.rooms);
  const sleepableRooms = project.rooms.filter((r) =>
    [
      "primary-bedroom",
      "bedroom",
      "loft",
      "bonus-room",
      "den",
      "office",
      "living-room",
      "media-room",
      "game-room",
    ].includes(r.type)
  );

  function runOptimizer() {
    const opt = optimizeSleeping(project.rooms, project.targetGuests);
    setResult(opt);
  }

  function applyAllRecommendations() {
    if (!result) return;
    for (const rr of result.roomResults) {
      const room = project.rooms.find((r) => r.id === rr.roomId);
      if (room) {
        room.selectedBedConfig = rr.recommended;
      }
    }
    saveProject(project);
    onUpdate();
  }

  function applyOneConfig(roomId: string, config: BedConfiguration) {
    const room = project.rooms.find((r) => r.id === roomId);
    if (room) {
      room.selectedBedConfig = config;
      saveProject(project);
      onUpdate();
    }
  }

  function clearConfig(roomId: string) {
    const room = project.rooms.find((r) => r.id === roomId);
    if (room) {
      room.selectedBedConfig = null;
      saveProject(project);
      onUpdate();
    }
  }

  if (project.rooms.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-brand-600">
          Add rooms first in the Rooms tab before optimizing sleeping
          arrangements.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header + Stats */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Sleep Optimization</h2>
          <p className="text-sm text-brand-600">
            Maximize sleeping capacity with queen-over-queen bunks and smart
            room assignments.
          </p>
        </div>
        <button onClick={runOptimizer} className="btn-accent btn-sm">
          Run Optimizer
        </button>
      </div>

      {/* Current Status Bar */}
      <div className="card mb-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-brand-600">
              Current Capacity
            </div>
            <div className="text-2xl font-bold text-brand-900">
              {currentSleeping}
              <span className="text-sm font-normal text-brand-600">
                {" "}
                guests
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-brand-900/10" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-brand-600">
              Target
            </div>
            <div className="text-2xl font-bold text-brand-900">
              {project.targetGuests}
            </div>
          </div>
          <div className="h-8 w-px bg-brand-900/10" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-brand-600">
              Status
            </div>
            <div
              className={`text-sm font-semibold ${
                currentSleeping >= project.targetGuests
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {currentSleeping >= project.targetGuests
                ? "Target Met"
                : `Need ${project.targetGuests - currentSleeping} more`}
            </div>
          </div>
        </div>
        <CapacityBar
          current={currentSleeping}
          target={project.targetGuests}
        />
      </div>

      {/* Optimization Result */}
      {result && (
        <div className="mb-6">
          <div
            className={`card border-2 ${
              result.targetMet
                ? "border-emerald-400 bg-emerald-50"
                : "border-amber bg-amber-light/20"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-brand-900">
                  {result.targetMet
                    ? "Optimization Complete"
                    : "Optimization Result"}
                </h3>
                <p className="mt-1 text-sm text-brand-700">
                  {result.summary}
                </p>
              </div>
              <button
                onClick={applyAllRecommendations}
                className="btn-primary btn-sm"
              >
                Apply All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room-by-Room Config */}
      <div className="space-y-3">
        {sleepableRooms.map((room) => {
          const configs = getConfigsForRoom(room);
          const optimizerResult = result?.roomResults.find(
            (r) => r.roomId === room.id
          );

          return (
            <div key={room.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-brand-900">{room.name}</h3>
                  <p className="text-xs text-brand-600">
                    {room.widthFt}&apos; &times; {room.lengthFt}&apos; &middot;{" "}
                    {room.ceilingHeightFt}&apos; ceiling &middot;{" "}
                    {(room.widthFt * room.lengthFt).toFixed(0)} sqft
                  </p>
                </div>
                {room.selectedBedConfig && (
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-dark">
                      {room.selectedBedConfig.name}
                    </div>
                    <div className="text-xs text-brand-600">
                      Sleeps {room.selectedBedConfig.totalSleeps}
                    </div>
                    <button
                      onClick={() => clearConfig(room.id)}
                      className="text-[10px] text-red-400 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Config options */}
              <div className="flex flex-wrap gap-2">
                {configs
                  .filter((c) => c.totalSleeps > 0)
                  .map((config) => {
                    const isSelected =
                      room.selectedBedConfig?.id === config.id;
                    const isRecommended =
                      optimizerResult?.recommended.id === config.id;

                    return (
                      <button
                        key={config.id}
                        onClick={() => applyOneConfig(room.id, config)}
                        className={`relative rounded-lg border px-3 py-2 text-left text-xs transition ${
                          isSelected
                            ? "border-amber bg-amber/10 text-brand-900"
                            : "border-brand-900/10 bg-white text-brand-700 hover:border-amber/40"
                        }`}
                      >
                        {isRecommended && !isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber text-[8px] font-bold text-brand-900">
                            R
                          </span>
                        )}
                        <div className="font-semibold">{config.name}</div>
                        <div className="text-brand-600">
                          Sleeps {config.totalSleeps}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CapacityBar({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="w-32">
      <div className="h-2 w-full rounded-full bg-brand-900/10">
        <div
          className={`h-2 rounded-full transition-all ${
            pct >= 100 ? "bg-emerald-500" : "bg-amber"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[10px] text-brand-600">
        {Math.round(pct)}%
      </div>
    </div>
  );
}
