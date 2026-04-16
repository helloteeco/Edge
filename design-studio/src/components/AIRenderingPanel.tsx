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

  // Accent wall — include hex color name for AI
  const accentInfo = room.accentWall
    ? `with a ${hexToColorName(room.accentWall.color)} ${room.accentWall.treatment} accent wall on the ${room.accentWall.wall} wall`
    : "";

  // Materials from furniture
  const materials = Array.from(new Set(
    room.furniture.map((f) => f.item.material).filter(Boolean)
  )).slice(0, 4);
  const materialStr = materials.length > 0
    ? `Key materials: ${materials.join(", ")}.`
    : "";

  // Color palette from mood boards
  const moodBoard = project.moodBoards[0];
  const moodColors = moodBoard?.colorPalette?.slice(0, 3) ?? [];
  const colorInfo =
    moodColors.length > 0
      ? `Color scheme: ${moodColors.map(hexToColorName).join(", ")}.`
      : "";
  const moodStyle = moodBoard?.inspirationNotes
    ? `Design inspiration: ${moodBoard.inspirationNotes.slice(0, 100)}.`
    : "";

  // Features — more descriptive for AI
  const featureDescriptions: Record<string, string> = {
    "Window": "large windows with natural light",
    "Vaulted Ceiling": "dramatic vaulted ceiling",
    "Fireplace": "stone fireplace as focal point",
    "Skylight": "skylight flooding room with light",
    "Balcony": "private balcony access",
    "Bay Window": "bay window seating nook",
    "Built-in Shelving": "built-in shelving",
    "En-suite": "en-suite bathroom",
  };
  const featureStr =
    room.features.length > 0
      ? room.features.map(f => featureDescriptions[f] ?? f.toLowerCase()).join(", ") + "."
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
    materialStr,
    colorInfo,
    moodStyle,
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

function hexToColorName(hex: string): string {
  // Convert common hex colors to descriptive names for AI prompts
  const colors: Record<string, string> = {
    "#f5f0eb": "warm cream", "#d4a574": "warm amber", "#8b7355": "mocha brown",
    "#3d3022": "dark chocolate", "#1a1a2e": "deep navy", "#f0f7fa": "icy blue",
    "#87ceeb": "sky blue", "#4a90a4": "ocean teal", "#2c5f6e": "deep teal",
    "#f2f5f0": "sage white", "#a8b5a0": "soft sage", "#5a6b50": "forest green",
    "#faf5ef": "warm linen", "#e8c9a8": "desert sand", "#c4956a": "terracotta",
    "#ffffff": "pure white", "#d4d4d4": "light gray", "#737373": "medium gray",
    "#404040": "charcoal", "#0a0a0a": "near black", "#fef3e2": "pale peach",
    "#f4a261": "golden amber", "#e76f51": "burnt sienna", "#264653": "dark teal",
    "#2a9d8f": "emerald teal", "#f8f4ff": "lavender white", "#c9b1ff": "soft lavender",
    "#faf0e6": "antique linen", "#d4856c": "dusty rose", "#a0522d": "sienna",
  };
  const lower = hex.toLowerCase();
  if (colors[lower]) return colors[lower];

  // Parse hex and give a rough name
  const r = parseInt(lower.slice(1, 3), 16);
  const g = parseInt(lower.slice(3, 5), 16);
  const b = parseInt(lower.slice(5, 7), 16);
  if (isNaN(r)) return hex;

  const brightness = (r + g + b) / 3;
  if (brightness > 220) return "light neutral";
  if (brightness > 180) return "warm neutral";
  if (brightness > 120) return "muted tone";
  if (brightness > 60) return "rich tone";
  return "dark tone";
}
