"use client";
import { useEffect, useRef, useState, useMemo } from "react";

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
}

interface CompMapProps {
  comparables: CompListing[];
  targetLat: number;
  targetLng: number;
  targetAddress?: string;
  onSelectComp?: (comp: CompListing) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
}

export function CompMap({ comparables, targetLat, targetLng, targetAddress, onSelectComp }: CompMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedComp, setSelectedComp] = useState<CompListing | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Filter comps with valid coordinates
  const validComps = useMemo(
    () => comparables.filter((c) => c.latitude && c.longitude && c.latitude !== 0 && c.longitude !== 0),
    [comparables]
  );

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

      // Target property marker (special red marker)
      const targetIcon = L.divIcon({
        className: "comp-map-target",
        html: `<div style="
          width: 36px; height: 36px; border-radius: 50%;
          background: #ef4444; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 14px; font-weight: 700;
        ">🏠</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([targetLat, targetLng], { icon: targetIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: system-ui; padding: 4px;">
            <strong style="font-size: 13px;">Your Property</strong><br/>
            <span style="font-size: 11px; color: #666;">${targetAddress || "Searched address"}</span>
          </div>`,
          { closeButton: false }
        );

      // Comp markers
      const markers: any[] = [];
      validComps.forEach((comp, index) => {
        const isTopMatch = index < 5;
        const markerColor = isTopMatch ? "#22c55e" : "#3b82f6";
        const markerSize = isTopMatch ? 32 : 26;

        const compIcon = L.divIcon({
          className: "comp-map-marker",
          html: `<div style="
            width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%;
            background: ${markerColor}; border: 2px solid white;
            box-shadow: 0 1px 4px rgba(0,0,0,0.25);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: ${isTopMatch ? 12 : 10}px; font-weight: 700;
            cursor: pointer; transition: transform 0.15s;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${index + 1}</div>`,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
        });

        const marker = L.marker([comp.latitude, comp.longitude], { icon: compIcon }).addTo(map);

        // Popup with comp data
        const popupContent = `
          <div style="font-family: system-ui; min-width: 200px; padding: 4px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; line-height: 1.3;">
              ${comp.name}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #666;">
                ${comp.bedrooms}bd / ${comp.bathrooms}ba
              </div>
              <div style="font-size: 11px; color: #666; text-align: right;">
                ${comp.distance}mi away
              </div>
              <div style="font-size: 13px; font-weight: 600; color: #16a34a;">
                ${formatCurrency(comp.annualRevenue)}/yr
              </div>
              <div style="font-size: 11px; color: #666; text-align: right;">
                $${comp.nightPrice}/night
              </div>
            </div>
            <div style="display: flex; gap: 8px; font-size: 11px; color: #666; margin-bottom: 6px;">
              <span>${comp.occupancy}% occ</span>
              ${comp.rating > 0 ? `<span>⭐ ${comp.rating.toFixed(1)}</span>` : ""}
              ${comp.reviewsCount > 0 ? `<span>(${comp.reviewsCount})</span>` : ""}
            </div>
            <a href="${comp.url || `https://www.airbnb.com/rooms/${comp.id}`}" 
               target="_blank" rel="noopener noreferrer"
               style="display: inline-block; background: #ff5a5f; color: white; padding: 4px 12px; 
                      border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">
              View on Airbnb →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent, { closeButton: true, maxWidth: 260 });

        marker.on("click", () => {
          setSelectedComp(comp);
          onSelectComp?.(comp);
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
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
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
  }, [targetLat, targetLng, validComps, targetAddress, onSelectComp]);

  if (validComps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: "#2b2823" }}>
            📍 Comparable Listings Map
          </h3>
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#f5f4f0", color: "#787060" }}>
            {validComps.length} comps
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "#787060" }}>
          Scroll and zoom to explore. Tap a marker to see details and link to Airbnb.
        </p>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            <span className="text-xs" style={{ color: "#787060" }}>Your Property</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }} />
            <span className="text-xs" style={{ color: "#787060" }}>Top 5 Match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
            <span className="text-xs" style={{ color: "#787060" }}>Other Comps</span>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "380px",
          position: "relative",
          zIndex: 1,
        }}
      />

      {/* Selected comp detail card (below map) */}
      {selectedComp && (
        <div className="px-6 py-4 border-t" style={{ borderColor: "#e5e3da" }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: "#2b2823" }}>
                {selectedComp.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#787060" }}>
                {selectedComp.bedrooms}bd / {selectedComp.bathrooms}ba • {selectedComp.accommodates} guests • {selectedComp.distance}mi away
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="font-bold text-sm" style={{ color: "#16a34a" }}>
                {formatCurrency(selectedComp.annualRevenue)}/yr
              </p>
              <p className="text-xs" style={{ color: "#787060" }}>
                ${selectedComp.nightPrice}/night • {selectedComp.occupancy}% occ
              </p>
            </div>
          </div>
          <a
            href={selectedComp.url || `https://www.airbnb.com/rooms/${selectedComp.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full text-center py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#ff5a5f", color: "white" }}
          >
            View on Airbnb →
          </a>
        </div>
      )}
    </div>
  );
}
