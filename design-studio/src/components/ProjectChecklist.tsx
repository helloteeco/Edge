"use client";

import type { Project } from "@/lib/types";
import { getTotalSleeping } from "@/lib/sleep-optimizer";

interface Props {
  project: Project;
}

interface CheckItem {
  label: string;
  done: boolean;
  detail: string;
}

export default function ProjectChecklist({ project }: Props) {
  const checks = getChecks(project);
  const completed = checks.filter((c) => c.done).length;
  const pct = checks.length > 0 ? Math.round((completed / checks.length) * 100) : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-brand-900">Delivery Checklist</h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 rounded-full bg-brand-900/10">
            <div
              className={`h-2 rounded-full transition-all ${
                pct === 100 ? "bg-emerald-500" : "bg-amber"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-brand-600 font-medium">{pct}%</span>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                check.done
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-brand-900/5 text-brand-600/40"
              }`}
            >
              {check.done ? "✓" : "○"}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm ${
                  check.done ? "text-brand-900" : "text-brand-600"
                }`}
              >
                {check.label}
              </div>
              <div className="text-xs text-brand-600/60">{check.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {pct === 100 && (
        <div className="mt-4 pt-3 border-t border-emerald-200 bg-emerald-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
          <p className="text-sm text-emerald-800 font-medium">
            Ready to deliver! Export your design package from the Export tab.
          </p>
        </div>
      )}
    </div>
  );
}

function getChecks(project: Project): CheckItem[] {
  const sleeping = getTotalSleeping(project.rooms);
  const totalFurniture = project.rooms.reduce(
    (s, r) => s + r.furniture.length,
    0
  );
  const roomsWithBeds = project.rooms.filter(
    (r) => r.selectedBedConfig && r.selectedBedConfig.totalSleeps > 0
  ).length;
  const roomsWithFurniture = project.rooms.filter(
    (r) => r.furniture.length > 0
  ).length;

  return [
    {
      label: "Property details added",
      done: !!(project.property.address && project.property.city),
      detail: project.property.address
        ? `${project.property.address}, ${project.property.city}`
        : "Add address and city",
    },
    {
      label: "Client information set",
      done: !!project.client.name,
      detail: project.client.name || "Add client name",
    },
    {
      label: "Rooms defined",
      done: project.rooms.length >= 2,
      detail: `${project.rooms.length} room${project.rooms.length !== 1 ? "s" : ""} added`,
    },
    {
      label: "Sleep plan configured",
      done: roomsWithBeds >= 1 && sleeping >= project.targetGuests,
      detail:
        sleeping >= project.targetGuests
          ? `${sleeping} guests (target: ${project.targetGuests})`
          : `${sleeping}/${project.targetGuests} guests — need ${project.targetGuests - sleeping} more`,
    },
    {
      label: "Furniture selected",
      done: totalFurniture >= 5 && roomsWithFurniture >= 2,
      detail: `${totalFurniture} items across ${roomsWithFurniture} rooms`,
    },
    {
      label: "Mood board created",
      done: project.moodBoards.length >= 1,
      detail:
        project.moodBoards.length > 0
          ? `${project.moodBoards.length} mood board${project.moodBoards.length !== 1 ? "s" : ""}`
          : "Create at least one mood board",
    },
    {
      label: "3D scan linked",
      done: !!(
        project.property.matterportLink ||
        project.property.polycamLink ||
        project.property.spoakLink
      ),
      detail:
        project.property.matterportLink || project.property.polycamLink
          ? "Scan linked"
          : "Add Matterport, Polycam, or Spoak link",
    },
  ];
}
