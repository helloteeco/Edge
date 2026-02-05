"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// Types for comparable listings
interface ComparableListing {
  id: string | number;
  name: string;
  url?: string;
  bedrooms: number;
  bathrooms: number;
  accommodates?: number;
  nightPrice: number;
  occupancy: number;
  annualRevenue: number;
  monthlyRevenue: number;
  rating?: number;
  reviewsCount?: number;
  distance?: number;
  matchQuality?: 'excellent' | 'good' | 'fair' | 'weak';
  latitude?: number;
  longitude?: number;
}

interface CompMapProps {
  searchedProperty: {
    address: string;
    latitude: number;
    longitude: number;
    bedrooms: number;
    bathrooms: number;
  };
  comparables: ComparableListing[];
  projectedRevenue?: number;
  onCompClick?: (comp: ComparableListing) => void;
  selectedCompId?: string | number | null;
}

// Format currency helper
const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return `$${Math.round(value)}`;
};

// Match quality colors
const matchQualityColors: Record<string, string> = {
  excellent: '#22c55e', // green
  good: '#3b82f6',      // blue
  fair: '#f59e0b',      // amber
  weak: '#9ca3af',      // gray
};

// Map height constant
const MAP_HEIGHT = 200;

export default function CompMap({ searchedProperty, comparables, projectedRevenue, onCompClick, selectedCompId }: CompMapProps) {
  const [isReady, setIsReady] = useState(false);
  const [leaflet, setLeaflet] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Filter comps with valid coordinates
  const compsWithCoords = comparables.filter(
    (comp) => comp.latitude && comp.longitude && comp.latitude !== 0 && comp.longitude !== 0
  );

  // Initialize Leaflet
  useEffect(() => {
    let mounted = true;

    const initLeaflet = async () => {
      // Load Leaflet CSS first
      if (typeof document !== 'undefined' && !document.getElementById('leaflet-css-main')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-main';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        
        // Wait for CSS to load
        await new Promise(resolve => {
          link.onload = resolve;
          setTimeout(resolve, 500); // Fallback timeout
        });
      }

      // Import Leaflet
      const L = await import('leaflet');
      
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mounted) {
        setLeaflet(L);
        setIsReady(true);
      }
    };

    initLeaflet();

    return () => {
      mounted = false;
    };
  }, []);

  // Create custom marker icon
  const createIcon = useCallback((L: any, color: string, isSearched: boolean = false) => {
    const size = isSearched ? 32 : 24;
    const borderWidth = isSearched ? 3 : 2;
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background-color: ${color};
          border: ${borderWidth}px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSearched ? '14px' : '10px'};
          color: white;
        ">
          ${isSearched ? '★' : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }, []);

  // Initialize map when Leaflet is ready
  useEffect(() => {
    if (!isReady || !leaflet || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    const L = leaflet;
    const container = mapContainerRef.current;

    // Clear any existing map
    if ((container as any)._leaflet_id) {
      return;
    }

    // Default center
    const defaultCenter: [number, number] = searchedProperty.latitude && searchedProperty.longitude
      ? [searchedProperty.latitude, searchedProperty.longitude]
      : [39.8283, -98.5795];

    // Create map
    const map = L.map(container, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Force size recalculation after a short delay
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isReady, leaflet, searchedProperty.latitude, searchedProperty.longitude]);

  // Add/update markers and fit bounds
  useEffect(() => {
    if (!mapInstanceRef.current || !leaflet) return;

    const L = leaflet;
    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const bounds: [number, number][] = [];

    // Add searched property marker
    if (searchedProperty.latitude && searchedProperty.longitude) {
      const marker = L.marker(
        [searchedProperty.latitude, searchedProperty.longitude],
        { icon: createIcon(L, '#2b2823', true), zIndexOffset: 1000 }
      ).addTo(map);

      marker.bindPopup(`
        <div style="min-width: 180px; font-family: sans-serif;">
          <div style="font-weight: bold; margin-bottom: 4px;">Your Property</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${searchedProperty.address}</div>
          <div style="font-size: 12px; color: #888;">${searchedProperty.bedrooms} bed • ${searchedProperty.bathrooms} bath</div>
          ${projectedRevenue ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;"><span style="color: #22c55e; font-weight: bold;">${formatCurrency(projectedRevenue)}/yr</span> <span style="font-size: 11px; color: #999;">projected</span></div>` : ''}
        </div>
      `);

      markersRef.current.push(marker);
      bounds.push([searchedProperty.latitude, searchedProperty.longitude]);
    }

    // Add comp markers
    compsWithCoords.forEach((comp) => {
      if (!comp.latitude || !comp.longitude) return;

      const color = matchQualityColors[comp.matchQuality || 'weak'];
      const marker = L.marker(
        [comp.latitude, comp.longitude],
        { icon: createIcon(L, color, false) }
      ).addTo(map);

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
            <div style="font-weight: 500; font-size: 13px; flex: 1;">${comp.name}</div>
            ${comp.matchQuality ? `<span style="font-size: 10px; padding: 2px 6px; border-radius: 10px; background: ${color}; color: white; margin-left: 4px;">${comp.matchQuality}</span>` : ''}
          </div>
          <div style="font-size: 12px; color: #888; margin-bottom: 6px;">
            ${comp.bedrooms} bed • ${comp.bathrooms} bath${comp.accommodates ? ` • Sleeps ${comp.accommodates}` : ''}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid #eee;">
            <div>
              <span style="color: #22c55e; font-weight: bold;">${formatCurrency(comp.annualRevenue)}/yr</span>
              <div style="font-size: 11px; color: #999;">${formatCurrency(comp.nightPrice)}/night • ${Math.round(comp.occupancy)}% occ</div>
            </div>
            ${comp.distance ? `<span style="font-size: 11px; color: #999;">${comp.distance.toFixed(1)}mi</span>` : ''}
          </div>
          ${comp.rating ? `<div style="font-size: 11px; color: #999; margin-top: 4px;">⭐ ${comp.rating.toFixed(1)} (${comp.reviewsCount || 0} reviews)</div>` : ''}
          ${comp.url ? `<a href="${comp.url}" target="_blank" style="display: block; margin-top: 8px; font-size: 12px; color: #3b82f6; text-decoration: none;">View on Airbnb →</a>` : ''}
        </div>
      `);

      if (onCompClick) {
        marker.on('click', () => onCompClick(comp));
      }

      markersRef.current.push(marker);
      bounds.push([comp.latitude, comp.longitude]);
    });

    // Fit bounds to show all markers
    if (bounds.length > 0) {
      setTimeout(() => {
        map.invalidateSize();
        
        if (bounds.length === 1) {
          map.setView(bounds[0], 14);
        } else {
          const leafletBounds = L.latLngBounds(bounds);
          map.fitBounds(leafletBounds, { 
            padding: [30, 30],
            maxZoom: 14 
          });
        }
      }, 150);
    }
  }, [leaflet, searchedProperty, compsWithCoords, projectedRevenue, onCompClick, createIcon]);

  return (
    <div className="w-full">
      {/* Map Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-[#2b2823] border-2 border-white shadow flex items-center justify-center">
            <span className="text-white text-[8px]">★</span>
          </div>
          <span style={{ color: '#787060' }}>Your Property</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: matchQualityColors.excellent }}></div>
          <span style={{ color: '#787060' }}>Excellent Match</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: matchQualityColors.good }}></div>
          <span style={{ color: '#787060' }}>Good Match</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: matchQualityColors.fair }}></div>
          <span style={{ color: '#787060' }}>Fair Match</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: matchQualityColors.weak }}></div>
          <span style={{ color: '#787060' }}>Other</span>
        </div>
      </div>

      {/* Map Container */}
      <div 
        className="rounded-xl overflow-hidden border" 
        style={{ borderColor: '#e5e3da' }}
      >
        {!isReady ? (
          <div 
            className="w-full bg-gray-100 flex items-center justify-center"
            style={{ height: `${MAP_HEIGHT}px` }}
          >
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              <span className="text-sm">Loading map...</span>
            </div>
          </div>
        ) : (
          <div 
            ref={mapContainerRef}
            className="leaflet-map-container"
            style={{ height: `${MAP_HEIGHT}px`, minHeight: `${MAP_HEIGHT}px`, width: '100%', position: 'relative' }}
          />
        )}
      </div>
      
      {/* Comp count info */}
      <div className="flex items-center justify-between mt-2 text-xs" style={{ color: '#787060' }}>
        <span>
          {compsWithCoords.length} of {comparables.length} comps shown on map
          {compsWithCoords.length < comparables.length && (
            <span className="text-gray-400"> (some missing coordinates)</span>
          )}
        </span>
        <span>Click markers for details</span>
      </div>
    </div>
  );
}
