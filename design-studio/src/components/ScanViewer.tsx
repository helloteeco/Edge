"use client";

import type { Property } from "@/lib/types";

interface Props {
  property: Property;
}

/**
 * Embeds Matterport and Polycam 3D scans, and links to Spoak projects.
 *
 * Matterport embed: https://my.matterport.com/show/?m=MODEL_ID
 * Polycam embed:    https://poly.cam/capture/CAPTURE_ID
 * Spoak:            Direct link (no public embed API)
 */
export default function ScanViewer({ property }: Props) {
  const matterportUrl = extractMatterportEmbedUrl(property.matterportLink);
  const polycamUrl = extractPolycamEmbedUrl(property.polycamLink);
  const spoakUrl = property.spoakLink?.trim() || "";

  const hasMatterport = !!matterportUrl;
  const hasPolycam = !!polycamUrl;
  const hasSpoak = !!spoakUrl;
  const hasAny = hasMatterport || hasPolycam || hasSpoak;

  if (!hasAny) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-3">📐</div>
        <h3 className="font-semibold text-brand-900 mb-2">No Scans Linked</h3>
        <p className="text-sm text-brand-600 max-w-md mx-auto">
          Add your Matterport, Polycam, or Spoak project links in the
          Overview tab to view your 3D scans here.
        </p>
        <div className="mt-4 space-y-2 text-xs text-brand-600/60">
          <p>Supported formats:</p>
          <p>Matterport: https://my.matterport.com/show/?m=...</p>
          <p>Polycam: https://poly.cam/capture/...</p>
          <p>Spoak: https://www.spoak.com/...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matterport Embed */}
      {hasMatterport && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between bg-brand-900/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-brand-900">
                Matterport 3D Tour
              </span>
            </div>
            <a
              href={property.matterportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-dark hover:underline"
            >
              Open in Matterport &rarr;
            </a>
          </div>
          <div className="relative aspect-video bg-brand-900/5">
            <iframe
              src={matterportUrl}
              className="absolute inset-0 h-full w-full"
              frameBorder="0"
              allowFullScreen
              allow="xr-spatial-tracking"
              title="Matterport 3D Tour"
            />
          </div>
        </div>
      )}

      {/* Polycam Embed */}
      {hasPolycam && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between bg-brand-900/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-brand-900">
                Polycam 3D Scan
              </span>
            </div>
            <a
              href={property.polycamLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-dark hover:underline"
            >
              Open in Polycam &rarr;
            </a>
          </div>
          <div className="relative aspect-video bg-brand-900/5">
            <iframe
              src={polycamUrl}
              className="absolute inset-0 h-full w-full"
              frameBorder="0"
              allowFullScreen
              title="Polycam 3D Scan"
            />
          </div>
        </div>
      )}

      {/* Spoak Link */}
      {hasSpoak && (
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 font-bold text-sm">
              S
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-brand-900">
                Spoak Design Board
              </h3>
              <p className="text-xs text-brand-600">
                Open your Spoak project to view and edit the design board.
              </p>
            </div>
            <a
              href={spoakUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm"
            >
              Open in Spoak &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── URL parsers ──

function extractMatterportEmbedUrl(link: string): string | null {
  if (!link?.trim()) return null;
  const trimmed = link.trim();

  // Already an embed URL
  if (trimmed.includes("my.matterport.com/show/")) {
    // Ensure it has the right params for embedding
    try {
      const url = new URL(trimmed);
      url.searchParams.set("play", "1");
      url.searchParams.set("qs", "1");
      return url.toString();
    } catch {
      return trimmed;
    }
  }

  // Extract model ID from various Matterport URL formats
  const patterns = [
    /matterport\.com\/show\/\?m=([a-zA-Z0-9]+)/,
    /my\.matterport\.com\/show\/\?m=([a-zA-Z0-9]+)/,
    /matterport\.com\/models\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return `https://my.matterport.com/show/?m=${match[1]}&play=1&qs=1`;
    }
  }

  // If it's just a model ID
  if (/^[a-zA-Z0-9]{8,}$/.test(trimmed)) {
    return `https://my.matterport.com/show/?m=${trimmed}&play=1&qs=1`;
  }

  return null;
}

function extractPolycamEmbedUrl(link: string): string | null {
  if (!link?.trim()) return null;
  const trimmed = link.trim();

  // Already a poly.cam URL
  if (trimmed.includes("poly.cam/capture/")) {
    // Ensure the embed path
    try {
      const url = new URL(trimmed);
      if (!url.pathname.endsWith("/embed")) {
        url.pathname = url.pathname.replace(/\/?$/, "/embed");
      }
      return url.toString();
    } catch {
      return trimmed;
    }
  }

  // Extract capture ID
  const match = trimmed.match(/poly\.cam\/capture\/([a-zA-Z0-9-]+)/);
  if (match?.[1]) {
    return `https://poly.cam/capture/${match[1]}/embed`;
  }

  return null;
}
