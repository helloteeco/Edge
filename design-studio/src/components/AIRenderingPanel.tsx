"use client";

import { useState } from "react";
import type { Project, Room } from "@/lib/types";

interface Props {
  project: Project;
}

/**
 * Generates AI rendering prompts based on the project's design selections.
 * Designers can copy these prompts into Midjourney, DALL-E, or any AI image generator.
 */
export default function AIRenderingPanel({ project }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string>(
    project.rooms[0]?.id ?? ""
  );
  const [promptType, setPromptType] = useState<"midjourney" | "dalle">(
    "midjourney"
  );
  const [copied, setCopied] = useState<string | null>(null);

  const room = project.rooms.find((r) => r.id === selectedRoom);
  const prompt = room ? generatePrompt(project, room, promptType) : "";
  const overviewPrompt = generateOverviewPrompt(project, promptType);

  function copyPrompt(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">AI Renderings</h2>
          <p className="text-sm text-brand-600">
            Auto-generated prompts based on your design selections. Copy into
            Midjourney, DALL-E, or any AI image generator.
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setPromptType("midjourney")}
            className={promptType === "midjourney" ? "tab-active" : "tab"}
          >
            Midjourney
          </button>
          <button
            onClick={() => setPromptType("dalle")}
            className={promptType === "dalle" ? "tab-active" : "tab"}
          >
            DALL-E
          </button>
        </div>
      </div>

      {/* Property Overview Prompt */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-brand-900">
            Property Overview Rendering
          </h3>
          <button
            onClick={() => copyPrompt(overviewPrompt, "overview")}
            className="btn-secondary btn-sm"
          >
            {copied === "overview" ? "Copied!" : "Copy Prompt"}
          </button>
        </div>
        <div className="rounded-lg bg-brand-900/5 p-4 font-mono text-xs text-brand-700 whitespace-pre-wrap leading-relaxed">
          {overviewPrompt}
        </div>
      </div>

      {/* Room-by-Room Prompts */}
      {project.rooms.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {project.rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoom(r.id)}
                className={selectedRoom === r.id ? "tab-active" : "tab"}
              >
                {r.name}
              </button>
            ))}
          </div>

          {room && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-brand-900">
                  {room.name} — Rendering Prompt
                </h3>
                <button
                  onClick={() => copyPrompt(prompt, room.id)}
                  className="btn-accent btn-sm"
                >
                  {copied === room.id ? "Copied!" : "Copy Prompt"}
                </button>
              </div>
              <div className="rounded-lg bg-brand-900/5 p-4 font-mono text-xs text-brand-700 whitespace-pre-wrap leading-relaxed">
                {prompt}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tips */}
      <div className="mt-6 card bg-amber/5 border-amber/20">
        <h3 className="font-semibold text-brand-900 mb-2">Tips</h3>
        <ul className="text-sm text-brand-700 space-y-1">
          <li>
            &bull; For Midjourney, paste the prompt in Discord with /imagine
          </li>
          <li>&bull; For DALL-E, use ChatGPT or the API</li>
          <li>
            &bull; Add &quot;--ar 16:9&quot; at the end for Midjourney to get
            wide shots
          </li>
          <li>
            &bull; The prompts include your furniture selections, colors, and
            style for accurate renders
          </li>
        </ul>
      </div>
    </div>
  );
}

// ── Prompt generation ──

function generateOverviewPrompt(
  project: Project,
  type: "midjourney" | "dalle"
): string {
  const style = formatStyle(project.style);
  const addr = project.property.address || "a vacation rental";
  const city = project.property.city
    ? `${project.property.city}, ${project.property.state}`
    : "";
  const sqft = project.property.squareFootage;
  const beds = project.property.bedrooms;
  const baths = project.property.bathrooms;

  const base = `Interior design rendering of ${addr}${city ? ` in ${city}` : ""}. ${style} style vacation rental${sqft ? `, ${sqft} sqft` : ""}, ${beds} bedrooms, ${baths} bathrooms. Warm inviting atmosphere, professional interior photography, wide angle lens, natural lighting, staged for vacation rental guests.`;

  if (type === "midjourney") {
    return `${base} --ar 16:9 --v 6 --style raw --q 2`;
  }
  return base;
}

function generatePrompt(
  project: Project,
  room: Room,
  type: "midjourney" | "dalle"
): string {
  const style = formatStyle(project.style);
  const roomType = room.type.replace(/-/g, " ");
  const dims = `${room.widthFt}' x ${room.lengthFt}'`;

  // Gather furniture names
  const furnitureNames = room.furniture
    .map((f) => `${f.item.name} (${f.item.color})`)
    .slice(0, 6);

  // Bed config
  const bedInfo = room.selectedBedConfig
    ? `featuring ${room.selectedBedConfig.name}`
    : "";

  // Accent wall
  const accentInfo = room.accentWall
    ? `with a ${room.accentWall.color} ${room.accentWall.treatment} accent wall`
    : "";

  // Color palette from mood boards
  const moodColors = project.moodBoards[0]?.colorPalette?.slice(0, 3) ?? [];
  const colorInfo =
    moodColors.length > 0
      ? `Color palette: ${moodColors.join(", ")}.`
      : "";

  // Features
  const featureStr =
    room.features.length > 0
      ? `Room features: ${room.features.join(", ").toLowerCase()}.`
      : "";

  const furnStr =
    furnitureNames.length > 0
      ? `Furnished with: ${furnitureNames.join(", ")}.`
      : "";

  const base = [
    `Interior design rendering of a ${style} ${roomType} (${dims}${room.ceilingHeightFt >= 10 ? ", vaulted ceiling" : ""})`,
    bedInfo ? `${bedInfo}.` : "",
    accentInfo ? `${accentInfo}.` : "",
    furnStr,
    colorInfo,
    featureStr,
    "Professional interior photography, natural lighting, warm and inviting atmosphere, high-end vacation rental staging, photorealistic.",
  ]
    .filter(Boolean)
    .join(" ");

  if (type === "midjourney") {
    return `${base} --ar 16:9 --v 6 --style raw --q 2`;
  }
  return base;
}

function formatStyle(style: string): string {
  return style
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
