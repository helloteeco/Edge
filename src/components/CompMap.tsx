"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

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

// The actual map component (loaded dynamically to avoid SSR issues)
function CompMapInner({ searchedProperty, comparables, projectedRevenue, onCompClick, selectedCompId }: CompMapProps) {
  const [L, setL] = useState<any>(null);
  const [ReactLeaflet, setReactLeaflet] = useState<any>(null);
  const mapRef = useRef<any>(null);

  // Dynamically import Leaflet on client side
  useEffect(() => {
    const loadLeaflet = async () => {
      // Import Leaflet CSS - add to document head
      if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }
      
      const leaflet = await import("leaflet");
      const reactLeaflet = await import("react-leaflet");
      
      // Fix default marker icon issue with webpack
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
      
      setL(leaflet);
      setReactLeaflet(reactLeaflet);
    };
    
    loadLeaflet();
  }, []);

  // Filter comps with valid coordinates
  const compsWithCoords = comparables.filter(
    (comp) => comp.latitude && comp.longitude && comp.latitude !== 0 && comp.longitude !== 0
  );

  // Calculate map bounds to fit all markers
  const getBounds = () => {
    if (!L) return null;
    
    const points: [number, number][] = [];
    
    // Add searched property
    if (searchedProperty.latitude && searchedProperty.longitude) {
      points.push([searchedProperty.latitude, searchedProperty.longitude]);
    }
    
    // Add comps
    compsWithCoords.forEach((comp) => {
      if (comp.latitude && comp.longitude) {
        points.push([comp.latitude, comp.longitude]);
      }
    });
    
    if (points.length === 0) return null;
    if (points.length === 1) return null; // Will use center + zoom instead
    
    return L.latLngBounds(points);
  };

  // Create custom marker icons
  const createIcon = (color: string, isSearched: boolean = false) => {
    if (!L) return null;
    
    const size = isSearched ? 40 : 28;
    const borderWidth = isSearched ? 4 : 2;
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background-color: ${color};
          border: ${borderWidth}px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSearched ? '16px' : '10px'};
          font-weight: bold;
          color: white;
          ${isSearched ? 'z-index: 1000;' : ''}
        ">
          ${isSearched ? '★' : ''}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  };

  if (!L || !ReactLeaflet) {
    return (
      <div className="w-full h-[300px] rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap } = ReactLeaflet;

  // Component to fit bounds after map loads
  const FitBounds = () => {
    const map = useMap();
    
    useEffect(() => {
      const bounds = getBounds();
      if (bounds) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }, [map]);
    
    return null;
  };

  // Default center (searched property or first comp)
  const defaultCenter: [number, number] = searchedProperty.latitude && searchedProperty.longitude
    ? [searchedProperty.latitude, searchedProperty.longitude]
    : compsWithCoords.length > 0
    ? [compsWithCoords[0].latitude!, compsWithCoords[0].longitude!]
    : [39.8283, -98.5795]; // Center of US

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
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#e5e3da' }}>
        <MapContainer
          ref={mapRef}
          center={defaultCenter}
          zoom={12}
          style={{ height: '300px', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <FitBounds />
          
          {/* Searched Property Marker */}
          {searchedProperty.latitude && searchedProperty.longitude && (
            <Marker
              position={[searchedProperty.latitude, searchedProperty.longitude]}
              icon={createIcon('#2b2823', true)}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <div className="font-bold text-gray-900 mb-1">Your Property</div>
                  <div className="text-gray-600 text-xs mb-2">{searchedProperty.address}</div>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>{searchedProperty.bedrooms} bed</span>
                    <span>{searchedProperty.bathrooms} bath</span>
                  </div>
                  {projectedRevenue && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-green-600 font-semibold">{formatCurrency(projectedRevenue)}/yr</span>
                      <span className="text-gray-400 text-xs ml-1">projected</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Comparable Property Markers */}
          {compsWithCoords.map((comp, index) => {
            const color = matchQualityColors[comp.matchQuality || 'weak'];
            const isSelected = selectedCompId === comp.id;
            
            return (
              <Marker
                key={comp.id || index}
                position={[comp.latitude!, comp.longitude!]}
                icon={createIcon(color, false)}
                zIndexOffset={isSelected ? 500 : 0}
                eventHandlers={{
                  click: () => {
                    if (onCompClick) onCompClick(comp);
                  },
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[220px]">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-gray-900 line-clamp-2 flex-1">{comp.name}</div>
                      {comp.matchQuality && (
                        <span 
                          className="text-[10px] px-1.5 py-0.5 rounded-full text-white whitespace-nowrap"
                          style={{ backgroundColor: color }}
                        >
                          {comp.matchQuality}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2 text-xs text-gray-500 mb-2">
                      <span>{comp.bedrooms} bed</span>
                      <span>{comp.bathrooms} bath</span>
                      {comp.accommodates && <span>Sleeps {comp.accommodates}</span>}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div>
                        <span className="text-green-600 font-bold">{formatCurrency(comp.annualRevenue)}/yr</span>
                        <div className="text-[10px] text-gray-400">
                          {formatCurrency(comp.nightPrice)}/night • {Math.round(comp.occupancy)}% occ
                        </div>
                      </div>
                      {comp.distance !== undefined && comp.distance > 0 && (
                        <span className="text-xs text-gray-400">{comp.distance}mi</span>
                      )}
                    </div>
                    
                    {comp.rating && comp.rating > 0 && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        ⭐ {comp.rating.toFixed(1)} ({comp.reviewsCount || 0} reviews)
                      </div>
                    )}
                    
                    {comp.url && (
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-xs text-blue-600 hover:underline"
                      >
                        View on Airbnb →
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
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

// Export with dynamic loading to prevent SSR issues
export default function CompMap(props: CompMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[300px] rounded-xl bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  return <CompMapInner {...props} />;
}
