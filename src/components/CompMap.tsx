
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
  dataSource?: string; // e.g. "pricelabs (366 listings)" or "airbnb-direct"
  listingsAnalyzed?: number; // Number of listings PriceLabs analyzed
  searchRadiusMiles?: number; // Radius used for Airbnb search
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000).toLocaleString()}K`;
  return `$${value.toLocaleString()}`;
}

function formatNightPrice(value: number): string {
  return `$${Math.round(value)}`;
}

// ===== Inject ALL Leaflet + custom CSS inline (no CDN dependency) =====
function ensureAllStyles(): void {
  if (document.getElementById("comp-map-all-styles")) return;
  const style = document.createElement("style");
  style.id = "comp-map-all-styles";
  style.textContent = `
    /* ============================================================
       LEAFLET CORE CSS (inlined from leaflet@1.9.4/dist/leaflet.css)
       This eliminates the need for the external CDN stylesheet
       which was being blocked/not applied in Next.js context.
       ============================================================ */

    /* Required styles — positioning */
    .leaflet-pane,
    .leaflet-tile,
    .leaflet-marker-icon,
    .leaflet-marker-shadow,
    .leaflet-tile-container,
    .leaflet-pane > svg,
    .leaflet-pane > canvas,
    .leaflet-zoom-box,
    .leaflet-image-layer,
    .leaflet-layer {
      position: absolute !important;
      left: 0;
      top: 0;
    }
    .leaflet-container {
      overflow: hidden !important;
    }
    .leaflet-tile,
    .leaflet-marker-icon,
    .leaflet-marker-shadow {
      -webkit-user-select: none;
      -moz-user-select: none;
      user-select: none;
      -webkit-user-drag: none;
    }
    .leaflet-tile::selection {
      background: transparent;
    }
    .leaflet-marker-icon,
    .leaflet-marker-shadow {
      display: block;
    }

    /* Prevent max-width from breaking tiles/images */
    .leaflet-container .leaflet-overlay-pane svg {
      max-width: none !important;
      max-height: none !important;
    }
    .leaflet-container .leaflet-marker-pane img,
    .leaflet-container .leaflet-shadow-pane img,
    .leaflet-container .leaflet-tile-pane img,
    .leaflet-container img.leaflet-image-layer,
    .leaflet-container .leaflet-tile {
      max-width: none !important;
      max-height: none !important;
      width: auto;
      padding: 0;
    }
    .leaflet-container img.leaflet-tile {
      mix-blend-mode: plus-lighter;
    }

    /* Touch handling */
    .leaflet-container.leaflet-touch-zoom {
      -ms-touch-action: pan-x pan-y;
      touch-action: pan-x pan-y;
    }
    .leaflet-container.leaflet-touch-drag {
      -ms-touch-action: pinch-zoom;
      touch-action: none;
      touch-action: pinch-zoom;
    }
    .leaflet-container.leaflet-touch-drag.leaflet-touch-zoom {
      -ms-touch-action: none;
      touch-action: none;
    }
    .leaflet-container {
      -webkit-tap-highlight-color: transparent;
    }
    .leaflet-container a {
      -webkit-tap-highlight-color: rgba(51, 181, 229, 0.4);
    }

    /* Tile visibility */
    .leaflet-tile {
      filter: inherit;
      visibility: hidden;
    }
    .leaflet-tile-loaded {
      visibility: inherit;
    }

    /* Zoom box */
    .leaflet-zoom-box {
      width: 0;
      height: 0;
      box-sizing: border-box;
      z-index: 800;
    }
    .leaflet-overlay-pane svg {
      -moz-user-select: none;
    }

    /* Z-index stacking */
    .leaflet-pane         { z-index: 400; }
    .leaflet-tile-pane    { z-index: 200; }
    .leaflet-overlay-pane { z-index: 400; }
    .leaflet-shadow-pane  { z-index: 500; }
    .leaflet-marker-pane  { z-index: 600; }
    .leaflet-tooltip-pane { z-index: 650; }
    .leaflet-popup-pane   { z-index: 700; }
    .leaflet-map-pane canvas { z-index: 100; }
    .leaflet-map-pane svg    { z-index: 200; }

    /* Control positioning */
    .leaflet-control {
      position: relative;
      z-index: 800;
      pointer-events: visiblePainted;
      pointer-events: auto;
    }
    .leaflet-top,
    .leaflet-bottom {
      position: absolute;
      z-index: 1000;
      pointer-events: none;
    }
    .leaflet-top    { top: 0; }
    .leaflet-right  { right: 0; }
    .leaflet-bottom { bottom: 0; }
    .leaflet-left   { left: 0; }
    .leaflet-control {
      float: left;
      clear: both;
    }
    .leaflet-right .leaflet-control {
      float: right;
    }
    .leaflet-top .leaflet-control    { margin-top: 10px; }
    .leaflet-bottom .leaflet-control { margin-bottom: 10px; }
    .leaflet-left .leaflet-control   { margin-left: 10px; }
    .leaflet-right .leaflet-control  { margin-right: 10px; }

    /* Zoom and fade animations */
    .leaflet-fade-anim .leaflet-popup {
      opacity: 0;
      transition: opacity 0.2s linear;
    }
    .leaflet-fade-anim .leaflet-map-pane .leaflet-popup {
      opacity: 1;
    }
    .leaflet-zoom-animated {
      transform-origin: 0 0;
    }
    svg.leaflet-zoom-animated {
      will-change: transform;
    }
    .leaflet-zoom-anim .leaflet-zoom-animated {
      transition: transform 0.25s cubic-bezier(0,0,0.25,1);
    }
    .leaflet-zoom-anim .leaflet-tile,
    .leaflet-pan-anim .leaflet-tile {
      transition: none;
    }
    .leaflet-zoom-anim .leaflet-zoom-hide {
      visibility: hidden;
    }

    /* Cursors */
    .leaflet-interactive { cursor: pointer; }
    .leaflet-grab {
      cursor: -webkit-grab;
      cursor: -moz-grab;
      cursor: grab;
    }
    .leaflet-crosshair,
    .leaflet-crosshair .leaflet-interactive {
      cursor: crosshair;
    }
    .leaflet-popup-pane,
    .leaflet-control {
      cursor: auto;
    }
    .leaflet-dragging .leaflet-grab,
    .leaflet-dragging .leaflet-grab .leaflet-interactive,
    .leaflet-dragging .leaflet-marker-draggable {
      cursor: move;
      cursor: -webkit-grabbing;
      cursor: -moz-grabbing;
      cursor: grabbing;
    }

    /* Marker & overlay interactivity */
    .leaflet-marker-icon,
    .leaflet-marker-shadow,
    .leaflet-image-layer,
    .leaflet-pane > svg path,
    .leaflet-tile-container {
      pointer-events: none;
    }
    .leaflet-marker-icon.leaflet-interactive,
    .leaflet-image-layer.leaflet-interactive,
    .leaflet-pane > svg path.leaflet-interactive,
    svg.leaflet-image-layer.leaflet-interactive path {
      pointer-events: visiblePainted;
      pointer-events: auto;
    }

    /* Visual tweaks */
    .leaflet-container {
      background: #ddd;
      outline-offset: 1px;
    }
    .leaflet-container a {
      color: #0078A8;
    }
    .leaflet-zoom-box {
      border: 2px dotted #38f;
      background: rgba(255,255,255,0.5);
    }

    /* Typography */
    .leaflet-container {
      font-family: "Helvetica Neue", Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.5;
    }

    /* Toolbar / zoom bar */
    .leaflet-bar {
      box-shadow: 0 1px 5px rgba(0,0,0,0.65);
      border-radius: 4px;
    }
    .leaflet-bar a {
      background-color: #fff;
      border-bottom: 1px solid #ccc;
      width: 26px;
      height: 26px;
      line-height: 26px;
      display: block;
      text-align: center;
      text-decoration: none;
      color: black;
    }
    .leaflet-bar a,
    .leaflet-control-layers-toggle {
      background-position: 50% 50%;
      background-repeat: no-repeat;
      display: block;
    }
    .leaflet-bar a:hover,
    .leaflet-bar a:focus {
      background-color: #f4f4f4;
    }
    .leaflet-bar a:first-child {
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }
    .leaflet-bar a:last-child {
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      border-bottom: none;
    }
    .leaflet-bar a.leaflet-disabled {
      cursor: default;
      background-color: #f4f4f4;
      color: #bbb;
    }
    .leaflet-touch .leaflet-bar a {
      width: 30px;
      height: 30px;
      line-height: 30px;
    }
    .leaflet-touch .leaflet-bar a:first-child {
      border-top-left-radius: 2px;
      border-top-right-radius: 2px;
    }
    .leaflet-touch .leaflet-bar a:last-child {
      border-bottom-left-radius: 2px;
      border-bottom-right-radius: 2px;
    }

    /* Zoom control */
    .leaflet-control-zoom-in,
    .leaflet-control-zoom-out {
      font: bold 18px 'Lucida Console', Monaco, monospace;
      text-indent: 1px;
    }
    .leaflet-touch .leaflet-control-zoom-in,
    .leaflet-touch .leaflet-control-zoom-out {
      font-size: 22px;
    }

    /* Attribution */
    .leaflet-container .leaflet-control-attribution {
      background: rgba(255, 255, 255, 0.8);
      margin: 0;
    }
    .leaflet-control-attribution,
    .leaflet-control-scale-line {
      padding: 0 5px;
      color: #333;
      line-height: 1.4;
    }
    .leaflet-control-attribution a {
      text-decoration: none;
    }

    /* Popup */
    .leaflet-popup {
      position: absolute;
      text-align: center;
      margin-bottom: 20px;
    }
    .leaflet-popup-content-wrapper {
      padding: 1px;
      text-align: left;
      border-radius: 12px;
    }
    .leaflet-popup-content {
      margin: 13px 24px 13px 20px;
      line-height: 1.3;
      font-size: 13px;
      min-height: 1px;
    }
    .leaflet-popup-content p {
      margin: 17px 0;
    }
    .leaflet-popup-tip-container {
      width: 40px;
      height: 20px;
      position: absolute;
      left: 50%;
      margin-top: -1px;
      margin-left: -20px;
      overflow: hidden;
      pointer-events: none;
    }
    .leaflet-popup-tip {
      width: 17px;
      height: 17px;
      padding: 1px;
      margin: -10px auto 0;
      pointer-events: auto;
      transform: rotate(45deg);
    }
    .leaflet-popup-content-wrapper,
    .leaflet-popup-tip {
      background: white;
      color: #333;
      box-shadow: 0 3px 14px rgba(0,0,0,0.4);
    }
    .leaflet-container a.leaflet-popup-close-button {
      position: absolute;
      top: 0;
      right: 0;
      border: none;
      text-align: center;
      width: 24px;
      height: 24px;
      font: 16px/24px Tahoma, Verdana, sans-serif;
      color: #757575;
      text-decoration: none;
      background: transparent;
    }
    .leaflet-container a.leaflet-popup-close-button:hover,
    .leaflet-container a.leaflet-popup-close-button:focus {
      color: #585858;
    }
    .leaflet-popup-scrolled {
      overflow: auto;
    }

    /* Div icon */
    .leaflet-div-icon {
      background: #fff;
      border: 1px solid #666;
    }

    /* Tooltip */
    .leaflet-tooltip {
      position: absolute;
      padding: 6px;
      background-color: #fff;
      border: 1px solid #fff;
      border-radius: 3px;
      color: #222;
      white-space: nowrap;
      user-select: none;
      pointer-events: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    .leaflet-tooltip.leaflet-interactive {
      cursor: pointer;
      pointer-events: auto;
    }

    /* Touch styles */
    .leaflet-touch .leaflet-control-attribution,
    .leaflet-touch .leaflet-control-layers,
    .leaflet-touch .leaflet-bar {
      box-shadow: none;
    }
    .leaflet-touch .leaflet-control-layers,
    .leaflet-touch .leaflet-bar {
      border: 2px solid rgba(0,0,0,0.2);
      background-clip: padding-box;
    }

    /* ============================================================
       CUSTOM COMP MAP STYLES
       ============================================================ */

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

    /* Popup card overrides */
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

    /* Container-level overrides for isolation */
    .comp-map-container .leaflet-container {
      width: 100% !important;
      height: 100% !important;
      z-index: 1 !important;
    }
  `;
  document.head.appendChild(style);

  // Also remove any old partial style tags from previous versions
  const oldStyles = document.getElementById("comp-map-styles");
  if (oldStyles) oldStyles.remove();
  const oldLeafletCss = document.getElementById("leaflet-css");
  if (oldLeafletCss) oldLeafletCss.remove();
}

export function CompMap({ comparables, targetLat, targetLng, targetAddress, onSelectComp, excludedIds = new Set(), dataSource, listingsAnalyzed, searchRadiusMiles }: CompMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedComp, setSelectedComp] = useState<CompListing | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number | string>>(new Set());

  // Filter comps to only those with valid (non-zero) coordinates
  // Show ALL comps the backend returned — they are the ones used for the calculation
  // Only reject comps with missing/zero coords (they'd appear at 0,0 in the ocean)
  const validComps = useMemo(() => {
    return comparables.filter((c) => {
      // Must have non-zero coordinates
      if (!c.latitude || !c.longitude || c.latitude === 0 || c.longitude === 0) return false;
      return true;
    });
  }, [comparables]);

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
    let resizeObserver: ResizeObserver | null = null;

    const initMap = async () => {
      // 1. Inject ALL styles inline (Leaflet core + custom) — no CDN dependency
      ensureAllStyles();

      // 2. Dynamically import leaflet (SSR-safe)
      L = (await import("leaflet")).default;

      // 3. Small delay to ensure CSS is applied to DOM
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 4. Guard: container must still exist
      if (!mapRef.current) return;

      // 4b. Wait until container has actual dimensions
      const waitForDimensions = async (el: HTMLElement, maxWait = 2000): Promise<boolean> => {
        const start = Date.now();
        while (Date.now() - start < maxWait) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return true;
          await new Promise(r => setTimeout(r, 50));
        }
        return false;
      };
      const hasDimensions = await waitForDimensions(mapRef.current);
      if (!hasDimensions || !mapRef.current) return;

      // 5. Clean up any previous map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // 6. Create the map
      map = L.map(mapRef.current, {
        center: [targetLat, targetLng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
      });

      mapInstanceRef.current = map;

      // 7. Add tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // 8. invalidateSize after tiles start loading to fix tile alignment
      map.whenReady(() => {
        map.invalidateSize({ animate: false });
        setTimeout(() => {
          if (map && mapRef.current) {
            map.invalidateSize({ animate: false });
          }
        }, 200);
      });

      // 9. Set up ResizeObserver to handle container resize
      if (typeof ResizeObserver !== "undefined" && mapRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (map) {
            map.invalidateSize({ animate: false });
          }
        });
        resizeObserver.observe(mapRef.current);
      }

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

      // ===== FIT BOUNDS — zoom to show all markers =====
      const doFitBounds = () => {
        if (!map || !mapRef.current) return;
        
        if (validComps.length > 0) {
          // Show ALL comps the backend returned (only 0/0 coords filtered out)
          const allPoints = [
            [targetLat, targetLng],
            ...validComps.map((c) => [c.latitude, c.longitude]),
          ];
          const bounds = L.latLngBounds(allPoints as [number, number][]);

          // fitBounds to show target + all comps; maxZoom 15 for tight clusters
          map.invalidateSize({ animate: false });
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15, animate: false });
          
          // Don't clamp zoom — comps may span a wide area and that's OK
        }
      };

      // Run fitBounds after map is ready and container is fully laid out
      doFitBounds();
      setTimeout(doFitBounds, 300);
      setTimeout(doFitBounds, 600);

      setIsMapReady(true);
    };

    initMap();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [targetLat, targetLng, validComps, targetAddress, onSelectComp, excludedIds]);

  const isPriceLabs = dataSource ? dataSource.toLowerCase().includes('pricelabs') : false;

  if (validComps.length === 0) {
    return (
      <div className="comp-map-container rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <div className="px-5 py-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5" style={{ color: '#2b2823' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-base font-semibold" style={{ color: "#2b2823" }}>Nearby Airbnb Listings</h3>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "#f8f7f4", border: "1px solid #e5e3da" }}>
            <p className="text-sm font-medium" style={{ color: "#2b2823" }}>No active Airbnb listings found nearby</p>
            <p className="text-xs mt-1.5" style={{ color: "#787060", lineHeight: "1.5" }}>
              We searched within {searchRadiusMiles || 50} miles but didn&apos;t find active Airbnb listings to show on the map.
              {isPriceLabs && listingsAnalyzed ? (
                <> Your revenue estimates are still accurate &mdash; they&apos;re based on PriceLabs&apos; analysis of <strong>{listingsAnalyzed.toLocaleString()} comparable properties</strong> in this market, which includes listings from multiple platforms.</>  
              ) : null}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comp-map-container rounded-2xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3" style={{ position: "relative", zIndex: 10, backgroundColor: "#ffffff" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: '#2b2823' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-base font-semibold" style={{ color: "#2b2823" }}>
              Nearby Airbnb Listings
            </h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#f5f4f0", color: "#787060" }}>
            {validComps.length} listings
          </span>
        </div>
        {/* Data source explanation */}
        {isPriceLabs && listingsAnalyzed ? (
          <div className="rounded-lg px-3 py-2 mt-2" style={{ backgroundColor: "#eff6ff", border: "1px solid #dbeafe" }}>
            <p className="text-[11px]" style={{ color: "#1e40af", lineHeight: "1.5" }}>
              <strong>Revenue estimates</strong> are based on PriceLabs&apos; analysis of <strong>{listingsAnalyzed.toLocaleString()} properties</strong>.
              The map below shows <strong>{validComps.length} sample Airbnb listings</strong> near your address for reference.
            </p>
          </div>
        ) : (
          <p className="text-xs mt-1.5" style={{ color: "#787060" }}>
            Tap any price tag to see listing details, photo, and Airbnb link.
          </p>
        )}
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: "#ef4444", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            <span className="text-xs" style={{ color: "#787060" }}>Your Property</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: "#2b2823" }}>$</div>
            <span className="text-xs" style={{ color: "#787060" }}>Nightly Rate</span>
          </div>
        </div>
      </div>

      {/* Map wrapper — creates isolated stacking context and clips Leaflet */}
      <div
        style={{
          width: "100%",
          height: "300px",
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        <div
          ref={mapRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#f5f4f0",
          }}
        />
      </div>

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
