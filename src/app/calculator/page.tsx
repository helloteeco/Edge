"use client";

import { useState, useEffect, useRef, useMemo, Component, type ReactNode, type ErrorInfo } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthHeader from "@/components/AuthHeader";
import AuthModal from "@/components/AuthModal";
import { DoubleTapSave, FloatingActionPill } from "@/components/DoubleTapSave";
import dynamic from "next/dynamic";
import { StuckHelper } from "@/components/StuckHelper";
import { refilterComps, type Comp } from "@/lib/refilterComps";

// Dynamic import for CompMap (Leaflet needs client-side only)
const CompMap = dynamic(() => import("@/components/CompMap").then(mod => ({ default: mod.CompMap })), {
  ssr: false,
  loading: () => <div className="rounded-2xl p-6 animate-pulse" style={{ backgroundColor: '#f5f4f0', height: 380 }} />,
});

// Dynamic import for CompCalendar (availability heatmap)
const CompCalendar = dynamic(() => import("@/components/CompCalendar"), {
  ssr: false,
  loading: () => <div className="rounded-2xl p-6 animate-pulse" style={{ backgroundColor: '#f5f4f0', height: 300 }} />,
});

// Dynamic import for CompAmenityComparison
const CompAmenityComparison = dynamic(() => import("@/components/CompAmenityComparison"), {
  ssr: false,
  loading: () => <div className="rounded-2xl p-6 animate-pulse" style={{ backgroundColor: '#f5f4f0', height: 200 }} />,
});

// ============================================================================
// TYPES
// ============================================================================

interface RecentSearch {
  address: string;
  annualRevenue: number;
  adr: number;
  occupancy: number;
  timestamp: number;
  // Cached full result for instant recall
  cachedResult?: AnalysisResult;
  cachedBedrooms?: number;
  cachedBathrooms?: number;
  cachedGuestCount?: number;
}

interface AddressSuggestion {
  display: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  streetLine?: string;
  locationLine?: string;
}

interface PercentileData {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface ComparableListing {
  id: number;
  name: string;
  url: string;
  image: string | null;
  bedrooms: number;
  bathrooms: number;
  accommodates: number;
  sqft: number;
  nightPrice: number;
  occupancy: number;
  monthlyRevenue: number;
  annualRevenue: number;
  rating: number;
  reviewsCount: number;
  propertyType: string;
  distance: number;
  latitude: number;
  longitude: number;
  relevanceScore: number;
  amenities?: string[];
  hostName?: string;
  isSuperhost?: boolean;
}

interface AnalysisResult {
  address: string;
  city: string;
  state: string;
  neighborhood: string;
  annualRevenue: number;
  monthlyRevenue: number;
  adr: number;
  occupancy: number;
  revPAN: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  listPrice: number;
  nearbyListings: number;
  percentiles: {
    revenue: PercentileData;
    adr: PercentileData;
    occupancy: PercentileData;
    listingsAnalyzed: number;
    totalListingsInArea: number;
  } | null;
  comparables: ComparableListing[];
  revenueChange: string;
  revenueChangePercent: number;
  occupancyChange: string;
  occupancyChangePercent: number;
  historical: { year: number; month: number; occupancy: number; adr?: number; revenue?: number }[];
  recommendedAmenities?: { name: string; boost: number; priority: string; icon: string }[];
  targetCoordinates?: { latitude: number; longitude: number };
  marketType?: string;
  dataSource?: string;
}

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

class CalculatorErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Calculator Error Boundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#fef2f2' }}>
            <p className="text-base font-medium" style={{ color: '#ef4444' }}>Something went wrong with this section.</p>
            <p className="text-sm mt-2" style={{ color: '#787060' }}>Try adjusting your inputs or refreshing the page.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#2b2823' }}
            >
              Try Again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CalculatorPage() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isReportSaved, setIsReportSaved] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [bedrooms, setBedrooms] = useState<number | null>(3);
  const [bathrooms, setBathrooms] = useState<number | null>(2);
  const [guestCount, setGuestCount] = useState<number | null>(6);
  
  // Address autocomplete
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userIsTypingRef = useRef(false); // Only fetch suggestions when user is actively typing
  
  // Manual income override
  const [useCustomIncome, setUseCustomIncome] = useState(false);
  const [customAnnualIncome, setCustomAnnualIncome] = useState("");
  
  // Revenue percentile selector
  const [revenuePercentile, setRevenuePercentile] = useState<"average" | "75th" | "90th">("average");
  
  // Analysis Mode: "buying", "arbitrage", or "iownit"
  const [analysisMode, setAnalysisMode] = useState<"buying" | "arbitrage" | "iownit">("buying");

  // I Own It mode fields
  const [iownitMortgage, setIownitMortgage] = useState(""); // Optional monthly mortgage
  const [iownitPropertyTaxRate, setIownitPropertyTaxRate] = useState(1.2);
  const [iownitInsuranceAnnual, setIownitInsuranceAnnual] = useState(2400);
  const [hudFmrData, setHudFmrData] = useState<{ byBedrooms: Record<number, number>; areaName: string; year: number; source?: string } | null>(null);
  const [isLoadingFmr, setIsLoadingFmr] = useState(false);
  const [fmrError, setFmrError] = useState<string | null>(null);
  
  // Arbitrage-specific fields
  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [firstLastMonth, setFirstLastMonth] = useState(true); // First + Last month rent required
  const [landlordInsuranceMonthly, setLandlordInsuranceMonthly] = useState(150); // Renter's/liability insurance
  
  // Investment Calculator Fields (Buying mode)
  const [purchasePrice, setPurchasePrice] = useState("");
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(7.0);
  const [loanTerm, setLoanTerm] = useState(30);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.2);
  const [insuranceAnnual, setInsuranceAnnual] = useState(3200);
  const [managementFeePercent, setManagementFeePercent] = useState(20);
  const [platformFeePercent, setPlatformFeePercent] = useState(3); // Airbnb host fee ~3%
  const [maintenancePercent, setMaintenancePercent] = useState(5);
  const [vacancyPercent, setVacancyPercent] = useState(0);
  
  // Teeco Design/Setup Costs (sqft-based)
  const [includeDesignServices, setIncludeDesignServices] = useState(false);
  const [includeSetupServices, setIncludeSetupServices] = useState(false);
  const [includeFurnishings, setIncludeFurnishings] = useState(false);
  const [includeAmenities, setIncludeAmenities] = useState(false);
  const [amenitiesCost, setAmenitiesCost] = useState(11000);
  const [furnishingsCost, setFurnishingsCost] = useState(26250); // Default: 1500 sqft * $17.50
  const [propertySqft, setPropertySqft] = useState(1500); // Default sqft for calculation
  const [studentDiscount, setStudentDiscount] = useState(false); // 20% discount toggle
  const [teecoStrategyActive, setTeecoStrategyActive] = useState(false); // Teeco Strategy toggle
  
  // Monthly Expenses
  const [electricMonthly, setElectricMonthly] = useState(100);
  const [waterMonthly, setWaterMonthly] = useState(80);
  const [internetMonthly, setInternetMonthly] = useState(60);
  const [trashMonthly, setTrashMonthly] = useState(30);
  const [lawnCareMonthly, setLawnCareMonthly] = useState(60);
  const [pestControlMonthly, setPestControlMonthly] = useState(25);
  const [cleaningMonthly, setCleaningMonthly] = useState(0);
  const [houseSuppliesMonthly, setHouseSuppliesMonthly] = useState(50);
  const [suppliesConsumablesMonthly, setSuppliesConsumablesMonthly] = useState(75); // Toiletries, linens replacement, kitchen supplies
  const [maintenanceMonthly, setMaintenanceMonthly] = useState(100);
  const [rentalSoftwareMonthly, setRentalSoftwareMonthly] = useState(30);

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  
  // Force refresh state (bypasses cache, always uses credit)
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // Market mismatch detection
  const [marketMismatch, setMarketMismatch] = useState<{
    searched: string;
    returned: string;
    creditRefunded: boolean;
  } | null>(null);
  const [unsupportedAddresses, setUnsupportedAddresses] = useState<string[]>([]);
  
  // Share link state
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  
  // Custom comp selection: track excluded comp IDs
  const [excludedCompIds, setExcludedCompIds] = useState<Set<number | string>>(new Set());
  // Expandable comp cards: show 5 initially, expand to all
  const [showAllComps, setShowAllComps] = useState(false);
  
  // Full unfiltered comp set from API — used for local bedroom re-filtering
  const [allComps, setAllComps] = useState<ComparableListing[]>([]);
  // Track the last address that triggered an API call (to avoid re-fetching on bedroom change)
  const [lastAnalyzedAddress, setLastAnalyzedAddress] = useState<string>("");
  // Store target coordinates for local re-filtering
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Real occupancy data from calendar scraping
  const [realOccupancyData, setRealOccupancyData] = useState<Record<string, { occupancyRate: number; bookedDays: number; totalDays: number; peakMonths: string[]; lowMonths: string[]; source: string; dailyCalendar?: { date: string; available: boolean }[] }>>({});
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(false);
  
  
  // Toggle a comp in/out of the selection
  const toggleCompExclusion = (compId: number | string) => {
    setExcludedCompIds(prev => {
      const next = new Set(prev);
      if (next.has(compId)) {
        next.delete(compId);
      } else {
        next.add(compId);
      }
      return next;
    });
  };
  
  // Geocode an address to get lat/lng (used as fallback when cached data lacks coordinates)
  const geocodeAddress = async (addr: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(`/api/geocode-latlng?address=${encodeURIComponent(addr)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.lat && data.lng) {
        console.log('[Geocode Fallback] Resolved:', addr, '→', data.lat, data.lng);
        return { lat: data.lat, lng: data.lng };
      }
    } catch (e) {
      console.error('[Geocode Fallback] Error:', e);
    }
    return null;
  };

  // Get the active (included) comps
  const getActiveComps = (): ComparableListing[] => {
    if (!result?.comparables) return [];
    return result.comparables.filter(c => !excludedCompIds.has(c.id));
  };
  
  // Recalculate revenue from active comps only
  const getCompBasedRevenue = (): { adr: number; occupancy: number; annualRevenue: number } | null => {
    const activeComps = getActiveComps();
    if (activeComps.length === 0) return null;
    const avgAdr = Math.round(activeComps.reduce((sum, c) => sum + c.nightPrice, 0) / activeComps.length);
    const avgOcc = Math.round(activeComps.reduce((sum, c) => sum + c.occupancy, 0) / activeComps.length);
    const avgRevenue = Math.round(activeComps.reduce((sum, c) => sum + (c.annualRevenue || c.monthlyRevenue * 12), 0) / activeComps.length);
    return { adr: avgAdr, occupancy: avgOcc, annualRevenue: avgRevenue };
  };
  
  // Limited data warning modal
  const [showLimitedDataWarning, setShowLimitedDataWarning] = useState(false);
  const [limitedDataInfo, setLimitedDataInfo] = useState<{
    searchedCity: string;
    searchedState: string;
    nearestMarket: string;
    distanceMiles: number | null;
  } | null>(null);

  // Fetch HUD FMR data when result changes (for I Own It mode)
  useEffect(() => {
    if (!result?.state || !result?.city) return;
    setIsLoadingFmr(true);
    setFmrError(null);
    fetch(`/api/hud-fmr?state=${encodeURIComponent(result.state)}&city=${encodeURIComponent(result.city)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHudFmrData({ byBedrooms: data.byBedrooms, areaName: data.areaName, year: data.year, source: data.source || undefined });
        } else {
          setFmrError(data.error || "Could not fetch rent data");
        }
      })
      .catch(() => setFmrError("Failed to fetch rent data"))
      .finally(() => setIsLoadingFmr(false));
  }, [result?.state, result?.city]);

  // Reset excluded comps and collapse comp list when a new analysis is run
  useEffect(() => {
    setExcludedCompIds(new Set());
    setRealOccupancyData({});
    setShowAllComps(false);
  }, [result?.address]);
  
  // Fetch real occupancy data for comps after analysis completes
  useEffect(() => {
    if (!result?.comparables || result.comparables.length === 0) return;
    
    const roomIds = result.comparables
      .slice(0, 8)
      .map(c => String(c.id))
      .filter(id => id && id !== '0');
    
    if (roomIds.length === 0) return;
    
    const fetchOccupancy = async () => {
      setIsLoadingOccupancy(true);
      try {
        const response = await fetch('/api/airbnb-occupancy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomIds }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.occupancy) {
            setRealOccupancyData(data.occupancy);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch real occupancy data:', err);
      } finally {
        setIsLoadingOccupancy(false);
      }
    };
    
    // Delay slightly so it doesn't block the main analysis render
    const timer = setTimeout(fetchOccupancy, 1500);
    return () => clearTimeout(timer);
  }, [result?.comparables]);

  // Lock body scroll when AI Analysis modal is open
  useEffect(() => {
    if (showAiAnalysis) {
      // Save current scroll position and lock body
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showAiAnalysis]);

  // Load recent searches from localStorage (with 90-day cache expiration)
  // Note: This caches the analysis results locally, not re-fetching from API
  const CACHE_EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  
  useEffect(() => {
    const saved = localStorage.getItem("edge_recent_searches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RecentSearch[];
        const now = Date.now();
        
        // Filter out expired cached results (older than 90 days)
        // Keep the search entry but remove the cached data
        const withExpiredCachesCleared = parsed.map(search => {
          if (search.cachedResult && search.timestamp) {
            const ageMs = now - search.timestamp;
            if (ageMs > CACHE_EXPIRATION_MS) {
              // Cache expired - remove cached data but keep the search entry
              return {
                address: search.address,
                annualRevenue: search.annualRevenue,
                adr: search.adr,
                occupancy: search.occupancy,
                timestamp: search.timestamp,
                // Cached data removed due to expiration
              };
            }
          }
          return search;
        });
        
        setRecentSearches(withExpiredCachesCleared);
        // Update localStorage with cleaned data
        localStorage.setItem("edge_recent_searches", JSON.stringify(withExpiredCachesCleared));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
    
    // Load unsupported addresses list
    const savedUnsupported = localStorage.getItem("edge_unsupported_addresses");
    if (savedUnsupported) {
      try {
        setUnsupportedAddresses(JSON.parse(savedUnsupported));
      } catch (e) {
        console.error("Failed to parse unsupported addresses:", e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL params (address, bedrooms, bathrooms, guests, cached, force)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const addressParam = urlParams.get("address");
    const bedroomsParam = urlParams.get("bedrooms");
    const bathroomsParam = urlParams.get("bathrooms");
    const guestsParam = urlParams.get("guests");
    const cachedParam = urlParams.get("cached");
    const forceParam = urlParams.get("force");
    
    if (addressParam) {
      setAddress(addressParam);
      if (bedroomsParam) setBedrooms(parseInt(bedroomsParam, 10));
      if (bathroomsParam) setBathrooms(parseInt(bathroomsParam, 10));
      if (guestsParam) setGuestCount(parseInt(guestsParam, 10));
      
      // If force=true, set forceRefresh to bypass cache on next analysis
      if (forceParam === "true") {
        setForceRefresh(true);
      }
      
      // If cached=true or fromSaved=true, load from localStorage cache first, then try Supabase cache
      const fromSavedParam = urlParams.get("fromSaved");
      if (cachedParam === "true" || fromSavedParam === "true") {
        const recentSearches = JSON.parse(localStorage.getItem("edge_recent_searches") || "[]");
        const cachedSearch = recentSearches.find((s: { address: string }) => s.address === addressParam);
        if (cachedSearch?.cachedResult) {
          setResult(cachedSearch.cachedResult);
          // Restore allComps and targetCoords for local bedroom re-filtering and comp map
          if (cachedSearch.cachedResult.comparables && Array.isArray(cachedSearch.cachedResult.comparables)) {
            setAllComps(cachedSearch.cachedResult.comparables as ComparableListing[]);
          }
          if (cachedSearch.cachedResult.targetCoordinates) {
            setTargetCoords({ lat: cachedSearch.cachedResult.targetCoordinates.latitude, lng: cachedSearch.cachedResult.targetCoordinates.longitude });
          } else {
            // Geocode fallback for legacy cache entries missing coordinates
            geocodeAddress(addressParam).then(coords => {
              if (coords) {
                console.log('[FromSaved] Geocoded address for CompMap:', coords);
                setTargetCoords(coords);
                // Also update the result so CompMap rendering picks it up
                setResult(prev => prev ? { ...prev, targetCoordinates: { latitude: coords.lat, longitude: coords.lng } } : prev);
              }
            });
          }
          setLastAnalyzedAddress(addressParam);
          // Check if this address is already saved
          const savedLocal = JSON.parse(localStorage.getItem('edge_saved_reports') || '[]');
          const addr = cachedSearch.cachedResult.address || cachedSearch.cachedResult.neighborhood;
          setIsReportSaved(savedLocal.some((r: any) => r.address === addr));
          if (cachedSearch.cachedResult.listPrice > 0) {
            setPurchasePrice(cachedSearch.cachedResult.listPrice.toString());
          }
          if (cachedSearch.cachedResult.sqft > 0) {
            setPropertySqft(cachedSearch.cachedResult.sqft);
            setFurnishingsCost(Math.round(cachedSearch.cachedResult.sqft * 15));
          }
        } else {
          // No local cache — try Supabase property-cache API (no credit used)
          fetch(`/api/property-cache?address=${encodeURIComponent(addressParam)}`)
            .then(res => res.json())
            .then(cacheData => {
              if (cacheData.success && cacheData.cached && cacheData.data) {
                // Use the same handleAnalyzeWithCache path
                const data = cacheData.data as {
                  property?: Record<string, unknown>;
                  neighborhood?: Record<string, unknown>;
                  percentiles?: Record<string, unknown>;
                  comparables?: unknown[];
                  historical?: unknown[];
                  recommendedAmenities?: unknown[];
                  targetCoordinates?: { latitude: number; longitude: number };
                  allComps?: unknown[];
                  marketType?: string;
                };
                const parseNum = (val: unknown): number => {
                  if (typeof val === "number") return val;
                  if (typeof val === "string") return parseFloat(val) || 0;
                  return 0;
                };
                const property = data.property || {};
                const neighborhood = data.neighborhood || {};
                const percentiles = data.percentiles;
                const avgAdr = parseNum(neighborhood?.adr);
                const avgOccupancy = parseNum(neighborhood?.occupancy);
                let annualRevenue: number;
                let monthlyRevenue: number;
                const percentilesTyped = percentiles as { revenue?: { p50?: number } } | null;
                if (percentilesTyped?.revenue?.p50 && percentilesTyped.revenue.p50 > 0) {
                  annualRevenue = percentilesTyped.revenue.p50;
                  monthlyRevenue = Math.round(annualRevenue / 12);
                } else if (parseNum(neighborhood?.annualRevenue) > 0) {
                  annualRevenue = parseNum(neighborhood?.annualRevenue);
                  monthlyRevenue = Math.round(annualRevenue / 12);
                } else {
                  annualRevenue = 0;
                  monthlyRevenue = 0;
                }
                const analysisResult: AnalysisResult = {
                  address: addressParam,
                  city: (property?.city as string) || (neighborhood?.city as string) || "",
                  state: (property?.state as string) || (neighborhood?.state as string) || "",
                  neighborhood: (neighborhood?.name as string) || "Unknown",
                  annualRevenue,
                  monthlyRevenue,
                  adr: Math.round(avgAdr),
                  occupancy: Math.round(avgOccupancy),
                  revPAN: avgAdr > 0 && avgOccupancy > 0 ? Math.round(avgAdr * (avgOccupancy / 100)) : 0,
                  bedrooms: parseInt(bedroomsParam || "3", 10),
                  bathrooms: parseInt(bathroomsParam || "2", 10),
                  sqft: parseNum(property?.sqft),
                  propertyType: (property?.propertyType as string) || "house",
                  listPrice: parseNum(property?.listPrice) || parseNum(property?.lastSalePrice) || parseNum(neighborhood?.medianPrice),
                  nearbyListings: parseNum(neighborhood?.listingsCount),
                  percentiles: percentiles as AnalysisResult["percentiles"] || null,
                  comparables: (data.comparables as ComparableListing[]) || [],
                  revenueChange: (neighborhood?.revenueChange as string) || "stable",
                  revenueChangePercent: parseNum(neighborhood?.revenueChangePercent),
                  occupancyChange: (neighborhood?.occupancyChange as string) || "stable",
                  occupancyChangePercent: parseNum(neighborhood?.occupancyChangePercent),
                  historical: (data.historical as AnalysisResult["historical"]) || [],
                  recommendedAmenities: (data.recommendedAmenities as AnalysisResult["recommendedAmenities"]) || [],
                  targetCoordinates: data.targetCoordinates || undefined,
                  marketType: (data.marketType as string) || undefined,
                  dataSource: ((data as any).dataSource as string) || undefined,
                };
                setResult(analysisResult);
                // Restore allComps and targetCoords for local bedroom re-filtering and comp map
                if (data.allComps && Array.isArray(data.allComps) && data.allComps.length > 0) {
                  setAllComps(data.allComps as ComparableListing[]);
                } else if (data.comparables && Array.isArray(data.comparables)) {
                  setAllComps(data.comparables as ComparableListing[]);
                }
                if (data.targetCoordinates) {
                  setTargetCoords({ lat: data.targetCoordinates.latitude, lng: data.targetCoordinates.longitude });
                } else {
                  // Geocode fallback for legacy cache entries missing coordinates
                  geocodeAddress(addressParam).then(coords => {
                    if (coords) {
                      console.log('[FromSaved/Supabase] Geocoded address for CompMap:', coords);
                      setTargetCoords(coords);
                      setResult(prev => prev ? { ...prev, targetCoordinates: { latitude: coords.lat, longitude: coords.lng } } : prev);
                    }
                  });
                }
                setLastAnalyzedAddress(addressParam);
                if (analysisResult.listPrice > 0) {
                  setPurchasePrice(analysisResult.listPrice.toString());
                }
                if (analysisResult.sqft > 0) {
                  setPropertySqft(analysisResult.sqft);
                  setFurnishingsCost(Math.round(analysisResult.sqft * 15));
                }
              }
            })
            .catch(err => console.error("[FromSaved] Cache fetch error:", err));
        }
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for existing authentication on mount
  useEffect(() => {
    // First check URL for magic link token (takes priority)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    
    if (token) {
      console.log("[Auth] Found magic link token in URL, verifying...");
      verifyMagicLink(token);
      // Clean up URL immediately
      window.history.replaceState({}, document.title, window.location.pathname);
      return; // Don't check localStorage if we're verifying a token
    }
    
    // No token in URL, check localStorage for existing session
    const authToken = localStorage.getItem("edge_auth_token");
    const authExpiry = localStorage.getItem("edge_auth_expiry");
    const savedEmail = localStorage.getItem("edge_auth_email");
    
    console.log("[Auth] Checking localStorage:", { authToken: !!authToken, authExpiry, savedEmail });
    
    if (authToken && authExpiry && savedEmail) {
      const expiryTime = parseInt(authExpiry, 10);
      if (Date.now() < expiryTime) {
        // Token still valid
        console.log("[Auth] Valid session found, user is authenticated:", savedEmail);
        setIsAuthenticated(true);
        setAuthEmail(savedEmail);
        // Fetch user credits
        fetchUserCredits(savedEmail);
      } else {
        // Token expired, clear auth
        console.log("[Auth] Session expired, clearing...");
        localStorage.removeItem("edge_auth_token");
        localStorage.removeItem("edge_auth_expiry");
        localStorage.removeItem("edge_auth_email");
      }
    } else {
      console.log("[Auth] No existing session found");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Verify magic link token
  const verifyMagicLink = async (token: string) => {
    console.log("[Auth] Starting magic link verification...");
    setShowAuthModal(true);
    setAuthStep("verifying");
    setAuthError(null);
    
    try {
      const response = await fetch("/api/auth/verify-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      console.log("[Auth] Verification response:", data);
      
      if (data.success) {
        // Store auth in localStorage (30-day session)
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
        const sessionToken = data.sessionToken || token;
        
        console.log("[Auth] Storing session:", { email: data.email, expiryTime });
        localStorage.setItem("edge_auth_token", sessionToken);
        localStorage.setItem("edge_auth_expiry", expiryTime.toString());
        localStorage.setItem("edge_auth_email", data.email);
        
        // Verify storage worked
        const storedToken = localStorage.getItem("edge_auth_token");
        const storedExpiry = localStorage.getItem("edge_auth_expiry");
        const storedEmail = localStorage.getItem("edge_auth_email");
        console.log("[Auth] Verified localStorage:", { storedToken: !!storedToken, storedExpiry, storedEmail });
        
        setIsAuthenticated(true);
        setAuthEmail(data.email);
        setShowAuthModal(false);
        setAuthStep("email");
        console.log("[Auth] User authenticated successfully!");
        
        // Fetch user credits
        fetchUserCredits(data.email);
        
        // Restore pending analysis state if it exists
        const pendingAddress = localStorage.getItem("edge_pending_address");
        const pendingBedrooms = localStorage.getItem("edge_pending_bedrooms");
        const pendingBathrooms = localStorage.getItem("edge_pending_bathrooms");
        const pendingGuests = localStorage.getItem("edge_pending_guests");
        
        if (pendingAddress) {
          console.log("[Auth] Restoring pending analysis state:", { pendingAddress, pendingBedrooms, pendingBathrooms, pendingGuests });
          setAddress(pendingAddress);
          if (pendingBedrooms) setBedrooms(parseInt(pendingBedrooms, 10));
          if (pendingBathrooms) setBathrooms(parseInt(pendingBathrooms, 10));
          if (pendingGuests) setGuestCount(parseInt(pendingGuests, 10));
          
          // Clear pending state from localStorage
          localStorage.removeItem("edge_pending_address");
          localStorage.removeItem("edge_pending_bedrooms");
          localStorage.removeItem("edge_pending_bathrooms");
          localStorage.removeItem("edge_pending_guests");
          
          // Auto-trigger the credit confirmation modal after a short delay
          setTimeout(() => {
            setPendingAnalysis(pendingAddress);
            setShowCreditConfirm(true);
          }, 500);
        }
      } else {
        console.error("[Auth] Verification failed:", data.error);
        setAuthError(data.error || "Invalid or expired link. Please request a new one.");
        setAuthStep("email");
      }
    } catch (err) {
      console.error("[Auth] Verification error:", err);
      setAuthError("Failed to verify. Please try again.");
      setAuthStep("email");
    }
  };
  
  // Send magic link email
  const sendMagicLink = async () => {
    if (!authEmail || !authEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    
    setAuthError(null);
    setAuthStep("verifying");
    
    try {
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAuthStep("sent");
      } else {
        setAuthError(data.error || "Failed to send email. Please try again.");
        setAuthStep("email");
      }
    } catch (err) {
      console.error("Magic link error:", err);
      setAuthError("Failed to send email. Please try again.");
      setAuthStep("email");
    }
  };
  
  // Fetch user credits from server
  const fetchUserCredits = async (email: string) => {
    try {
      const response = await fetch(`/api/credits?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success) {
        setCreditsRemaining(data.credits.remaining);
        setCreditsLimit(data.credits.limit);
        setCreditsUsed(data.credits.used);
        console.log("[Credits] Loaded:", data.credits);
      }
    } catch (error) {
      console.error("[Credits] Error fetching:", error);
    }
  };
  
  // Handle analyze button click - check auth and credits first
  const handleAnalyzeClick = async () => {
    // Double-check auth from localStorage in case state is stale
    const authToken = localStorage.getItem("edge_auth_token");
    const authExpiry = localStorage.getItem("edge_auth_expiry");
    const savedEmail = localStorage.getItem("edge_auth_email");
    
    const hasValidSession = authToken && authExpiry && savedEmail && 
      Date.now() < parseInt(authExpiry, 10);
    
    console.log("[Auth] Analyze clicked - isAuthenticated:", isAuthenticated, "hasValidSession:", hasValidSession);
    
    // Check if this is the user's first free analysis (no sign-in required)
    const hasUsedFreePreview = localStorage.getItem("edge_free_preview_used");
    const isFirstFreeAnalysis = !hasUsedFreePreview && !isAuthenticated && !hasValidSession;
    
    if (isFirstFreeAnalysis) {
      // Allow first analysis without sign-in — show value first
      console.log("[Auth] First free preview - skipping auth");
      // Go straight to analysis (skip credit confirm too)
      handleAnalyze();
      localStorage.setItem("edge_free_preview_used", "true");
      return;
    }
    
    // After first free analysis, require sign-in
    if (!isAuthenticated && !hasValidSession) {
      // Save pending analysis state to localStorage before showing auth modal
      localStorage.setItem("edge_pending_address", address);
      localStorage.setItem("edge_pending_bedrooms", bedrooms?.toString() || "");
      localStorage.setItem("edge_pending_bathrooms", bathrooms?.toString() || "");
      localStorage.setItem("edge_pending_guests", guestCount?.toString() || "");
      console.log("[Auth] Saved pending analysis state:", { address, bedrooms, bathrooms, guestCount });
      
      setShowAuthModal(true);
      setAuthStep("email");
      setAuthError(null);
      return;
    }
    
    // If we have a valid session but state isn't updated, update it
    if (!isAuthenticated && hasValidSession) {
      console.log("[Auth] Updating state from localStorage");
      setIsAuthenticated(true);
      setAuthEmail(savedEmail);
      fetchUserCredits(savedEmail);
    }
    
    // Check if user has credits
    if (creditsRemaining !== null && creditsRemaining <= 0) {
      setShowPaywall(true);
      return;
    }
    
    // Extract city and state from address for limited data check
    const addressParts = address.split(',').map(p => p.trim());
    let searchedCity = '';
    let searchedState = '';
    if (addressParts.length >= 2) {
      searchedCity = addressParts[1].toLowerCase().replace(/[^a-z\s]/g, '').trim();
    }
    if (addressParts.length >= 3) {
      // Extract state code (first 2 letters after city)
      searchedState = addressParts[2].replace(/[^a-zA-Z]/g, '').trim().substring(0, 2).toUpperCase();
    }
    
    // Check if this location has limited data (pre-search check)
    if (searchedCity && searchedState) {
      try {
        const limitedDataResponse = await fetch(
          `/api/limited-data-locations?city=${encodeURIComponent(searchedCity)}&state=${encodeURIComponent(searchedState)}`
        );
        const limitedData = await limitedDataResponse.json();
        
        if (limitedData.success && limitedData.hasLimitedData) {
          console.log('[LimitedData] Pre-search check found limited data:', limitedData);
          // Show warning modal instead of proceeding directly
          setLimitedDataInfo({
            searchedCity: searchedCity,
            searchedState: searchedState,
            nearestMarket: limitedData.nearestMarket || 'Unknown',
            distanceMiles: limitedData.distanceMiles,
          });
          setPendingAnalysis(address);
          setShowLimitedDataWarning(true);
          return;
        }
      } catch (err) {
        console.error('[LimitedData] Pre-search check error:', err);
        // Continue with normal flow if check fails
      }
    }
    
    // Show credit confirmation modal
    setPendingAnalysis(address);
    setShowCreditConfirm(true);
  };
  
  // Confirm and proceed with analysis (deduct credit)
  const confirmAnalysis = async () => {
    const savedEmail = localStorage.getItem("edge_auth_email");
    if (!savedEmail) return;
    
    setShowCreditConfirm(false);
    
    // Check cache ONLY if not forcing refresh
    if (!forceRefresh) {
      try {
        const cacheResponse = await fetch(`/api/property-cache?address=${encodeURIComponent(pendingAnalysis || address)}`);
        const cacheData = await cacheResponse.json();
        
        if (cacheData.success && cacheData.cached && cacheData.data) {
          console.log("[Cache] Using cached data - no credit deducted");
          // Use cached data directly
          handleAnalyzeWithCache(cacheData.data);
          setPendingAnalysis(null);
          setForceRefresh(false);
          return;
        }
      } catch (error) {
        console.error("[Cache] Error checking cache:", error);
      }
    } else {
      console.log("[Cache] Force refresh enabled - bypassing cache, will use credit");
    }
    
    // No cache - deduct credit first, then make API call
    try {
      const creditResponse = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedEmail, action: 'deduct' }),
      });
      
      const creditData = await creditResponse.json();
      
      if (!creditData.success) {
        if (creditData.needsUpgrade) {
          setShowPaywall(true);
        } else {
          setError(creditData.error || "Failed to process credit. Please try again.");
        }
        setPendingAnalysis(null);
        return;
      }
      
      // Update credits display
      setCreditsRemaining(creditData.remaining);
      
      // Now proceed with analysis
      handleAnalyze(pendingAnalysis || undefined);
      setPendingAnalysis(null);
      setForceRefresh(false);
    } catch (error) {
      console.error("[Credits] Error deducting:", error);
      setError("Failed to process request. Please try again.");
      setPendingAnalysis(null);
    }
  };
  
  // Handle analysis with cached data
  const handleAnalyzeWithCache = (cachedData: Record<string, unknown>) => {
    // Reconstruct result from cached data
    const data = cachedData as {
      property?: Record<string, unknown>;
      neighborhood?: Record<string, unknown>;
      percentiles?: Record<string, unknown>;
      comparables?: unknown[];
      historical?: unknown[];
      recommendedAmenities?: unknown[];
      targetCoordinates?: { latitude: number; longitude: number };
      allComps?: unknown[];
      marketType?: string;
    };
    
    const parseNum = (val: unknown): number => {
      if (typeof val === "number") return val;
      if (typeof val === "string") return parseFloat(val) || 0;
      return 0;
    };
    
    const property = data.property || {};
    const neighborhood = data.neighborhood || {};
    const percentiles = data.percentiles as AnalysisResult["percentiles"];
    
    const avgAdr = parseNum(neighborhood?.adr);
    const avgOccupancy = parseNum(neighborhood?.occupancy);
    
    let annualRevenue: number;
    let monthlyRevenue: number;
    
    const percentilesTyped = percentiles as { revenue?: { p50?: number } } | null;
    if (percentilesTyped?.revenue?.p50 && percentilesTyped.revenue.p50 > 0) {
      annualRevenue = percentilesTyped.revenue.p50;
      monthlyRevenue = Math.round(annualRevenue / 12);
    } else if (parseNum(neighborhood?.annualRevenue) > 0) {
      annualRevenue = parseNum(neighborhood?.annualRevenue);
      monthlyRevenue = Math.round(annualRevenue / 12);
    } else {
      annualRevenue = 0;
      monthlyRevenue = 0;
    }
    
    const analysisResult: AnalysisResult = {
      address: pendingAnalysis || address,
      city: (property?.city as string) || (neighborhood?.city as string) || "",
      state: (property?.state as string) || (neighborhood?.state as string) || "",
      neighborhood: (neighborhood?.name as string) || "Unknown",
      annualRevenue,
      monthlyRevenue,
      adr: Math.round(avgAdr),
      occupancy: Math.round(avgOccupancy),
      revPAN: avgAdr > 0 && avgOccupancy > 0 ? Math.round(avgAdr * (avgOccupancy / 100)) : 0,
      bedrooms: bedrooms || 3,
      bathrooms: bathrooms || 2,
      sqft: parseNum(property?.sqft),
      propertyType: (property?.propertyType as string) || "house",
      listPrice: parseNum(property?.listPrice) || parseNum(property?.lastSalePrice) || parseNum(neighborhood?.medianPrice),
      nearbyListings: parseNum(neighborhood?.listingsCount),
      percentiles: percentiles || null,
      comparables: (data.comparables as ComparableListing[]) || [],
      revenueChange: (neighborhood?.revenueChange as string) || "stable",
      revenueChangePercent: parseNum(neighborhood?.revenueChangePercent),
      occupancyChange: (neighborhood?.occupancyChange as string) || "stable",
      occupancyChangePercent: parseNum(neighborhood?.occupancyChangePercent),
      historical: (data.historical as AnalysisResult["historical"]) || [],
      recommendedAmenities: (data.recommendedAmenities as AnalysisResult["recommendedAmenities"]) || [],
      targetCoordinates: data.targetCoordinates || undefined,
      marketType: (data.marketType as string) || undefined,
      dataSource: ((data as any).dataSource as string) || undefined,
    };
    
    // NEVER reconstruct targetCoordinates from comp coordinates — they could be from a different market
    // Instead, geocode the actual address if coordinates are missing
    
    setResult(analysisResult);
    setIsReportSaved(false); // Reset saved state for new analysis
    setAddress(pendingAnalysis || address);
    
    // Restore allComps and targetCoords for local bedroom re-filtering and comp map
    if (data.allComps && Array.isArray(data.allComps) && data.allComps.length > 0) {
      setAllComps(data.allComps as ComparableListing[]);
    } else if (data.comparables && Array.isArray(data.comparables)) {
      setAllComps(data.comparables as ComparableListing[]);
    }
    const resolvedCoords = analysisResult.targetCoordinates || data.targetCoordinates;
    if (resolvedCoords && resolvedCoords.latitude !== 0 && resolvedCoords.longitude !== 0) {
      setTargetCoords({ lat: resolvedCoords.latitude, lng: resolvedCoords.longitude });
    } else {
      // Geocode fallback for legacy cache entries missing all coordinates
      const addrToGeocode = pendingAnalysis || address;
      geocodeAddress(addrToGeocode).then(coords => {
        if (coords) {
          console.log('[Cache Restore] Geocoded address for CompMap:', coords);
          setTargetCoords(coords);
          setResult(prev => prev ? { ...prev, targetCoordinates: { latitude: coords.lat, longitude: coords.lng } } : prev);
        }
      });
    }
    setLastAnalyzedAddress(pendingAnalysis || address);
    
    if (analysisResult.listPrice > 0 && !purchasePrice) {
      setPurchasePrice(analysisResult.listPrice.toString());
    }
    
    if (analysisResult.sqft > 0) {
      setPropertySqft(analysisResult.sqft);
      setFurnishingsCost(Math.round(analysisResult.sqft * 15));
    }
    
    setUseCustomIncome(false);
    setCustomAnnualIncome("");

    // Save to recent searches so History tab and Recent Searches bar work
    saveRecentSearch({
      address: analysisResult.address,
      annualRevenue: analysisResult.annualRevenue,
      adr: analysisResult.adr,
      occupancy: analysisResult.occupancy,
      timestamp: Date.now(),
      cachedResult: analysisResult,
      cachedBedrooms: bedrooms || analysisResult.bedrooms,
      cachedBathrooms: bathrooms || analysisResult.bathrooms,
      cachedGuestCount: guestCount || (bedrooms || analysisResult.bedrooms) * 2,
    });
  };

  // Save recent search
  const saveRecentSearch = (search: RecentSearch) => {
    const updated = [search, ...recentSearches.filter(s => s.address !== search.address)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("edge_recent_searches", JSON.stringify(updated));
  };

  // Save report to Saved section
  const saveReport = async () => {
    if (!result) return;
    
    // Check if user is authenticated
    const authEmail = localStorage.getItem("edge_auth_email");
    const authToken = localStorage.getItem("edge_auth_token");
    const authExpiry = localStorage.getItem("edge_auth_expiry");
    
    const hasValidSession = authEmail && authToken && authExpiry && 
      Date.now() < parseInt(authExpiry, 10);
    
    if (!hasValidSession) {
      // Show auth modal if not signed in
      alert("Please sign in to save reports. Your saved reports will sync across all your devices.");
      setShowAuthModal(true);
      return;
    }
    
    const investment = calculateInvestment();
    const displayRevenue = getDisplayRevenue();
    
    const report = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      address: result.address,
      city: result.city,
      state: result.state,
      bedrooms: bedrooms || result.bedrooms,
      bathrooms: bathrooms || result.bathrooms,
      guestCount: guestCount || (bedrooms || 3) * 2,
      annualRevenue: displayRevenue,
      cashFlow: investment.cashFlow,
      cashOnCash: investment.cashOnCashReturn,
      purchasePrice: parseFloat(purchasePrice) || 0,
      notes: "",
      savedAt: Date.now(),
      // Preserve custom inputs so the analysis can be restored exactly
      customInputs: {
        purchasePrice,
        downPaymentPercent,
        interestRate,
        managementFeePercent,
        cleaningCostPerStay: cleaningMonthly,
        revenuePercentile,
        useCustomIncome,
        customAnnualIncome,
        monthlyRent,
        securityDeposit,
        firstLastMonth,
        startupBudget: 0,
      },
    };
    
    // Save to server (user-specific data)
    try {
      const response = await fetch('/api/saved-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          email: authEmail,
          property: {
            id: report.id,
            address: report.address,
            notes: report.notes,
            result: {
              annualRevenue: report.annualRevenue,
              cashOnCash: report.cashOnCash,
              monthlyNetCashFlow: report.cashFlow,
              bedrooms: report.bedrooms,
              bathrooms: report.bathrooms,
              guestCount: report.guestCount,
            },
            customInputs: report.customInputs,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsReportSaved(true);
        // Also cache in localStorage so the floating pill heart stays filled
        const savedLocal = JSON.parse(localStorage.getItem('edge_saved_reports') || '[]');
        const addr = result.address || result.neighborhood;
        if (!savedLocal.some((r: any) => r.address === addr)) {
          savedLocal.push({ address: addr, savedAt: Date.now() });
          localStorage.setItem('edge_saved_reports', JSON.stringify(savedLocal));
        }
        alert("Report saved! View it in the Saved section.");
      } else if (data.error?.includes("already")) {
        alert("This property is already saved!");
      } else {
        alert("Failed to save report. Please try again.");
      }
    } catch (error) {
      console.error("Error saving to server:", error);
      alert("Failed to save report. Please check your connection and try again.");
    }
  };

  // Email report
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  
  // Magic Link Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authStep, setAuthStep] = useState<"email" | "sent" | "verifying">("email");
  const [authError, setAuthError] = useState<string | null>(null);
  const [magicToken, setMagicToken] = useState<string | null>(null);
  
  // Credit System
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [creditsLimit, setCreditsLimit] = useState<number>(3);
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<string | null>(null);
  
  // Calculate free vs purchased credits (free credits = first 3)
  const FREE_CREDITS_TOTAL = 3;
  const freeCreditsRemaining = Math.max(0, FREE_CREDITS_TOTAL - creditsUsed);
  const purchasedCreditsRemaining = creditsRemaining !== null ? Math.max(0, creditsRemaining - freeCreditsRemaining) : 0;
  const hasPurchasedCredits = creditsLimit > FREE_CREDITS_TOTAL;
  
  const sendEmailReport = async () => {
    if (!emailAddress || !result) return;
    
    setEmailSending(true);
    try {
      // First generate the PDF
      downloadPDFReport();
      
      // Wait a moment for PDF to generate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate email with summary
      const inv = calculateInvestment();
      const arb = calculateArbitrage();
      const displayRevenue = getDisplayRevenue();
      const own = calculateIownit();
      const activeCalc = analysisMode === "buying" ? inv : arb;
      
      const strategyLabel = analysisMode === "iownit" ? "I Own It (STR vs LTR)" : analysisMode === "arbitrage" ? "Rental Arbitrage" : "Investment";
      const subject = encodeURIComponent(`STR ${strategyLabel} Analysis - ${result.address}`);
      
      const returnsSection = analysisMode === "iownit"
        ? `STR vs LTR COMPARISON\n` +
          `• STR Monthly Net: $${Math.round(own.strMonthlyCashFlow).toLocaleString()}\n` +
          `• LTR Monthly Net (HUD FMR): $${Math.round(own.ltrMonthlyCashFlow).toLocaleString()}\n` +
          `• Monthly Difference: $${Math.round(own.monthlyDifference).toLocaleString()}\n` +
          `• Winner: ${own.strWins ? 'STR' : 'LTR'}\n`
        : analysisMode === "buying" 
        ? `INVESTMENT RETURNS\n` +
          `• Cash-on-Cash Return: ${inv.cashOnCashReturn.toFixed(1)}%\n` +
          `• Annual Cash Flow: $${inv.cashFlow.toLocaleString()}\n` +
          `• Total Cash Required: $${inv.totalCashNeeded.toLocaleString()}\n`
        : `ARBITRAGE RETURNS\n` +
          `• Monthly Rent: $${parseFloat(monthlyRent).toLocaleString()}\n` +
          `• Cash-on-Cash Return: ${arb.cashOnCashReturn.toFixed(1)}%\n` +
          `• Annual Cash Flow: $${arb.cashFlow.toLocaleString()}\n` +
          `• Total Cash to Start: $${arb.totalCashNeeded.toLocaleString()}\n`;
      
      const body = encodeURIComponent(
        `Hi,\n\n` +
        `I wanted to share this STR ${strategyLabel.toLowerCase()} analysis with you.\n\n` +
        `────────────────────────────────\n` +
        `PROPERTY: ${result.address}\n` +
        `${bedrooms || result.bedrooms} BR / ${bathrooms || result.bathrooms} BA / Sleeps ${guestCount || (bedrooms || 3) * 2}\n` +
        `Strategy: ${strategyLabel}\n` +
        `────────────────────────────────\n\n` +
        `PROJECTED REVENUE\n` +
        `• Annual Revenue: $${displayRevenue.toLocaleString()}\n` +
        `• Monthly Average: $${Math.round(displayRevenue / 12).toLocaleString()}\n\n` +
        returnsSection + `\n` +
        `────────────────────────────────\n\n` +
        `📎 Please see the attached PDF for the full detailed analysis including:\n` +
        `• Monthly revenue forecast with seasonality\n` +
        `• Comparable properties in the area\n` +
        `• Recommended amenities for top performance\n` +
        `• ${analysisMode === "arbitrage" ? "Payback timeline" : "10-year investment projection"}\n\n` +
        `(The PDF should have just downloaded - please attach it to this email)\n\n` +
        `────────────────────────────────\n` +
        `Generated by Edge by Teeco\n` +
        `edge.teeco.co`
      );
      
      window.open(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
      setShowEmailModal(false);
      setEmailAddress("");
    } catch (err) {
      console.error("Email error:", err);
      alert("Failed to send email. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  // Address autocomplete with debounce — only runs when user is actively typing
  useEffect(() => {
    // Only fetch suggestions when the user typed into the input field.
    // Programmatic setAddress calls (URL params, auth restore, analysis result,
    // suggestion selection) do NOT set userIsTypingRef, so they are skipped.
    if (!userIsTypingRef.current) return;
    userIsTypingRef.current = false;

    const debounceTimer = setTimeout(async () => {
      if (address.length >= 3) {
        setIsLoadingSuggestions(true);
        try {
          const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
          const data = await response.json();
          if (data.suggestions) {
            setSuggestions(data.suggestions);
            setShowSuggestions(true);
          }
        } catch (e) {
          console.error("Geocode error:", e);
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [address]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    // Do NOT set userIsTypingRef — this prevents the useEffect from re-fetching
    setAddress(suggestion.display);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Check if form is valid for analysis
  const canAnalyze = address.trim().length > 0;

  // ========== LOCAL RE-FILTER (no API call) ==========
  // When user changes bedrooms/bathrooms/guests but NOT the address,
  // re-filter the stored allComps locally instead of burning an API credit.
  // Auto-refilter triggered by bedroom/bath/guest button taps
  // Takes explicit params because React state hasn't updated yet in the same tick
  const handleLocalRefilterAuto = (newBedrooms?: number | null, newBathrooms?: number | null, newGuests?: number | null) => {
    const br = newBedrooms ?? bedrooms ?? 3;
    const ba = newBathrooms ?? bathrooms ?? 2;
    const gc = newGuests ?? guestCount ?? br * 2;
    
    if (allComps.length > 0 && targetCoords && result) {
      console.log(`[AutoRefilter] ${br}br/${ba}ba/${gc}guests from ${allComps.length} comps`);
      
      const filtered = refilterComps(
        allComps as Comp[],
        targetCoords.lat,
        targetCoords.lng,
        br,
        ba,
        gc,
      );
      
      const newPercentiles = {
        revenue: filtered.percentiles.revenue,
        adr: filtered.percentiles.adr,
        occupancy: filtered.percentiles.occupancy,
        listingsAnalyzed: filtered.filteredListings,
        totalListingsInArea: filtered.totalListings,
      };
      
      let annualRevenue = 0;
      if (filtered.percentiles.revenue.p50 > 0) {
        annualRevenue = filtered.percentiles.revenue.p50;
      } else if (filtered.avgAnnualRevenue > 0) {
        annualRevenue = filtered.avgAnnualRevenue;
      } else if (filtered.avgAdr > 0 && filtered.avgOccupancy > 0) {
        annualRevenue = Math.round(filtered.avgAdr * (filtered.avgOccupancy / 100) * 365);
      }
      
      const monthlyRevenue = Math.round(annualRevenue / 12);
      const revPAN = filtered.avgAdr > 0 && filtered.avgOccupancy > 0 
        ? Math.round(filtered.avgAdr * (filtered.avgOccupancy / 100)) : 0;
      
      setResult({
        ...result,
        annualRevenue,
        monthlyRevenue,
        adr: filtered.avgAdr,
        occupancy: filtered.avgOccupancy,
        revPAN,
        bedrooms: br,
        bathrooms: ba,
        percentiles: newPercentiles,
        comparables: filtered.comparables as ComparableListing[],
        nearbyListings: filtered.totalListings,
      });
      
      setExcludedCompIds(new Set());
      setUseCustomIncome(false);
      setCustomAnnualIncome("");
      
      console.log(`[AutoRefilter] Done: ${filtered.filteredListings} comps, ADR $${filtered.avgAdr}, Rev $${annualRevenue}/yr`);
    }
  };

  const handleLocalRefilter = () => {
    const currentAddress = address.trim();
    
    // If we have allComps and the address hasn't changed, re-filter locally
    if (allComps.length > 0 && targetCoords && lastAnalyzedAddress && 
        currentAddress.toLowerCase() === lastAnalyzedAddress.toLowerCase() && result) {
      console.log(`[Refilter] Local re-filter: ${bedrooms}br/${bathrooms}ba/${guestCount}guests from ${allComps.length} comps`);
      
      const filtered = refilterComps(
        allComps as Comp[],
        targetCoords.lat,
        targetCoords.lng,
        bedrooms ?? 3,
        bathrooms ?? 2,
        guestCount || (bedrooms ?? 3) * 2,
      );
      
      // Build updated percentiles
      const newPercentiles = {
        revenue: filtered.percentiles.revenue,
        adr: filtered.percentiles.adr,
        occupancy: filtered.percentiles.occupancy,
        listingsAnalyzed: filtered.filteredListings,
        totalListingsInArea: filtered.totalListings,
      };
      
      // Determine revenue from percentiles
      let annualRevenue = 0;
      if (filtered.percentiles.revenue.p50 > 0) {
        annualRevenue = filtered.percentiles.revenue.p50;
      } else if (filtered.avgAnnualRevenue > 0) {
        annualRevenue = filtered.avgAnnualRevenue;
      } else if (filtered.avgAdr > 0 && filtered.avgOccupancy > 0) {
        annualRevenue = Math.round(filtered.avgAdr * (filtered.avgOccupancy / 100) * 365);
      }
      
      const monthlyRevenue = Math.round(annualRevenue / 12);
      const revPAN = filtered.avgAdr > 0 && filtered.avgOccupancy > 0 
        ? Math.round(filtered.avgAdr * (filtered.avgOccupancy / 100)) : 0;
      
      // Update the result with re-filtered data
      setResult({
        ...result,
        annualRevenue,
        monthlyRevenue,
        adr: filtered.avgAdr,
        occupancy: filtered.avgOccupancy,
        revPAN,
        bedrooms: bedrooms ?? 3,
        bathrooms: bathrooms ?? 2,
        percentiles: newPercentiles,
        comparables: filtered.comparables as ComparableListing[],
        nearbyListings: filtered.totalListings,
      });
      
      // Reset excluded comps for new bedroom selection
      setExcludedCompIds(new Set());
      setUseCustomIncome(false);
      setCustomAnnualIncome("");
      
      console.log(`[Refilter] Done: ${filtered.filteredListings} comps, ADR $${filtered.avgAdr}, Rev $${annualRevenue}/yr`);
      return;
    }
    
    // Address changed or no allComps stored — fall back to full API call
    console.log(`[Refilter] Address changed or no cached comps, making API call`);
    handleAnalyze();
  };

  // Analyze address
  const handleAnalyze = async (searchAddress?: string) => {
    const addressToAnalyze = searchAddress || address;
    if (!addressToAnalyze.trim()) return;
    
    // Bedrooms/bathrooms default to 3/2 so they're always set

    setIsLoading(true);
    setLoadingStep("Checking cache...");
    setError(null);
    setShowSuggestions(false);

    try {
      // FAST PATH: Check server-side property_cache first (no credit used, ~200ms)
      // If the exact address was analyzed before, we can skip the expensive Apify scrape
      let data: any = null;
      try {
        const cacheCheck = await fetch(`/api/property-cache?address=${encodeURIComponent(addressToAnalyze)}`);
        const cacheData = await cacheCheck.json();
        if (cacheData?.success && cacheData?.cached && cacheData?.data) {
          const cachedResult = cacheData.data;
          if (cachedResult?.neighborhood) {
            console.log('[Analyze] INSTANT from property_cache');
            cachedResult.success = true;
            cachedResult.dataSource = cachedResult.dataSource || 'property_cache';
            
            // Always geocode the actual searched address for accurate map pin
            // NEVER reconstruct from comp coordinates — they could be from a different market
            let cacheTargetLat = cachedResult.targetCoordinates?.latitude || 0;
            let cacheTargetLng = cachedResult.targetCoordinates?.longitude || 0;
            if (!cacheTargetLat || !cacheTargetLng) {
              const geocoded = await geocodeAddress(addressToAnalyze);
              if (geocoded) {
                cacheTargetLat = geocoded.lat;
                cacheTargetLng = geocoded.lng;
                cachedResult.targetCoordinates = { latitude: cacheTargetLat, longitude: cacheTargetLng };
                console.log('[Analyze] Geocoded address for CompMap:', geocoded);
              }
            }
            
            // CRITICAL: Filter cached comps by distance from actual address
            // Old cache entries may contain distant comps from before bounding-box search
            const MAX_COMP_DIST_MI = 50;
            const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
              if (!lat2 || !lon2) return 999;
              const R = 3959;
              const dLat = ((lat2 - lat1) * Math.PI) / 180;
              const dLon = ((lon2 - lon1) * Math.PI) / 180;
              const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
              return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };
            if (cacheTargetLat && cacheTargetLng && cachedResult.comparables?.length) {
              const before = cachedResult.comparables.length;
              cachedResult.comparables = cachedResult.comparables.filter((c: any) => {
                if (!c.latitude || !c.longitude) return false;
                const d = haversine(cacheTargetLat, cacheTargetLng, c.latitude, c.longitude);
                c.distance = Math.round(d * 10) / 10;
                return d <= MAX_COMP_DIST_MI;
              });
              // Re-sort by relevance: bedroom match + distance
              const reqBr = bedrooms ?? 3;
              cachedResult.comparables.sort((a: any, b: any) => {
                const sA = Math.abs((a.bedrooms || reqBr) - reqBr) * 40 + Math.min(a.distance / 15, 1) * 25;
                const sB = Math.abs((b.bedrooms || reqBr) - reqBr) * 40 + Math.min(b.distance / 15, 1) * 25;
                return sA - sB;
              });
              cachedResult.comparables = cachedResult.comparables.slice(0, 30);
              console.log(`[Analyze] Distance-filtered cached comps: ${before} → ${cachedResult.comparables.length}`);
            }
            if (cacheTargetLat && cacheTargetLng && cachedResult.allComps?.length) {
              cachedResult.allComps = cachedResult.allComps.filter((c: any) => {
                if (!c.latitude || !c.longitude) return false;
                const d = haversine(cacheTargetLat, cacheTargetLng, c.latitude, c.longitude);
                c.distance = Math.round(d * 10) / 10;
                return d <= MAX_COMP_DIST_MI;
              });
            }
            
            data = cachedResult;
            setLoadingStep("Found cached data!");
          }
        }
      } catch {
        console.log('[Analyze] property_cache check failed, continuing to full API');
      }

      // If no cache hit, do the full API call
      if (!data) {
        setLoadingStep("Finding nearby Airbnb listings...");
        // Cycle through progress steps to show the user something is happening
        const steps = [
          { delay: 5000, text: "Scanning Airbnb listings in the area..." },
          { delay: 12000, text: "Analyzing nightly rates & occupancy..." },
          { delay: 20000, text: "Calculating revenue estimates..." },
          { delay: 35000, text: "Comparing with nearby properties..." },
          { delay: 55000, text: "Almost done, finalizing results..." },
          { delay: 90000, text: "Taking longer than usual, please wait..." },
        ];
        const stepTimers = steps.map(s => setTimeout(() => setLoadingStep(s.text), s.delay));
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240_000);

        let response: Response;
        try {
          response = await fetch("/api/mashvisor/property", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: addressToAnalyze, bedrooms, bathrooms, accommodates: guestCount || (bedrooms ?? 3) * 2 }),
            signal: controller.signal,
          });
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          stepTimers.forEach(t => clearTimeout(t));
          if (fetchErr?.name === 'AbortError') {
            setError("Analysis timed out. The server took too long to respond. Please try again — results are often cached after the first attempt.");
            setIsLoading(false);
            return;
          }
          throw fetchErr;
        }
        clearTimeout(timeoutId);
        stepTimers.forEach(t => clearTimeout(t));
        setLoadingStep("Processing results...");
        data = await response.json();
      }

      if (!data.success) {
        setError(data.error || data.message || "Could not find data for this address. Try a different address.");
        setIsLoading(false);
        return;
      }

      const { property, neighborhood, percentiles, comparables, historical, recommendedAmenities, targetCoordinates, allComps: rawAllComps } = data;
      // Note: rawAllComps = full unfiltered comp set for local bedroom re-filtering

      const parseNum = (val: unknown): number => {
        if (typeof val === "number") return val;
        if (typeof val === "string") return parseFloat(val) || 0;
        return 0;
      };

      // Get REAL data from Apify comps - STR only
      const avgAdr = parseNum(neighborhood?.adr);
      const avgOccupancy = parseNum(neighborhood?.occupancy);
      
      // Use percentile data if available (already filtered by bedroom count)
      // NOTE: percentiles.revenue values are ALREADY ANNUAL (calculated from monthly * 12 in API)
      let annualRevenue: number;
      let monthlyRevenue: number;
      
      if (percentiles?.revenue?.p50 > 0) {
        // p50 is ALREADY annual revenue - don&apos;t multiply by 12 again!
        annualRevenue = percentiles.revenue.p50;
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else if (parseNum(neighborhood?.annualRevenue) > 0) {
        // Use neighborhood annual revenue directly
        annualRevenue = parseNum(neighborhood?.annualRevenue);
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else if (parseNum(neighborhood?.monthlyRevenue) > 0) {
        // Fallback to neighborhood monthly revenue
        monthlyRevenue = parseNum(neighborhood?.monthlyRevenue);
        annualRevenue = monthlyRevenue * 12;
      } else if (avgAdr > 0 && avgOccupancy > 0) {
        // Calculate from ADR and occupancy (no bedroom multiplier - data should already be bedroom-specific)
        annualRevenue = Math.round(avgAdr * (avgOccupancy / 100) * 365);
        monthlyRevenue = Math.round(annualRevenue / 12);
      } else {
        annualRevenue = 0;
        monthlyRevenue = 0;
      }
      
      const revPAN = avgAdr > 0 && avgOccupancy > 0 ? Math.round(avgAdr * (avgOccupancy / 100)) : 0;
      const sqft = parseNum(property?.sqft);

      const analysisResult: AnalysisResult = {
        address: addressToAnalyze,
        city: property?.city || neighborhood?.city || "",
        state: property?.state || neighborhood?.state || "",
        neighborhood: neighborhood?.name || "Unknown",
        annualRevenue,
        monthlyRevenue,
        adr: Math.round(avgAdr),
        occupancy: Math.round(avgOccupancy),
        revPAN,
        bedrooms: bedrooms ?? 3,
        bathrooms: bathrooms ?? 2,
        sqft: sqft,
        propertyType: property?.propertyType || "house",
        listPrice: parseNum(property?.listPrice) || parseNum(property?.lastSalePrice) || parseNum(neighborhood?.medianPrice),
        nearbyListings: parseNum(neighborhood?.listingsCount),
        percentiles: percentiles || null,
        comparables: comparables || [],
        revenueChange: neighborhood?.revenueChange || "stable",
        revenueChangePercent: parseNum(neighborhood?.revenueChangePercent),
        occupancyChange: neighborhood?.occupancyChange || "stable",
        occupancyChangePercent: parseNum(neighborhood?.occupancyChangePercent),
        historical: historical || [],
        recommendedAmenities: recommendedAmenities || [],
        targetCoordinates: targetCoordinates || undefined,
        marketType: (data.marketType as string) || undefined,
        dataSource: ((data as any).dataSource as string) || undefined,
      };
      setResult(analysisResult);
      setAddress(addressToAnalyze);;
      
      // Store full comp set for local bedroom re-filtering (no new API call needed)
      if (rawAllComps && Array.isArray(rawAllComps) && rawAllComps.length > 0) {
        setAllComps(rawAllComps as ComparableListing[]);
      } else {
        // Fallback: use the filtered comparables as allComps
        setAllComps(comparables || []);
      }
      setLastAnalyzedAddress(addressToAnalyze);
      if (targetCoordinates && targetCoordinates.latitude !== 0 && targetCoordinates.longitude !== 0) {
        setTargetCoords({ lat: targetCoordinates.latitude, lng: targetCoordinates.longitude });
      } else {
        // Always geocode the actual address as fallback — never rely on comp coordinates
        geocodeAddress(addressToAnalyze).then(coords => {
          if (coords) {
            console.log('[Fresh Analysis] Geocoded address for CompMap:', coords);
            setTargetCoords(coords);
            setResult(prev => prev ? { ...prev, targetCoordinates: { latitude: coords.lat, longitude: coords.lng } } : prev);
          }
        });
      }
      
      // ========== MARKET MISMATCH DETECTION ==========
      // Extract city from the searched address
      const addressParts = addressToAnalyze.split(',').map(p => p.trim());
      // Typically: "123 Main St", "City", "State ZIP" or "123 Main St, City, State"
      let searchedCity = '';
      if (addressParts.length >= 2) {
        // Second part is usually the city
        searchedCity = addressParts[1].toLowerCase().replace(/[^a-z\s]/g, '').trim();
      }
      
      const returnedCity = (analysisResult.city || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
      const returnedNeighborhood = (analysisResult.neighborhood || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
      
      // Check if there's a mismatch (city in address doesn't match API's city or neighborhood)
      const cityMatches = searchedCity && (
        returnedCity.includes(searchedCity) || 
        searchedCity.includes(returnedCity) ||
        returnedNeighborhood.includes(searchedCity) ||
        searchedCity.includes(returnedNeighborhood)
      );
      
      if (searchedCity && !cityMatches && returnedCity) {
        console.log(`[Mismatch] Searched: "${searchedCity}" but API returned: "${returnedCity}" / "${returnedNeighborhood}"`);
        
        // Set mismatch state to show persistent warning banner
        // Note: No auto-refund since user was warned and chose to proceed
        setMarketMismatch({
          searched: addressParts.slice(1).join(', '), // City, State part
          returned: `${analysisResult.city || analysisResult.neighborhood}, ${analysisResult.state}`,
          creditRefunded: false, // User made informed choice, no refund
        });
        
        // Add to GLOBAL limited data locations database (warns all future users)
        try {
          const searchedState = addressParts.length >= 3 
            ? addressParts[2].replace(/[^a-zA-Z]/g, '').trim().substring(0, 2).toUpperCase()
            : analysisResult.state;
          
          await fetch('/api/limited-data-locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add',
              city: searchedCity,
              state: searchedState,
              searchedAddress: addressToAnalyze,
              nearestMarketCity: analysisResult.city || analysisResult.neighborhood,
              nearestMarketState: analysisResult.state,
              // Distance could be calculated if we had coordinates
            }),
          });
          console.log('[LimitedData] Added to global limited data locations');
        } catch (globalErr) {
          console.error('[LimitedData] Failed to add to global list:', globalErr);
        }
      } else {
        // No mismatch - clear any previous mismatch state
        setMarketMismatch(null);
      }
      // ========== END MISMATCH DETECTION ==========
      
      // Auto-fill purchase price if available
      if (analysisResult.listPrice > 0 && !purchasePrice) {
        setPurchasePrice(analysisResult.listPrice.toString());
      }
      
      // Auto-set sqft for design/setup cost calculations
      if (sqft > 0) {
        setPropertySqft(sqft);
        setFurnishingsCost(Math.round(sqft * 15));
      }
      
      setUseCustomIncome(false);
      setCustomAnnualIncome("");

      saveRecentSearch({
        address: addressToAnalyze,
        annualRevenue,
        adr: Math.round(avgAdr),
        occupancy: Math.round(avgOccupancy),
        timestamp: Date.now(),
        // Cache full result for instant recall
        cachedResult: analysisResult,
        cachedBedrooms: bedrooms ?? 3,
        cachedBathrooms: bathrooms ?? 2,
        cachedGuestCount: guestCount || (bedrooms ?? 3) * 2,
      });
      
      // Cache the API response in Supabase (90-day TTL)
      // Skip if data already came from cache (no need to re-save)
      if ((data as any).dataSource !== 'property_cache') {
        try {
          // Ensure targetCoordinates is always saved — geocode if missing, NEVER use comp coords
          let coordsToSave = targetCoordinates;
          if (!coordsToSave || coordsToSave.latitude === 0 || coordsToSave.longitude === 0) {
            // Use the already-resolved targetCoords state (from geocode) if available
            if (targetCoords && targetCoords.lat !== 0 && targetCoords.lng !== 0) {
              coordsToSave = { latitude: targetCoords.lat, longitude: targetCoords.lng };
              console.log('[Cache] Using geocoded targetCoords for cache:', coordsToSave);
            }
          }
          
          await fetch('/api/property-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: addressToAnalyze,
              data: { property, neighborhood, percentiles, comparables, historical, recommendedAmenities, targetCoordinates: coordsToSave || null, allComps: rawAllComps },
            }),
          });
          console.log("[Cache] Stored API response for 90 days");
        } catch (cacheError) {
          console.error("[Cache] Failed to cache:", cacheError);
        }
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Failed to analyze address. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate and download PDF report
  const downloadPDFReport = async () => {
    if (!result) return;
    
    const investment = calculateInvestment();
    const displayRevenue = getDisplayRevenue();
    const guestMultiplier = getGuestCountMultiplier();
    const guestBonus = Math.round((guestMultiplier - 1) * 100);
    const baselineGuests = (bedrooms || 3) * 2;
    
    // Get seasonal data from the same function used in UI
    const seasonalData = getSeasonalityData();
    const baseMonthlyRev = displayRevenue / 12;
    
    // Calculate monthly revenues with seasonal variation - SAME LOGIC AS UI
    const monthlyRevenues = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
      const monthData = seasonalData[index];
      let monthlyRev = 0;
      
      if (monthData?.revenue && monthData.revenue > 0) {
        // Use actual historical revenue with guest multiplier
        monthlyRev = Math.round(monthData.revenue * guestMultiplier);
      } else if (monthData?.occupancy) {
        // Calculate from occupancy variation
        const baseOccupancy = result.occupancy || 55;
        const seasonalMultiplier = baseOccupancy > 0 ? (monthData.occupancy / baseOccupancy) : 1;
        monthlyRev = Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
      } else {
        // Fallback to base monthly
        monthlyRev = Math.round(baseMonthlyRev);
      }
      
      return { month, revenue: monthlyRev || Math.round(baseMonthlyRev) };
    });
    
    // Find peak and low months
    const sortedMonths = [...monthlyRevenues].sort((a, b) => b.revenue - a.revenue);
    const peakMonth = sortedMonths[0];
    const lowMonth = sortedMonths[sortedMonths.length - 1];
    
    // Create a printable HTML document - Premium Teeco Investment Report
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>${analysisMode === 'iownit' ? 'I Own It (STR vs LTR)' : analysisMode === 'arbitrage' ? 'Airbnb Arbitrage' : 'Investment'} Analysis - ${result.address || result.neighborhood}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #2b2823; line-height: 1.6; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px; }
    
    /* Premium Header */
    .header { text-align: center; padding-bottom: 32px; margin-bottom: 32px; border-bottom: 1px solid #e5e3da; }
    .logo-container { margin-bottom: 24px; }
    .logo { height: 48px; }
    .property-title { font-size: 32px; font-weight: 700; color: #2b2823; margin-bottom: 12px; letter-spacing: -0.5px; }
    .property-details { font-size: 15px; color: #787060; font-weight: 500; }
    .property-details span { margin: 0 12px; }
    
    /* Executive Summary - Premium Card */
    .executive-summary { background: #2b2823; border-radius: 20px; padding: 40px; margin-bottom: 32px; color: white; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; text-align: center; }
    .summary-item { }
    .summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.6); margin-bottom: 8px; font-weight: 500; }
    .summary-value { font-size: 32px; font-weight: 700; color: #22c55e; }
    .summary-subtext { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 6px; }
    
    /* Section Headers */
    h2 { font-size: 16px; font-weight: 600; color: #2b2823; margin: 36px 0 16px 0; padding-bottom: 10px; border-bottom: 1px solid #e5e3da; text-transform: uppercase; letter-spacing: 1px; }
    h2 .badge { font-size: 10px; background: #22c55e; color: white; padding: 3px 10px; border-radius: 20px; margin-left: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    
    /* Investment Highlights */
    .highlights { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .highlight-card { background: #f5f4f0; border-radius: 16px; padding: 24px 16px; text-align: center; }
    .highlight-card.positive { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
    .highlight-card.accent { background: #2b2823; }
    .highlight-card.accent .highlight-value { color: #22c55e; }
    .highlight-card.accent .highlight-label { color: rgba(255,255,255,0.6); }
    .strategy-badge { display: inline-block; background: #2b2823; color: #fff; padding: 6px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px; }
    .highlight-value { font-size: 28px; font-weight: 700; color: #2b2823; margin-bottom: 4px; }
    .highlight-label { font-size: 10px; color: #787060; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }
    
    /* Tables */
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .table td { padding: 16px 20px; border-bottom: 1px solid #e5e3da; font-size: 14px; }
    .table tr:last-child td { border-bottom: none; }
    .table .total { background: #f5f4f0; font-weight: 600; }
    .table .positive { color: #16a34a; font-weight: 600; }
    .table .negative { color: #dc2626; }
    .table .right { text-align: right; font-weight: 500; }
    
    /* Monthly Revenue Grid - Premium */
    .monthly-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin: 20px 0; }
    .month-card { background: #f5f4f0; border-radius: 12px; padding: 16px 10px; text-align: center; transition: all 0.2s; }
    .month-card.peak { background: #2b2823; color: white; }
    .month-card.peak .month-name { color: rgba(255,255,255,0.6); }
    .month-card.peak .month-value { color: #22c55e; }
    .month-card.low { background: #fef3c7; }
    .month-name { font-size: 10px; color: #787060; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }
    .month-value { font-size: 15px; font-weight: 700; color: #2b2823; margin-top: 6px; }
    
    /* Comps */
    .comp-card { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #e5e3da; }
    .comp-card:last-child { border-bottom: none; }
    .comp-info { flex: 1; }
    .comp-name { font-weight: 600; color: #2b2823; font-size: 14px; }
    .comp-details { font-size: 12px; color: #787060; margin-top: 4px; }
    .comp-revenue { text-align: right; }
    .comp-revenue-value { font-weight: 700; color: #2b2823; font-size: 16px; }
    .comp-revenue-details { font-size: 11px; color: #787060; }
    
    /* Amenities */
    .amenity-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .amenity-item { display: flex; align-items: center; padding: 14px 16px; background: #f5f4f0; border-radius: 12px; }
    .amenity-item.must-have { background: #2b2823; color: white; }
    .amenity-item.must-have .amenity-name { color: white; }
    .amenity-item.must-have .amenity-boost { color: #22c55e; }
    .amenity-item.high-impact { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); }
    .amenity-name { flex: 1; font-weight: 500; font-size: 14px; color: #2b2823; }
    .amenity-boost { font-weight: 700; color: #16a34a; font-size: 14px; }
    
    /* ROI Timeline */
    .roi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 16px 0; }
    .roi-year { background: #f5f4f0; border-radius: 10px; padding: 14px 8px; text-align: center; }
    .roi-year.highlight { background: #2b2823; color: white; }
    .roi-year.highlight .roi-label { color: rgba(255,255,255,0.6); }
    .roi-year.highlight .roi-value { color: #22c55e; }
    .roi-label { font-size: 10px; color: #787060; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
    .roi-value { font-size: 14px; font-weight: 700; color: #2b2823; margin-top: 4px; }
    
    /* Footer */
    .footer { margin-top: 48px; padding-top: 32px; border-top: 1px solid #e5e3da; text-align: center; }
    .footer-brand { font-size: 20px; font-weight: 700; color: #2b2823; margin-bottom: 4px; letter-spacing: -0.5px; }
    .footer-url { font-size: 14px; color: #2b2823; font-weight: 500; margin-bottom: 8px; }
    .footer-tagline { font-size: 13px; color: #787060; font-style: italic; margin-bottom: 16px; }
    .footer-text { font-size: 12px; color: #787060; }
    .disclaimer { font-size: 10px; color: #a0a0a0; margin-top: 20px; max-width: 550px; margin-left: auto; margin-right: auto; line-height: 1.5; }
    
    /* Print styles */
    @page {
      margin: 0.5in;
      size: letter;
    }
    @media print {
      body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-container">
        <img src="data:image/png;base64,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" style="height: 40px; width: auto;" alt="Teeco" />
      </div>
      ${analysisMode === 'arbitrage' ? '<div class="strategy-badge">&#128273; Airbnb Arbitrage Analysis</div>' : ''}
      <h1 class="property-title">${result.address || result.neighborhood}</h1>
      <p class="property-details">
        <span>${result.city}, ${result.state}</span> &bull; 
        <span>${result.bedrooms} Bed / ${result.bathrooms} Bath</span> &bull; 
        <span>Sleeps ${guestCount || baselineGuests}</span>
      </p>
      ${result.dataSource && result.dataSource.includes('pricelabs') ? '<div style="display:inline-block;margin-top:12px;padding:4px 14px;background:#0ea5e9;color:#fff;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.5px;">&#9989; PRICELABS DATA &bull; Powered by PriceLabs</div>' : result.dataSource ? '<div style="display:inline-block;margin-top:12px;padding:4px 14px;background:#94a3b8;color:#fff;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.5px;">AIRBNB DATA</div>' : ''}
    </div>
    
    <!-- Executive Summary -->
    <div class="executive-summary">
      <div class="summary-grid">
        <div class="summary-item">
          <p class="summary-label">Projected Annual Revenue</p>
          <p class="summary-value">${formatCurrency(displayRevenue)}</p>
          <p class="summary-subtext">${formatCurrency(Math.round(displayRevenue / 12))}/month average</p>
        </div>
        <div class="summary-item">
          <p class="summary-label">Monthly Cash Flow</p>
          <p class="summary-value">${formatCurrency(Math.round((analysisMode === 'arbitrage' ? arbitrage.cashFlow : investment.cashFlow) / 12))}</p>
          <p class="summary-subtext">After all expenses</p>
        </div>
        <div class="summary-item">
          <p class="summary-label">Cash-on-Cash Return</p>
          <p class="summary-value">${(analysisMode === 'arbitrage' ? arbitrage.cashOnCashReturn : investment.cashOnCashReturn).toFixed(1)}%</p>
          <p class="summary-subtext">On total cash invested</p>
        </div>
      </div>
    </div>
    
    <!-- Investment Highlights -->
    <div class="highlights">
      <div class="highlight-card">
        <div class="highlight-value">${formatCurrency(result.adr)}</div>
        <div class="highlight-label">Avg Daily Rate</div>
      </div>
      <div class="highlight-card">
        <div class="highlight-value">${result.occupancy}%</div>
        <div class="highlight-label">Occupancy Rate</div>
      </div>
      <div class="highlight-card positive">
        <div class="highlight-value">${formatCurrency(analysisMode === 'arbitrage' ? arbitrage.totalCashNeeded : investment.totalCashNeeded)}</div>
        <div class="highlight-label">${analysisMode === 'arbitrage' ? 'Total Cash to Start' : 'Total Cash Required'}</div>
      </div>
      <div class="highlight-card accent">
        <div class="highlight-value">${analysisMode === 'arbitrage' ? `${Math.ceil(arbitrage.totalCashNeeded / Math.max(arbitrage.cashFlow / 12, 1))} mo` : formatCurrency(peakMonth.revenue)}</div>
        <div class="highlight-label">${analysisMode === 'arbitrage' ? 'Payback Period' : `Peak Month (${peakMonth.month})`}</div>
      </div>
    </div>
    
    <!-- Investment / Arbitrage Analysis -->
    ${analysisMode === "buying" && purchasePrice ? `
    <h2>Investment Analysis (Buying to Own)</h2>
    <table class="table">
      <tr><td>Purchase Price</td><td class="right">${formatCurrency(parseFloat(purchasePrice))}</td></tr>
      <tr><td>Down Payment (${downPaymentPercent}%)</td><td class="right">${formatCurrency(investment.downPayment)}</td></tr>
      <tr><td>Loan Amount (${loanTerm}yr @ ${interestRate}%)</td><td class="right">${formatCurrency(investment.loanAmount)}</td></tr>
      <tr><td>Monthly Mortgage (P&I)</td><td class="right">${formatCurrency(investment.monthlyMortgage)}</td></tr>
      <tr class="total"><td>Total Cash Required</td><td class="right">${formatCurrency(investment.totalCashNeeded)}</td></tr>
    </table>
    
    <h2>Annual Expense Breakdown</h2>
    <table class="table">
      <tr><td>Mortgage (P&I)</td><td class="right">${formatCurrency(investment.monthlyMortgage * 12)}</td></tr>
      <tr><td>Property Tax (${propertyTaxRate}%)</td><td class="right">${formatCurrency(investment.annualPropertyTax)}</td></tr>
      <tr><td>STR Insurance</td><td class="right">${formatCurrency(investment.annualInsurance)}</td></tr>
      <tr><td>Management Fee (${managementFeePercent}%)</td><td class="right">${formatCurrency(investment.annualManagement)}</td></tr>
      <tr><td>Platform Fee (${platformFeePercent}%)</td><td class="right">${formatCurrency(investment.annualPlatformFee)}</td></tr>
      <tr><td>Operating Expenses</td><td class="right">${formatCurrency(investment.monthlyOperating * 12)}</td></tr>
      <tr class="total"><td>Total Annual Expenses</td><td class="right negative">${formatCurrency(investment.totalAnnualExpenses)}</td></tr>
      <tr class="total"><td>Gross Revenue</td><td class="right positive">${formatCurrency(displayRevenue)}</td></tr>
      <tr class="total"><td><strong>Net Annual Cash Flow</strong></td><td class="right ${investment.cashFlow >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(investment.cashFlow)}</strong></td></tr>
    </table>
    ` : ''}
    ${analysisMode === "arbitrage" && monthlyRent ? `
    <h2>Arbitrage Analysis (Rental Arbitrage)</h2>
    <table class="table">
      <tr><td>Monthly Rent to Landlord</td><td class="right">${formatCurrency(parseFloat(monthlyRent))}</td></tr>
      <tr><td>Security Deposit</td><td class="right">${formatCurrency(arbitrage.securityDepositAmount)}</td></tr>
      <tr><td>${firstLastMonth ? 'First + Last Month Rent' : 'First Month Rent'}</td><td class="right">${formatCurrency(arbitrage.firstLastMonthCost)}</td></tr>
      <tr><td>Startup Costs</td><td class="right">${formatCurrency(arbitrage.startupCosts)}</td></tr>
      <tr class="total"><td>Total Cash to Get Started</td><td class="right">${formatCurrency(arbitrage.totalCashNeeded)}</td></tr>
    </table>
    
    <h2>Annual Expense Breakdown</h2>
    <table class="table">
      <tr><td>Rent to Landlord</td><td class="right">${formatCurrency(arbitrage.annualRent)}</td></tr>
      <tr><td>Management Fee (${managementFeePercent}%)</td><td class="right">${formatCurrency(arbitrage.annualManagement)}</td></tr>
      <tr><td>Platform Fee (${platformFeePercent}%)</td><td class="right">${formatCurrency(arbitrage.annualPlatformFee)}</td></tr>
      <tr><td>Liability Insurance</td><td class="right">${formatCurrency(arbitrage.annualInsurance)}</td></tr>
      <tr><td>Operating Expenses</td><td class="right">${formatCurrency(arbitrage.monthlyOperating * 12)}</td></tr>
      <tr class="total"><td>Total Annual Expenses</td><td class="right negative">${formatCurrency(arbitrage.totalAnnualExpenses)}</td></tr>
      <tr class="total"><td>Gross Revenue</td><td class="right positive">${formatCurrency(displayRevenue)}</td></tr>
      <tr class="total"><td><strong>Net Annual Cash Flow</strong></td><td class="right ${arbitrage.cashFlow >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(arbitrage.cashFlow)}</strong></td></tr>
    </table>
    ` : ''}
    ${analysisMode === "iownit" && hudFmrData ? `
    <h2>I Own It Analysis (STR vs LTR)</h2>
    <table class="table">
      <tr><td>Monthly Mortgage</td><td class="right">${iownitMortgage ? formatCurrency(parseFloat(iownitMortgage)) : 'Paid off'}</td></tr>
      <tr><td>HUD Fair Market Rent (${bedrooms || 3}BR)</td><td class="right">${formatCurrency(iownit.fmrMonthly)}/mo</td></tr>
    </table>
    <h2>STR Income</h2>
    <table class="table">
      <tr><td>Gross Revenue</td><td class="right positive">${formatCurrency(iownit.grossRevenue)}</td></tr>
      ${iownit.annualMortgage > 0 ? `<tr><td>Mortgage</td><td class="right">${formatCurrency(iownit.annualMortgage)}</td></tr>` : ''}
      <tr><td>STR Insurance</td><td class="right">${formatCurrency(iownit.annualInsurance)}</td></tr>
      <tr><td>Management (${managementFeePercent}%)</td><td class="right">${formatCurrency(iownit.annualManagement)}</td></tr>
      <tr><td>Platform Fee (${platformFeePercent}%)</td><td class="right">${formatCurrency(iownit.annualPlatformFee)}</td></tr>
      <tr><td>Operating Expenses</td><td class="right">${formatCurrency(iownit.monthlyOperating * 12)}</td></tr>
      <tr class="total"><td><strong>STR Net Cash Flow</strong></td><td class="right ${iownit.strCashFlow >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(iownit.strCashFlow)}</strong></td></tr>
    </table>
    <h2>LTR Income (HUD Fair Market Rent)</h2>
    <table class="table">
      <tr><td>Gross Rent (${bedrooms || 3}BR FMR)</td><td class="right positive">${formatCurrency(iownit.ltrGrossAnnual)}</td></tr>
      ${iownit.annualMortgage > 0 ? `<tr><td>Mortgage</td><td class="right">${formatCurrency(iownit.annualMortgage)}</td></tr>` : ''}
      <tr><td>Landlord Insurance</td><td class="right">${formatCurrency(iownit.ltrInsurance)}</td></tr>
      <tr><td>Vacancy (5%)</td><td class="right">${formatCurrency(iownit.ltrVacancy)}</td></tr>
      <tr><td>Management (8%)</td><td class="right">${formatCurrency(iownit.ltrManagement)}</td></tr>
      <tr><td>Maintenance (5%)</td><td class="right">${formatCurrency(iownit.ltrMaintenance)}</td></tr>
      <tr class="total"><td><strong>LTR Net Cash Flow</strong></td><td class="right ${iownit.ltrCashFlow >= 0 ? 'positive' : 'negative'}"><strong>${formatCurrency(iownit.ltrCashFlow)}</strong></td></tr>
    </table>
    <div style="background: ${iownit.strWins ? '#ecfdf5' : '#eff6ff'}; padding: 16px; border-radius: 12px; text-align: center; margin: 16px 0;">
      <p style="font-size: 18px; font-weight: bold; color: ${iownit.strWins ? '#16a34a' : '#2563eb'};">${iownit.strWins ? '🚀 STR wins' : '🏢 LTR wins'} by ${formatCurrency(Math.abs(iownit.monthlyDifference))}/mo</p>
      <p style="font-size: 12px; color: #666; margin-top: 4px;">That's ${formatCurrency(Math.abs(iownit.annualDifference))} more per year</p>
    </div>
    ` : ''}
    
    <!-- Monthly Revenue Forecast -->
    <h2>Monthly Revenue Forecast <span class="badge">Seasonal</span></h2>
    <div class="monthly-grid">
      ${monthlyRevenues.map(m => {
        const isPeak = m.revenue === peakMonth.revenue;
        const isLow = m.revenue === lowMonth.revenue;
        return `<div class="month-card ${isPeak ? 'peak' : isLow ? 'low' : ''}">
          <div class="month-name">${m.month}</div>
          <div class="month-value">${formatCurrency(m.revenue)}</div>
        </div>`;
      }).join('')}
    </div>
    <p style="font-size: 12px; color: #666; text-align: center; margin-top: 8px;"><span style="color:#22c55e;">&#9679;</span> Peak Season &nbsp; <span style="color:#eab308;">&#9679;</span> Low Season &nbsp; Annual Total: <strong>${formatCurrency(monthlyRevenues.reduce((sum, m) => sum + m.revenue, 0))}</strong></p>
    
    <!-- Nearby Airbnb Listings -->
    ${result.comparables && result.comparables.length > 0 ? `
    <h2>Nearby Airbnb Listings</h2>
    <p style="font-size: 11px; color: #666; margin-bottom: 8px;">These are sample active Airbnb listings near this address, shown for reference. Revenue estimates above are based on a larger dataset.</p>
    <div>
      ${result.comparables.slice(0, 5).map(c => `
      <div class="comp-card">
        <div class="comp-info">
          <div class="comp-name">${c.name.substring(0, 45)}${c.name.length > 45 ? '...' : ''}</div>
          <div class="comp-details">${c.bedrooms} bed &bull; ${c.bathrooms || '-'} bath &bull; &#9733; ${c.rating || '-'}</div>
        </div>
        <div class="comp-revenue">
          <div class="comp-revenue-value">${formatCurrency(c.annualRevenue)}/yr</div>
          <div class="comp-revenue-details">${formatCurrency(c.nightPrice)}/night &bull; ${c.occupancy}% occ</div>
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Recommended Amenities -->
    ${result.recommendedAmenities && result.recommendedAmenities.length > 0 ? `
    <h2>Upgrades to Reach 90th Percentile</h2>
    <p style="font-size: 12px; color: #666; margin-bottom: 12px;">Based on 25-mile market analysis of top-performing Airbnbs</p>
    <div class="amenity-grid">
      ${result.recommendedAmenities.slice(0, 6).map(a => `
      <div class="amenity-item ${a.priority === 'MUST HAVE' ? 'must-have' : a.priority === 'HIGH IMPACT' ? 'high-impact' : ''}">
        <span class="amenity-name">${a.name}</span>
        <span class="amenity-boost">+${a.boost}%</span>
      </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- Startup Costs -->
    ${investment.startupCosts > 0 ? `
    <h2>Startup Investment</h2>
    <table class="table">
      ${includeDesignServices ? `<tr><td>Teeco Design Services</td><td class="right">${formatCurrency(calculateDesignCost())}</td></tr>` : ''}
      ${includeSetupServices ? `<tr><td>Teeco Setup Services</td><td class="right">${formatCurrency(calculateSetupCost())}</td></tr>` : ''}
      ${includeFurnishings ? `<tr><td>Furnishings & Decor</td><td class="right">${formatCurrency(furnishingsCost)}</td></tr>` : ''}
      ${includeAmenities ? `<tr><td>Upgrades & Amenities</td><td class="right">${formatCurrency(amenitiesCost)}</td></tr>` : ''}
      <tr class="total"><td><strong>Total Startup Investment</strong></td><td class="right"><strong>${formatCurrency(investment.startupCosts)}</strong></td></tr>
    </table>
    ` : ''}
    
    <!-- 10-Year Investment Projection (Buying only) / Payback Timeline (Arbitrage) -->
    ${analysisMode === "arbitrage" && monthlyRent ? `
    <h2>Payback Timeline</h2>
    <table class="table">
      <tr><td>Monthly Cash Flow</td><td class="right" style="color: ${arbitrage.monthlyCashFlow >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(arbitrage.monthlyCashFlow)}</td></tr>
      <tr><td>Payback Period</td><td class="right">${arbitrage.monthlyCashFlow > 0 ? Math.ceil(arbitrage.totalCashNeeded / arbitrage.monthlyCashFlow) + ' months' : 'N/A'}</td></tr>
      <tr><td>Year 1 Profit</td><td class="right" style="color: ${arbitrage.cashFlow >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(arbitrage.cashFlow)}</td></tr>
      <tr class="total"><td><strong>Year 2 Profit (no startup costs)</strong></td><td class="right" style="color: ${arbitrage.cashFlow >= 0 ? '#22c55e' : '#ef4444'};"><strong>${formatCurrency(arbitrage.cashFlow * 2 - arbitrage.totalCashNeeded)}</strong></td></tr>
    </table>
    ` : ''}
    ${analysisMode === "buying" && purchasePrice ? `
    <h2>10-Year Investment Projection</h2>
    <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; margin-bottom: 16px;">
      ${(() => {
        // Proper amortization for PDF
        const pdfPrice = parseFloat(purchasePrice) || 0;
        const pdfLoan = pdfPrice - investment.downPayment;
        const pdfMonthlyR = interestRate / 100 / 12;
        let pdfBal = pdfLoan;
        let pdfTotalPrin = 0;
        const pdfCumPrincipal: number[] = [];
        for (let yr = 1; yr <= 10; yr++) {
          for (let m = 0; m < 12; m++) {
            if (pdfBal <= 0) break;
            const intPmt = pdfBal * pdfMonthlyR;
            const prinPmt = Math.min(investment.monthlyMortgage - intPmt, pdfBal);
            pdfTotalPrin += Math.max(0, prinPmt);
            pdfBal -= Math.max(0, prinPmt);
          }
          pdfCumPrincipal.push(pdfTotalPrin);
        }
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => {
          const annualCashFlow = investment.cashFlow;
          const cumulativeCashFlow = annualCashFlow * year;
          const principalPaid = pdfCumPrincipal[year - 1] || 0;
          const appreciation = pdfPrice * 0.03 * year;
          const totalReturn = cumulativeCashFlow + investment.downPayment + principalPaid + appreciation - investment.totalCashNeeded;
          return `<div style="text-align: center; padding: 8px; background: ${totalReturn >= 0 ? '#ecfdf5' : '#fef2f2'}; border-radius: 4px;">
            <div style="font-size: 10px; color: #666;">Year ${year}</div>
            <div style="font-size: 11px; font-weight: bold; color: ${totalReturn >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(totalReturn)}</div>
          </div>`;
        }).join('');
      })()}
    </div>
    ${(() => {
      const pdfPrice2 = parseFloat(purchasePrice) || 0;
      const pdfLoan2 = pdfPrice2 - investment.downPayment;
      const pdfMonthlyR2 = interestRate / 100 / 12;
      let pdfBal2 = pdfLoan2;
      let pdfTotalPrin2 = 0;
      for (let i = 0; i < 120; i++) {
        if (pdfBal2 <= 0) break;
        const intPmt = pdfBal2 * pdfMonthlyR2;
        const prinPmt = Math.min(investment.monthlyMortgage - intPmt, pdfBal2);
        pdfTotalPrin2 += Math.max(0, prinPmt);
        pdfBal2 -= Math.max(0, prinPmt);
      }
      const pdfAppreciation10 = pdfPrice2 * 0.03 * 10;
      const pdfEquity = investment.downPayment + pdfTotalPrin2 + pdfAppreciation10;
      const pdfTotalReturn = (investment.cashFlow * 10) + pdfEquity - investment.totalCashNeeded;
      return `<table class="table">
        <tr><td>10-Year Cumulative Cash Flow</td><td class="right" style="color: ${investment.cashFlow >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(investment.cashFlow * 10)}</td></tr>
        <tr><td>Estimated Equity Built (Principal + 3% Appreciation)</td><td class="right">${formatCurrency(pdfEquity)}</td></tr>
        <tr class="total"><td><strong>Total 10-Year Return</strong></td><td class="right" style="color: #22c55e;"><strong>${formatCurrency(pdfTotalReturn)}</strong></td></tr>
      </table>`;
    })()}
    <p style="font-size: 10px; color: #999; text-align: center; margin-top: 8px;">*Assumes 3% annual appreciation with proper amortization schedule</p>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">Edge by Teeco</div>
      <p class="footer-url">edge.teeco.co</p>
      <p class="footer-tagline">Your unfair advantage in STR investing</p>
      <p class="footer-text">Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p class="disclaimer">This analysis is for informational purposes only and should not be considered financial advice. Projections are based on market data and may vary based on property management, market conditions, and other factors. Always conduct your own due diligence before making investment decisions.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Open print dialog with the report
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.focus();
      // Auto-trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Calculate guest count multiplier based on industry data
  // Research shows ~5-8% revenue increase per additional guest capacity above baseline
  // Baseline: bedrooms * 2 guests (standard assumption)
  const getGuestCountMultiplier = () => {
    if (!bedrooms || !guestCount) return 1.0;
    
    const baselineGuests = bedrooms * 2; // Standard: 2 guests per bedroom
    const extraGuests = guestCount - baselineGuests;
    
    if (extraGuests <= 0) return 1.0; // No bonus if at or below baseline
    
    // Diminishing returns per extra guest above baseline:
    // Guest 1-2 above baseline: 6% each (bunk beds, easy wins)
    // Guest 3-4: 4% each (sleeper sofas, air mattresses)
    // Guest 5+: 2% each (diminishing marginal value)
    // Capped at 40% total bonus
    let bonus = 0;
    for (let i = 1; i <= extraGuests; i++) {
      if (i <= 2) bonus += 0.06;
      else if (i <= 4) bonus += 0.04;
      else bonus += 0.02;
    }
    return 1.0 + Math.min(bonus, 0.40);
  };

  // Teeco Strategy boost calculation
  // Based on industry data: professional design + smart capacity + premium amenities
  const getTeecoStrategyBoost = () => {
    if (!bedrooms) return { multiplier: 1.0, boostPercent: 0, standardGuests: 0, teecoGuests: 0, breakdown: [] };
    
    const breakdown: { label: string; boost: number }[] = [];
    let totalBoost = 0;
    
    // 1. Professional Design Premium: 15-20% ADR increase
    // Source: AirDNA reports professionally staged/designed listings earn 15-25% more
    // Conservative estimate: 15% base + 2% per bedroom (larger homes benefit more from design)
    const designBoost = Math.min(0.15 + (bedrooms - 1) * 0.02, 0.22);
    breakdown.push({ label: 'Professional interior design', boost: Math.round(designBoost * 100) });
    totalBoost += designBoost;
    
    // 2. Smart Capacity Maximization: bunk rooms, sleeper sofas, murphy beds
    // Teeco typically adds 2 guests per bedroom above standard (2 per BR)
    // Each extra guest = ~6% revenue boost (same as existing algorithm)
    const standardGuests = bedrooms * 2;
    const teecoGuests = Math.min(bedrooms * 3 + 2, 16); // Teeco optimizes to ~3 per BR + 2, max 16
    const extraGuests = teecoGuests - standardGuests;
    const capacityBoost = Math.min(extraGuests * 0.06, 0.50);
    if (capacityBoost > 0) {
      breakdown.push({ label: `Smart capacity (${teecoGuests} vs ${standardGuests} guests)`, boost: Math.round(capacityBoost * 100) });
      totalBoost += capacityBoost;
    }
    
    // 3. Premium Amenity Package: hot tub, game room, outdoor living
    // Industry data: hot tub +12-18%, game room +8-12%, fire pit +5-8%
    // Teeco standard package includes curated amenity selection
    const amenityBoost = 0.10; // Conservative 10% for standard amenity optimization
    breakdown.push({ label: 'Curated amenity package', boost: Math.round(amenityBoost * 100) });
    totalBoost += amenityBoost;
    
    // 4. Professional Photography & Listing Optimization: 5-10%
    const listingBoost = 0.07;
    breakdown.push({ label: 'Professional photography & listing', boost: Math.round(listingBoost * 100) });
    totalBoost += listingBoost;
    
    return {
      multiplier: 1.0 + totalBoost,
      boostPercent: Math.round(totalBoost * 100),
      standardGuests,
      teecoGuests,
      breakdown
    };
  };



  // Get display revenue based on percentile selection, custom income, and guest capacity
  const getDisplayRevenue = () => {
    if (useCustomIncome && customAnnualIncome) {
      return parseFloat(customAnnualIncome) || 0;
    }
    
    if (!result) return 0;
    
    const guestMultiplier = getGuestCountMultiplier();
    
    // Use real percentile data if available
    // NOTE: percentiles.revenue values are ALREADY ANNUAL (not monthly)
    if (result.percentiles?.revenue) {
      let baseRevenue = 0;
      switch (revenuePercentile) {
        case "75th":
          baseRevenue = result.percentiles.revenue.p75;
          break;
        case "90th":
          baseRevenue = result.percentiles.revenue.p90;
          break;
        default:
          baseRevenue = result.percentiles.revenue.p50;
      }
      return Math.round(baseRevenue * guestMultiplier);
    }
    
    // Fallback to calculated revenue (Airbnb-only data)
    let baseRevenue = result.annualRevenue;
    switch (revenuePercentile) {
      case "75th":
        baseRevenue = Math.round(result.annualRevenue * 1.25);
        break;
      case "90th":
        baseRevenue = Math.round(result.annualRevenue * 1.45);
        break;
    }
    return Math.round(baseRevenue * guestMultiplier);
  };

  // Get base revenue WITHOUT Teeco Strategy (for comparison display)
  const getBaseRevenue = () => {
    if (useCustomIncome && customAnnualIncome) {
      return parseFloat(customAnnualIncome) || 0;
    }
    if (!result) return 0;
    const guestMultiplier = getGuestCountMultiplier();
    if (result.percentiles?.revenue) {
      let baseRevenue = 0;
      switch (revenuePercentile) {
        case "75th": baseRevenue = result.percentiles.revenue.p75; break;
        case "90th": baseRevenue = result.percentiles.revenue.p90; break;
        default: baseRevenue = result.percentiles.revenue.p50;
      }
      return Math.round(baseRevenue * guestMultiplier);
    }
    let baseRevenue = result.annualRevenue;
    switch (revenuePercentile) {
      case "75th": baseRevenue = Math.round(result.annualRevenue * 1.25); break;
      case "90th": baseRevenue = Math.round(result.annualRevenue * 1.45); break;
    }
    return Math.round(baseRevenue * guestMultiplier);
  };

  // Calculate design cost ($7/sqft with optional 20% student discount)
  const calculateDesignCost = () => {
    const baseCost = propertySqft * 7;
    return studentDiscount ? Math.round(baseCost * 0.8) : baseCost;
  };

  // Calculate setup cost ($13/sqft with optional 20% student discount)
  const calculateSetupCost = () => {
    const baseCost = propertySqft * 13;
    return studentDiscount ? Math.round(baseCost * 0.8) : baseCost;
  };

  // Calculate default furnishings cost ($15/sqft)
  const getDefaultFurnishingsCost = () => {
    return Math.round(propertySqft * 15);
  };

  // Calculate startup costs (one-time)
  const calculateStartupCosts = () => {
    let total = 0;
    if (includeDesignServices) total += calculateDesignCost();
    if (includeSetupServices) total += calculateSetupCost();
    if (includeFurnishings) total += furnishingsCost;
    if (includeAmenities) total += amenitiesCost;
    return total;
  };

  // Calculate monthly operating expenses
  const calculateMonthlyExpenses = () => {
    const utilities = electricMonthly + waterMonthly + internetMonthly + trashMonthly;
    const propertyMaintenance = lawnCareMonthly + pestControlMonthly + maintenanceMonthly;
    const operations = houseSuppliesMonthly + suppliesConsumablesMonthly + rentalSoftwareMonthly;
    return utilities + propertyMaintenance + operations;
  };

  // Calculate arbitrage returns
  const calculateArbitrage = () => {
    const rent = parseFloat(monthlyRent) || 0;
    if (rent === 0) {
      return {
        needsRent: true,
        monthlyRent: 0,
        securityDepositAmount: 0,
        firstLastMonthCost: 0,
        totalUpfront: 0,
        annualRent: 0,
        annualManagement: 0,
        annualPlatformFee: 0,
        annualInsurance: 0,
        monthlyOperating: 0,
        totalAnnualExpenses: 0,
        cashFlow: 0,
        cashOnCashReturn: 0,
        monthlyCashFlow: 0,
        startupCosts: calculateStartupCosts(),
        totalCashNeeded: 0,
      };
    }

    const deposit = parseFloat(securityDeposit) || rent; // Default deposit = 1 month rent
    const firstLast = firstLastMonth ? rent * 2 : rent; // First + last or just first
    const totalUpfront = deposit + firstLast;
    
    const annualRent = rent * 12;
    const grossRevenue = getDisplayRevenue();
    const annualManagement = grossRevenue * (managementFeePercent / 100);
    const annualPlatformFee = grossRevenue * (platformFeePercent / 100);
    const annualInsurance = landlordInsuranceMonthly * 12;
    const monthlyOperating = calculateMonthlyExpenses();
    const annualOperating = monthlyOperating * 12;
    
    const totalAnnualExpenses = annualRent + annualManagement + annualPlatformFee + annualInsurance + annualOperating;
    const cashFlow = grossRevenue - totalAnnualExpenses;
    
    const startupCosts = calculateStartupCosts();
    const totalCashNeeded = totalUpfront + startupCosts;
    const cashOnCashReturn = totalCashNeeded > 0 ? (cashFlow / totalCashNeeded) * 100 : 0;

    return {
      needsRent: false,
      monthlyRent: rent,
      securityDepositAmount: deposit,
      firstLastMonthCost: firstLast,
      totalUpfront,
      annualRent,
      annualManagement,
      annualPlatformFee,
      annualInsurance,
      monthlyOperating,
      totalAnnualExpenses,
      cashFlow,
      cashOnCashReturn,
      monthlyCashFlow: cashFlow / 12,
      startupCosts,
      totalCashNeeded,
    };
  };

  // Calculate investment returns (Buying mode)
  const calculateInvestment = () => {
    const price = parseFloat(purchasePrice) || 0;
    if (price === 0) {
      return {
        needsPrice: true,
        downPayment: 0,
        loanAmount: 0,
        monthlyMortgage: 0,
        annualPropertyTax: 0,
        annualInsurance: 0,
        annualManagement: 0,
        annualPlatformFee: 0,
        annualMaintenance: 0,
        annualVacancy: 0,
        monthlyOperating: 0,
        totalAnnualExpenses: 0,
        netOperatingIncome: 0,
        cashFlow: 0,
        cashOnCashReturn: 0,
        monthlyCashFlow: 0,
        startupCosts: calculateStartupCosts(),
        totalCashNeeded: 0,
      };
    }

    const downPayment = price * (downPaymentPercent / 100);
    const loanAmount = price - downPayment;
    
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const monthlyMortgage = loanAmount > 0 ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : 0;
    
    const annualPropertyTax = price * (propertyTaxRate / 100);
    const annualInsurance = insuranceAnnual;
    const grossRevenue = getDisplayRevenue();
    const annualManagement = grossRevenue * (managementFeePercent / 100);
    const annualPlatformFee = grossRevenue * (platformFeePercent / 100);
    const annualMaintenance = grossRevenue * (maintenancePercent / 100);
    // Note: Vacancy is NOT added separately — occupancy rate already accounts for vacancy.
    // Adding a separate vacancy % would double-count it.
    const annualVacancy = 0;
    const monthlyOperating = calculateMonthlyExpenses();
    const annualOperating = monthlyOperating * 12;
    
    const totalAnnualExpenses = (monthlyMortgage * 12) + annualPropertyTax + annualInsurance + annualManagement + annualPlatformFee + annualMaintenance + annualOperating;
    const netOperatingIncome = grossRevenue - annualPropertyTax - annualInsurance - annualManagement - annualPlatformFee - annualMaintenance - annualOperating;
    const cashFlow = grossRevenue - totalAnnualExpenses;
    
    const startupCosts = calculateStartupCosts();
    const totalCashNeeded = downPayment + startupCosts;
    const cashOnCashReturn = totalCashNeeded > 0 ? (cashFlow / totalCashNeeded) * 100 : 0;

    return {
      needsPrice: false,
      downPayment,
      loanAmount,
      monthlyMortgage,
      annualPropertyTax,
      annualInsurance,
      annualManagement,
      annualPlatformFee,
      annualMaintenance,
      annualVacancy,
      monthlyOperating,
      totalAnnualExpenses,
      netOperatingIncome,
      cashFlow,
      cashOnCashReturn,
      monthlyCashFlow: cashFlow / 12,
      startupCosts,
      totalCashNeeded,
    };
  };

  // Calculate I Own It returns (homeowner converting to STR)
  const calculateIownit = () => {
    const grossRevenue = getDisplayRevenue();
    const mortgage = parseFloat(iownitMortgage) || 0;
    const annualMortgage = mortgage * 12;
    const annualPropertyTax = mortgage > 0 ? (mortgage * 12 * 10) * (iownitPropertyTaxRate / 100) : 0; // Rough estimate: mortgage * 10 ≈ home value
    const annualInsurance = iownitInsuranceAnnual;
    const annualManagement = grossRevenue * (managementFeePercent / 100);
    const annualPlatformFee = grossRevenue * (platformFeePercent / 100);
    const monthlyOperating = calculateMonthlyExpenses();
    const annualOperating = monthlyOperating * 12;
    const startupCosts = calculateStartupCosts();
    
    const totalAnnualExpenses = annualMortgage + annualPropertyTax + annualInsurance + annualManagement + annualPlatformFee + annualOperating;
    const strCashFlow = grossRevenue - totalAnnualExpenses;
    const strMonthlyCashFlow = strCashFlow / 12;
    
    // HUD FMR-based LTR comparison
    const br = bedrooms || 3;
    const fmrMonthly = hudFmrData?.byBedrooms?.[Math.min(br, 4)] || 0;
    const ltrGrossAnnual = fmrMonthly * 12;
    const ltrVacancy = ltrGrossAnnual * 0.05; // 5% vacancy
    const ltrManagement = ltrGrossAnnual * 0.08; // 8% management
    const ltrMaintenance = ltrGrossAnnual * 0.05; // 5% maintenance
    const ltrInsurance = 1800; // Typical landlord insurance
    const ltrPropertyTax = annualPropertyTax; // Same property tax
    const ltrTotalExpenses = annualMortgage + ltrPropertyTax + ltrInsurance + ltrVacancy + ltrManagement + ltrMaintenance;
    const ltrCashFlow = ltrGrossAnnual - ltrTotalExpenses;
    const ltrMonthlyCashFlow = ltrCashFlow / 12;
    
    const monthlyDifference = strMonthlyCashFlow - ltrMonthlyCashFlow;
    const annualDifference = strCashFlow - ltrCashFlow;
    
    return {
      // STR side
      grossRevenue,
      annualMortgage,
      annualPropertyTax,
      annualInsurance,
      annualManagement,
      annualPlatformFee,
      monthlyOperating,
      totalAnnualExpenses,
      strCashFlow,
      strMonthlyCashFlow,
      startupCosts,
      // LTR side
      fmrMonthly,
      ltrGrossAnnual,
      ltrVacancy,
      ltrManagement,
      ltrMaintenance,
      ltrInsurance,
      ltrPropertyTax,
      ltrTotalExpenses,
      ltrCashFlow,
      ltrMonthlyCashFlow,
      // Comparison
      monthlyDifference,
      annualDifference,
      strWins: strCashFlow > ltrCashFlow,
    };
  };

  // Memoize expensive calculations to avoid recalculating on every render
  const investment = useMemo(() => calculateInvestment(), [
    purchasePrice, downPaymentPercent, interestRate, loanTerm, propertyTaxRate,
    insuranceAnnual, managementFeePercent, maintenancePercent, platformFeePercent,
    result, revenuePercentile, guestCount, bedrooms, useCustomIncome, customAnnualIncome,
    electricMonthly, waterMonthly, internetMonthly, trashMonthly,
    lawnCareMonthly, pestControlMonthly, maintenanceMonthly, houseSuppliesMonthly,
    rentalSoftwareMonthly, cleaningMonthly, suppliesConsumablesMonthly,
    includeDesignServices, includeSetupServices,
    includeFurnishings, includeAmenities, furnishingsCost, amenitiesCost, propertySqft,
    studentDiscount, excludedCompIds,
  ]);
  const arbitrage = useMemo(() => calculateArbitrage(), [
    monthlyRent, securityDeposit, firstLastMonth, landlordInsuranceMonthly,
    managementFeePercent, maintenancePercent, platformFeePercent,
    result, revenuePercentile, guestCount, bedrooms, useCustomIncome, customAnnualIncome,
    electricMonthly, waterMonthly, internetMonthly, trashMonthly,
    lawnCareMonthly, pestControlMonthly, maintenanceMonthly, houseSuppliesMonthly,
    rentalSoftwareMonthly, cleaningMonthly, suppliesConsumablesMonthly,
    includeDesignServices, includeSetupServices,
    includeFurnishings, includeAmenities, furnishingsCost, amenitiesCost, propertySqft,
    studentDiscount, excludedCompIds,
  ]);
  const iownit = useMemo(() => calculateIownit(), [
    iownitMortgage, iownitPropertyTaxRate, iownitInsuranceAnnual,
    managementFeePercent, platformFeePercent,
    result, revenuePercentile, guestCount, bedrooms, useCustomIncome, customAnnualIncome,
    electricMonthly, waterMonthly, internetMonthly, trashMonthly,
    lawnCareMonthly, pestControlMonthly, maintenanceMonthly, houseSuppliesMonthly,
    rentalSoftwareMonthly, cleaningMonthly, suppliesConsumablesMonthly,
    includeDesignServices, includeSetupServices,
    includeFurnishings, includeAmenities, furnishingsCost, amenitiesCost, propertySqft,
    studentDiscount, excludedCompIds, hudFmrData,
  ]);

  // Get AI Analysis of the deal
  const getAiAnalysis = async () => {
    if (!result) return;
    if (analysisMode === "buying" && investment.needsPrice) return;
    if (analysisMode === "arbitrage" && arbitrage.needsRent) return;
    if (analysisMode === "iownit" && !hudFmrData) return;
    
    setIsLoadingAiAnalysis(true);
    setShowAiAnalysis(true);
    setAiAnalysis(null);
    
    const displayRevenue = useCustomIncome && customAnnualIncome 
      ? parseFloat(customAnnualIncome) 
      : revenuePercentile === "75th" && result.percentiles?.revenue?.p75
        ? result.percentiles.revenue.p75
        : revenuePercentile === "90th" && result.percentiles?.revenue?.p90
          ? result.percentiles.revenue.p90
          : result.annualRevenue;
    
    const investmentSection = analysisMode === "iownit" ? `
## I OWN IT ANALYSIS (Homeowner Converting to STR)
- **Monthly Mortgage:** ${iownitMortgage ? '$' + parseFloat(iownitMortgage).toLocaleString() : 'Not provided (paid off)'}
- **Property Tax Rate:** ${iownitPropertyTaxRate}%
- **STR Insurance:** $${iownitInsuranceAnnual.toLocaleString()}/year
- **STR Setup Costs:** $${iownit.startupCosts.toLocaleString()}

## STR INCOME (Short-Term Rental)
- **Gross Annual Revenue:** $${iownit.grossRevenue.toLocaleString()}
- **Total Annual Expenses:** $${iownit.totalAnnualExpenses.toLocaleString()}
- **Net Annual Cash Flow:** $${iownit.strCashFlow.toLocaleString()}
- **Net Monthly Cash Flow:** $${Math.round(iownit.strMonthlyCashFlow).toLocaleString()}

## LTR INCOME (Long-Term Rental - HUD Fair Market Rent)
- **HUD FMR Monthly Rent (${bedrooms || 3}BR):** $${iownit.fmrMonthly.toLocaleString()}
- **Gross Annual Revenue:** $${iownit.ltrGrossAnnual.toLocaleString()}
- **Total Annual Expenses:** $${iownit.ltrTotalExpenses.toLocaleString()}
- **Net Annual Cash Flow:** $${iownit.ltrCashFlow.toLocaleString()}
- **Net Monthly Cash Flow:** $${Math.round(iownit.ltrMonthlyCashFlow).toLocaleString()}

## COMPARISON
- **Monthly Difference (STR - LTR):** $${Math.round(iownit.monthlyDifference).toLocaleString()}
- **Annual Difference:** $${iownit.annualDifference.toLocaleString()}
- **Winner:** ${iownit.strWins ? 'STR' : 'LTR'}` : analysisMode === "buying" ? `
## INVESTMENT STRUCTURE (Buying to Own)
- **Purchase Price:** $${parseInt(purchasePrice).toLocaleString()}
- **Down Payment:** ${downPaymentPercent}% ($${investment.downPayment.toLocaleString()})
- **Loan Amount:** $${investment.loanAmount.toLocaleString()} at ${interestRate}% for ${loanTerm} years
- **Monthly Mortgage (P&I):** $${investment.monthlyMortgage.toLocaleString()}
- **Total Cash Required:** $${investment.totalCashNeeded.toLocaleString()}

## ANNUAL EXPENSES
- **Mortgage (P&I):** $${(investment.monthlyMortgage * 12).toLocaleString()}
- **Property Tax (${propertyTaxRate}%):** $${investment.annualPropertyTax.toLocaleString()}
- **Insurance:** $${investment.annualInsurance.toLocaleString()}
- **Management Fee (${managementFeePercent}%):** $${investment.annualManagement.toLocaleString()}
- **Platform Fee (${platformFeePercent}%):** $${investment.annualPlatformFee.toLocaleString()}
- **Operating Expenses:** $${(investment.monthlyOperating * 12).toLocaleString()}
- **Total Annual Expenses:** $${investment.totalAnnualExpenses.toLocaleString()}

## KEY METRICS
- **Annual Cash Flow:** $${investment.cashFlow.toLocaleString()}
- **Monthly Cash Flow:** $${Math.round(investment.monthlyCashFlow).toLocaleString()}
- **Cash-on-Cash Return:** ${investment.cashOnCashReturn.toFixed(1)}%
- **10-Year Projected Cash Flow:** $${(investment.cashFlow * 10).toLocaleString()}` : `
## ARBITRAGE STRUCTURE (Rental Arbitrage)
- **Monthly Rent to Landlord:** $${parseFloat(monthlyRent).toLocaleString()}
- **Security Deposit:** $${arbitrage.securityDepositAmount.toLocaleString()}
- **First ${firstLastMonth ? '+ Last' : ''} Month Rent:** $${arbitrage.firstLastMonthCost.toLocaleString()}
- **Startup Costs (furnishing, etc.):** $${arbitrage.startupCosts.toLocaleString()}
- **Total Cash to Get Started:** $${arbitrage.totalCashNeeded.toLocaleString()}

## ANNUAL EXPENSES
- **Rent to Landlord:** $${arbitrage.annualRent.toLocaleString()}
- **Management Fee (${managementFeePercent}%):** $${arbitrage.annualManagement.toLocaleString()}
- **Platform Fee (${platformFeePercent}%):** $${arbitrage.annualPlatformFee.toLocaleString()}
- **Liability Insurance:** $${arbitrage.annualInsurance.toLocaleString()}
- **Operating Expenses:** $${(arbitrage.monthlyOperating * 12).toLocaleString()}
- **Total Annual Expenses:** $${arbitrage.totalAnnualExpenses.toLocaleString()}

## KEY METRICS
- **Annual Cash Flow:** $${arbitrage.cashFlow.toLocaleString()}
- **Monthly Cash Flow:** $${Math.round(arbitrage.monthlyCashFlow).toLocaleString()}
- **Cash-on-Cash Return:** ${arbitrage.cashOnCashReturn.toFixed(1)}%
- **Payback Period:** ${arbitrage.monthlyCashFlow > 0 ? Math.ceil(arbitrage.totalCashNeeded / arbitrage.monthlyCashFlow) + ' months' : 'N/A'}`;

    const arbitrageQuestions = analysisMode === "iownit" ? `
6. **STR vs LTR Deep Dive** - Given the HUD Fair Market Rent data, which strategy truly makes more sense for this specific market?
7. **Transition Considerations** - What are the practical steps and costs of converting from a primary residence or LTR to an STR?
8. **Risk Assessment** - What are the risks of STR (regulation, seasonality, management burden) vs the stability of LTR?` : analysisMode === "arbitrage" ? `
6. **Landlord Risk** - What are the risks of the landlord finding out and terminating the lease?
7. **Lease Negotiation Tips** - What should they look for in a lease to protect their arbitrage business?
8. **Exit Strategy** - What happens if they need to exit? How to minimize losses.` : `
6. **Questions to Ask** - 3-5 specific questions they should investigate before buying.
7. **The Wealth-Building Perspective** - Help them see how this fits into building long-term wealth.`;
    
    const analysisPrompt = `I need a comprehensive $500-level consulting analysis of this STR ${analysisMode === "iownit" ? "homeowner conversion (I already own this property and want to know: STR or LTR?)" : analysisMode === "arbitrage" ? "rental arbitrage" : "investment"} deal. Please analyze every aspect and help me think like a sophisticated investor.

## PROPERTY DATA
- **Location:** ${result.address || result.neighborhood}, ${result.city}, ${result.state}
- **Property Type:** ${result.propertyType || 'Single Family'}
- **Bedrooms:** ${result.bedrooms} | **Bathrooms:** ${result.bathrooms}
- **Square Feet:** ${result.sqft || propertySqft}
- **Nearby STR Listings:** ${result.nearbyListings || 'Unknown'}
- **Strategy:** ${analysisMode === "iownit" ? "I Own It (homeowner evaluating STR vs LTR)" : analysisMode === "arbitrage" ? "Rental Arbitrage (leasing property to sublease on Airbnb)" : "Buying to Own"}

## REVENUE PROJECTIONS
- **Projected Annual Revenue:** $${displayRevenue.toLocaleString()}
- **Average Daily Rate (ADR):** $${result.adr}
- **Occupancy Rate:** ${result.occupancy}%
- **Monthly Average:** $${Math.round(displayRevenue / 12).toLocaleString()}
${result.percentiles ? `- **Market 75th Percentile Revenue:** $${result.percentiles.revenue.p75.toLocaleString()}
- **Market 90th Percentile Revenue:** $${result.percentiles.revenue.p90.toLocaleString()}` : ''}
${investmentSection}

Please provide:
1. **Deal Quality Assessment** - Is this a good deal? Rate it and explain why.
2. **What These Numbers Really Mean** - Translate the metrics into plain English impact on their life.
3. **Hidden Considerations** - What are they NOT thinking about that could make or break this deal?
4. **Comparison to Benchmarks** - How does this compare to what successful STR ${analysisMode === "arbitrage" ? "arbitrage operators" : "investors"} target?
5. **Red Flags & Green Lights** - Specific concerns or exciting opportunities in this deal.
${arbitrageQuestions}
8. **Bottom Line Recommendation** - Your honest assessment and suggested next steps.

Be specific, use the actual numbers, and help them think like a sophisticated ${analysisMode === "iownit" ? "property owner maximizing their asset" : analysisMode === "arbitrage" ? "arbitrage operator" : "investor"} who's done this many times.`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: analysisPrompt }],
        }),
      });

      if (!response.ok) throw new Error("Failed to get AI analysis");
      
      const data = await response.json();
      setAiAnalysis(data.message);
    } catch (error) {
      console.error("AI Analysis error:", error);
      setAiAnalysis("I'm having trouble generating the analysis right now. Please try again in a moment, or reach out to hello@teeco.co for personalized guidance!");
    } finally {
      setIsLoadingAiAnalysis(false);
    }
  };

  // Generate seasonality data (12 months)
  const getSeasonalityData = (): { year: number; month: number; occupancy: number; revenue?: number; adr?: number }[] => {
    if (!result) return [];
    
    if (result.historical && result.historical.length >= 12) {
      return result.historical.slice(0, 12);
    }
    
    const baseOccupancy = result.occupancy || 55;
    const seasonalMultipliers = [0.7, 0.75, 0.9, 1.0, 1.1, 1.2, 1.25, 1.2, 1.0, 0.9, 0.8, 0.85];
    
    return seasonalMultipliers.map((mult, index) => ({
      year: 2025,
      month: index + 1,
      occupancy: Math.round(Math.min(baseOccupancy * mult, 95)),
      revenue: 0,
      adr: 0,
    }));
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <DoubleTapSave isSaved={isReportSaved} onToggleSave={async () => {
      if (!result) return;
      if (isReportSaved) {
        const addr = result.address || result.neighborhood;
        const saved = JSON.parse(localStorage.getItem('edge_saved_reports') || '[]');
        const matchEntry = saved.find((r: any) => r.address === addr);
        const exists = saved.findIndex((r: any) => r.address === addr);
        if (exists >= 0) {
          saved.splice(exists, 1);
          localStorage.setItem('edge_saved_reports', JSON.stringify(saved));
        }
        setIsReportSaved(false);
        const authEmail = localStorage.getItem('edge_auth_email');
        const authToken = localStorage.getItem('edge_auth_token');
        const authExpiry = localStorage.getItem('edge_auth_expiry');
        if (authEmail && authToken && authExpiry && Date.now() < parseInt(authExpiry, 10)) {
          try {
            await fetch('/api/saved-properties', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: authEmail, propertyId: matchEntry?.id || addr })
            });
          } catch (err) {
            console.log('Server unsave failed:', err);
          }
        }
      } else {
        saveReport();
      }
    }}>
    <div className="min-h-screen overflow-x-clip" style={{ backgroundColor: "#f5f4f0" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ backgroundColor: "#2b2823" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/teeco-icon-black.png" alt="Teeco" width={32} height={32} className="w-8 h-8 invert" />
            <div>
              <span className="text-white font-semibold">Edge by Teeco</span>
              <p className="text-xs text-white/60 hidden sm:block">Your unfair advantage in STR investing</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <AuthHeader variant="dark" />
            <Link href="/" className="text-sm text-white/70 hover:text-white">
              ← Back to Map
            </Link>
          </div>
        </div>
      </header>

      {/* Credit Counter Banner - Subtle brand-aligned design */}
      {isAuthenticated && creditsRemaining !== null && (
        <div 
          className="px-4 py-2.5"
          style={{ 
            backgroundColor: creditsRemaining > 0 ? '#f5f4f0' : '#fef2f2',
            borderBottom: `1px solid ${creditsRemaining > 0 ? '#e5e3da' : '#fecaca'}`
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ 
                  backgroundColor: creditsRemaining > 0 ? '#22c55e' : '#ef4444',
                  color: 'white'
                }}
              >
                {creditsRemaining}
              </div>
              <span className="text-sm font-medium" style={{ color: '#2b2823' }}>
                {creditsRemaining > 0 
                  ? (freeCreditsRemaining > 0 && purchasedCreditsRemaining > 0
                      ? `${freeCreditsRemaining} Free + ${purchasedCreditsRemaining} Credits`
                      : freeCreditsRemaining > 0
                        ? `${freeCreditsRemaining} Free Anal${freeCreditsRemaining === 1 ? 'ysis' : 'yses'} Available`
                        : `${purchasedCreditsRemaining} Credit${purchasedCreditsRemaining === 1 ? '' : 's'} Available`
                    )
                  : 'Ready to continue? Get more credits'
                }
              </span>
            </div>
            <button
              onClick={() => setShowPaywall(true)}
              className="text-sm font-medium px-3 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: creditsRemaining === 0 ? '#2b2823' : '#e5e3da', color: creditsRemaining === 0 ? 'white' : '#2b2823' }}
            >
              {creditsRemaining === 0 ? 'Get More Credits' : 'Buy More'}
            </button>
          </div>
        </div>
      )}

      {/* Sign In Prompt Banner */}
      {!isAuthenticated && (
        <div 
          className="px-4 py-2.5"
          style={{ 
            backgroundColor: '#f0f9ff',
            borderBottom: '1px solid #bae6fd'
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: '#0284c7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm" style={{ color: '#0369a1' }}>
                <strong>Your first analysis is free</strong> — no credit card required
              </span>
            </div>
            <button
              onClick={() => { setShowAuthModal(true); setAuthStep('email'); }}
              className="text-sm font-medium px-3 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: '#0284c7', color: 'white' }}
            >
              Sign In
            </button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-clip">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-sm font-medium" style={{ color: "#787060" }}>Short-Term Rental Calculator</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f4f0', color: '#787060' }}>Live Airbnb Data</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#2b2823" }}>
            How much could your<br />Airbnb earn?
          </h1>
          <p className="text-gray-600">Revenue estimates from 30+ real Airbnb comps near your property</p>
        </div>

        {/* Search Box */}
        <div className="rounded-2xl p-4 sm:p-6 mb-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "visible", position: "relative", zIndex: showSuggestions ? 100 : 1 }}>
          {/* Address Input */}
          <div className="flex gap-3" style={{ position: "relative", zIndex: showSuggestions ? 100 : 1 }}>
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <svg className="w-5 h-5" style={{ color: "#787060" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={address}
                onChange={(e) => { userIsTypingRef.current = true; setAddress(e.target.value); }}
                onKeyDown={(e) => e.key === "Enter" && canAnalyze && handleAnalyze()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter property address..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="property-address-search"
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 text-base transition-colors"
                style={{ 
                  borderColor: showSuggestions ? "#2b2823" : "#e5e5e5",
                  backgroundColor: "#fafafa",
                  color: "#2b2823"
                }}
              />
              
              {/* Loading indicator */}
              {isLoadingSuggestions && address.length >= 3 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* Suggestions dropdown - positioned absolutely below input */}
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 bg-white rounded-xl border border-gray-200 overflow-y-auto"
                  style={{ 
                    top: "100%",
                    marginTop: 4,
                    zIndex: 99999,
                    maxHeight: "min(280px, 40vh)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)"
                  }}
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(suggestion); }}
                      onClick={(e) => { e.preventDefault(); handleSelectSuggestion(suggestion); }}
                      onTouchEnd={(e) => { e.preventDefault(); handleSelectSuggestion(suggestion); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-start gap-3 border-b border-gray-100 last:border-b-0"
                      type="button"
                    >
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#787060" }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{suggestion.streetLine || suggestion.street}</p>
                        <p className="text-sm text-gray-500 truncate">{suggestion.locationLine || `${suggestion.city}, ${suggestion.state}`}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={handleAnalyzeClick}
              disabled={!canAnalyze || isLoading}
              className="px-8 py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: canAnalyze ? "#2b2823" : "#a0a0a0" }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">{loadingStep || "Analyzing..."}</span>
                </div>
              ) : (
                "Analyze Free"
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-400 mt-2">Free short-term rental revenue analysis for any US address</p>
          <p className="text-xs text-gray-400 mt-1">Defaults: 3 bed / 2 bath — you can refine after results</p>
          
          {/* Credit Display */}
          {isAuthenticated && creditsRemaining !== null && (
            <div className="mt-4 flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: creditsRemaining > 0 ? "#22c55e" : "#ef4444" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-sm font-medium" style={{ color: "#2b2823" }}>
                  {freeCreditsRemaining > 0 && purchasedCreditsRemaining > 0
                    ? `${freeCreditsRemaining} Free + ${purchasedCreditsRemaining} Credits`
                    : freeCreditsRemaining > 0
                      ? `${freeCreditsRemaining} of 3 free analyses remaining`
                      : `${purchasedCreditsRemaining} credit${purchasedCreditsRemaining === 1 ? '' : 's'} remaining`
                  }
                </span>
              </div>
              <button
                onClick={() => setShowPaywall(true)}
                className="text-sm font-medium px-3 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: creditsRemaining <= 1 ? '#2b2823' : '#e5e3da', color: creditsRemaining <= 1 ? '#fff' : '#2b2823' }}
              >
                {creditsRemaining <= 1 ? 'Get More' : 'Buy More'}
              </button>
            </div>
          )}
        </div>

        {/* Social Proof - only show before results */}
        {!result && (
          <div className="flex items-center justify-center gap-4 mb-4 py-3">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">T</div>
                <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">M</div>
                <div className="w-6 h-6 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">R</div>
              </div>
              <span className="text-xs text-gray-500">Used by STR investors across 50 states</span>
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>Free</span>
              <span className="text-xs text-gray-500">No signup required</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-xl p-4 mb-6 bg-red-50 border border-red-200">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stuck Helper - hidden before results to keep landing clean */}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Market Mismatch Warning */}
            {marketMismatch && (
              <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-base" style={{ color: '#92400e' }}>Market Data Mismatch</h4>
                    <p className="text-sm mt-1" style={{ color: '#a16207' }}>
                      You searched for: <strong>{marketMismatch.searched}</strong>
                    </p>
                    <p className="text-sm" style={{ color: '#a16207' }}>
                      Showing data for: <strong>{marketMismatch.returned}</strong>
                    </p>
                    <p className="text-xs mt-2" style={{ color: '#b45309' }}>
                      We couldn&apos;t find specific data for your location. These estimates are based on the nearest market with available data. <strong>Use these numbers as a rough reference only.</strong>
                    </p>
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#fef9c3' }}>
                      <span className="text-lg">ℹ️</span>
                      <span className="text-sm" style={{ color: '#854d0e' }}>
                        You chose to proceed with nearest market data
                      </span>
                    </div>
                    <p className="text-xs mt-3" style={{ color: '#92400e' }}>
                      💡 <strong>Tip:</strong> Try searching for a property in a larger nearby city for more accurate data.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ===== PROPERTY CONFIGURATION — All inputs in one place ===== */}
            <div className="rounded-2xl p-4 sm:p-6" style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: '#2b2823' }}>Property Configuration</h3>
                  <p className="text-xs" style={{ color: '#787060' }}>Adjust to match your property — revenue updates instantly</p>
                </div>

              </div>

              {/* Strategy Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAnalysisMode('buying')}
                  className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${analysisMode === 'buying' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  style={analysisMode === 'buying' ? { backgroundColor: '#2b2823' } : { backgroundColor: '#f5f4f0' }}
                >
                  🏠 Buying
                </button>
                <button
                  onClick={() => setAnalysisMode('arbitrage')}
                  className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${analysisMode === 'arbitrage' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  style={analysisMode === 'arbitrage' ? { backgroundColor: '#2b2823' } : { backgroundColor: '#f5f4f0' }}
                >
                  🔑 Arbitrage
                </button>
                <button
                  onClick={() => setAnalysisMode('iownit')}
                  className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${analysisMode === 'iownit' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  style={analysisMode === 'iownit' ? { backgroundColor: '#2b2823' } : { backgroundColor: '#f5f4f0' }}
                >
                  🏡 I Own It
                </button>
              </div>

              {/* Bed / Bath / Sleeps — compact row */}
              <div className="flex flex-wrap gap-3 mb-3">
                <div className="flex-1 min-w-[100px]">
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: '#787060' }}>Bedrooms</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        onClick={() => { setBedrooms(num); setGuestCount(num * 2); setTimeout(() => handleLocalRefilterAuto(num, bathrooms, num * 2), 50); }}
                        className={`flex-1 min-h-[36px] rounded-lg text-xs font-medium transition-all ${bedrooms === num ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={bedrooms === num ? { backgroundColor: '#2b2823' } : {}}
                      >
                        {num === 6 ? '6+' : num}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: '#787060' }}>Bathrooms</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => { setBathrooms(num); setTimeout(() => handleLocalRefilterAuto(bedrooms, num, guestCount), 50); }}
                        className={`flex-1 min-h-[36px] rounded-lg text-xs font-medium transition-all ${bathrooms === num ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        style={bathrooms === num ? { backgroundColor: '#2b2823' } : {}}
                      >
                        {num === 5 ? '5+' : num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="text-[11px] font-medium mb-1 block" style={{ color: '#787060' }}>Sleeps</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[2, 4, 6, 8, 10, 12, 14, 16].map((num) => (
                    <button
                      key={num}
                      onClick={() => { setGuestCount(num); setTimeout(() => handleLocalRefilterAuto(bedrooms, bathrooms, num), 50); }}
                      className={`w-10 min-h-[36px] rounded-lg text-xs font-medium transition-all ${guestCount === num ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      style={guestCount === num ? { backgroundColor: '#2b2823' } : {}}
                    >
                      {num === 16 ? '16+' : num}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            
            {/* Revenue Estimate Card */}
            <div className="rounded-2xl p-4 sm:p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold" style={{ color: "#2b2823" }}>{result.address || result.neighborhood}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{result.city}, {result.state} • {result.bedrooms} BR / {result.bathrooms} BA</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {result.dataSource && result.dataSource.toLowerCase().includes('pricelabs') && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#eef6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        PRICELABS DATA
                      </span>
                    )}
                    {result.dataSource && !result.dataSource.toLowerCase().includes('pricelabs') && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f4f0', color: '#787060' }}>
                        AIRBNB DATA
                      </span>
                    )}
                    {result.percentiles && (
                      <span className="text-xs text-gray-400 sm:hidden">
                        {result.percentiles.listingsAnalyzed} listings analyzed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {result.percentiles && (
                    <div className="text-right text-xs text-gray-500 hidden sm:block">
                      Based on {result.percentiles.listingsAnalyzed} {result.bedrooms}BR listings
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {/* Save Report Button */}
                    <button
                      onClick={() => {
                        if (isReportSaved) {
                          // Unsave
                          const addr = result.address || result.neighborhood;
                          const saved = JSON.parse(localStorage.getItem('edge_saved_reports') || '[]');
                          const idx = saved.findIndex((r: any) => r.address === addr);
                          if (idx >= 0) {
                            saved.splice(idx, 1);
                            localStorage.setItem('edge_saved_reports', JSON.stringify(saved));
                          }
                          setIsReportSaved(false);
                        } else {
                          saveReport();
                        }
                      }}
                      className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: isReportSaved ? "#22c55e" : "#e5e3da", color: isReportSaved ? "#ffffff" : "#2b2823" }}
                      title={isReportSaved ? "Saved" : "Save Report"}
                    >
                      <svg className="w-4 h-4" fill={isReportSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span className="hidden sm:inline">{isReportSaved ? "Saved" : "Save"}</span>
                    </button>
                    
                    {/* Email Button */}
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: "#e5e3da", color: "#2b2823" }}
                      title="Email Report"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">Email</span>
                    </button>
                    
                    {/* PDF Download Button */}
                    <button
                      onClick={downloadPDFReport}
                      className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                      title="Download PDF Report"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    
                    {/* Share Link Button */}
                    <button
                      onClick={async () => {
                        if (isCreatingShareLink) return;
                        setIsCreatingShareLink(true);
                        
                        try {
                          const displayRevenue = getDisplayRevenue();
                          const response = await fetch('/api/share', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              address: result.address || result.neighborhood,
                              city: result.city,
                              state: result.state,
                              bedrooms: result.bedrooms,
                              bathrooms: result.bathrooms,
                              guestCount: guestCount || result.bedrooms * 2,
                              purchasePrice: purchasePrice ? parseFloat(purchasePrice.replace(/,/g, '')) : 0,
                              annualRevenue: displayRevenue,
                              occupancyRate: result.occupancy,
                              adr: result.adr,
                              cashFlow: investment.cashFlow,
                              cashOnCash: investment.cashOnCashReturn,
                              analysisData: {
                                activeListings: result.nearbyListings,
                                peakMonth: result.historical?.[0]?.month,
                                peakMonthRevenue: result.historical?.[0]?.revenue,
                                downPayment: investment.downPayment,
                                downPaymentPercent: downPaymentPercent,
                                loanAmount: investment.loanAmount,
                                monthlyMortgage: investment.monthlyMortgage,
                                percentiles: result.percentiles
                              }
                            })
                          });
                          
                          if (!response.ok) throw new Error('Failed to create share link');
                          
                          const { shareUrl } = await response.json();
                          
                          // Copy link and share
                          if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                            await navigator.share({
                              title: `STR Analysis: ${result.address || result.neighborhood}`,
                              url: shareUrl
                            });
                          } else {
                            await navigator.clipboard.writeText(shareUrl);
                            alert('Share link copied! This link can only be viewed once and expires in 90 days.');
                          }
                        } catch (err: any) {
                          // Don't show error if user just dismissed the share sheet
                          if (err?.name === 'AbortError' || err?.message?.includes('Share canceled') || err?.message?.includes('abort')) {
                            console.log('Share dismissed by user');
                          } else {
                            console.error('Share error:', err);
                            alert('Failed to create share link. Please try again.');
                          }
                        } finally {
                          setIsCreatingShareLink(false);
                        }
                      }}
                      className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: "#22c55e", color: "#ffffff" }}
                      title="Share Analysis Link"
                      disabled={isCreatingShareLink}
                    >
                      {isCreatingShareLink ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 2L11 13" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">{isCreatingShareLink ? 'Creating...' : 'Share'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Percentile Selector */}
              <div className="flex gap-2 sm:gap-3 mb-4 overflow-x-auto">
                {(["average", "75th", "90th"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setRevenuePercentile(p)}
                    className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all min-w-0 ${
                      revenuePercentile === p
                        ? "text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={revenuePercentile === p ? { backgroundColor: "#2b2823" } : {}}
                  >
                    {p === "average" ? "Average" : p === "75th" ? "75th %" : "90th %"}
                    {result.percentiles?.revenue && (
                      <span className="block text-xs opacity-75">
                        {formatCurrency(
                          p === "average" 
                            ? result.percentiles.revenue.p50
                            : p === "75th" 
                              ? result.percentiles.revenue.p75
                              : result.percentiles.revenue.p90
                        )}/yr
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Revenue Display */}
              <div className="text-center py-4 sm:py-6 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: "#787060" }}>
                  {revenuePercentile === "average" ? "Estimated Annual Revenue" : 
                   revenuePercentile === "75th" ? "75th Percentile Revenue" : "90th Percentile Revenue"}
                </p>
                <p className="text-3xl sm:text-4xl font-bold" style={{ color: "#22c55e" }}>
                  {formatCurrency(getDisplayRevenue())}
                </p>
                {/* Confidence Range - uses real p25-p75 percentile data when available */}
                <p className="text-sm mt-1" style={{ color: "#787060" }}>
                  Range: {formatCurrency(
                    result.percentiles?.revenue?.p25 
                      ? Math.round(result.percentiles.revenue.p25 * getGuestCountMultiplier())
                      : Math.round(getDisplayRevenue() * 0.8)
                  )} – {formatCurrency(
                    result.percentiles?.revenue?.p75
                      ? Math.round(result.percentiles.revenue.p75 * getGuestCountMultiplier())
                      : Math.round(getDisplayRevenue() * 1.2)
                  )}
                </p>
                {result.percentiles?.revenue?.p25 && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#a0a0a0" }}>25th – 75th percentile from comparable listings</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {result.dataSource && result.dataSource.toLowerCase().includes('pricelabs') ? (
                    <>Based on PriceLabs analysis of <strong style={{ color: '#2563eb' }}>{result.percentiles?.listingsAnalyzed || result.nearbyListings || '300+'} comparable properties</strong> across multiple platforms</>
                  ) : (
                    <>Based on {result.percentiles?.listingsAnalyzed || result.nearbyListings || 'comparable'} nearby Airbnb listings</>
                  )}
                </p>
                {revenuePercentile !== "average" && (
                  <p className="text-xs text-gray-400 mt-2">
                    {result?.dataSource?.toLowerCase().includes('pricelabs')
                      ? (revenuePercentile === "75th" 
                          ? "Actual 75th percentile from PriceLabs market data" 
                          : "Actual 90th percentile from PriceLabs market data")
                      : (revenuePercentile === "75th" 
                          ? "Top 25% performers in this market" 
                          : "Top 10% performers in this market")}
                  </p>
                )}
                {guestCount && bedrooms && guestCount > bedrooms * 2 && (
                  <p className="text-xs text-green-600 mt-2">
                    +{Math.round((getGuestCountMultiplier() - 1) * 100)}% guest capacity bonus (sleeps {guestCount} vs standard {bedrooms * 2})
                  </p>
                )}
              </div>

              {/* Forward-Looking 30-Day Revenue Estimate */}
              {(() => {
                const today = new Date();
                const currentMonth = today.getMonth(); // 0-indexed
                const dayOfMonth = today.getDate();
                const daysInCurrentMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
                const daysInNextMonth = new Date(today.getFullYear(), currentMonth + 2, 0).getDate();
                const daysLeftThisMonth = daysInCurrentMonth - dayOfMonth;
                const daysFromNextMonth = 30 - daysLeftThisMonth;
                
                const seasonalData = getSeasonalityData();
                const annualRev = getDisplayRevenue() || 0;
                const baseMonthlyRev = annualRev / 12;
                const guestMult = getGuestCountMultiplier();
                const baseOcc = result.occupancy || 55;
                
                // Calculate percentile scaling ratio so monthly data reflects selected percentile
                // Raw historical total = sum of all monthly revenues from API (before percentile/guest adjustments)
                const rawHistoricalTotal = seasonalData.reduce((sum, m) => sum + (m.revenue || 0), 0);
                const percentileScale = (rawHistoricalTotal > 0 && annualRev > 0) ? (annualRev / rawHistoricalTotal) : 1;
                
                // Calculate revenue for current month
                const currentMonthData = seasonalData.find(m => m.month === currentMonth + 1);
                let currentMonthRev = baseMonthlyRev;
                if (currentMonthData?.revenue && currentMonthData.revenue > 0) {
                  // Scale raw monthly revenue by percentile ratio (already includes guest/percentile adjustments)
                  currentMonthRev = Math.round(currentMonthData.revenue * percentileScale);
                } else if (currentMonthData) {
                  const mult = baseOcc > 0 ? (currentMonthData.occupancy / baseOcc) : 1;
                  currentMonthRev = Math.round(baseMonthlyRev * Math.min(Math.max(mult, 0.5), 1.5));
                }
                
                // Calculate revenue for next month
                const nextMonthIdx = (currentMonth + 1) % 12;
                const nextMonthData = seasonalData.find(m => m.month === nextMonthIdx + 1);
                let nextMonthRev = baseMonthlyRev;
                if (nextMonthData?.revenue && nextMonthData.revenue > 0) {
                  nextMonthRev = Math.round(nextMonthData.revenue * percentileScale);
                } else if (nextMonthData) {
                  const mult = baseOcc > 0 ? (nextMonthData.occupancy / baseOcc) : 1;
                  nextMonthRev = Math.round(baseMonthlyRev * Math.min(Math.max(mult, 0.5), 1.5));
                }
                
                // Daily rates for each month
                const dailyRateThisMonth = currentMonthRev / daysInCurrentMonth;
                const dailyRateNextMonth = nextMonthRev / daysInNextMonth;
                
                // Blended 30-day revenue
                const thirtyDayRevenue = Math.round(
                  (dailyRateThisMonth * daysLeftThisMonth) + 
                  (dailyRateNextMonth * Math.max(daysFromNextMonth, 0))
                );
                
                // Current month occupancy
                const currentOcc = currentMonthData?.occupancy || baseOcc;
                const nextOcc = nextMonthData?.occupancy || baseOcc;
                const blendedOcc = Math.round(
                  (currentOcc * daysLeftThisMonth + nextOcc * Math.max(daysFromNextMonth, 0)) / 30
                );
                
                // Estimated booked nights
                const bookedNights = Math.round(30 * blendedOcc / 100);
                const estimatedADR = bookedNights > 0 ? Math.round(thirtyDayRevenue / bookedNights) : (result.adr || 0);
                
                // Determine if this is peak, average, or low
                const monthlyAvg = annualRev / 12;
                const isHigh = thirtyDayRevenue > monthlyAvg * 1.1;
                const isLow = thirtyDayRevenue < monthlyAvg * 0.9;
                const periodLabel = isHigh ? 'Peak Period' : isLow ? 'Low Period' : 'Average Period';
                const periodColor = isHigh ? '#16a34a' : isLow ? '#f59e0b' : '#3b82f6';
                const periodBg = isHigh ? '#f0fdf4' : isLow ? '#fffbeb' : '#eff6ff';
                
                const currentMonthName = monthNames[currentMonth];
                const nextMonthName = monthNames[nextMonthIdx];
                const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                const dateRange = `${currentMonthName} ${dayOfMonth} – ${monthNames[endDate.getMonth()]} ${endDate.getDate()}`;
                
                return (
                  <div className="mt-4 rounded-2xl p-6" style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: `2px solid ${periodColor}20` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-base font-semibold" style={{ color: '#2b2823' }}>Next 30 Days</h3>
                        <p className="text-xs" style={{ color: '#787060' }}>{dateRange}</p>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: periodBg, color: periodColor }}>
                        {periodLabel}
                      </span>
                    </div>
                    
                    <div className="text-center py-3 rounded-xl mb-3" style={{ backgroundColor: periodBg }}>
                      <p className="text-xs font-medium mb-1" style={{ color: periodColor }}>Projected 30-Day Revenue</p>
                      <p className="text-3xl font-bold" style={{ color: periodColor }}>
                        {formatCurrency(thirtyDayRevenue)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f5f4f0' }}>
                        <p className="text-xs" style={{ color: '#787060' }}>Est. ADR</p>
                        <p className="text-sm font-bold" style={{ color: '#2b2823' }}>${estimatedADR}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f5f4f0' }}>
                        <p className="text-xs" style={{ color: '#787060' }}>Occupancy</p>
                        <p className="text-sm font-bold" style={{ color: '#2b2823' }}>{blendedOcc}%</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#f5f4f0' }}>
                        <p className="text-xs" style={{ color: '#787060' }}>Booked</p>
                        <p className="text-sm font-bold" style={{ color: '#2b2823' }}>{bookedNights}/30 nights</p>
                      </div>
                    </div>
                    
                    {/* Blended breakdown */}
                    <div className="mt-3 flex gap-2">
                      <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: '#fafaf8' }}>
                        <p className="text-[10px]" style={{ color: '#787060' }}>{currentMonthName} ({daysLeftThisMonth}d left)</p>
                        <p className="text-xs font-semibold" style={{ color: '#2b2823' }}>{formatCurrency(Math.round(dailyRateThisMonth * daysLeftThisMonth))}</p>
                      </div>
                      {daysFromNextMonth > 0 && (
                        <div className="flex-1 p-2 rounded-lg text-center" style={{ backgroundColor: '#fafaf8' }}>
                          <p className="text-[10px]" style={{ color: '#787060' }}>{nextMonthName} ({daysFromNextMonth}d)</p>
                          <p className="text-xs font-semibold" style={{ color: '#2b2823' }}>{formatCurrency(Math.round(dailyRateNextMonth * daysFromNextMonth))}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* CompMap moved below Comparable Listings for better flow */}

              {/* Custom Income Override */}
              <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomIncome}
                    onChange={(e) => setUseCustomIncome(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium" style={{ color: "#2b2823" }}>I know this market better - use my own estimates</span>
                </label>
                {useCustomIncome && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-gray-500">Override market data with your own knowledge:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Annual Revenue ($)</label>
                        <input
                          type="number"
                          value={customAnnualIncome}
                          onChange={(e) => setCustomAnnualIncome(e.target.value)}
                          placeholder="e.g. 85000"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Avg Nightly Rate ($)</label>
                        <input
                          type="number"
                          id="customAdr"
                          placeholder={`Current: $${result.adr}`}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Occupancy (%)</label>
                        <input
                          type="number"
                          id="customOccupancy"
                          placeholder={`Current: ${result.occupancy}%`}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                          max="100"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-amber-600">💡 Tip: Use this if you have local market knowledge that differs from the data shown</p>
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs text-gray-500">Avg Nightly Rate</p>
                  <p className="text-lg font-bold" style={{ color: "#2b2823" }}>{formatCurrency(result.adr)}</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs text-gray-500">Occupancy</p>
                  <p className="text-lg font-bold" style={{ color: "#2b2823" }}>{result.occupancy}%</p>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                  <p className="text-xs text-gray-500">Active Listings</p>
                  <p className="text-lg font-bold" style={{ color: "#2b2823" }}>{result.nearbyListings}</p>
                </div>
              </div>
            </div>

            {/* Performance Path Card - explains what each revenue tier means */}
            {result && bedrooms && (
              <div className="rounded-2xl p-4 sm:p-6" style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎯</span>
                  <h3 className="text-base font-semibold" style={{ color: '#2b2823' }}>What Drives Revenue Tiers</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Revenue estimates above are based on real comparable listings. Here&apos;s what separates each tier.
                </p>
                
                <div className="space-y-3">
                  {/* Average tier */}
                  <div 
                    className="p-3 rounded-xl cursor-pointer transition-all"
                    style={{ 
                      backgroundColor: revenuePercentile === 'average' ? '#f5f4f0' : '#fafafa',
                      border: revenuePercentile === 'average' ? '1.5px solid #2b2823' : '1.5px solid transparent'
                    }}
                    onClick={() => setRevenuePercentile('average')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#2b2823' }}>50th Percentile (Average)</span>
                      {result.percentiles?.revenue && (
                        <span className="text-sm font-bold" style={{ color: '#2b2823' }}>
                          {formatCurrency(Math.round(result.percentiles.revenue.p50 * getGuestCountMultiplier()))}/yr
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Standard listing, basic furnishing, minimal optimization. What most hosts earn.</p>
                  </div>
                  
                  {/* 75th tier */}
                  <div 
                    className="p-3 rounded-xl cursor-pointer transition-all"
                    style={{ 
                      backgroundColor: revenuePercentile === '75th' ? '#f0fdf4' : '#fafafa',
                      border: revenuePercentile === '75th' ? '1.5px solid #22c55e' : '1.5px solid transparent'
                    }}
                    onClick={() => setRevenuePercentile('75th')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>75th Percentile</span>
                      {result.percentiles?.revenue && (
                        <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                          {formatCurrency(Math.round(result.percentiles.revenue.p75 * getGuestCountMultiplier()))}/yr
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Professional design, smart guest capacity, quality photography. What Teeco-optimized properties target.</p>
                  </div>
                  
                  {/* 90th tier */}
                  <div 
                    className="p-3 rounded-xl cursor-pointer transition-all"
                    style={{ 
                      backgroundColor: revenuePercentile === '90th' ? '#fffbeb' : '#fafafa',
                      border: revenuePercentile === '90th' ? '1.5px solid #f59e0b' : '1.5px solid transparent'
                    }}
                    onClick={() => setRevenuePercentile('90th')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#d97706' }}>90th Percentile</span>
                      {result.percentiles?.revenue && (
                        <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                          {formatCurrency(Math.round(result.percentiles.revenue.p90 * getGuestCountMultiplier()))}/yr
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Unique theme, exceptional reviews, dynamic pricing mastery, premium amenities. Top 10% of hosts.</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                  <p className="text-xs" style={{ color: '#16a34a' }}>
                    🚀 <span className="font-semibold">Want to reach the 75th percentile?</span> Teeco&apos;s design + setup service helps properties earn more through professional staging, smart capacity planning, and curated amenities.
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  Revenue tiers are based on comparable listings within the same market and bedroom count. Actual results vary based on property condition, management quality, and market conditions.
                </p>
              </div>
            )}

            {/* Seasonality Revenue Chart */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Monthly Revenue Forecast</h3>
              <p className="text-sm text-gray-500 mb-4">Projected monthly income based on seasonal demand</p>
              
              {/* Bar Chart with Y-Axis */}
              {(() => {
                const annualRev = getDisplayRevenue() || 0;
                const baseMonthlyRev = annualRev / 12;
                const seasonData = getSeasonalityData();
                
                // Calculate percentile scaling ratio so chart reflects selected percentile + bed/bath
                const rawTotal = seasonData.reduce((sum, m) => sum + (m.revenue || 0), 0);
                const pScale = (rawTotal > 0 && annualRev > 0) ? (annualRev / rawTotal) : 1;
                
                // Calculate all monthly revenues first
                const monthlyRevenues = seasonData.map(month => {
                  if (month.revenue && month.revenue > 0) {
                    return Math.round(month.revenue * pScale);
                  } else {
                    const baseOccupancy = result.occupancy || 55;
                    const seasonalMultiplier = baseOccupancy > 0 ? (month.occupancy / baseOccupancy) : 1;
                    return Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
                  }
                });
                
                const maxRev = Math.max(...monthlyRevenues, 1);
                const minRev = Math.min(...monthlyRevenues);
                // Start Y-axis from 80% of min to dramatically emphasize variation
                // This makes the visual difference between peak and low months much more apparent
                const yAxisMin = Math.floor(minRev * 0.8 / 500) * 500;
                const yAxisMax = Math.ceil(maxRev * 1.05 / 500) * 500;
                const yAxisRange = Math.max(yAxisMax - yAxisMin, 1000); // Ensure minimum range
                
                // Generate Y-axis labels (4 ticks)
                const yAxisTicks = [0, 0.33, 0.66, 1].map(pct => Math.round(yAxisMin + yAxisRange * pct));
                
                return (
                  <div className="flex gap-2">
                    {/* Y-Axis Labels */}
                    <div className="flex flex-col justify-between h-48 text-right pr-2" style={{ minWidth: '45px' }}>
                      {yAxisTicks.reverse().map((tick, i) => (
                        <span key={i} className="text-xs" style={{ color: "#787060" }}>
                          ${tick >= 1000 ? Math.round(tick / 1000) + 'k' : tick}
                        </span>
                      ))}
                    </div>
                    
                    {/* Chart Area */}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-end h-44 border-l border-b" style={{ borderColor: '#e5e3da' }}>
                        {monthlyRevenues.map((monthlyRev, index) => {
                          // Calculate height based on Y-axis range (not from 0)
                          const heightPercent = yAxisRange > 0 ? ((monthlyRev - yAxisMin) / yAxisRange) * 100 : 50;
                          const barColor = monthlyRev >= baseMonthlyRev * 1.1 ? '#22c55e' : monthlyRev >= baseMonthlyRev * 0.9 ? '#3b82f6' : '#f59e0b';
                          
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full px-[1px] sm:px-1">
                              <span className="text-[8px] sm:text-[10px] font-semibold mb-1" style={{ color: "#2b2823" }}>
                                {monthlyRev >= 1000 ? Math.round(monthlyRev / 1000) + 'k' : monthlyRev}
                              </span>
                              <div 
                                className="w-full max-w-[16px] sm:max-w-[20px] rounded-t transition-all cursor-pointer hover:opacity-80"
                                style={{ 
                                  height: `${Math.max(heightPercent, 5)}%`,
                                  backgroundColor: barColor,
                                }}
                                title={`${monthNames[index]}: ${formatCurrency(monthlyRev)}`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex mt-1">
                        {monthNames.map((name, index) => (
                          <div key={index} className="flex-1 text-center">
                            <span className="text-[8px] sm:text-[10px]" style={{ color: "#787060" }}>
                              {name.charAt(0)}<span className="hidden sm:inline">{name.slice(1)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                  <span style={{ color: "#787060" }}>Peak Season</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span style={{ color: "#787060" }}>Average</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span style={{ color: "#787060" }}>Low Season</span>
                </div>
              </div>
            </div>

            {/* Monthly Revenue Projection */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Monthly Revenue Projection</h3>
              <p className="text-sm text-gray-500 mb-4">Estimated revenue based on seasonal occupancy</p>
              
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {(() => {
                  const annRevGrid = getDisplayRevenue() || 0;
                  const baseMonthlyRevGrid = annRevGrid / 12;
                  const sDataGrid = getSeasonalityData();
                  const rawTotalGrid = sDataGrid.reduce((s, m) => s + (m.revenue || 0), 0);
                  const pScaleGrid = (rawTotalGrid > 0 && annRevGrid > 0) ? (annRevGrid / rawTotalGrid) : 1;
                  return sDataGrid;
                })().map((month, index) => {
                  const annualRev = getDisplayRevenue() || 0;
                  const baseMonthlyRev = annualRev / 12;
                  const sDataAll = getSeasonalityData();
                  const rawTotalAll = sDataAll.reduce((s, m) => s + (m.revenue || 0), 0);
                  const pScaleAll = (rawTotalAll > 0 && annualRev > 0) ? (annualRev / rawTotalAll) : 1;
                  // Use actual revenue from historical data if available
                  let monthlyRev = 0;
                  if (month.revenue && month.revenue > 0) {
                    // Scale by percentile ratio to reflect bed/bath/percentile selection
                    monthlyRev = Math.round(month.revenue * pScaleAll);
                  } else {
                    const baseOccupancy = result.occupancy || 55;
                    const seasonalMultiplier = baseOccupancy > 0 ? (month.occupancy / baseOccupancy) : 1;
                    monthlyRev = Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
                  }
                  monthlyRev = monthlyRev || Math.round(baseMonthlyRev);
                  return (
                    <div key={index} className="p-3 rounded-lg text-center" style={{ backgroundColor: "#f5f4f0" }}>
                      <p className="text-xs font-medium" style={{ color: "#787060" }}>{monthNames[month.month - 1]}</p>
                      <p className="text-sm font-bold" style={{ color: "#2b2823" }}>
                        {formatCurrency(monthlyRev)}
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "#ecfdf5" }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: "#787060" }}>Projected Annual Total</span>
                  <span className="text-xl font-bold text-green-600">{formatCurrency(getDisplayRevenue())}</span>
                </div>
              </div>
            </div>

            {/* Comparable Listings */}
            {result.comparables && result.comparables.length > 0 && (() => {
              // Calculate confidence score based on ACTIVE comp quality
              const allComps = result.comparables;
              const activeComps = allComps.filter(c => !excludedCompIds.has(c.id));
              const comps = allComps; // Show all, but mark excluded
              const bedroomMatches = activeComps.filter(c => c.bedrooms === result.bedrooms).length;
              const bedroomMatchPct = activeComps.length > 0 ? (bedroomMatches / activeComps.length) * 100 : 0;
              const avgDistance = activeComps.reduce((sum, c) => sum + (c.distance || 0), 0) / (activeComps.length || 1);
              const hasEnoughComps = activeComps.length >= 5;
              const hasGoodMatches = bedroomMatchPct >= 50;
              const isCloseProximity = avgDistance <= 5;
              const confidenceScore = (hasEnoughComps ? 33 : activeComps.length * 6) + (hasGoodMatches ? 34 : bedroomMatchPct * 0.34) + (isCloseProximity ? 33 : Math.max(0, 33 - avgDistance * 3));
              const confidenceLabel = confidenceScore >= 75 ? "High" : confidenceScore >= 45 ? "Medium" : "Low";
              const confidenceColor = confidenceScore >= 75 ? "#16a34a" : confidenceScore >= 45 ? "#ca8a04" : "#ef4444";
              
              // Comp-based revenue recalculation
              const compRevenue = getCompBasedRevenue();
              const hasExclusions = excludedCompIds.size > 0;

              return (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold" style={{ color: "#2b2823" }}>
                    Nearby {result.bedrooms === 6 ? "6+" : result.bedrooms}BR Airbnb Listings
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${confidenceColor}15`, color: confidenceColor }}>
                    {confidenceLabel} Confidence
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: "#787060" }}>
                  {activeComps.length}/{allComps.length} listings shown • {bedroomMatches} exact bedroom match{bedroomMatches !== 1 ? "es" : ""} • {avgDistance.toFixed(1)}mi avg distance
                </p>
                {/* Data source explanation */}
                {result.dataSource && result.dataSource.toLowerCase().includes('pricelabs') && (
                  <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: "#eff6ff", border: "1px solid #dbeafe" }}>
                    <p className="text-[11px]" style={{ color: "#1e40af", lineHeight: "1.5" }}>
                      Your revenue estimates above are powered by <strong>PriceLabs</strong> ({result.percentiles?.listingsAnalyzed?.toLocaleString() || result.percentiles?.totalListingsInArea?.toLocaleString() || '300+'} listings analyzed).
                      These Airbnb listings below are shown for reference only &mdash; they are not the same dataset used for your revenue projections.
                    </p>
                  </div>
                )}
                
                {/* Real Occupancy Data Banner */}
                {Object.keys(realOccupancyData).length > 0 && (() => {
                  const realEntries = Object.values(realOccupancyData);
                  const avgRealOcc = Math.round(realEntries.reduce((s, e) => s + e.occupancyRate, 0) / realEntries.length);
                  // Aggregate peak months
                  const peakCounts = new Map<string, number>();
                  realEntries.forEach(e => e.peakMonths?.forEach((m: string) => peakCounts.set(m, (peakCounts.get(m) || 0) + 1)));
                  const topPeaks = Array.from(peakCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
                  return (
                    <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#1d4ed8' }}>📅 Real Calendar Occupancy</p>
                          <p className="text-xs mt-0.5" style={{ color: '#787060' }}>
                            Based on {realEntries.length} listing calendar{realEntries.length !== 1 ? 's' : ''} scraped
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color: '#1d4ed8' }}>{avgRealOcc}%</p>
                          <p className="text-xs" style={{ color: '#787060' }}>vs {result.occupancy}% est.</p>
                        </div>
                      </div>
                      {topPeaks.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Peak months: {topPeaks.join(', ')}</p>
                      )}
                    </div>
                  );
                })()}
                {isLoadingOccupancy && Object.keys(realOccupancyData).length === 0 && (
                  <div className="mb-4 p-3 rounded-xl animate-pulse" style={{ backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}>
                    <p className="text-xs font-medium" style={{ color: '#0284c7' }}>📅 Fetching real calendar occupancy for top comps...</p>
                  </div>
                )}
                
                {/* Comp-based revenue recalculation banner */}
                {hasExclusions && compRevenue && (
                  <div className="mb-4 p-3 rounded-xl border-2 border-dashed" style={{ borderColor: '#22c55e', backgroundColor: '#f0fdf4' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#15803d' }}>Custom Comp Average ({activeComps.length} selected)</p>
                        <p className="text-xs mt-0.5" style={{ color: '#787060' }}>
                          ${compRevenue.adr}/night • {compRevenue.occupancy}% occ
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: '#15803d' }}>{formatCurrency(compRevenue.annualRevenue)}/yr</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExcludedCompIds(new Set())}
                      className="mt-2 text-xs font-medium px-3 py-1 rounded-full transition-colors"
                      style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                    >
                      Reset Selection (Include All)
                    </button>
                  </div>
                )}
                
                <div className="space-y-4">
                  {comps.slice(0, showAllComps ? comps.length : 5).map((listing, index) => {
                    const isExcluded = excludedCompIds.has(listing.id);
                    return (
                    <div
                      key={listing.id || index}
                      id={`comp-card-${listing.id}`}
                      className={`flex gap-3 p-3 sm:p-4 rounded-xl transition-all border ${isExcluded ? 'opacity-40 border-gray-200 bg-gray-50' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      {/* Include/Exclude Toggle */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCompExclusion(listing.id);
                        }}
                        className="flex-shrink-0 self-center"
                        title={isExcluded ? "Include this comp" : "Exclude this comp"}
                      >
                        <div
                          className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: isExcluded ? '#d1d5db' : '#22c55e',
                            backgroundColor: isExcluded ? '#f9fafb' : '#22c55e',
                          }}
                        >
                          {!isExcluded && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </button>
                      
                      {/* Comp Photo */}
                      <a
                        href={listing.url || `https://www.airbnb.com/rooms/${listing.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 flex-1 min-w-0 group"
                      >
                        <div className="flex-shrink-0 relative">
                          {listing.image ? (
                            <img
                              src={listing.image}
                              alt={listing.name}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f4f0' }}>
                              <span className="text-2xl">🏠</span>
                            </div>
                          )}
                          {/* Numbered badge */}
                          <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: isExcluded ? '#9ca3af' : (index < 5 ? '#22c55e' : '#3b82f6') }}>
                            {index + 1}
                          </div>
                        </div>
                        {/* Comp Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium truncate text-sm sm:text-base ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-blue-600'}`}>{listing.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {listing.bedrooms}bd / {listing.bathrooms}ba • {listing.accommodates || listing.bedrooms * 2} guests • {listing.distance > 0 ? `${Number(listing.distance).toFixed(1)}mi` : listing.propertyType}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-bold text-sm sm:text-base ${isExcluded ? 'text-gray-400' : 'text-green-600'}`}>{formatCurrency(listing.annualRevenue || listing.monthlyRevenue * 12)}/yr</p>
                              <p className="text-xs text-gray-500">${listing.nightPrice}/night</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {realOccupancyData[String(listing.id)] ? (
                              <span className="text-xs font-medium" style={{ color: '#16a34a' }} title={`Real data: ${realOccupancyData[String(listing.id)].bookedDays}/${realOccupancyData[String(listing.id)].totalDays} days booked`}>
                                📅 {realOccupancyData[String(listing.id)].occupancyRate}% occ
                              </span>
                            ) : isLoadingOccupancy ? (
                              <span className="text-xs text-gray-400 animate-pulse">⏳ {listing.occupancy}% occ</span>
                            ) : (
                              <span className="text-xs text-gray-500">{listing.occupancy}% occ</span>
                            )}
                            {listing.rating > 0 && (
                              <span className="text-xs text-gray-400">⭐ {listing.rating.toFixed(1)} ({listing.reviewsCount})</span>
                            )}
                            <span className="text-xs font-medium ml-auto" style={{ color: '#ff5a5f' }}>View on Airbnb →</span>
                          </div>
                        </div>
                      </a>
                    </div>
                    );
                  })}
                </div>
                
                {/* See All / Collapse button */}
                {comps.length > 5 && (
                  <button
                    onClick={() => setShowAllComps(!showAllComps)}
                    className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: showAllComps ? '#f5f4f0' : '#2b2823',
                      color: showAllComps ? '#2b2823' : '#ffffff',
                      border: showAllComps ? '1px solid #e5e3da' : 'none',
                    }}
                  >
                    {showAllComps
                      ? `Show Less`
                      : `See All ${comps.length} Comps`
                    }
                  </button>
                )}
                
                <p className="text-xs mt-3 text-center" style={{ color: '#a09880' }}>
                  Tap checkboxes to include/exclude listings • Revenue on each card is estimated from its nightly rate
                </p>
              </div>
              );
            })()}

            {/* ===== Interactive Comp Map — right after comp cards for natural spatial context ===== */}
            {result.comparables && result.comparables.length > 0 && (() => {
              // Use targetCoords (always geocoded from actual address) as the primary source
              // This ensures the pin is ALWAYS on the searched property, never on a random comp
              let mapTargetLat = targetCoords?.lat || 0;
              let mapTargetLng = targetCoords?.lng || 0;
              
              // Fallback to result.targetCoordinates if targetCoords not yet resolved
              if (mapTargetLat === 0 && mapTargetLng === 0 && result.targetCoordinates && result.targetCoordinates.latitude !== 0 && result.targetCoordinates.longitude !== 0) {
                mapTargetLat = result.targetCoordinates.latitude;
                mapTargetLng = result.targetCoordinates.longitude;
              }
              
              // Final fallback: compute center from comps with valid coords so the map still renders
              // This ensures the map ALWAYS shows when there are comps, even if geocode is slow
              if (mapTargetLat === 0 && mapTargetLng === 0) {
                const validComps = result.comparables.filter(
                  (c: any) => c.latitude && c.longitude && c.latitude !== 0 && c.longitude !== 0
                );
                if (validComps.length > 0) {
                  // Use median of comp coordinates as approximate center
                  const lats = validComps.map((c: any) => c.latitude).sort((a: number, b: number) => a - b);
                  const lngs = validComps.map((c: any) => c.longitude).sort((a: number, b: number) => a - b);
                  mapTargetLat = lats[Math.floor(lats.length / 2)];
                  mapTargetLng = lngs[Math.floor(lngs.length / 2)];
                }
              }
              
              // If still no coordinates at all, don't render the map
              if (mapTargetLat === 0 && mapTargetLng === 0) return null;
              
              return (
                <CalculatorErrorBoundary fallback={
                  <div className="p-6 text-center rounded-2xl" style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <p className="text-sm" style={{ color: '#ef4444' }}>Map failed to load. Try refreshing the page.</p>
                  </div>
                }>
                  <CompMap
                    comparables={result.comparables}
                    targetLat={mapTargetLat}
                    targetLng={mapTargetLng}
                    targetAddress={result.address}
                    excludedIds={excludedCompIds}
                    dataSource={result.dataSource}
                    listingsAnalyzed={result.percentiles?.listingsAnalyzed || result.percentiles?.totalListingsInArea}
                    searchRadiusMiles={(result as any).searchRadiusMiles}
                    onSelectComp={(comp) => {
                      const compEl = document.getElementById(`comp-card-${comp.id}`);
                      if (compEl) compEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  />
                </CalculatorErrorBoundary>
              );
            })()}

            {/* Comp Calendar Heatmap */}
            {Object.keys(realOccupancyData).length > 0 && result.comparables && result.comparables.length > 0 && (
              <CompCalendar
                comparables={result.comparables.map(c => ({
                  id: String(c.id || ''),
                  name: c.name || 'Listing',
                  url: c.url || '',
                  adr: c.nightPrice,
                  occupancy: c.occupancy,
                }))}
                occupancyData={realOccupancyData}
              />
            )}

            {/* Comp Amenity Comparison */}
            {result.comparables && result.comparables.length > 0 && (
              <CompAmenityComparison
                comparables={result.comparables.map(c => ({
                  id: String(c.id || ''),
                  name: c.name || 'Listing',
                  amenities: c.amenities || [],
                  nightPrice: c.nightPrice,
                  rating: c.rating,
                  isSuperhost: c.isSuperhost || false,
                }))}
                excludedCompIds={excludedCompIds}
              />
            )}

            {/* Recommended Amenities for 90th Percentile */}
            {result.recommendedAmenities && result.recommendedAmenities.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>
                  🎯 Upgrades to Reach 90th Percentile
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Based on 25-mile market analysis of top-performing Airbnbs. These upgrades and amenities have the highest impact on revenue.
                </p>
                <div className="space-y-2">
                  {result.recommendedAmenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        backgroundColor: amenity.priority === 'MUST HAVE' ? '#f0fdf4' : amenity.priority === 'HIGH IMPACT' ? '#fefce8' : '#f5f4f0'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{amenity.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{amenity.name}</p>
                          <p className="text-xs" style={{
                            color: amenity.priority === 'MUST HAVE' ? '#16a34a' : amenity.priority === 'HIGH IMPACT' ? '#ca8a04' : '#6b7280'
                          }}>
                            {amenity.priority}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">+{amenity.boost}%</p>
                        <p className="text-xs text-gray-500">revenue boost</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Startup Costs - Teeco Services */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold" style={{ color: "#2b2823" }}>Startup Costs</h3>
                {/* Student Discount Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={studentDiscount}
                    onChange={(e) => setStudentDiscount(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-green-600">20% Student Discount</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-4">One-time setup expenses (toggle on/off)</p>
              
              {/* Property Sqft Input */}
              <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <label className="text-sm font-medium block mb-2" style={{ color: "#787060" }}>
                  Property Square Footage (for cost calculation)
                </label>
                <input
                  type="number"
                  value={propertySqft}
                  onChange={(e) => setPropertySqft(parseInt(e.target.value) || 1500)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200"
                  placeholder="Enter sqft..."
                />
                {result.sqft > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Market data: {result.sqft} sqft</p>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Design Services - $7/sqft */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeDesignServices ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeDesignServices}
                      onChange={(e) => setIncludeDesignServices(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Teeco Design Services</p>
                      <p className="text-xs text-gray-500">$7/sqft • Interior design & styling{studentDiscount && " (20% off)"}</p>
                    </div>
                  </div>
                  <p className="font-semibold" style={{ color: includeDesignServices ? "#22c55e" : "#787060" }}>
                    {formatCurrency(calculateDesignCost())}
                  </p>
                </div>
                
                {/* Setup Services - $13/sqft */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeSetupServices ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeSetupServices}
                      onChange={(e) => setIncludeSetupServices(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Teeco Setup Services</p>
                      <p className="text-xs text-gray-500">$13/sqft • Full property setup & staging{studentDiscount && " (20% off)"}</p>
                    </div>
                  </div>
                  <p className="font-semibold" style={{ color: includeSetupServices ? "#22c55e" : "#787060" }}>
                    {formatCurrency(calculateSetupCost())}
                  </p>
                </div>
                
                {/* Furnishings */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeFurnishings ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeFurnishings}
                      onChange={(e) => setIncludeFurnishings(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Furnishings</p>
                      <p className="text-xs text-gray-500">~$15/sqft • Furniture, decor, linens</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={furnishingsCost}
                    onChange={(e) => setFurnishingsCost(parseInt(e.target.value) || 0)}
                    className="w-28 px-3 py-2 rounded-lg text-right font-semibold"
                    style={{ 
                      backgroundColor: includeFurnishings ? "#dcfce7" : "#e5e3da",
                      border: "2px solid",
                      borderColor: includeFurnishings ? "#22c55e" : "#787060",
                      color: includeFurnishings ? "#166534" : "#2b2823"
                    }}
                  />
                </div>
                
                {/* Upgrades & Amenities */}
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: includeAmenities ? "#f0fdf4" : "#f5f4f0" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeAmenities}
                      onChange={(e) => setIncludeAmenities(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-medium" style={{ color: "#2b2823" }}>Upgrades & Amenities</p>
                      <p className="text-xs text-gray-500">Hot tub, fire pit, game room, etc.</p>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={amenitiesCost}
                    onChange={(e) => setAmenitiesCost(parseInt(e.target.value) || 0)}
                    className="w-28 px-3 py-2 rounded-lg text-right font-semibold"
                    style={{ 
                      backgroundColor: includeAmenities ? "#dcfce7" : "#e5e3da",
                      border: "2px solid",
                      borderColor: includeAmenities ? "#22c55e" : "#787060",
                      color: includeAmenities ? "#166534" : "#2b2823"
                    }}
                  />
              </div>
              
              {/* Total Startup Costs */}
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#2b2823" }}>
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Startup Costs</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(calculateStartupCosts())}</span>
                </div>
              </div>
            </div>

            {/* Monthly Operating Expenses */}
            <div className="rounded-2xl p-6 mt-2" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Monthly Operating Expenses</h3>
              <p className="text-sm text-gray-500 mb-4">Recurring costs to run your STR</p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1: Electric & Water */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Electric</label>
                  <input
                    type="number"
                    value={electricMonthly}
                    onChange={(e) => setElectricMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Water</label>
                  <input
                    type="number"
                    value={waterMonthly}
                    onChange={(e) => setWaterMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 2: Internet & Trash */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Internet</label>
                  <input
                    type="number"
                    value={internetMonthly}
                    onChange={(e) => setInternetMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Trash</label>
                  <input
                    type="number"
                    value={trashMonthly}
                    onChange={(e) => setTrashMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 3: Lawn Care & Pest Control */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Lawn Care</label>
                  <input
                    type="number"
                    value={lawnCareMonthly}
                    onChange={(e) => setLawnCareMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Pest Control</label>
                  <input
                    type="number"
                    value={pestControlMonthly}
                    onChange={(e) => setPestControlMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 4: House Supplies (Cleaning note) */}
                <div className="col-span-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                  <p className="text-xs text-gray-500">💡 <strong>Cleaning fees & pet fees</strong> are typically passed on to guests as separate line items and are not included in your expenses.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">House Supplies</label>
                  <input
                    type="number"
                    value={houseSuppliesMonthly}
                    onChange={(e) => setHouseSuppliesMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 5: Supplies & Consumables + Maintenance */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Supplies & Consumables</label>
                  <input
                    type="number"
                    value={suppliesConsumablesMonthly}
                    onChange={(e) => setSuppliesConsumablesMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                    placeholder="Toiletries, linens, kitchen"
                  />
                </div>
                
                {/* Row 6: Maintenance & Rental Software */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Maintenance/Repair</label>
                  <input
                    type="number"
                    value={maintenanceMonthly}
                    onChange={(e) => setMaintenanceMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Rental Software</label>
                  <input
                    type="number"
                    value={rentalSoftwareMonthly}
                    onChange={(e) => setRentalSoftwareMonthly(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium" style={{ color: "#787060" }}>Est. Monthly Operating</span>
                  <span className="text-lg font-bold" style={{ color: "#2b2823" }}>{formatCurrency(calculateMonthlyExpenses())}</span>
                </div>
              </div>
              
              {/* Monthly Costs Help */}
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd" }}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: "#0369a1" }}>Not sure about these costs?</p>
                    <p className="text-xs mt-1" style={{ color: "#0284c7" }}>
                      Ask our Edge assistant about typical costs in this area.
                    </p>
                    <button
                      onClick={() => {
                        const chatButton = document.querySelector('button[class*="fixed bottom-24 right-4"]') as HTMLButtonElement;
                        if (chatButton) chatButton.click();
                      }}
                      className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all hover:scale-105"
                      style={{ backgroundColor: "#0369a1", color: "#ffffff" }}
                    >
                      💬 Ask Edge Assistant
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Calculator - Mode Conditional */}
            <div className="rounded-2xl p-6 mt-2" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              {analysisMode === "buying" ? (
                <>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Investment Calculator</h3>
                  <p className="text-sm text-gray-500 mb-4">Calculate your potential returns</p>
                  
                  {/* Purchase Price */}
                  <div className="mb-4">
                    <label className="text-sm font-medium block mb-2" style={{ color: "#787060" }}>Purchase Price</label>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="Enter purchase price..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-lg"
                    />
                  </div>
                  
                  {/* Sliders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Down Payment</span>
                        <span className="font-medium">{downPaymentPercent}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={downPaymentPercent} onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Interest Rate</span>
                        <span className="font-medium">{interestRate.toFixed(1)}%</span>
                      </div>
                      <input type="range" min="3" max="12" step="0.1" value={interestRate} onChange={(e) => setInterestRate(parseFloat(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Loan Term</span>
                        <span className="font-medium">{loanTerm} years</span>
                      </div>
                      <div className="flex gap-2">
                        {[15, 20, 30].map((term) => (
                          <button key={term} onClick={() => setLoanTerm(term)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${loanTerm === term ? "text-white" : "bg-gray-100 text-gray-600"}`} style={loanTerm === term ? { backgroundColor: "#2b2823" } : {}}>{term}yr</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Property Tax Rate</span>
                        <span className="font-medium">{propertyTaxRate.toFixed(1)}%</span>
                      </div>
                      <input type="range" min="0.5" max="3" step="0.1" value={propertyTaxRate} onChange={(e) => setPropertyTaxRate(parseFloat(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Management Fee</span>
                        <span className="font-medium">{managementFeePercent}%</span>
                      </div>
                      <input type="range" min="0" max="35" value={managementFeePercent} onChange={(e) => setManagementFeePercent(parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <label className="text-sm block mb-1" style={{ color: "#787060" }}>STR Insurance (Annual)</label>
                      <input type="number" value={insuranceAnnual} onChange={(e) => setInsuranceAnnual(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Platform Fee (Airbnb)</span>
                        <span className="font-medium">{platformFeePercent}%</span>
                      </div>
                      <input type="range" min="0" max="15" value={platformFeePercent} onChange={(e) => setPlatformFeePercent(parseInt(e.target.value))} className="w-full" />
                    </div>
                  </div>
                  
                  {/* Investment Results */}
                  {investment.needsPrice ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-amber-700 text-sm">👆 Enter a purchase price above to see ROI calculations</p>
                    </div>
                  ) : (
                    <>
                      {/* Key Metrics */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 rounded-xl" style={{ backgroundColor: investment.monthlyCashFlow >= 0 ? "#ecfdf5" : "#fef2f2" }}>
                          <p className="text-xs text-gray-500">Monthly Cash Flow</p>
                          <p className={`text-xl font-bold ${investment.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(investment.monthlyCashFlow)}</p>
                        </div>
                        <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                          <p className="text-xs text-gray-500">Cash-on-Cash</p>
                          <p className="text-xl font-bold" style={{ color: "#2b2823" }}>{investment.cashOnCashReturn.toFixed(1)}%</p>
                          {(includeDesignServices || includeSetupServices || includeFurnishings) && (() => {
                            // Calculate CoC without startup costs to show the impact
                            const cocWithoutStartup = (investment.totalCashNeeded - investment.startupCosts) > 0
                              ? (investment.cashFlow / (investment.totalCashNeeded - investment.startupCosts)) * 100 : 0;
                            return cocWithoutStartup > investment.cashOnCashReturn ? (
                              <p className="text-[10px] text-gray-400 mt-1">{cocWithoutStartup.toFixed(1)}% without setup</p>
                            ) : null;
                          })()}
                        </div>
                        <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                          <p className="text-xs text-gray-500">Total Cash Needed</p>
                          <p className="text-xl font-bold" style={{ color: "#2b2823" }}>{formatCurrency(investment.totalCashNeeded)}</p>
                        </div>
                      </div>
                      
                      {/* Expense Breakdown */}
                      <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                        <h4 className="font-medium mb-3" style={{ color: "#2b2823" }}>Annual Expense Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Mortgage (P&I)</span><span className="font-medium">{formatCurrency(investment.monthlyMortgage * 12)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Property Tax</span><span className="font-medium">{formatCurrency(investment.annualPropertyTax)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">STR Insurance</span><span className="font-medium">{formatCurrency(investment.annualInsurance)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Management ({managementFeePercent}%)</span><span className="font-medium">{formatCurrency(investment.annualManagement)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Platform Fee ({platformFeePercent}%)</span><span className="font-medium">{formatCurrency(investment.annualPlatformFee)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Operating Expenses</span><span className="font-medium">{formatCurrency(investment.monthlyOperating * 12)}</span></div>
                          <div className="border-t border-gray-300 pt-2 mt-2"><div className="flex justify-between font-medium"><span>Total Annual Expenses</span><span className="text-red-600">{formatCurrency(investment.totalAnnualExpenses)}</span></div></div>
                          <div className="flex justify-between font-medium"><span>Gross Revenue</span><span className="text-green-600">{formatCurrency(getDisplayRevenue())}</span></div>
                          <div className="border-t border-gray-300 pt-2 mt-2"><div className="flex justify-between font-bold text-lg"><span>Annual Cash Flow</span><span className={investment.cashFlow >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(investment.cashFlow)}</span></div></div>
                        </div>
                      </div>
                      
                      {/* ROI Timeline Chart */}
                      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#ffffff", border: "1px solid #e5e3da" }}>
                        <h4 className="font-medium mb-4" style={{ color: "#2b2823" }}>10-Year Investment Projection</h4>
                        <div className="relative">
                          <div className="flex items-end gap-1 h-40 mb-2">
                            {(() => {
                              // Proper amortization: calculate cumulative principal paid per year
                              const price = parseFloat(purchasePrice) || 0;
                              const loanAmt = price - investment.downPayment;
                              const monthlyR = interestRate / 100 / 12;
                              const nPayments = loanTerm * 12;
                              
                              // Build cumulative principal schedule
                              const cumulativePrincipal: number[] = [];
                              let remainingBalance = loanAmt;
                              let totalPrincipalPaid = 0;
                              for (let yr = 1; yr <= 10; yr++) {
                                for (let m = 0; m < 12; m++) {
                                  if (remainingBalance <= 0) break;
                                  const interestPayment = remainingBalance * monthlyR;
                                  const principalPayment = Math.min(investment.monthlyMortgage - interestPayment, remainingBalance);
                                  totalPrincipalPaid += Math.max(0, principalPayment);
                                  remainingBalance -= Math.max(0, principalPayment);
                                }
                                cumulativePrincipal.push(totalPrincipalPaid);
                              }
                              
                              // Calculate max return for bar scaling
                              const yr10Principal = cumulativePrincipal[9] || 0;
                              const yr10Appreciation = price * 0.03 * 10;
                              const maxReturn = (investment.cashFlow * 10) + investment.downPayment + yr10Principal + yr10Appreciation - investment.totalCashNeeded;
                              
                              return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => {
                              const annualCashFlow = investment.cashFlow;
                              const cumulativeCashFlow = annualCashFlow * year;
                              const principalPaid = cumulativePrincipal[year - 1] || 0;
                              const appreciation = price * 0.03 * year;
                              const totalEquity = investment.downPayment + principalPaid + appreciation;
                              const totalReturn = cumulativeCashFlow + totalEquity - investment.totalCashNeeded;
                              const heightPercent = maxReturn > 0 ? Math.max(10, Math.min(100, (totalReturn / maxReturn) * 100)) : 50;
                              const isPositive = totalReturn >= 0;
                              return (
                                <div key={year} className="flex-1 flex flex-col items-center justify-end h-full">
                                  <div className="w-full rounded-t transition-all" style={{ height: `${heightPercent}%`, backgroundColor: isPositive ? '#22c55e' : '#ef4444', opacity: 0.7 + (year * 0.03) }} title={`Year ${year}: ${formatCurrency(totalReturn)} total return`}></div>
                                </div>
                              );
                            });
                            })()}
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => (
                              <div key={year} className="flex-1 text-center min-w-0"><span className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: "#787060" }}>{year}</span></div>
                            ))}
                          </div>
                          <p className="text-[10px] text-center mt-1" style={{ color: "#a0a0a0" }}>Years</p>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                            <p className="text-xs text-gray-500">10-Yr Cash Flow</p>
                            <p className={`font-bold ${investment.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(investment.cashFlow * 10)}</p>
                          </div>
                          {(() => {
                            // Proper amortization for summary metrics
                            const price = parseFloat(purchasePrice) || 0;
                            const loanAmt = price - investment.downPayment;
                            const monthlyR = interestRate / 100 / 12;
                            let bal = loanAmt;
                            let totalPrin = 0;
                            for (let i = 0; i < 120; i++) {
                              if (bal <= 0) break;
                              const intPmt = bal * monthlyR;
                              const prinPmt = Math.min(investment.monthlyMortgage - intPmt, bal);
                              totalPrin += Math.max(0, prinPmt);
                              bal -= Math.max(0, prinPmt);
                            }
                            const appreciation10 = price * 0.03 * 10;
                            const equityBuilt = investment.downPayment + totalPrin + appreciation10;
                            const totalReturn10 = (investment.cashFlow * 10) + equityBuilt - investment.totalCashNeeded;
                            return (
                              <>
                                <div className="p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                                  <p className="text-xs text-gray-500">Est. Equity Built</p>
                                  <p className="font-bold" style={{ color: "#2b2823" }}>{formatCurrency(equityBuilt)}</p>
                                </div>
                                <div className="p-3 rounded-lg" style={{ backgroundColor: "#ecfdf5" }}>
                                  <p className="text-xs text-gray-500">Total 10-Yr Return</p>
                                  <p className="font-bold text-green-600">{formatCurrency(totalReturn10)}</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">*Assumes 3% annual appreciation and average principal paydown</p>
                      </div>
                    </>
                  )}
                </>
              ) : analysisMode === "arbitrage" ? (
                /* ========== ARBITRAGE MODE ========== */
                <>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>🔑 Arbitrage Calculator</h3>
                  <p className="text-sm text-gray-500 mb-4">Calculate your rental arbitrage returns</p>
                  
                  {/* Monthly Rent */}
                  <div className="mb-4">
                    <label className="text-sm font-medium block mb-2" style={{ color: "#787060" }}>Monthly Rent to Landlord</label>
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(e.target.value)}
                      placeholder="Enter monthly rent..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-lg"
                    />
                  </div>
                  
                  {/* Arbitrage-specific inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-sm block mb-1" style={{ color: "#787060" }}>Security Deposit</label>
                      <input
                        type="number"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(e.target.value)}
                        placeholder={monthlyRent ? `Default: ${formatCurrency(parseFloat(monthlyRent) || 0)}` : "Enter deposit..."}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200"
                      />
                      <p className="text-xs text-gray-400 mt-1">Usually 1-2 months rent</p>
                    </div>
                    <div>
                      <label className="text-sm block mb-1" style={{ color: "#787060" }}>First & Last Month</label>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => setFirstLastMonth(true)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium ${firstLastMonth ? "text-white" : "bg-gray-100 text-gray-600"}`}
                          style={firstLastMonth ? { backgroundColor: "#2b2823" } : {}}
                        >
                          First + Last
                        </button>
                        <button
                          onClick={() => setFirstLastMonth(false)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium ${!firstLastMonth ? "text-white" : "bg-gray-100 text-gray-600"}`}
                          style={!firstLastMonth ? { backgroundColor: "#2b2823" } : {}}
                        >
                          First Only
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Required upfront rent payments</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Management Fee</span>
                        <span className="font-medium">{managementFeePercent}%</span>
                      </div>
                      <input type="range" min="0" max="35" value={managementFeePercent} onChange={(e) => setManagementFeePercent(parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <label className="text-sm block mb-1" style={{ color: "#787060" }}>Monthly Liability Insurance</label>
                      <input
                        type="number"
                        value={landlordInsuranceMonthly}
                        onChange={(e) => setLandlordInsuranceMonthly(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200"
                      />
                      <p className="text-xs text-gray-400 mt-1">Renter&apos;s / STR liability insurance</p>
                    </div>
                  </div>
                  
                  {/* Upfront Cost Summary */}
                  {!arbitrage.needsRent && (
                    <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                      <h4 className="font-medium mb-3" style={{ color: "#2b2823" }}>Upfront Cost to Control Property</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Security Deposit</span>
                          <span className="font-medium">{formatCurrency(arbitrage.securityDepositAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{firstLastMonth ? "First + Last Month Rent" : "First Month Rent"}</span>
                          <span className="font-medium">{formatCurrency(arbitrage.firstLastMonthCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Startup Costs (furnishing, etc.)</span>
                          <span className="font-medium">{formatCurrency(arbitrage.startupCosts)}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span>Total Cash to Get Started</span>
                            <span style={{ color: "#2b2823" }}>{formatCurrency(arbitrage.totalCashNeeded)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Arbitrage Results */}
                  {arbitrage.needsRent ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-amber-700 text-sm">👆 Enter your monthly rent above to see arbitrage ROI calculations</p>
                    </div>
                  ) : (
                    <>
                      {/* Key Metrics */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 rounded-xl" style={{ backgroundColor: arbitrage.monthlyCashFlow >= 0 ? "#ecfdf5" : "#fef2f2" }}>
                          <p className="text-xs text-gray-500">Monthly Cash Flow</p>
                          <p className={`text-xl font-bold ${arbitrage.monthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(arbitrage.monthlyCashFlow)}</p>
                        </div>
                        <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                          <p className="text-xs text-gray-500">Cash-on-Cash</p>
                          <p className="text-xl font-bold" style={{ color: "#2b2823" }}>{arbitrage.cashOnCashReturn.toFixed(1)}%</p>
                          {(includeDesignServices || includeSetupServices || includeFurnishings) && (() => {
                            const cocWithoutStartup = (arbitrage.totalCashNeeded - arbitrage.startupCosts) > 0
                              ? (arbitrage.cashFlow / (arbitrage.totalCashNeeded - arbitrage.startupCosts)) * 100 : 0;
                            return cocWithoutStartup > arbitrage.cashOnCashReturn ? (
                              <p className="text-[10px] text-gray-400 mt-1">{cocWithoutStartup.toFixed(1)}% without setup</p>
                            ) : null;
                          })()}
                        </div>
                        <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                          <p className="text-xs text-gray-500">Total Cash Needed</p>
                          <p className="text-xl font-bold" style={{ color: "#2b2823" }}>{formatCurrency(arbitrage.totalCashNeeded)}</p>
                        </div>
                      </div>
                      
                      {/* Expense Breakdown */}
                      <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                        <h4 className="font-medium mb-3" style={{ color: "#2b2823" }}>Annual Expense Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Rent to Landlord</span><span className="font-medium">{formatCurrency(arbitrage.annualRent)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Management ({managementFeePercent}%)</span><span className="font-medium">{formatCurrency(arbitrage.annualManagement)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Platform Fee ({platformFeePercent}%)</span><span className="font-medium">{formatCurrency(arbitrage.annualPlatformFee)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Liability Insurance</span><span className="font-medium">{formatCurrency(arbitrage.annualInsurance)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Operating Expenses</span><span className="font-medium">{formatCurrency(arbitrage.monthlyOperating * 12)}</span></div>
                          <div className="border-t border-gray-300 pt-2 mt-2"><div className="flex justify-between font-medium"><span>Total Annual Expenses</span><span className="text-red-600">{formatCurrency(arbitrage.totalAnnualExpenses)}</span></div></div>
                          <div className="flex justify-between font-medium"><span>Gross Revenue</span><span className="text-green-600">{formatCurrency(getDisplayRevenue())}</span></div>
                          <div className="border-t border-gray-300 pt-2 mt-2"><div className="flex justify-between font-bold text-lg"><span>Annual Cash Flow</span><span className={arbitrage.cashFlow >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(arbitrage.cashFlow)}</span></div></div>
                        </div>
                      </div>
                      
                      {/* Payback Period */}
                      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#ffffff", border: "1px solid #e5e3da" }}>
                        <h4 className="font-medium mb-4" style={{ color: "#2b2823" }}>Payback Timeline</h4>
                        <div className="relative">
                          {(() => {
                            const monthlyCF = arbitrage.monthlyCashFlow;
                            const totalInvested = arbitrage.totalCashNeeded;
                            const paybackMonths = monthlyCF > 0 ? Math.ceil(totalInvested / monthlyCF) : 0;
                            const maxMonths = 24; // Show up to 24 months
                            
                            return (
                              <>
                                <div className="flex items-end gap-0.5 h-32 mb-2">
                                  {Array.from({ length: Math.min(maxMonths, 24) }, (_, i) => i + 1).map((month) => {
                                    const cumulative = monthlyCF * month;
                                    const percentRecovered = totalInvested > 0 ? Math.min(100, (cumulative / totalInvested) * 100) : 0;
                                    const isPaidBack = cumulative >= totalInvested;
                                    return (
                                      <div key={month} className="flex-1 flex flex-col items-center justify-end h-full">
                                        <div
                                          className="w-full rounded-t transition-all"
                                          style={{
                                            height: `${Math.max(5, percentRecovered)}%`,
                                            backgroundColor: isPaidBack ? '#22c55e' : monthlyCF > 0 ? '#f59e0b' : '#ef4444',
                                            opacity: 0.7 + (month * 0.01),
                                          }}
                                          title={`Month ${month}: ${formatCurrency(cumulative)} recovered`}
                                        ></div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: Math.min(maxMonths, 24) }, (_, i) => i + 1).map((month) => (
                                    <div key={month} className="flex-1 text-center min-w-0">
                                      {month % 3 === 0 && <span className="text-[9px]" style={{ color: "#787060" }}>{month}</span>}
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[10px] text-center mt-1" style={{ color: "#a0a0a0" }}>Months</p>
                                
                                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                                  <div className="p-3 rounded-lg" style={{ backgroundColor: monthlyCF > 0 ? "#ecfdf5" : "#fef2f2" }}>
                                    <p className="text-xs text-gray-500">Payback Period</p>
                                    <p className="font-bold" style={{ color: monthlyCF > 0 ? "#16a34a" : "#ef4444" }}>
                                      {monthlyCF > 0 ? `${paybackMonths} months` : "N/A"}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                                    <p className="text-xs text-gray-500">Year 1 Profit</p>
                                    <p className={`font-bold ${arbitrage.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatCurrency(arbitrage.cashFlow)}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                                    <p className="text-xs text-gray-500">Year 2 Profit</p>
                                    <p className={`font-bold ${arbitrage.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatCurrency(arbitrage.cashFlow * 2 - arbitrage.totalCashNeeded)}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">*Year 2+ assumes no additional startup costs (deposit already paid)</p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                /* ========== I OWN IT MODE ========== */
                <>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>🏡 I Own It Calculator</h3>
                  <p className="text-sm text-gray-500 mb-4">Compare STR income vs Long-Term Rental (HUD Fair Market Rent)</p>
                  
                  {/* Monthly Mortgage (optional) */}
                  <div className="mb-4">
                    <label className="text-sm font-medium block mb-2" style={{ color: "#787060" }}>Monthly Mortgage Payment <span className="text-gray-400 font-normal">(optional — leave blank if paid off)</span></label>
                    <input
                      type="number"
                      value={iownitMortgage}
                      onChange={(e) => setIownitMortgage(e.target.value)}
                      placeholder="Enter monthly mortgage..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-lg"
                    />
                  </div>
                  
                  {/* Property Tax & Insurance */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Property Tax Rate</span>
                        <span className="font-medium">{iownitPropertyTaxRate.toFixed(1)}%</span>
                      </div>
                      <input type="range" min="0.5" max="3" step="0.1" value={iownitPropertyTaxRate} onChange={(e) => setIownitPropertyTaxRate(parseFloat(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <label className="text-sm block mb-1" style={{ color: "#787060" }}>STR Insurance (Annual)</label>
                      <input type="number" value={iownitInsuranceAnnual} onChange={(e) => setIownitInsuranceAnnual(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-gray-200" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Management Fee</span>
                        <span className="font-medium">{managementFeePercent}%</span>
                      </div>
                      <input type="range" min="0" max="35" value={managementFeePercent} onChange={(e) => setManagementFeePercent(parseInt(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Platform Fee (Airbnb)</span>
                        <span className="font-medium">{platformFeePercent}%</span>
                      </div>
                      <input type="range" min="0" max="15" value={platformFeePercent} onChange={(e) => setPlatformFeePercent(parseInt(e.target.value))} className="w-full" />
                    </div>
                  </div>
                  
                  {/* HUD FMR Data Display */}
                  {isLoadingFmr ? (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-blue-700 text-sm">Loading HUD Fair Market Rent data...</p>
                      </div>
                    </div>
                  ) : fmrError ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                      <p className="text-amber-700 text-sm">⚠️ {fmrError}</p>
                    </div>
                  ) : hudFmrData ? (
                    <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "#f0f7ff", border: "1px solid #bfdbfe" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium" style={{ color: "#1e40af" }}>🏢 HUD Fair Market Rent — {hudFmrData.areaName}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{hudFmrData.year}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[0, 1, 2, 3, 4].map(br => (
                          <div key={br} className={`p-2 rounded-lg ${br === (bedrooms || 3) ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white'}`}>
                            <p className="text-[10px] text-gray-500">{br === 0 ? 'Studio' : `${br}BR`}</p>
                            <p className={`text-sm font-bold ${br === (bedrooms || 3) ? 'text-blue-700' : 'text-gray-700'}`}>${(hudFmrData.byBedrooms[br] || 0).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">
                        Source: U.S. Department of Housing and Urban Development
                        {hudFmrData.source === 'state-average' && ' (state average — county-level data temporarily unavailable)'}
                      </p>
                    </div>
                  ) : null}
                  
                  {/* STR vs LTR Comparison Results */}
                  {hudFmrData ? (
                    <>
                      {/* Head-to-Head Comparison */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className={`text-center p-4 rounded-xl ${iownit.strWins ? 'ring-2 ring-green-400' : ''}`} style={{ backgroundColor: iownit.strMonthlyCashFlow >= 0 ? "#ecfdf5" : "#fef2f2" }}>
                          <p className="text-xs text-gray-500 mb-1">🏠 STR Monthly Net</p>
                          <p className={`text-2xl font-bold ${iownit.strMonthlyCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(iownit.strMonthlyCashFlow)}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatCurrency(iownit.grossRevenue)}/yr gross</p>
                        </div>
                        <div className={`text-center p-4 rounded-xl ${!iownit.strWins ? 'ring-2 ring-blue-400' : ''}`} style={{ backgroundColor: iownit.ltrMonthlyCashFlow >= 0 ? "#eff6ff" : "#fef2f2" }}>
                          <p className="text-xs text-gray-500 mb-1">🏢 LTR Monthly Net</p>
                          <p className={`text-2xl font-bold ${iownit.ltrMonthlyCashFlow >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(iownit.ltrMonthlyCashFlow)}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatCurrency(iownit.fmrMonthly)}/mo HUD FMR</p>
                        </div>
                      </div>
                      
                      {/* Verdict Banner */}
                      <div className={`p-4 rounded-xl mb-4 text-center ${iownit.strWins ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                        <p className={`text-lg font-bold ${iownit.strWins ? 'text-green-700' : 'text-blue-700'}`}>
                          {iownit.strWins ? '🚀 STR wins by ' : '🏢 LTR wins by '}
                          {formatCurrency(Math.abs(iownit.monthlyDifference))}/mo
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          That&apos;s {formatCurrency(Math.abs(iownit.annualDifference))} more per year with {iownit.strWins ? 'Short-Term Rental' : 'Long-Term Rental'}
                        </p>
                      </div>
                      
                      {/* ── STR vs LTR Visual Bar Chart ── */}
                      {(() => {
                        const maxVal = Math.max(
                          iownit.grossRevenue,
                          iownit.ltrGrossAnnual,
                          iownit.totalAnnualExpenses,
                          iownit.ltrTotalExpenses,
                          Math.abs(iownit.strCashFlow),
                          Math.abs(iownit.ltrCashFlow),
                          1
                        );
                        const barPct = (val: number) => Math.max(3, Math.min(100, (Math.abs(val) / maxVal) * 100));
                        
                        const rows: { label: string; strVal: number; ltrVal: number; strColor: string; ltrColor: string; isCashFlow?: boolean }[] = [
                          { label: "Revenue", strVal: iownit.grossRevenue, ltrVal: iownit.ltrGrossAnnual, strColor: "#22c55e", ltrColor: "#3b82f6" },
                          { label: "Expenses", strVal: iownit.totalAnnualExpenses, ltrVal: iownit.ltrTotalExpenses, strColor: "#f87171", ltrColor: "#f87171" },
                          { label: "Net Cash Flow", strVal: iownit.strCashFlow, ltrVal: iownit.ltrCashFlow, strColor: iownit.strCashFlow >= 0 ? "#16a34a" : "#ef4444", ltrColor: iownit.ltrCashFlow >= 0 ? "#2563eb" : "#ef4444", isCashFlow: true },
                        ];
                        
                        return (
                          <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}>
                            <h4 className="font-medium mb-4 text-sm" style={{ color: "#2b2823" }}>📊 Annual Comparison</h4>
                            
                            {/* Legend */}
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e" }}></div>
                                <span className="text-xs text-gray-600">STR</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6" }}></div>
                                <span className="text-xs text-gray-600">LTR</span>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              {rows.map((row) => (
                                <div key={row.label}>
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className={`text-xs ${row.isCashFlow ? 'font-semibold' : ''} text-gray-600`}>{row.label}</span>
                                  </div>
                                  {/* STR bar */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] text-gray-400 w-7 text-right">STR</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${barPct(row.strVal)}%`, backgroundColor: row.strColor, opacity: 0.85 }}
                                      ></div>
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium" style={{ color: barPct(row.strVal) > 60 ? '#fff' : '#374151' }}>
                                        {row.strVal < 0 ? '-' : ''}{formatCurrency(Math.abs(row.strVal))}
                                      </span>
                                    </div>
                                  </div>
                                  {/* LTR bar */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 w-7 text-right">LTR</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${barPct(row.ltrVal)}%`, backgroundColor: row.ltrColor, opacity: 0.85 }}
                                      ></div>
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium" style={{ color: barPct(row.ltrVal) > 60 ? '#fff' : '#374151' }}>
                                        {row.ltrVal < 0 ? '-' : ''}{formatCurrency(Math.abs(row.ltrVal))}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Monthly net comparison mini-cards */}
                            <div className="grid grid-cols-2 gap-3 mt-4 pt-3" style={{ borderTop: "1px solid #f3f4f6" }}>
                              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: iownit.strMonthlyCashFlow >= 0 ? "#f0fdf4" : "#fef2f2" }}>
                                <p className="text-[10px] text-gray-500">STR Monthly</p>
                                <p className={`text-sm font-bold ${iownit.strMonthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(iownit.strMonthlyCashFlow)}</p>
                              </div>
                              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: iownit.ltrMonthlyCashFlow >= 0 ? "#eff6ff" : "#fef2f2" }}>
                                <p className="text-[10px] text-gray-500">LTR Monthly</p>
                                <p className={`text-sm font-bold ${iownit.ltrMonthlyCashFlow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(iownit.ltrMonthlyCashFlow)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* STR Expense Breakdown */}
                      <div className="p-4 rounded-xl mb-3" style={{ backgroundColor: "#f5f4f0" }}>
                        <h4 className="font-medium mb-3" style={{ color: "#2b2823" }}>🏠 STR Annual Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Gross Revenue</span><span className="font-medium text-green-600">{formatCurrency(iownit.grossRevenue)}</span></div>
                          {iownit.annualMortgage > 0 && <div className="flex justify-between"><span className="text-gray-600">Mortgage</span><span className="font-medium">-{formatCurrency(iownit.annualMortgage)}</span></div>}
                          {iownit.annualPropertyTax > 0 && <div className="flex justify-between"><span className="text-gray-600">Property Tax ({iownitPropertyTaxRate}%)</span><span className="font-medium">-{formatCurrency(iownit.annualPropertyTax)}</span></div>}
                          <div className="flex justify-between"><span className="text-gray-600">STR Insurance</span><span className="font-medium">-{formatCurrency(iownit.annualInsurance)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Management ({managementFeePercent}%)</span><span className="font-medium">-{formatCurrency(iownit.annualManagement)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Platform Fee ({platformFeePercent}%)</span><span className="font-medium">-{formatCurrency(iownit.annualPlatformFee)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Operating Expenses</span><span className="font-medium">-{formatCurrency(iownit.monthlyOperating * 12)}</span></div>
                          <div className="border-t border-gray-300 pt-2 mt-2"><div className="flex justify-between font-bold text-lg"><span>Net Cash Flow</span><span className={iownit.strCashFlow >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(iownit.strCashFlow)}</span></div></div>
                        </div>
                      </div>
                      
                      {/* LTR Expense Breakdown */}
                      <div className="p-4 rounded-xl" style={{ backgroundColor: "#eff6ff" }}>
                        <h4 className="font-medium mb-3" style={{ color: "#1e3a5f" }}>🏢 LTR Annual Breakdown (HUD FMR)</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Gross Rent ({bedrooms || 3}BR FMR)</span><span className="font-medium text-blue-600">{formatCurrency(iownit.ltrGrossAnnual)}</span></div>
                          {iownit.annualMortgage > 0 && <div className="flex justify-between"><span className="text-gray-600">Mortgage</span><span className="font-medium">-{formatCurrency(iownit.annualMortgage)}</span></div>}
                          {iownit.ltrPropertyTax > 0 && <div className="flex justify-between"><span className="text-gray-600">Property Tax</span><span className="font-medium">-{formatCurrency(iownit.ltrPropertyTax)}</span></div>}
                          <div className="flex justify-between"><span className="text-gray-600">Landlord Insurance</span><span className="font-medium">-{formatCurrency(iownit.ltrInsurance)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Vacancy (5%)</span><span className="font-medium">-{formatCurrency(iownit.ltrVacancy)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Management (8%)</span><span className="font-medium">-{formatCurrency(iownit.ltrManagement)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Maintenance (5%)</span><span className="font-medium">-{formatCurrency(iownit.ltrMaintenance)}</span></div>
                          <div className="border-t border-blue-200 pt-2 mt-2"><div className="flex justify-between font-bold text-lg"><span>Net Cash Flow</span><span className={iownit.ltrCashFlow >= 0 ? "text-blue-600" : "text-red-600"}>{formatCurrency(iownit.ltrCashFlow)}</span></div></div>
                        </div>
                      </div>
                      
                      {/* Startup costs reminder */}
                      {iownit.startupCosts > 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-xs text-amber-700">💡 STR setup costs: {formatCurrency(iownit.startupCosts)} (one-time). At {formatCurrency(Math.abs(iownit.monthlyDifference))}/mo difference, {iownit.strWins ? `STR pays back setup in ~${Math.ceil(iownit.startupCosts / Math.max(iownit.monthlyDifference, 1))} months` : 'LTR avoids this upfront cost'}.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <p className="text-gray-500 text-sm text-center">Analyze a property above to see STR vs LTR comparison</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Deal Score Badge */}
            {((analysisMode === "buying" && !investment.needsPrice) || (analysisMode === "arbitrage" && !arbitrage.needsRent) || (analysisMode === "iownit" && hudFmrData)) && (
              <div className="rounded-2xl p-6 mt-4" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Deal Score</h3>
                  {(() => {
                    // Calculate deal score based on multiple factors - use appropriate mode
                    let totalScore = 0;
                    let cocScore = 0, cashFlowScore = 0, occupancyScore = 0, dataScore = 0;
                    let cocPct = "0", monthlyNet = "$0", paybackMonths = 0;
                    let paybackYears: string | null = null;
                    
                    if (analysisMode === "iownit") {
                      // I Own It scoring: based on STR vs LTR advantage
                      const advantageScore = Math.min(40, Math.max(0, (iownit.monthlyDifference / 500) * 40)); // $500/mo advantage = 40 pts
                      cashFlowScore = Math.min(30, Math.max(0, (iownit.strMonthlyCashFlow / 500) * 30)); // STR cash flow
                      occupancyScore = Math.min(20, Math.max(0, ((result.occupancy - 40) / 30) * 20));
                      dataScore = (result.percentiles ? 5 : 2.5) + (hudFmrData ? 5 : 2.5);
                      cocScore = advantageScore;
                      totalScore = Math.round(cocScore + cashFlowScore + occupancyScore + dataScore);
                      monthlyNet = formatCurrency(iownit.strMonthlyCashFlow);
                      cocPct = iownit.fmrMonthly > 0 ? ((iownit.grossRevenue / (iownit.fmrMonthly * 12)) * 100 - 100).toFixed(0) : "0";
                    } else {
                      const activeCalc = analysisMode === "buying" ? investment : arbitrage;
                      cocScore = Math.min(40, Math.max(0, activeCalc.cashOnCashReturn * 4)); // 0-40 points (10% CoC = 40 pts)
                      cashFlowScore = Math.min(30, Math.max(0, (activeCalc.monthlyCashFlow / 500) * 30)); // 0-30 points ($500/mo = 30 pts)
                      occupancyScore = Math.min(20, Math.max(0, ((result.occupancy - 40) / 30) * 20)); // 0-20 points (70% occ = 20 pts)
                      dataScore = result.percentiles ? 10 : 5; // 10 points for good data, 5 for limited
                      totalScore = Math.round(cocScore + cashFlowScore + occupancyScore + dataScore);
                      paybackMonths = activeCalc.monthlyCashFlow > 0 ? Math.ceil(activeCalc.totalCashNeeded / activeCalc.monthlyCashFlow) : 0;
                      paybackYears = paybackMonths > 0 ? (paybackMonths / 12).toFixed(1) : null;
                      cocPct = activeCalc.cashOnCashReturn.toFixed(1);
                      monthlyNet = formatCurrency(activeCalc.monthlyCashFlow);
                    }
                    
                    let verdict = "PASS";
                    let verdictColor = "#f59e0b";
                    let verdictBg = "#fef3c7";
                    let explanation = "This deal may work but requires careful consideration.";
                    
                    if (analysisMode === "iownit") {
                      if (totalScore >= 75) {
                        verdict = "GO STR";
                        verdictColor = "#16a34a";
                        verdictBg = "#dcfce7";
                        explanation = `STR nets ${monthlyNet}/mo — ${formatCurrency(Math.abs(iownit.monthlyDifference))} more than LTR. Strong case for short-term rental.`;
                      } else if (totalScore >= 60) {
                        verdict = "STR FAVORED";
                        verdictColor = "#22c55e";
                        verdictBg = "#ecfdf5";
                        explanation = `STR nets ${monthlyNet}/mo. The numbers favor STR, but consider the extra work involved.`;
                      } else if (totalScore >= 45) {
                        verdict = "CLOSE CALL";
                        verdictColor = "#eab308";
                        verdictBg = "#fefce8";
                        explanation = `STR and LTR are close. STR nets ${monthlyNet}/mo. Consider your time, effort, and risk tolerance.`;
                      } else {
                        verdict = iownit.strWins ? "MARGINAL STR" : "LTR BETTER";
                        verdictColor = "#ef4444";
                        verdictBg = "#fef2f2";
                        explanation = iownit.strWins ? `STR barely edges out LTR. The extra effort may not be worth ${formatCurrency(Math.abs(iownit.monthlyDifference))}/mo.` : `LTR wins by ${formatCurrency(Math.abs(iownit.monthlyDifference))}/mo with far less hassle. Stick with long-term rental.`;
                      }
                    } else if (totalScore >= 75) {
                      verdict = "STRONG BUY";
                      verdictColor = "#16a34a";
                      verdictBg = "#dcfce7";
                      explanation = `${cocPct}% CoC return with ${monthlyNet}/mo cash flow. ${paybackYears ? `Full payback in ~${paybackYears} years.` : ''} Top-tier deal.`;
                    } else if (totalScore >= 60) {
                      verdict = "GOOD DEAL";
                      verdictColor = "#22c55e";
                      verdictBg = "#ecfdf5";
                      explanation = `${cocPct}% CoC return netting ${monthlyNet}/mo. ${paybackYears ? `Payback in ~${paybackYears} years.` : ''} Solid fundamentals.`;
                    } else if (totalScore >= 45) {
                      verdict = "CONSIDER";
                      verdictColor = "#eab308";
                      verdictBg = "#fefce8";
                      explanation = `${cocPct}% CoC with ${monthlyNet}/mo cash flow. Moderate returns — a value-add strategy could improve this.`;
                    } else {
                      verdict = "CAUTION";
                      verdictColor = "#ef4444";
                      verdictBg = "#fef2f2";
                      explanation = `${cocPct}% CoC with ${monthlyNet}/mo cash flow. Returns are too thin to justify the risk — negotiate or pass.`;
                    }
                    
                    return (
                      <>
                        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-4" style={{ backgroundColor: verdictBg }}>
                          <span className="text-5xl font-bold" style={{ color: verdictColor }}>{totalScore}</span>
                          <div className="text-left">
                            <span className="text-sm text-gray-500">/100</span>
                            <p className="text-xl font-bold" style={{ color: verdictColor }}>{verdict}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{explanation}</p>
                        
                        {/* Score Breakdown */}
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                            <p className="text-gray-500">{analysisMode === "iownit" ? "STR Advantage" : "Cash-on-Cash"}</p>
                            <p className="font-bold" style={{ color: "#2b2823" }}>{Math.round(cocScore)}/40</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                            <p className="text-gray-500">Cash Flow</p>
                            <p className="font-bold" style={{ color: "#2b2823" }}>{Math.round(cashFlowScore)}/30</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                            <p className="text-gray-500">Occupancy</p>
                            <p className="font-bold" style={{ color: "#2b2823" }}>{Math.round(occupancyScore)}/20</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ backgroundColor: "#f5f4f0" }}>
                            <p className="text-gray-500">Data Quality</p>
                            <p className="font-bold" style={{ color: "#2b2823" }}>{dataScore}/10</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* AI Analysis CTA */}
            {((analysisMode === "buying" && !investment.needsPrice) || (analysisMode === "arbitrage" && !arbitrage.needsRent) || (analysisMode === "iownit" && hudFmrData)) && (
              <div className="rounded-2xl p-6 mt-4" style={{ backgroundColor: "#2b2823" }}>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg font-semibold text-white mb-1">Get $500-Level Deal Analysis</h3>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Our AI will analyze every aspect of this deal and help you think like a sophisticated investor
                    </p>
                  </div>
                  <button
                    onClick={getAiAnalysis}
                    disabled={isLoadingAiAnalysis}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-70"
                    style={{ backgroundColor: "#ffffff", color: "#2b2823" }}
                  >
                    {isLoadingAiAnalysis ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🤖</span>
                        Get AI Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* AI Analysis Modal */}
            {showAiAnalysis && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                onClick={(e) => {
                  // Close modal when clicking backdrop
                  if (e.target === e.currentTarget) setShowAiAnalysis(false);
                }}
              >
                <div 
                  className="relative w-full max-w-2xl flex flex-col rounded-2xl"
                  style={{ backgroundColor: "#ffffff", maxHeight: "85vh" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header - Fixed */}
                  <div className="flex-shrink-0 px-6 py-4 border-b rounded-t-2xl" style={{ backgroundColor: "#2b2823", borderColor: "#3d3a34" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                          <span className="text-xl">🤖</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Edge AI Analysis</h3>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {result?.address || result?.neighborhood}, {result?.city}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAiAnalysis(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Modal Content - Scrollable */}
                  <div 
                    className="flex-1 p-6 overflow-y-auto overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {isLoadingAiAnalysis ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#e5e3da" }}>
                          <svg className="animate-spin w-8 h-8" style={{ color: "#787060" }} viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <p className="text-lg font-medium" style={{ color: "#2b2823" }}>Analyzing your deal...</p>
                        <p className="text-sm" style={{ color: "#787060" }}>This may take 10-15 seconds</p>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="prose prose-sm max-w-none">
                        <div 
                          className="text-sm leading-relaxed"
                          style={{ color: "#2b2823" }}
                        >
                          {aiAnalysis.split('\n').map((line, i) => {
                            // Skip empty lines
                            if (!line.trim()) return <div key={i} className="h-2"></div>;
                            
                            // Style ### headers (h3)
                            if (line.startsWith('### ')) {
                              return (
                                <h4 key={i} className="font-bold text-base mt-5 mb-2" style={{ color: "#2b2823" }}>
                                  {line.replace(/^### /, '')}
                                </h4>
                              );
                            }
                            // Style ## headers (h2)
                            if (line.startsWith('## ')) {
                              return (
                                <h3 key={i} className="font-bold text-lg mt-6 mb-2" style={{ color: "#2b2823" }}>
                                  {line.replace(/^## /, '')}
                                </h3>
                              );
                            }
                            // Style numbered items (e.g., "1. Title")
                            if (/^\d+\.\s/.test(line)) {
                              return (
                                <h4 key={i} className="font-semibold text-base mt-4 mb-2" style={{ color: "#2b2823" }}>
                                  {line.replace(/\*\*/g, '')}
                                </h4>
                              );
                            }
                            // Process inline formatting for regular text
                            const formatLine = (text: string) => {
                              // Replace **bold** with styled spans
                              const parts = text.split(/(\*\*[^*]+\*\*)/);
                              return parts.map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                              });
                            };
                            // Regular text with inline formatting
                            return <p key={i} className="mb-2 leading-relaxed">{formatLine(line)}</p>;
                          })}
                        </div>
                        
                        {/* Share Analysis */}
                        <div className="mt-6 pt-4 border-t" style={{ borderColor: "#e5e3da" }}>
                          <p className="text-sm text-center mb-3" style={{ color: "#787060" }}>
                            Share this analysis
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center mb-6">
                            <button
                              onClick={async () => {
                                if (isCreatingShareLink || !result) return;
                                setIsCreatingShareLink(true);
                                
                                try {
                                  const displayRevenue = getDisplayRevenue();
                                  const response = await fetch('/api/share', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      address: result.address || result.neighborhood,
                                      city: result.city,
                                      state: result.state,
                                      bedrooms: result.bedrooms,
                                      bathrooms: result.bathrooms,
                                      guestCount: guestCount || result.bedrooms * 2,
                                      purchasePrice: purchasePrice ? parseFloat(purchasePrice.replace(/,/g, '')) : 0,
                                      annualRevenue: displayRevenue,
                                      occupancyRate: result.occupancy,
                                      adr: result.adr,
                                      cashFlow: investment.cashFlow,
                                      cashOnCash: investment.cashOnCashReturn,
                                      analysisData: {
                                        activeListings: result.nearbyListings,
                                        peakMonth: result.historical?.[0]?.month,
                                        peakMonthRevenue: result.historical?.[0]?.revenue,
                                        downPayment: investment.downPayment,
                                        downPaymentPercent: downPaymentPercent,
                                        loanAmount: investment.loanAmount,
                                        monthlyMortgage: investment.monthlyMortgage,
                                        percentiles: result.percentiles,
                                        aiAnalysis: aiAnalysis
                                      }
                                    })
                                  });
                                  
                                  if (!response.ok) throw new Error('Failed to create share link');
                                  
                                  const { shareUrl } = await response.json();
                                  
                                  if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                                    await navigator.share({
                                      title: `STR Analysis: ${result.address || result.neighborhood}`,
                                      url: shareUrl
                                    });
                                  } else {
                                    await navigator.clipboard.writeText(shareUrl);
                                    alert('Share link copied! This link can only be viewed once and expires in 90 days.');
                                  }
                                } catch (err: any) {
                                  // Don't show error if user just dismissed the share sheet
                                  if (err?.name === 'AbortError' || err?.message?.includes('Share canceled') || err?.message?.includes('abort')) {
                                    console.log('Share dismissed by user');
                                  } else {
                                    console.error('Share error:', err);
                                    alert('Failed to create share link. Please try again.');
                                  }
                                } finally {
                                  setIsCreatingShareLink(false);
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105"
                              style={{ backgroundColor: "#22c55e", color: "#ffffff" }}
                              disabled={isCreatingShareLink}
                            >
                              {isCreatingShareLink ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-5 5m5-5l5 5" />
                                </svg>
                              )}
                              {isCreatingShareLink ? 'Creating...' : 'Share Link'}
                            </button>
                            <button
                              onClick={() => {
                                const subject = encodeURIComponent(`Edge AI Analysis - ${result?.address || result?.neighborhood}, ${result?.city}`);
                                const body = encodeURIComponent(`Edge AI Analysis\n\n${aiAnalysis?.replace(/[#*]/g, '') || ''}\n\n---\nAnalyzed with Edge by Teeco: https://edge.teeco.co`);
                                window.open(`mailto:?subject=${subject}&body=${body}`);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105"
                              style={{ backgroundColor: "#787060", color: "#ffffff" }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email
                            </button>
                            <button
                              onClick={async () => {
                                // Trigger PDF generation with AI analysis included
                                const analysisText = aiAnalysis?.replace(/[#*]/g, '') || '';
                                // Store analysis in session for PDF
                                sessionStorage.setItem('aiAnalysisForPdf', analysisText);
                                // Find and click the PDF button
                                const pdfButton = document.querySelector('[data-pdf-button]') as HTMLButtonElement;
                                if (pdfButton) {
                                  pdfButton.click();
                                } else {
                                  // Fallback - copy to clipboard
                                  navigator.clipboard.writeText(analysisText);
                                  alert('Analysis copied! Use the PDF button in the results to generate a full report.');
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105"
                              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              PDF
                            </button>
                          </div>
                        </div>
                        
                        {/* CTA at bottom */}
                        <div className="pt-4 border-t" style={{ borderColor: "#e5e3da" }}>
                          <p className="text-sm text-center mb-3" style={{ color: "#787060" }}>
                            Ready to take the next step?
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                              href="https://login.circle.so/sign_up?request_host=teeco.circle.so&user%5Binvitation_token%5D=24bf3e259d3f754c41c323f1eda7eb88a49991b0-87b646d2-7efe-4bec-a0b8-a03098b44aa2#email"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105"
                              style={{ backgroundColor: "#2b2823", color: "#ffffff" }}
                            >
                              🎓 Watch Free Training
                            </a>
                            <button
                              onClick={() => {
                                setShowAiAnalysis(false);
                                // Open chat assistant
                                setTimeout(() => {
                                  const chatButton = document.querySelector('button[class*="fixed bottom-24 right-4"]') as HTMLButtonElement;
                                  if (chatButton) chatButton.click();
                                }, 100);
                              }}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105"
                              style={{ backgroundColor: "#e5e3da", color: "#2b2823" }}
                            >
                              💬 Ask More Questions
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Your Next Steps Checklist */}
            <div className="rounded-2xl p-6 mt-4" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Your Next Steps</h3>
              <p className="text-sm text-gray-500 mb-4">Follow this checklist to move forward with confidence</p>
              
              <div className="space-y-3">
                {/* Step 1 - Completed */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "#ecfdf5" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#22c55e" }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Analyzed property revenue potential</p>
                    <p className="text-sm text-green-600">You&apos;ve run the numbers - great first step!</p>
                  </div>
                </div>
                
                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2" style={{ borderColor: "#d8d6cd" }}>
                    <span className="text-xs font-bold" style={{ color: "#787060" }}>2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "#2b2823" }}>Get pre-approved for financing</p>
                    <p className="text-sm text-gray-500">Know your budget before making offers</p>
                  </div>
                </div>
                
                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2" style={{ borderColor: "#d8d6cd" }}>
                    <span className="text-xs font-bold" style={{ color: "#787060" }}>3</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "#2b2823" }}>Connect with a local STR-friendly agent</p>
                    <p className="text-sm text-gray-500">Find someone who understands the STR market</p>
                  </div>
                </div>
                
                {/* Step 4 */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2" style={{ borderColor: "#d8d6cd" }}>
                    <span className="text-xs font-bold" style={{ color: "#787060" }}>4</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "#2b2823" }}>Tour properties & verify assumptions</p>
                    <p className="text-sm text-gray-500">See the property and neighborhood in person</p>
                  </div>
                </div>
                
                {/* Step 5 */}
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2" style={{ borderColor: "#d8d6cd" }}>
                    <span className="text-xs font-bold" style={{ color: "#787060" }}>5</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "#2b2823" }}>Design, furnish & launch your STR</p>
                    <p className="text-sm text-gray-500">Set up your property for 5-star reviews</p>
                  </div>
                </div>
              </div>
              
              {/* Coaching CTA */}
              <div className="mt-5 p-4 rounded-xl" style={{ backgroundColor: "#fef3c7", border: "1px solid #fcd34d" }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎓</span>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: "#92400e" }}>Need help with steps 2-5?</p>
                    <p className="text-sm mt-1" style={{ color: "#a16207" }}>
                      Teeco&apos;s 1:1 coaching walks you through everything - from finding STR-friendly lenders and agents in our community, to designing and launching your property. Only ~3 hours/week once set up.
                    </p>
                    <a 
                      href="https://teeco.co/fund-your-financial-freedom"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105"
                      style={{ backgroundColor: "#92400e", color: "#ffffff" }}
                    >
                      Learn About Coaching
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Take Action - Zillow Links */}
            <div className="rounded-2xl p-6 mt-4" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#dbeafe" }}>
                  <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "#2b2823" }}>Take Action</h3>
                  <p className="text-sm text-gray-500">Ready to move forward? Start here.</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <a
                  href={`https://www.zillow.com/${encodeURIComponent((result?.city || '').toLowerCase().replace(/\s+/g, '-') + '-' + (result?.state || '').toLowerCase().replace(/\s+/g, ''))}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: "#f0f7ff", border: "1px solid #bfdbfe" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#2563eb" }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: "#1e40af" }}>Find a Home to Analyze</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>Browse properties for sale{result?.city ? ` in ${result.city}` : ''} on Zillow</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="https://www.zillow.com/professionals/real-estate-agent-reviews/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#16a34a" }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: "#15803d" }}>Find an Agent to Buy Remotely</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>Top-rated real estate agents who can help you invest from anywhere</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="https://www.zillow.com/homeloans/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: "#fefce8", border: "1px solid #fde68a" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#ca8a04" }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: "#a16207" }}>Get Pre-Approved for a Loan</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>Compare lenders and rates to know your budget</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#9ca3af" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <p className="text-xs text-center mt-3" style={{ color: "#9ca3af" }}>Opens Zillow.com in a new tab</p>
            </div>
          </div>
          </div>
        )}

        {/* Recent Searches — only visible when signed in */}
        {!result && recentSearches.length > 0 && isAuthenticated && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "#2b2823" }}>Recent Searches</h3>
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // If we have cached result, load it instantly without API call
                    if (search.cachedResult) {
                      setAddress(search.address);
                      setResult(search.cachedResult);
                      if (search.cachedBedrooms) setBedrooms(search.cachedBedrooms);
                      if (search.cachedBathrooms) setBathrooms(search.cachedBathrooms);
                      if (search.cachedGuestCount) setGuestCount(search.cachedGuestCount);
                      // Restore allComps and targetCoords for bedroom re-filtering and comp map
                      if (search.cachedResult.comparables && Array.isArray(search.cachedResult.comparables)) {
                        setAllComps(search.cachedResult.comparables as ComparableListing[]);
                      }
                      if (search.cachedResult.targetCoordinates) {
                        setTargetCoords({ lat: search.cachedResult.targetCoordinates.latitude, lng: search.cachedResult.targetCoordinates.longitude });
                      } else {
                        // Geocode fallback for legacy cache entries missing coordinates
                        geocodeAddress(search.address).then(coords => {
                          if (coords) {
                            setTargetCoords(coords);
                            setResult(prev => prev ? { ...prev, targetCoordinates: { latitude: coords.lat, longitude: coords.lng } } : prev);
                          }
                        });
                      }
                      setLastAnalyzedAddress(search.address);
                      // Auto-fill purchase price if available
                      if (search.cachedResult.listPrice > 0 && !purchasePrice) {
                        setPurchasePrice(search.cachedResult.listPrice.toString());
                      }
                      // Auto-set sqft
                      if (search.cachedResult.sqft > 0) {
                        setPropertySqft(search.cachedResult.sqft);
                        setFurnishingsCost(Math.round(search.cachedResult.sqft * 15));
                      }
                    } else {
                      // Fallback: re-analyze if no cached data (old searches)
                      setAddress(search.address);
                      if (bedrooms && bathrooms) {
                        handleAnalyze(search.address);
                      }
                    }
                  }}
                  className="w-full p-3 rounded-xl text-left hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{search.address}</p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(search.annualRevenue)}/yr • {formatCurrency(search.adr)}/night • {search.occupancy}% occ
                      </p>
                    </div>
                    {search.cachedResult && (
                      <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Instant</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Cross-Reference Tools - Minimal Footer Style */}
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid #e5e3da' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: '#a0a0a0' }}>
              Cross-reference your analysis: 
              <a 
                href="https://rabbu.com/airbnb-calculator" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-1 hover:underline transition-colors"
                style={{ color: '#787060' }}
              >
                Rabbu (Free)
              </a>
              <span className="mx-2">·</span>
              <a 
                href="https://www.airdna.co" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline transition-colors"
                style={{ color: '#787060' }}
              >
                AirDNA ($34/mo)
              </a>
            </p>
            <p className="text-xs" style={{ color: '#a0a0a0' }}>
              Edge data: <span style={{ color: '#787060' }}>Airbnb Comps</span> · Live market data
            </p>
          </div>
        </div>
      </main>
      
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#2b2823' }}>Email Report</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: '#787060' }}>
              Send a summary of this investment analysis to any email address.
            </p>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-3 rounded-xl border text-sm mb-4"
              style={{ borderColor: '#d8d6cd' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-sm"
                style={{ backgroundColor: '#e5e3da', color: '#787060' }}
              >
                Cancel
              </button>
              <button
                onClick={sendEmailReport}
                disabled={!emailAddress || emailSending}
                className="flex-1 py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
              >
                {emailSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Limited Data Warning Modal */}
      {showLimitedDataWarning && limitedDataInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            {/* Close button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => {
                  setShowLimitedDataWarning(false);
                  setLimitedDataInfo(null);
                  setPendingAnalysis(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              {/* Warning Icon */}
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
                <svg className="w-8 h-8" style={{ color: '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-bold mb-2" style={{ color: '#92400e' }}>
                Limited Data Available
              </h2>
              
              <div className="text-left mb-4 p-4 rounded-xl" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
                <p className="text-sm mb-2" style={{ color: '#92400e' }}>
                  <strong>You searched for:</strong><br />
                  <span className="capitalize">{limitedDataInfo.searchedCity}</span>, {limitedDataInfo.searchedState}
                </p>
                <p className="text-sm mb-2" style={{ color: '#92400e' }}>
                  <strong>Nearest market with data:</strong><br />
                  <span className="capitalize">{limitedDataInfo.nearestMarket}</span>
                  {limitedDataInfo.distanceMiles && (
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fde68a', color: '#92400e' }}>
                      ~{limitedDataInfo.distanceMiles} mi away
                    </span>
                  )}
                </p>
                <p className="text-xs mt-3" style={{ color: '#b45309' }}>
                  We don&apos;t have specific rental data for this location yet. The estimates shown may be based on the nearest market, which may not accurately reflect your area.
                </p>
              </div>
              
              <div className="text-left mb-4 p-3 rounded-lg" style={{ backgroundColor: '#f5f4f0' }}>
                <p className="text-xs" style={{ color: '#787060' }}>
                  💡 <strong>Tip:</strong> For more accurate data, try searching for a property in a larger nearby city.
                </p>
              </div>
              
              <p className="text-sm mb-4" style={{ color: '#787060' }}>
                Proceed anyway? This will use 1 of your <span className="font-semibold" style={{ color: '#22c55e' }}>
                  {freeCreditsRemaining > 0 
                    ? `${freeCreditsRemaining} free` 
                    : `${purchasedCreditsRemaining}`
                  }
                </span> {freeCreditsRemaining > 0 ? 'analyses' : 'credits'}.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLimitedDataWarning(false);
                    setLimitedDataInfo(null);
                    setPendingAnalysis(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-medium text-sm"
                  style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLimitedDataWarning(false);
                    setShowCreditConfirm(true);
                  }}
                  className="flex-1 py-3 rounded-xl font-medium text-sm"
                  style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
                >
                  Use Nearest Market (1 credit)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Credit Confirmation Modal */}
      {showCreditConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            {/* Close button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => {
                  setShowCreditConfirm(false);
                  setPendingAnalysis(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                <svg className="w-8 h-8" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#2b2823' }}>
                Analyze This Property
              </h2>
              <p className="font-medium text-sm mb-4 px-4 py-2 rounded-lg" style={{ backgroundColor: '#f5f4f0', color: '#2b2823' }}>
                {pendingAnalysis || address}
              </p>
              
              {/* What you'll get */}
              <div className="text-left mb-4 p-3 rounded-lg" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#166534' }}>This analysis includes:</p>
                <ul className="text-xs space-y-1" style={{ color: '#15803d' }}>
                  <li>✓ Revenue projection with confidence range</li>
                  <li>✓ Comparable property data</li>
                  <li>✓ Cash-on-cash return calculator</li>
                  <li>✓ AI-powered deal analysis</li>
                </ul>
              </div>
              
              {forceRefresh && (
                <div className="text-left mb-4 p-3 rounded-lg" style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d' }}>
                  <p className="text-xs font-semibold" style={{ color: '#92400e' }}>⚠️ Fresh Analysis Requested</p>
                  <p className="text-xs mt-1" style={{ color: '#a16207' }}>This will fetch new data from our API and use 1 credit, even if cached data exists.</p>
                </div>
              )}
              
              <p className="text-sm mb-4" style={{ color: '#787060' }}>
                {forceRefresh ? 'Will use' : 'Uses'} 1 of your <span className="font-semibold" style={{ color: '#22c55e' }}>
                  {freeCreditsRemaining > 0 
                    ? `${freeCreditsRemaining} free` 
                    : `${purchasedCreditsRemaining}`
                  }
                </span> {freeCreditsRemaining > 0 ? (freeCreditsRemaining === 1 ? 'analysis' : 'analyses') : (purchasedCreditsRemaining === 1 ? 'credit' : 'credits')}.
                {creditsRemaining && creditsRemaining > 1 && ` You'll have ${creditsRemaining - 1} left.`}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreditConfirm(false);
                    setPendingAnalysis(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-medium text-sm"
                  style={{ backgroundColor: '#e5e3da', color: '#787060' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAnalysis}
                  className="flex-1 py-3 rounded-xl font-medium text-sm"
                  style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
                >
                  ✓ Analyze Property
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Paywall Modal - Out of Credits */}
      {showPaywall && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '16px',
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: 'max(80px, calc(env(safe-area-inset-bottom) + 70px))',
          }}
          onClick={() => setShowPaywall(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-sm overflow-y-auto"
            style={{ 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: 'calc(100vh - 120px)',
              padding: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end -mt-1 -mr-1 mb-2">
              <button
                onClick={() => setShowPaywall(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              {/* Compact Header */}
              <h2 className="text-xl font-bold mb-2" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Get More Analyses
              </h2>
              <p className="text-sm mb-4" style={{ color: '#787060' }}>
                {freeCreditsRemaining > 0 
                  ? `You have ${freeCreditsRemaining} free ${freeCreditsRemaining === 1 ? 'analysis' : 'analyses'} left. Get more credits for unlimited access.`
                  : `You've used your 3 free analyses. Unlock more to continue.`
                }
              </p>
              
              {/* Pricing Options - Hormozi 3-Tier */}
              <div className="space-y-3 mb-4">
                {/* Tier 1: Starter - Makes middle look smart */}
                <a 
                  href={`https://buy.stripe.com/9B628r5GbfOa2J03eE8AE07?prefilled_email=${encodeURIComponent(authEmail || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl border-2 cursor-pointer hover:border-gray-400 transition-all" 
                  style={{ borderColor: '#e5e5e5' }}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className="font-semibold text-sm" style={{ color: '#2b2823' }}>5 Credits</p>
                      <p className="text-xs" style={{ color: '#787060' }}>$1.00/analysis</p>
                    </div>
                    <p className="text-lg font-bold" style={{ color: '#2b2823' }}>$4.99</p>
                  </div>
                </a>
                
                {/* Tier 2: Pro - BEST VALUE - Where most buyers land */}
                <a 
                  href={`https://buy.stripe.com/9B614ngkP1XkdnEaH68AE09?prefilled_email=${encodeURIComponent(authEmail || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl border-2 cursor-pointer hover:border-green-600 transition-all relative" 
                  style={{ borderColor: '#22c55e', backgroundColor: '#f0fdf4' }}
                >
                  <div className="absolute -top-2 left-3 px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#22c55e', color: '#fff' }}>
                    MOST POPULAR
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className="font-bold" style={{ color: '#2b2823' }}>25 Credits</p>
                      <p className="text-xs" style={{ color: '#787060' }}>$0.80/analysis</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: '#2b2823' }}>$19.99</p>
                      <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>Save 20%</p>
                    </div>
                  </div>
                </a>
                
                {/* Tier 3: Power - Price anchor that makes Pro look like a deal */}
                <a 
                  href={`https://buy.stripe.com/eVq3cv7Oj1Xk6Zg7uU8AE06?prefilled_email=${encodeURIComponent(authEmail || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl border-2 cursor-pointer hover:border-gray-400 transition-all relative" 
                  style={{ borderColor: '#e5e5e5', backgroundColor: '#fafafa' }}
                >
                  <div className="absolute -top-2 left-3 px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: '#2b2823', color: '#fff' }}>
                    BEST RATE
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className="font-semibold text-sm" style={{ color: '#2b2823' }}>100 Credits</p>
                      <p className="text-xs" style={{ color: '#787060' }}>$0.70/analysis</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: '#2b2823' }}>$69.99</p>
                      <p className="text-xs font-medium" style={{ color: '#787060' }}>Save 30%</p>
                    </div>
                  </div>
                </a>
              </div>
              
              <p className="text-xs mb-3" style={{ color: '#a0a0a0' }}>
                Secure payment via Stripe. Credits added instantly.
              </p>
              
              <button
                onClick={() => setShowPaywall(false)}
                className="w-full py-3 rounded-xl font-medium text-sm"
                style={{ backgroundColor: '#e5e3da', color: '#787060' }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Magic Link Authentication Modal - uses shared AuthModal component */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthStep("email");
          setAuthError(null);
        }}
        onSuccess={(email) => {
          setAuthEmail(email);
          setIsAuthenticated(true);
          setShowAuthModal(false);
          setAuthStep("email");
          fetchUserCredits(email);
        }}
        title="Sign in to Analyze"
        subtitle="No password needed. No credit card required."
      />
      {/* Floating Action Pill for Analysis Pages */}
      {result && (
        <FloatingActionPill
          isSaved={isReportSaved}
          hideCount={true}
          onToggleSave={async () => {
            if (isReportSaved) {
              // Unsave: remove from localStorage
              const addr = result.address || result.neighborhood;
              const saved = JSON.parse(localStorage.getItem('edge_saved_reports') || '[]');
              const matchEntry = saved.find((r: any) => r.address === addr);
              const exists = saved.findIndex((r: any) => r.address === addr);
              if (exists >= 0) {
                saved.splice(exists, 1);
                localStorage.setItem('edge_saved_reports', JSON.stringify(saved));
              }
              setIsReportSaved(false);
              
              // Also remove from server if authenticated
              const authEmail = localStorage.getItem('edge_auth_email');
              const authToken = localStorage.getItem('edge_auth_token');
              const authExpiry = localStorage.getItem('edge_auth_expiry');
              if (authEmail && authToken && authExpiry && Date.now() < parseInt(authExpiry, 10)) {
                try {
                  await fetch('/api/saved-properties', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: authEmail, propertyId: matchEntry?.id || addr })
                  });
                } catch (err) {
                  console.log('Server unsave failed:', err);
                }
              }
            } else {
              // Save: calls saveReport which sets isReportSaved on success
              saveReport();
            }
          }}
          shareText={`Check out this STR deal I found — ${formatCurrency(getDisplayRevenue())}/yr projected revenue:`}
          shareData={{
            address: result.address || result.neighborhood,
            city: result.city,
            state: result.state,
            bedrooms: result.bedrooms,
            bathrooms: result.bathrooms,
            guestCount: guestCount || result.bedrooms * 2,
            purchasePrice: purchasePrice ? parseFloat(purchasePrice.replace(/,/g, '')) : 0,
            annualRevenue: getDisplayRevenue(),
            occupancyRate: result.occupancy,
            adr: result.adr,
            cashFlow: investment.cashFlow,
            cashOnCash: investment.cashOnCashReturn,
            analysisData: {
              activeListings: result.nearbyListings,
              peakMonth: result.historical?.[0]?.month,
              peakMonthRevenue: result.historical?.[0]?.revenue,
              downPayment: investment.downPayment,
              downPaymentPercent: downPaymentPercent,
              loanAmount: investment.loanAmount,
              monthlyMortgage: investment.monthlyMortgage,
              percentiles: result.percentiles
            }
          }}
        />
      )}

      {/* Stuck Helper - shown below results when analysis is complete */}
      {result && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <StuckHelper tabName="calculator" />
        </div>
      )}
    </div>
    </DoubleTapSave>
  );
}
