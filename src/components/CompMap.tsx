"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";

// Types matching the calculator's ComparableListing
interface CompListing {
  id: number;
  name: string;
  url: string;
  image: string | null;
  bedrooms: number;
  bathrooms: number;
  accommodates: number;
  nightPrice: number;
  occupancy: number;
  annualRevenue: number;
  monthlyRevenue: number;
  rating: number;
  reviewsCount: number;
  propertyType: string;
  distance: number;
  latitude: number;
  longitude: number;
  relevanceScore: number;
  hostName?: string;
  isSuperhost?: boolean;
}

interface CompMapProps {
  comparables: CompListing[];
  targetLat: number;
  targetLng: number;
  targetAddress?: string;
  onSelectComp?: (comp: CompListing) => void;
  excludedIds?: Set<number | string>;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString()}K`;
  return `$${value.toLocaleString()}`;
}

function formatNightPrice(value: number): string {
  return `$${Math.round(value)}`;
}

export function CompMap({ comparables, targetLat, targetLng, targetAddress, onSelectComp, excludedIds = new Set() }: CompMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedComp, setSelectedComp] = useState<CompListing | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number | string>>(new Set());

  // Filter comps with valid coordinates
  const validComps = useMemo(
    () => comparables.filter((c) => c.latitude && c.longitude && c.latitude !== 0 && c.longitude !== 0),
    [comparables]
  );

  // Track image load errors
  const handleImgError = useCallback((compId: number | string) => {
    setImgErrors(prev => {
      const next = new Set(prev);
      next.add(compId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    let L: any;
    let map: any;

    const initMap = async () => {
      // Dynamically import leaflet (SSR-safe)
      L = (await import("leaflet")).default;

      // Add Leaflet CSS if not already present
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Add custom marker styles
      if (!document.getElementById("comp-map-styles")) {
        const style = document.createElement("style");
        style.id = "comp-map-styles";
        style.textContent = `
          .comp-price-tag {
            background: #2b2823;
            color: white;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            font-family: system-ui, -apple-system, sans-serif;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
            position: relative;
            text-align: center;
            line-height: 1;
          }
          .comp-price-tag:hover {
            transform: scale(1.1);
            box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          }
          .comp-price-tag::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid #2b2823;
          }
          .comp-price-tag.excluded {
            background: #9ca3af;
            opacity: 0.5;
          }
          .comp-price-tag.excluded::after {
            border-top-color: #9ca3af;
          }
          .comp-price-tag.selected {
            background: #16a34a;
            transform: scale(1.15);
          }
          .comp-price-tag.selected::after {
            border-top-color: #16a34a;
          }
          .target-marker {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #ef4444;
            border: 3px solid white;
            box-shadow: 0 2px 10px rgba(239,68,68,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            animation: targetPulse 2s ease-in-out infinite;
          }
          @keyframes targetPulse {
            0%, 100% { box-shadow: 0 2px 10px rgba(239,68,68,0.4); }
            50% { box-shadow: 0 2px 20px rgba(239,68,68,0.6); }
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px !important;
            padding: 0 !important;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
          }
          .leaflet-popup-content {
            margin: 0 !important;
            min-width: 240px;
          }
          .leaflet-popup-tip {
            box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
          }
          .comp-popup-card {
            font-family: system-ui, -apple-system, sans-serif;
          }
          .comp-popup-card img {
            width: 100%;
            height: 140px;
            object-fit: cover;
          }
          .comp-popup-card .comp-popup-body {
            padding: 10px 12px 12px;
          }
          .comp-popup-card .comp-popup-name {
            font-size: 13px;
            font-weight: 600;
            color: #2b2823;
            line-height: 1.3;
            margin-bottom: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .comp-popup-card .comp-popup-meta {
            font-size: 11px;
            color: #787060;
            margin-bottom: 6px;
          }
          .comp-popup-card .comp-popup-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 8px;
            margin-bottom: 8px;
          }
          .comp-popup-card .comp-popup-stat {
            display: flex;
            flex-direction: column;
          }
          .comp-popup-card .comp-popup-stat-label {
            font-size: 10px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .comp-popup-card .comp-popup-stat-value {
            font-size: 13px;
            font-weight: 600;
            color: #2b2823;
          }
          .comp-popup-card .comp-popup-stat-value.green {
            color: #16a34a;
          }
          .comp-popup-card .comp-popup-link {
            display: block;
            text-align: center;
            background: #ff5a5f;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            transition: opacity 0.15s;
          }
          .comp-popup-card .comp-popup-link:hover {
            opacity: 0.85;
          }
          .comp-popup-card .comp-popup-no-img {
            width: 100%;
            height: 100px;
            background: #f5f4f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
          }
        `;
        document.head.appendChild(style);
      }

      // Wait for CSS to load
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      map = L.map(mapRef.current, {
        center: [targetLat, targetLng],
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
      });

      mapInstanceRef.current = map;

      // Use CartoDB Positron tiles (clean, minimal, free)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // ===== TARGET PROPERTY MARKER =====
      const targetIcon = L.divIcon({
        className: "",
        html: `<div class="target-marker">🏠</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const targetPopupContent = `
        <div class="comp-popup-card">
          <div class="comp-popup-body" style="padding-top: 12px;">
            <div class="comp-popup-name" style="font-size: 14px;">📍 Your Property</div>
            <div class="comp-popup-meta">${targetAddress || "Searched address"}</div>
          </div>
        </div>
      `;

      L.marker([targetLat, targetLng], { icon: targetIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(targetPopupContent, { closeButton: true, maxWidth: 260, offset: [0, -10] });

      // ===== COMPARABLE LISTING MARKERS =====
      const markers: any[] = [];
      validComps.forEach((comp) => {
        const isExcluded = excludedIds.has(comp.id);
        const priceLabel = formatNightPrice(comp.nightPrice);
        const extraClass = isExcluded ? " excluded" : "";

        const compIcon = L.divIcon({
          className: "",
          html: `<div class="comp-price-tag${extraClass}" data-comp-id="${comp.id}">${priceLabel}</div>`,
          iconSize: [60, 28],
          iconAnchor: [30, 28],
        });

        const marker = L.marker([comp.latitude, comp.longitude], { icon: compIcon }).addTo(map);

        // Build rich popup with listing image
        const imgHtml = comp.image
          ? `<img src="${comp.image}" alt="${comp.name}" onerror="this.parentElement.innerHTML='<div class=\\'comp-popup-no-img\\'>🏡</div>'" />`
          : `<div class="comp-popup-no-img">🏡</div>`;

        const ratingHtml = comp.rating > 0
          ? `<span>★ ${comp.rating.toFixed(1)}${comp.reviewsCount > 0 ? ` (${comp.reviewsCount})` : ""}</span>`
          : "";

        const superhostBadge = comp.isSuperhost
          ? `<span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">Superhost</span>`
          : "";

        const popupContent = `
          <div class="comp-popup-card">
            ${imgHtml}
            <div class="comp-popup-body">
              <div class="comp-popup-name">${comp.name}</div>
              <div class="comp-popup-meta">
                ${comp.bedrooms}bd / ${comp.bathrooms}ba · ${comp.accommodates} guests · ${comp.distance.toFixed(1)}mi away
                ${ratingHtml ? ` · ${ratingHtml}` : ""}
                ${superhostBadge ? ` ${superhostBadge}` : ""}
              </div>
              <div class="comp-popup-stats">
                <div class="comp-popup-stat">
                  <span class="comp-popup-stat-label">Nightly Rate</span>
                  <span class="comp-popup-stat-value">$${comp.nightPrice}/night</span>
                </div>
                <div class="comp-popup-stat">
                  <span class="comp-popup-stat-label">Occupancy</span>
                  <span class="comp-popup-stat-value">${comp.occupancy}%</span>
                </div>
                <div class="comp-popup-stat">
                  <span class="comp-popup-stat-label">Monthly Rev</span>
                  <span class="comp-popup-stat-value green">${formatCurrency(comp.monthlyRevenue)}</span>
                </div>
                <div class="comp-popup-stat">
                  <span class="comp-popup-stat-label">Annual Rev</span>
                  <span class="comp-popup-stat-value green">${formatCurrency(comp.annualRevenue)}</span>
                </div>
              </div>
              <a href="${comp.url || `https://www.airbnb.com/rooms/${comp.id}`}" 
                 target="_blank" rel="noopener noreferrer"
                 class="comp-popup-link">
                View on Airbnb →
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: true, maxWidth: 280, offset: [0, -14] });

        marker.on("click", () => {
          setSelectedComp(comp);
          onSelectComp?.(comp);
          // Highlight the selected marker
          document.querySelectorAll(".comp-price-tag.selected").forEach(el => el.classList.remove("selected"));
          const el = document.querySelector(`.comp-price-tag[data-comp-id="${comp.id}"]`);
          if (el) el.classList.add("selected");
        });

        markers.push(marker);
      });

      markersRef.current = markers;

      // Fit bounds to show all markers
      if (validComps.length > 0) {
        const allPoints = [
          [targetLat, targetLng],
          ...validComps.map((c) => [c.latitude, c.longitude]),
        ];
        const bounds = L.latLngBounds(allPoints as [number, number][]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }

      setIsMapReady(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [targetLat, targetLng, validComps, targetAddress, onSelectComp, excludedIds]);

  if (validComps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#2b2823' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-base font-semibold" style={{ color: "#2b2823" }}>
              Property & Comparables
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#f5f4f0", color: "#787060" }}>
            {validComps.length} listings
          </span>
        </div>
        <p className="text-xs mt-1.5" style={{ color: "#787060" }}>
          Tap any price tag to see listing details, photo, and Airbnb link.
        </p>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: "#ef4444", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            <span className="text-xs" style={{ color: "#787060" }}>Your Property</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: "#2b2823" }}>$</div>
            <span className="text-xs" style={{ color: "#787060" }}>Comp Nightly Rate</span>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "400px",
          position: "relative",
          zIndex: 1,
        }}
      />

      {/* Selected comp detail card (below map) */}
      {selectedComp && (
        <div className="px-5 py-4 border-t" style={{ borderColor: "#e5e3da" }}>
          <div className="flex gap-3">
            {/* Thumbnail */}
            {selectedComp.image && !imgErrors.has(selectedComp.id) ? (
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                <img
                  src={selectedComp.image}
                  alt={selectedComp.name}
                  className="w-full h-full object-cover"
                  onError={() => handleImgError(selectedComp.id)}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: "#f5f4f0" }}>
                🏡
              </div>
            )}
            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: "#2b2823" }}>
                {selectedComp.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#787060" }}>
                {selectedComp.bedrooms}bd / {selectedComp.bathrooms}ba · {selectedComp.accommodates} guests · {selectedComp.distance.toFixed(1)}mi
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold" style={{ color: "#2b2823" }}>
                  ${selectedComp.nightPrice}/night
                </span>
                <span className="text-xs" style={{ color: "#787060" }}>
                  {selectedComp.occupancy}% occ
                </span>
                <span className="text-xs font-semibold" style={{ color: "#16a34a" }}>
                  {formatCurrency(selectedComp.annualRevenue)}/yr
                </span>
              </div>
            </div>
          </div>
          <a
            href={selectedComp.url || `https://www.airbnb.com/rooms/${selectedComp.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#ff5a5f", color: "white" }}
          >
            View on Airbnb →
          </a>
        </div>
      )}
    </div>
  );
}
