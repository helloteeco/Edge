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
import { addCreditEvent, getCreditLog, formatCreditEventTime, type CreditEvent } from "@/lib/creditLog";
import { cacheAnalysisResult } from "@/lib/serviceWorker";
import { findCityForAddress, getStateBenchmark } from "@/data/helpers";

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
  // From Supabase cross-device sync
  analyzedAt?: string;
  expiresAt?: string;
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
  
  // Track whether user has manually edited expenses (to avoid overwriting)
  const userEditedExpenses = useRef(false);
  const userEditedRent = useRef(false);
  const userEditedInsurance = useRef(false);
  const userEditedFurnishings = useRef(false);
  // Track whether we've already done the initial bedroom-filter after data loads
  const hasInitialRefiltered = useRef(false);

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
  // Comp sorting: 'relevance' (default), 'revenue', 'distance', 'bedrooms', 'occupancy', 'rating'
  const [compSortBy, setCompSortBy] = useState<'relevance' | 'revenue' | 'distance' | 'bedrooms' | 'occupancy' | 'rating'>('relevance');
  // Select-only mode: when true, only selected (non-excluded) comps are used; user picks specific comps
  const [selectOnlyMode, setSelectOnlyMode] = useState(false);
  // Distance radius filter: null = show all, number = max miles
  const [compDistanceFilter, setCompDistanceFilter] = useState<number | null>(null);
  
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
  
  // Recalculate revenue from active comps only, with percentile support
  const getCompBasedRevenue = (): { adr: number; occupancy: number; annualRevenue: number; percentiles: { p25: number; p50: number; p75: number; p90: number }; adrPercentiles: { p25: number; p50: number; p75: number; p90: number }; occPercentiles: { p25: number; p50: number; p75: number; p90: number } } | null => {
    const activeComps = getActiveComps();
    if (activeComps.length === 0) return null;
    const avgAdr = Math.round(activeComps.reduce((sum, c) => sum + c.nightPrice, 0) / activeComps.length);
    const avgOcc = Math.round(activeComps.reduce((sum, c) => sum + c.occupancy, 0) / activeComps.length);
    const avgRevenue = Math.round(activeComps.reduce((sum, c) => sum + (c.annualRevenue || c.monthlyRevenue * 12), 0) / activeComps.length);
    
    // Compute percentiles from active comps
    const revenues = activeComps.map(c => c.annualRevenue || c.monthlyRevenue * 12).sort((a, b) => a - b);
    const adrs = activeComps.map(c => c.nightPrice).sort((a, b) => a - b);
    const occs = activeComps.map(c => c.occupancy).sort((a, b) => a - b);
    
    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      if (arr.length === 1) return arr[0];
      const idx = (p / 100) * (arr.length - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      if (lower === upper) return arr[lower];
      return Math.round(arr[lower] + (arr[upper] - arr[lower]) * (idx - lower));
    };
    
    return {
      adr: avgAdr,
      occupancy: avgOcc,
      annualRevenue: avgRevenue,
      percentiles: {
        p25: percentile(revenues, 25),
        p50: percentile(revenues, 50),
        p75: percentile(revenues, 75),
        p90: percentile(revenues, 90),
      },
      adrPercentiles: {
        p25: percentile(adrs, 25),
        p50: percentile(adrs, 50),
        p75: percentile(adrs, 75),
        p90: percentile(adrs, 90),
      },
      occPercentiles: {
        p25: percentile(occs, 25),
        p50: percentile(occs, 50),
        p75: percentile(occs, 75),
        p90: percentile(occs, 90),
      },
    };
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
    setCompSortBy('relevance');
    setSelectOnlyMode(false);
    setCompDistanceFilter(null);
    // Reset the initial refilter flag so the next analysis gets auto-filtered too
    hasInitialRefiltered.current = false;
  }, [result?.address]);

  // ===== AUTO-REFILTER ON INITIAL LOAD =====
  // When PriceLabs returns raw unfiltered data (average across ALL bedroom sizes),
  // immediately refilter using the property's detected bedroom count so the first
  // displayed revenue is bedroom-appropriate and consistent with manual refilters.
  useEffect(() => {
    if (hasInitialRefiltered.current) return;
    if (!result || allComps.length === 0 || !targetCoords) return;
    // Need at least 3 comps to make filtering meaningful
    if (allComps.length < 3) return;
    
    const br = bedrooms ?? result.bedrooms ?? 3;
    const ba = bathrooms ?? 2;
    const gc = guestCount ?? br * 2;
    
    console.log(`[InitialRefilter] Auto-filtering ${allComps.length} comps for ${br}br/${ba}ba/${gc}guests`);
    hasInitialRefiltered.current = true;
    
    // Inline refilter logic to avoid stale closure issues with handleLocalRefilterAuto
    const timer = setTimeout(() => {
      try {
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
        
        setResult(prev => prev ? {
          ...prev,
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
        } : prev);
        
        setExcludedCompIds(new Set());
        setCompSortBy('relevance');
        setSelectOnlyMode(false);
        setCompDistanceFilter(null);
        
        console.log(`[InitialRefilter] Done: ${filtered.filteredListings} comps, ADR $${filtered.avgAdr}, Rev $${annualRevenue}/yr`);
      } catch (err) {
        console.warn('[InitialRefilter] Failed:', err);
      }
    }, 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allComps, targetCoords, result?.address]);
  
  // Fetch real occupancy data for comps after analysis completes
  useEffect(() => {
    if (!result?.comparables || result.comparables.length === 0) return;
    
    const topComps = result.comparables.slice(0, 8);
    const roomIds = topComps
      .map(c => String(c.id))
      .filter(id => id && id !== '0');
    
    if (roomIds.length === 0) return;
    
    const fetchOccupancy = async () => {
      setIsLoadingOccupancy(true);
      try {
        // Pass listing data so the estimation endpoint can use review counts,
        // nightly prices, and coordinates for accurate per-comp occupancy
        const listings = topComps.map(c => ({
          id: String(c.id),
          reviewsCount: c.reviewsCount || 0,
          nightPrice: c.nightPrice || 150,
          latitude: c.latitude || 0,
          longitude: c.longitude || 0,
        }));
        const response = await fetch('/api/airbnb-occupancy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomIds, listings }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.occupancy) {
            setRealOccupancyData(data.occupancy);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch occupancy data:', err);
      } finally {
        setIsLoadingOccupancy(false);
      }
    };
    
    // Delay slightly so it doesn't block the main analysis render
    const timer = setTimeout(fetchOccupancy, 1500);
    return () => clearTimeout(timer);
  }, [result?.comparables]);

  // ===== SMART DEFAULTS: Dynamic expense auto-populate =====
  // Factors: bedroom count, guest count, sqft, and cost-of-living (via home price)
  // Formulas scale with property size and local cost levels.
  // National median home price (~$350K) = 1.0x multiplier. Higher = more expensive area.
  // Adjusts automatically when new cities are added or market prices change.
  // ===== RESEARCH-BASED STR EXPENSE DEFAULTS =====
  // Sources: AirDNA (2024), BuildYourBnB, Steadily (2025), Host Tools (2025),
  // Redfin (2025), BiggerPockets forums, RentCafe (2025)
  // Key benchmarks:
  //   - BuildYourBnB: ~$150/mo per utility, $75/room supplies, $200-250/room cleaning
  //   - Steadily: Full homes $400-$800+/mo total utilities
  //   - Host Tools: $500-$700/mo utilities for modest property
  //   - Solar.com: Avg electric for 3BR = $163/mo nationwide
  //   - STRs use significantly more utilities than regular homes (24/7 HVAC, frequent laundry)
  useEffect(() => {
    if (!result || userEditedExpenses.current) return;
    const br = bedrooms || 3;
    const guests = guestCount || br * 2;
    const sqft = propertySqft || (br * 500 + 400);
    const homePrice = parseFloat(purchasePrice) || result?.listPrice || 350000;
    
    // Cost-of-living multiplier using dampened power curve
    // $200K → 0.85x, $350K → 1.0x, $500K → 1.12x, $800K → 1.28x, $1M → 1.37x
    const NATIONAL_MEDIAN = 350000;
    const rawCol = Math.pow(homePrice / NATIONAL_MEDIAN, 0.3);
    const colMultiplier = Math.min(Math.max(rawCol, 0.75), 1.6);
    
    const round5 = (n: number) => Math.round(n / 5) * 5;
    
    // ---- ELECTRIC ----
    // Per-bedroom: $55/BR (STRs run HVAC 24/7 for guests, smart locks, always-on devices)
    // Floor: $120 (even a studio STR has significant electric)
    // Scales with: bedrooms (proxy for sqft) + cost-of-living
    const electric = round5(Math.max(55 * br, 120) * colMultiplier);
    
    // ---- WATER / SEWER ----
    // Per-bedroom: $25/BR base + $5 per guest above 2-per-BR baseline
    // Floor: $60. STRs do more laundry (linens every turnover), more showers
    const extraGuests = Math.max(guests - br * 2, 0);
    const water = round5(Math.max(25 * br + 5 * extraGuests, 60) * colMultiplier);
    
    // ---- INTERNET ----
    // Mostly flat: $80 base. Larger homes may need mesh systems ($100+)
    // Slight COL adjustment (capped at 1.2x — internet doesn't vary much)
    const internet = round5(br >= 5 ? 100 : 80) * Math.min(colMultiplier, 1.2) > 0
      ? round5((br >= 5 ? 100 : 80) * Math.min(colMultiplier, 1.2))
      : 80;
    
    // ---- TRASH ----
    // Per-bedroom: $12/BR + $3 per extra guest. Floor: $35
    // More guests = more trash volume
    const trash = round5(Math.max(12 * br + 3 * extraGuests, 35) * Math.min(colMultiplier, 1.3));
    
    // ---- LAWN CARE ----
    // Per-bedroom: $20/BR (larger homes = larger lots). Floor: $75
    // Scales with COL (labor costs vary by market)
    const lawn = round5(Math.max(20 * br, 75) * colMultiplier);
    
    // ---- PEST CONTROL ----
    // Per-bedroom: $8/BR. Floor: $25. Quarterly service amortized monthly
    const pest = round5(Math.max(8 * br, 25) * Math.min(colMultiplier, 1.3));
    
    // ---- HOUSE SUPPLIES ----
    // BuildYourBnB benchmark: $75/room for supplies (linens, towels, small items)
    // We use $25/BR as monthly amortized cost (linens last ~6 months)
    // Floor: $50. Scales with bedrooms primarily
    const supplies = round5(Math.max(25 * br, 50) * (1 + (colMultiplier - 1) * 0.5));
    
    // ---- SUPPLIES & CONSUMABLES ----
    // Toiletries, coffee, soap, TP, paper towels — scales heavily with guest count
    // $15/BR base + $10/guest (guests consume these directly)
    // Floor: $60
    const consumables = round5(Math.max(15 * br + 10 * guests, 60) * (1 + (colMultiplier - 1) * 0.5));
    
    // ---- MAINTENANCE / REPAIR ----
    // BuildYourBnB: ~$150/mo. Scales with property size and value
    // Per-bedroom: $40/BR. Floor: $120
    // STRs have higher wear & tear than regular homes (constant guest turnover)
    const maintenance = round5(Math.max(40 * br, 120) * colMultiplier);
    
    // ---- RENTAL SOFTWARE ----
    // PriceLabs ($20-40) + channel manager ($10-30) = $30-70/mo
    // Larger properties may use more tools. Mostly flat.
    const software = br >= 5 ? 50 : 35;
    
    setElectricMonthly(electric);
    setWaterMonthly(water);
    setInternetMonthly(internet);
    setTrashMonthly(trash);
    setLawnCareMonthly(lawn);
    setPestControlMonthly(pest);
    setHouseSuppliesMonthly(supplies);
    setSuppliesConsumablesMonthly(consumables);
    setMaintenanceMonthly(maintenance);
    setRentalSoftwareMonthly(software);
    
    const total = electric + water + internet + trash + lawn + pest + supplies + consumables + maintenance + software;
    console.log(`[SmartDefaults] Research-based expenses for ${br}BR/${guests}guests/${sqft}sqft/$${homePrice.toLocaleString()} home (COL: ${colMultiplier.toFixed(2)}x): $${total}/mo`, {
      electric, water, internet, trash, lawn, pest, supplies, consumables, maintenance, software
    });
  }, [result?.address, bedrooms, guestCount, propertySqft, purchasePrice]);

  // ===== SMART DEFAULTS: Auto-populate arbitrage rent from HUD FMR =====
  useEffect(() => {
    if (!hudFmrData || userEditedRent.current) return;
    const br = bedrooms || 3;
    const fmrRent = hudFmrData.byBedrooms?.[Math.min(br, 4)];
    if (fmrRent && fmrRent > 0) {
      setMonthlyRent(Math.round(fmrRent).toString());
      console.log(`[SmartDefaults] Auto-filled arbitrage rent from HUD FMR: $${fmrRent}/mo for ${br}BR`);
    }
  }, [hudFmrData, bedrooms]);

  // ===== SMART DEFAULTS: Scale STR insurance with purchase price =====
  useEffect(() => {
    if (userEditedInsurance.current) return;
    const price = parseFloat(purchasePrice) || 0;
    if (price > 0) {
      // STR insurance typically runs $2.50-$3.50 per $1K of home value annually
      // Use $3 per $1K as a reasonable middle estimate, with a floor of $1,800 and cap of $8,000
      const estimated = Math.round(Math.min(Math.max(price * 0.003, 1800), 8000) / 100) * 100;
      setInsuranceAnnual(estimated);
      console.log(`[SmartDefaults] Set STR insurance to $${estimated}/yr for $${price.toLocaleString()} home`);
    }
  }, [purchasePrice]);

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
        
        // Sort by timestamp DESC and cap at 5
        const sorted = withExpiredCachesCleared
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 5);
        setRecentSearches(sorted);
        // Update localStorage with cleaned data
        localStorage.setItem("edge_recent_searches", JSON.stringify(sorted));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
    
    // Fetch from Supabase for signed-in users and merge with local
    const savedEmail = localStorage.getItem("edge_auth_email");
    if (savedEmail) {
      // 1. Bulk-sync local searches TO Supabase (background, non-blocking)
      const localSearches = JSON.parse(localStorage.getItem("edge_recent_searches") || "[]");
      if (localSearches.length > 0) {
        const syncKey = `edge_searches_synced_${savedEmail.toLowerCase().trim()}`;
        const lastSynced = localStorage.getItem(syncKey);
        const now = Date.now();
        // Re-sync every 5 minutes to catch new local searches
        if (!lastSynced || (now - parseInt(lastSynced, 10)) > 5 * 60 * 1000) {
          fetch("/api/recent-searches", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: savedEmail, searches: localSearches }),
          })
            .then(() => localStorage.setItem(syncKey, String(now)))
            .catch(err => console.error("[RecentSearches] Bulk sync error:", err));
        }
      }

      // 2. Fetch FROM Supabase and merge with local (cloud wins when newer)
      fetch(`/api/recent-searches?email=${encodeURIComponent(savedEmail)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.searches?.length > 0) {
            setRecentSearches(prev => {
              // Build a map of local searches keyed by address
              const localMap = new Map<string, RecentSearch>();
              prev.forEach((s: RecentSearch) => localMap.set(s.address, s));
              
              // Merge: for each cloud search, use cloud version if newer or if local doesn't have it
              let changed = false;
              const cloudSearches = data.searches.map((s: RecentSearch) => ({
                ...s,
                timestamp: s.analyzedAt ? new Date(s.analyzedAt).getTime() : (s.timestamp || Date.now()),
              }));
              
              for (const cloud of cloudSearches) {
                const local = localMap.get(cloud.address);
                if (!local) {
                  // Cloud-only: add it
                  localMap.set(cloud.address, cloud);
                  changed = true;
                } else {
                  // Both exist: use whichever is newer
                  const cloudTime = cloud.timestamp || 0;
                  const localTime = local.timestamp || 0;
                  if (cloudTime > localTime) {
                    localMap.set(cloud.address, cloud);
                    changed = true;
                  }
                }
              }
              
              if (!changed) return prev;
              
              // Sort by timestamp descending (most recent first), limit to 5
              const merged = Array.from(localMap.values())
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 5);
              localStorage.setItem("edge_recent_searches", JSON.stringify(merged));
              console.log(`[RecentSearches] Merged ${cloudSearches.length} cloud + ${prev.length} local → ${merged.length} total`);
              return merged;
            });
          }
        })
        .catch(err => console.error("[RecentSearches] Fetch error:", err));
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
      
      // Restore custom inputs from saved report (passed as JSON in ci param)
      const ciParam = urlParams.get("ci");
      if (ciParam) {
        try {
          const ci = JSON.parse(decodeURIComponent(ciParam));
          if (ci.purchasePrice) setPurchasePrice(ci.purchasePrice);
          if (ci.downPaymentPercent !== undefined) setDownPaymentPercent(ci.downPaymentPercent);
          if (ci.interestRate !== undefined) setInterestRate(ci.interestRate);
          if (ci.managementFeePercent !== undefined) setManagementFeePercent(ci.managementFeePercent);
          if (ci.cleaningCostPerStay !== undefined) setCleaningMonthly(ci.cleaningCostPerStay);
          if (ci.revenuePercentile) setRevenuePercentile(ci.revenuePercentile as "average" | "75th" | "90th");
          if (ci.useCustomIncome !== undefined) setUseCustomIncome(ci.useCustomIncome);
          if (ci.customAnnualIncome) setCustomAnnualIncome(ci.customAnnualIncome);
          if (ci.monthlyRent) setMonthlyRent(ci.monthlyRent);
          if (ci.securityDeposit) setSecurityDeposit(ci.securityDeposit);
          console.log('[FromSaved] Restored custom inputs:', ci);
        } catch (e) {
          console.warn('[FromSaved] Failed to parse custom inputs:', e);
        }
      }
      
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
          } else {
            // Fallback: use city median home value from our data
            const cityMatch = findCityForAddress(addressParam);
            if (cityMatch && cityMatch.medianHomeValue > 0) {
              console.log('[PurchasePrice] Cache path fallback to city median:', cityMatch.name, cityMatch.medianHomeValue);
              setPurchasePrice(Math.round(cityMatch.medianHomeValue).toString());
            } else {
              const parsed = addressParam.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
              if (parsed) {
                const bench = getStateBenchmark(parsed[1].toUpperCase());
                if (bench && bench.medianHomePrice > 0) {
                  setPurchasePrice(Math.round(bench.medianHomePrice).toString());
                }
              }
            }
          }
          if (cachedSearch.cachedResult.sqft > 0) {
            setPropertySqft(cachedSearch.cachedResult.sqft);
            setFurnishingsCost(Math.round(cachedSearch.cachedResult.sqft * 15));
          }
          // Enrich with Zillow property details (sqft + estimated value) in background
          if (!cachedSearch.cachedResult.sqft || cachedSearch.cachedResult.sqft === 0) {
            fetch(`/api/property-details?address=${encodeURIComponent(addressParam)}&bedrooms=${cachedSearch.cachedResult.bedrooms || 3}`)
              .then(res => res.json())
              .then(details => {
                if (details.success && details.sqft > 0) {
                  setPropertySqft(details.sqft);
                  setFurnishingsCost(Math.round(details.sqft * 15));
                  setResult(prev => prev ? { ...prev, sqft: details.sqft } : prev);
                }
                if (details.success && details.estimatedValue > 0 && !cachedSearch.cachedResult.listPrice) {
                  setPurchasePrice(details.estimatedValue.toString());
                } else if (!cachedSearch.cachedResult.listPrice) {
                  setPurchasePrice(prev => {
                    if (prev) return prev;
                    const cityMatch = findCityForAddress(addressParam);
                    if (cityMatch && cityMatch.medianHomeValue > 0) return Math.round(cityMatch.medianHomeValue).toString();
                    const parsed = addressParam.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
                    if (parsed) {
                      const bench = getStateBenchmark(parsed[1].toUpperCase());
                      if (bench && bench.medianHomePrice > 0) return Math.round(bench.medianHomePrice).toString();
                    }
                    return prev;
                  });
                }
              })
              .catch(() => {
                setPurchasePrice(prev => {
                  if (prev) return prev;
                  const cityMatch = findCityForAddress(addressParam);
                  if (cityMatch && cityMatch.medianHomeValue > 0) return Math.round(cityMatch.medianHomeValue).toString();
                  const parsed = addressParam.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
                  if (parsed) {
                    const bench = getStateBenchmark(parsed[1].toUpperCase());
                    if (bench && bench.medianHomePrice > 0) return Math.round(bench.medianHomePrice).toString();
                  }
                  return prev;
                });
              });
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
                userEditedExpenses.current = false;
                userEditedRent.current = false;
                userEditedInsurance.current = false;
                userEditedFurnishings.current = false;
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
                } else {
                  const cityMatch = findCityForAddress(addressParam);
                  if (cityMatch && cityMatch.medianHomeValue > 0) {
                    setPurchasePrice(Math.round(cityMatch.medianHomeValue).toString());
                  } else {
                    const parsed = addressParam.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
                    if (parsed) {
                      const bench = getStateBenchmark(parsed[1].toUpperCase());
                      if (bench && bench.medianHomePrice > 0) {
                        setPurchasePrice(Math.round(bench.medianHomePrice).toString());
                      }
                    }
                  }
                }
                if (analysisResult.sqft > 0) {
                  setPropertySqft(analysisResult.sqft);
                  setFurnishingsCost(Math.round(analysisResult.sqft * 15));
                }
                // Enrich with Zillow property details in background
                if (!analysisResult.sqft || analysisResult.sqft === 0) {
                  fetch(`/api/property-details?address=${encodeURIComponent(addressParam)}&bedrooms=${analysisResult.bedrooms || 3}`)
                    .then(res => res.json())
                    .then(details => {
                      if (details.success && details.sqft > 0) {
                        setPropertySqft(details.sqft);
                        setFurnishingsCost(Math.round(details.sqft * 15));
                        setResult(prev => prev ? { ...prev, sqft: details.sqft } : prev);
                      }
                      if (details.success && details.estimatedValue > 0 && !analysisResult.listPrice) {
                        setPurchasePrice(details.estimatedValue.toString());
                      } else if (!analysisResult.listPrice) {
                        // Fallback to city median when property details API has no estimated value
                        setPurchasePrice(prev => {
                          if (prev) return prev; // Don't overwrite if already set
                          const cityMatch = findCityForAddress(addressParam);
                          if (cityMatch && cityMatch.medianHomeValue > 0) {
                            return Math.round(cityMatch.medianHomeValue).toString();
                          }
                          const parsed = addressParam.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
                          if (parsed) {
                            const bench = getStateBenchmark(parsed[1].toUpperCase());
                            if (bench && bench.medianHomePrice > 0) {
                              return Math.round(bench.medianHomePrice).toString();
                            }
                          }
                          return prev;
                        });
                      }
                    })
                    .catch(() => {
                      // Property details API failed - fallback to city median
                      setPurchasePrice(prev => {
                        if (prev) return prev;
                        const cityMatch = findCityForAddress(addressParam);
                        if (cityMatch && cityMatch.medianHomeValue > 0) {
                          return Math.round(cityMatch.medianHomeValue).toString();
                        }
                        const parsed = addressParam.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
                        if (parsed) {
                          const bench = getStateBenchmark(parsed[1].toUpperCase());
                          if (bench && bench.medianHomePrice > 0) {
                            return Math.round(bench.medianHomePrice).toString();
                          }
                        }
                        return prev;
                      });
                    });
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
        // Trigger sync flag so AuthHeader picks up the new auth state
        localStorage.setItem("edge_auth_sync", Date.now().toString());
        
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
        
        // Bulk-sync local searches to Supabase on sign-in
        const localSearches = JSON.parse(localStorage.getItem("edge_recent_searches") || "[]");
        if (localSearches.length > 0) {
          fetch("/api/recent-searches", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.email, searches: localSearches }),
          })
            .then(() => {
              const syncKey = `edge_searches_synced_${data.email.toLowerCase().trim()}`;
              localStorage.setItem(syncKey, String(Date.now()));
              console.log("[RecentSearches] Bulk synced local searches to cloud on sign-in");
            })
            .catch(err => console.error("[RecentSearches] Bulk sync error on sign-in:", err));
        }
        
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
      // Store return path so auth callback redirects back here
      localStorage.setItem("edge_auth_return_path", "/calculator");
      
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, redirectPath: "/calculator" }),
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
        setCreditLog(getCreditLog());
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
      // Server-side check to prevent incognito/multi-device abuse
      try {
        const previewCheck = await fetch('/api/free-preview');
        const previewData = await previewCheck.json();
        if (previewData.success && previewData.used) {
          // This IP already used their free preview — require sign-in
          console.log("[Auth] Free preview already used from this IP — requiring sign-in");
          localStorage.setItem("edge_free_preview_used", "true");
          localStorage.setItem("edge_pending_address", address);
          localStorage.setItem("edge_pending_bedrooms", bedrooms?.toString() || "");
          localStorage.setItem("edge_pending_bathrooms", bathrooms?.toString() || "");
          localStorage.setItem("edge_pending_guests", guestCount?.toString() || "");
          setShowAuthModal(true);
          setAuthStep("email");
          setAuthError(null);
          return;
        }
      } catch (err) {
        console.error("[Auth] Free preview check failed, allowing anyway:", err);
      }
      
      // Allow first analysis without sign-in — show value first
      console.log("[Auth] First free preview - skipping auth");
      handleAnalyze();
      localStorage.setItem("edge_free_preview_used", "true");
      
      // Record server-side that this IP used their free preview
      fetch('/api/free-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      }).catch(() => {});
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
          // Log the free cache hit
          addCreditEvent({
            type: 'free',
            address: pendingAnalysis || address,
            creditsAfter: creditsRemaining ?? 0,
            note: 'Loaded from cache (no credit used)',
          });
          setCreditLog(getCreditLog());
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
      
      // Log the credit deduction
      addCreditEvent({
        type: 'deduct',
        address: pendingAnalysis || address,
        creditsAfter: creditData.remaining,
        note: 'New analysis',
      });
      setCreditLog(getCreditLog());
      
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
    
    // Reset user-edit flags so smart defaults apply to new analysis
    userEditedExpenses.current = false;
    userEditedRent.current = false;
    userEditedInsurance.current = false;
    userEditedFurnishings.current = false;
    
    // Cache in service worker for offline access
    cacheAnalysisResult(pendingAnalysis || address, data);
    
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
    
    // Auto-fill purchase price from analysis data (always on fresh analysis)
    if (analysisResult.listPrice > 0) {
      setPurchasePrice(analysisResult.listPrice.toString());
    } else {
      // Immediate fallback: use city median home value from our data
      // (property details API may also fill this later, but this ensures it's never blank)
      const addrForFallback = pendingAnalysis || address;
      const cityMatch = findCityForAddress(addrForFallback);
      if (cityMatch && cityMatch.medianHomeValue > 0) {
        console.log('[PurchasePrice] Immediate fallback to city median:', cityMatch.name, cityMatch.medianHomeValue);
        setPurchasePrice(Math.round(cityMatch.medianHomeValue).toString());
      } else {
        const parsed = addrForFallback.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
        if (parsed) {
          const bench = getStateBenchmark(parsed[1].toUpperCase());
          if (bench && bench.medianHomePrice > 0) {
            console.log('[PurchasePrice] Immediate fallback to state median:', parsed[1], bench.medianHomePrice);
            setPurchasePrice(Math.round(bench.medianHomePrice).toString());
          }
        }
      }
    }
    
    // Auto-fill sqft from analysis data
    if (analysisResult.sqft > 0) {
      setPropertySqft(analysisResult.sqft);
      setFurnishingsCost(Math.round(analysisResult.sqft * 15));
    }
    
    // Fetch property details (sqft + estimated value) from Redfin/Zillow in background
    // This enriches the analysis with actual property data when the primary source has no sqft/price
    const addrForDetails = pendingAnalysis || address;
    fetch(`/api/property-details?address=${encodeURIComponent(addrForDetails)}&bedrooms=${analysisResult.bedrooms}`)
      .then(res => res.json())
      .then(details => {
        if (details.success) {
          // Auto-fill sqft — prefer real data over bedroom estimate
          if (details.sqft > 0 && !details.isEstimate) {
            setPropertySqft(prev => {
              // Only auto-fill if analysis didn't already provide real sqft
              if (prev === 0 || prev === 1500 || analysisResult.sqft === 0) {
                setFurnishingsCost(Math.round(details.sqft * 15));
                return details.sqft;
              }
              return prev;
            });
            setResult(prev => prev ? { ...prev, sqft: details.sqft } : prev);
          } else if (details.sqft > 0 && details.isEstimate && analysisResult.sqft === 0) {
            // Use bedroom-based estimate only if we have nothing else
            setPropertySqft(prev => {
              if (prev === 0) {
                setFurnishingsCost(Math.round(details.sqft * 15));
                return details.sqft;
              }
              return prev;
            });
          }
          // Auto-fill purchase price if analysis had no listPrice
          if (details.estimatedValue > 0 && analysisResult.listPrice === 0) {
            setPurchasePrice(prev => {
              if (!prev || prev === "" || prev === "0") {
                return details.estimatedValue.toString();
              }
              return prev;
            });
          }
          console.log('[PropertyDetails]', details.source, '- sqft:', details.sqft, '(est:', details.isEstimate, ') value:', details.estimatedValue);
          // If property details succeeded but still no price, fallback to city median
          if ((!details.estimatedValue || details.estimatedValue === 0) && analysisResult.listPrice === 0) {
            setPurchasePrice(prev => {
              if (!prev || prev === '' || prev === '0') {
                const cityMatch = findCityForAddress(addrForDetails);
                if (cityMatch && cityMatch.medianHomeValue > 0) {
                  console.log('[PurchasePrice] Fallback to city median (after prop details):', cityMatch.name, cityMatch.medianHomeValue);
                  return Math.round(cityMatch.medianHomeValue).toString();
                }
                const parsed = addrForDetails.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
                if (parsed) {
                  const bench = getStateBenchmark(parsed[1].toUpperCase());
                  if (bench && bench.medianHomePrice > 0) {
                    return Math.round(bench.medianHomePrice).toString();
                  }
                }
              }
              return prev;
            });
          }
        }
      })
      .catch(err => {
        console.warn('[PropertyDetails] fetch failed (non-blocking):', err);
        // Fallback: if property details failed and we still have no purchase price, use city median
        if (analysisResult.listPrice === 0) {
          setPurchasePrice(prev => {
            if (!prev || prev === '' || prev === '0') {
              const cityMatch = findCityForAddress(addrForDetails);
              if (cityMatch && cityMatch.medianHomeValue > 0) {
                console.log('[PurchasePrice] Fallback to city median:', cityMatch.name, cityMatch.medianHomeValue);
                return Math.round(cityMatch.medianHomeValue).toString();
              }
              // State-level fallback
              const parsed = addrForDetails.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
              if (parsed) {
                const bench = getStateBenchmark(parsed[1].toUpperCase());
                if (bench && bench.medianHomePrice > 0) {
                  console.log('[PurchasePrice] Fallback to state median:', parsed[1], bench.medianHomePrice);
                  return Math.round(bench.medianHomePrice).toString();
                }
              }
            }
            return prev;
          });
        }
      });
    
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

  // Save recent search (localStorage + Supabase sync for signed-in users)
  const saveRecentSearch = (search: RecentSearch) => {
    const updated = [search, ...recentSearches.filter(s => s.address !== search.address)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("edge_recent_searches", JSON.stringify(updated));
    
    // Sync to Supabase for cross-device access
    const savedEmail = localStorage.getItem("edge_auth_email");
    if (savedEmail) {
      fetch("/api/recent-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: savedEmail, search }),
      }).catch(err => console.error("[RecentSearches] Sync error:", err));
    }
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
  const [emailToast, setEmailToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
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
  const [showCreditLog, setShowCreditLog] = useState(false);
  const [creditLog, setCreditLog] = useState<CreditEvent[]>([]);
  
  // Calculate free vs purchased credits (free credits = first 3)
  const FREE_CREDITS_TOTAL = 3;
  const freeCreditsRemaining = Math.max(0, FREE_CREDITS_TOTAL - creditsUsed);
  const purchasedCreditsRemaining = creditsRemaining !== null ? Math.max(0, creditsRemaining - freeCreditsRemaining) : 0;
  const hasPurchasedCredits = creditsLimit > FREE_CREDITS_TOTAL;
  
  const sendEmailReport = async () => {
    if (!emailAddress || !result) return;
    
    setEmailSending(true);
    setShowEmailModal(false);
    
    try {
      const inv = calculateInvestment();
      const arb = calculateArbitrage();
      const own = calculateIownit();
      const displayRevenue = getDisplayRevenue();
      
      const strategyLabel = analysisMode === "iownit" ? "I Own It (STR vs LTR)" : analysisMode === "arbitrage" ? "Rental Arbitrage" : "Investment Purchase";
      
      // Build summary text for email body
      let summaryLines = `${bedrooms || result.bedrooms} BR / ${bathrooms || result.bathrooms} BA / Sleeps ${guestCount || (bedrooms || 3) * 2}\n`;
      summaryLines += `Projected Annual Revenue: ${formatCurrency(displayRevenue)}\n`;
      
      if (analysisMode === "iownit") {
        summaryLines += `STR Monthly Net: ${formatCurrency(own.strMonthlyCashFlow)}\n`;
        summaryLines += `LTR Monthly Net: ${formatCurrency(own.ltrMonthlyCashFlow)}\n`;
        summaryLines += `Winner: ${own.strWins ? 'STR' : 'LTR'} by ${formatCurrency(Math.abs(own.monthlyDifference))}/mo`;
      } else if (analysisMode === "buying") {
        summaryLines += `Cash-on-Cash Return: ${inv.cashOnCashReturn.toFixed(1)}%\n`;
        summaryLines += `Monthly Cash Flow: ${formatCurrency(inv.monthlyCashFlow)}\n`;
        summaryLines += `Total Cash Required: ${formatCurrency(inv.totalCashNeeded)}`;
      } else {
        summaryLines += `Cash-on-Cash Return: ${arb.cashOnCashReturn.toFixed(1)}%\n`;
        summaryLines += `Monthly Cash Flow: ${formatCurrency(arb.monthlyCashFlow)}\n`;
        summaryLines += `Total Cash to Start: ${formatCurrency(arb.totalCashNeeded)}`;
      }
      
      // Generate the full report HTML (same as PDF)
      // We need to call downloadPDFReport logic but capture the HTML instead of printing
      // The reportHTML is generated inside downloadPDFReport, so we extract it
      const reportHtml = generateReportHTML();
      
      const senderEmail = localStorage.getItem('edge_auth_email') || undefined;
      
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: emailAddress,
          senderEmail,
          reportHtml,
          propertyAddress: result.address || result.neighborhood,
          strategy: strategyLabel,
          summary: summaryLines,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmailToast({ type: 'success', message: `Report sent to ${emailAddress}` });
      } else {
        setEmailToast({ type: 'error', message: data.error || 'Failed to send email. Please try again.' });
      }
    } catch (err) {
      console.error('Email error:', err);
      setEmailToast({ type: 'error', message: 'Failed to send email. Please check your connection.' });
    } finally {
      setEmailSending(false);
      setEmailAddress('');
      // Auto-dismiss toast after 4 seconds
      setTimeout(() => setEmailToast(null), 4000);
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
      // If the exact address was analyzed before, we can skip the expensive API calls
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
            
            // If a credit was deducted before reaching here (via confirmAnalysis),
            // refund it since we got the data from cache, not a paid API call
            const savedEmail = localStorage.getItem("edge_auth_email");
            if (savedEmail) {
              try {
                const refundRes = await fetch('/api/credits', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: savedEmail, action: 'refund' }),
                });
                const refundData = await refundRes.json();
                if (refundData.success) {
                  console.log('[Credits] Refunded credit — data came from cache, not paid API');
                  setCreditsRemaining(refundData.remaining);
                  addCreditEvent({
                    type: 'refund',
                    address: addressToAnalyze,
                    creditsAfter: refundData.remaining,
                    note: 'Auto-refund: data found in cache',
                  });
                  setCreditLog(getCreditLog());
                }
              } catch (refundErr) {
                console.error('[Credits] Refund failed:', refundErr);
              }
            }
          }
        }
      } catch {
        console.log('[Analyze] property_cache check failed, continuing to full API');
      }

      // If no cache hit, do the full API call
      if (!data) {
        setLoadingStep("Finding nearby STR listings...");
        // Cycle through progress steps to show the user something is happening
        const steps = [
          { delay: 5000, text: "Scanning STR listings in the area..." },
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
            // Auto-refund on timeout
            const savedEmailTimeout = localStorage.getItem("edge_auth_email");
            if (savedEmailTimeout && isAuthenticated) {
              fetch('/api/credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: savedEmailTimeout, action: 'refund', reason: 'Auto-refund: analysis timed out', address: addressToAnalyze }),
              }).then(r => r.json()).then(d => {
                if (d.success) { setCreditsRemaining(d.remaining); addCreditEvent({ type: 'refund', address: addressToAnalyze, creditsAfter: d.remaining, note: 'Auto-refund: timeout' }); setCreditLog(getCreditLog()); }
              }).catch(() => {});
            }
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
        // Auto-refund on API error
        const savedEmailErr = localStorage.getItem("edge_auth_email");
        if (savedEmailErr && isAuthenticated) {
          fetch('/api/credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmailErr, action: 'refund', reason: `Auto-refund: API error - ${data.error || 'unknown'}`, address: addressToAnalyze }),
          }).then(r => r.json()).then(d => {
            if (d.success) { setCreditsRemaining(d.remaining); addCreditEvent({ type: 'refund', address: addressToAnalyze, creditsAfter: d.remaining, note: 'Auto-refund: API error' }); setCreditLog(getCreditLog()); }
          }).catch(() => {});
        }
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

      // Get comp data from Airbnb Direct API - STR only
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
      userEditedExpenses.current = false;
      userEditedRent.current = false;
      userEditedInsurance.current = false;
      userEditedFurnishings.current = false;
      setAddress(addressToAnalyze);
      
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
      } else if (!purchasePrice) {
        // Fallback: use city median home value from our data
        const cityMatch = findCityForAddress(addressToAnalyze);
        if (cityMatch && cityMatch.medianHomeValue > 0) {
          setPurchasePrice(Math.round(cityMatch.medianHomeValue).toString());
        } else {
          const parsed = addressToAnalyze.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
          if (parsed) {
            const bench = getStateBenchmark(parsed[1].toUpperCase());
            if (bench && bench.medianHomePrice > 0) {
              setPurchasePrice(Math.round(bench.medianHomePrice).toString());
            }
          }
        }
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
      
      // CRITICAL: Auto-refund credit if analysis failed after deduction
      const savedEmail = localStorage.getItem("edge_auth_email");
      if (savedEmail && isAuthenticated) {
        try {
          console.log('[Credits] Attempting auto-refund after analysis failure...');
          const refundRes = await fetch('/api/credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmail, action: 'refund', reason: 'Auto-refund: analysis failed', address: addressToAnalyze }),
          });
          const refundData = await refundRes.json();
          if (refundData.success) {
            console.log('[Credits] Auto-refunded credit after failure');
            setCreditsRemaining(refundData.remaining);
            addCreditEvent({
              type: 'refund',
              address: addressToAnalyze,
              creditsAfter: refundData.remaining,
              note: 'Auto-refund: analysis failed',
            });
            setCreditLog(getCreditLog());
          }
        } catch (refundErr) {
          console.error('[Credits] Auto-refund after failure failed:', refundErr);
        }
      }
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

  // Helper: handle numeric input changes — strips leading zeros, allows empty field
  const handleNumericChange = (setter: (v: number) => void, fallback = 0) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      setter(0); // Always set to 0 when empty — let numDisplay show empty string
      return;
    }
    // Strip leading zeros: "060" → 60, "0" stays 0
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      setter(parsed);
    }
  };

  // Helper: display value for numeric inputs — show empty string when 0 so user can type freely
  const numDisplay = (val: number): string => val === 0 ? '' : String(val);

  // Generate the full report HTML — used by both PDF download and email send
  const generateReportHTML = (): string => {
    if (!result) return '';
    
    const investment = calculateInvestment();
    const arbitrage = calculateArbitrage();
    const iownit = calculateIownit();
    const displayRevenue = getDisplayRevenue();
    const guestMultiplier = getGuestCountMultiplier();
    const guestBonus = Math.round((guestMultiplier - 1) * 100);
    const baselineGuests = (bedrooms || 3) * 2;
    const effectiveOccupancy = result.occupancy || 55;
    const effectiveAdr = effectiveOccupancy > 0 ? Math.round(displayRevenue / (365 * effectiveOccupancy / 100)) : result.adr;
    
    // Get seasonal data
    const seasonalData = getSeasonalityData();
    const baseMonthlyRev = displayRevenue / 12;
    
    // Calculate monthly revenues with seasonal variation
    const monthlyRevenues = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
      const monthData = seasonalData[index];
      let monthlyRev = 0;
      if (monthData?.revenue && monthData.revenue > 0) {
        monthlyRev = Math.round(monthData.revenue * guestMultiplier);
      } else if (monthData?.occupancy) {
        const baseOccupancy = result.occupancy || 55;
        const seasonalMultiplier = baseOccupancy > 0 ? (monthData.occupancy / baseOccupancy) : 1;
        monthlyRev = Math.round(baseMonthlyRev * Math.min(Math.max(seasonalMultiplier, 0.5), 1.5));
      } else {
        monthlyRev = Math.round(baseMonthlyRev);
      }
      return { month, revenue: monthlyRev || Math.round(baseMonthlyRev) };
    });
    
    const sortedMonths = [...monthlyRevenues].sort((a, b) => b.revenue - a.revenue);
    const peakMonth = sortedMonths[0];
    const lowMonth = sortedMonths[sortedMonths.length - 1];
    
    // Calculate deal score (same logic as UI)
    let totalScore = 0;
    let cocScore = 0, cashFlowScore = 0, occupancyScore = 0, dataScore = 0;
    let cocPct = "0", monthlyNet = "$0", paybackMonths = 0;
    let paybackYears: string | null = null;
    
    if (analysisMode === "iownit") {
      const advantageScore = Math.min(40, Math.max(0, (iownit.monthlyDifference / 500) * 40));
      cashFlowScore = Math.min(30, Math.max(0, (iownit.strMonthlyCashFlow / 500) * 30));
      occupancyScore = Math.min(20, Math.max(0, ((result.occupancy - 40) / 30) * 20));
      dataScore = (result.percentiles ? 5 : 2.5) + (hudFmrData ? 5 : 2.5);
      cocScore = advantageScore;
      totalScore = Math.round(cocScore + cashFlowScore + occupancyScore + dataScore);
      monthlyNet = formatCurrency(iownit.strMonthlyCashFlow);
      cocPct = iownit.fmrMonthly > 0 ? ((iownit.grossRevenue / (iownit.fmrMonthly * 12)) * 100 - 100).toFixed(0) : "0";
    } else {
      const activeCalc = analysisMode === "buying" ? investment : arbitrage;
      cocScore = Math.min(40, Math.max(0, activeCalc.cashOnCashReturn * 4));
      cashFlowScore = Math.min(30, Math.max(0, (activeCalc.monthlyCashFlow / 500) * 30));
      occupancyScore = Math.min(20, Math.max(0, ((result.occupancy - 40) / 30) * 20));
      dataScore = result.percentiles ? 10 : 5;
      totalScore = Math.round(cocScore + cashFlowScore + occupancyScore + dataScore);
      paybackMonths = activeCalc.monthlyCashFlow > 0 ? Math.ceil(activeCalc.totalCashNeeded / activeCalc.monthlyCashFlow) : 0;
      paybackYears = paybackMonths > 0 ? (paybackMonths / 12).toFixed(1) : null;
      cocPct = activeCalc.cashOnCashReturn.toFixed(1);
      monthlyNet = formatCurrency(activeCalc.monthlyCashFlow);
    }
    
    let verdict = "PASS";
    let verdictColor = "#f59e0b";
    let explanation = "This deal may work but requires careful consideration.";
    
    if (analysisMode === "iownit") {
      if (totalScore >= 75) { verdict = "GO STR"; verdictColor = "#16a34a"; explanation = `STR nets ${monthlyNet}/mo \u2014 ${formatCurrency(Math.abs(iownit.monthlyDifference))} more than LTR. Strong case for short-term rental.`; }
      else if (totalScore >= 60) { verdict = "STR FAVORED"; verdictColor = "#22c55e"; explanation = `STR nets ${monthlyNet}/mo. The numbers favor STR, but consider the extra work involved.`; }
      else if (totalScore >= 45) { verdict = "CLOSE CALL"; verdictColor = "#eab308"; explanation = `STR and LTR are close. STR nets ${monthlyNet}/mo. Consider your time, effort, and risk tolerance.`; }
      else { verdict = iownit.strWins ? "MARGINAL STR" : "LTR BETTER"; verdictColor = "#ef4444"; explanation = iownit.strWins ? `STR barely edges out LTR.` : `LTR wins by ${formatCurrency(Math.abs(iownit.monthlyDifference))}/mo with far less hassle.`; }
    } else if (totalScore >= 75) { verdict = "STRONG BUY"; verdictColor = "#16a34a"; explanation = `${cocPct}% CoC return with ${monthlyNet}/mo cash flow. ${paybackYears ? `Full payback in ~${paybackYears} years.` : ''} Top-tier deal.`; }
    else if (totalScore >= 60) { verdict = "GOOD DEAL"; verdictColor = "#22c55e"; explanation = `${cocPct}% CoC return netting ${monthlyNet}/mo. ${paybackYears ? `Payback in ~${paybackYears} years.` : ''} Solid fundamentals.`; }
    else if (totalScore >= 45) { verdict = "CONSIDER"; verdictColor = "#eab308"; explanation = `${cocPct}% CoC with ${monthlyNet}/mo cash flow. Moderate returns \u2014 a value-add strategy could improve this.`; }
    else { verdict = "CAUTION"; verdictColor = "#ef4444"; explanation = `${cocPct}% CoC with ${monthlyNet}/mo cash flow. Returns are too thin to justify the risk.`; }
    
    // Verdict background colors
    const verdictBgMap: Record<string, string> = { "#16a34a": "#dcfce7", "#22c55e": "#ecfdf5", "#eab308": "#fefce8", "#f59e0b": "#fef3c7", "#ef4444": "#fef2f2" };
    const verdictBg = verdictBgMap[verdictColor] || "#fef3c7";
    
    // Operating expenses breakdown
    const monthlyExpenses = calculateMonthlyExpenses();
    const utilityTotal = electricMonthly + waterMonthly + internetMonthly + trashMonthly;
    const maintenanceTotal = lawnCareMonthly + pestControlMonthly + maintenanceMonthly;
    const operationsTotal = houseSuppliesMonthly + suppliesConsumablesMonthly + rentalSoftwareMonthly;
    
    // Revenue percentile data — use comp-based when exclusions active
    const pdfCompRev = excludedCompIds.size > 0 ? getCompBasedRevenue() : null;
    const hasPercentiles = !!(pdfCompRev?.percentiles || result.percentiles?.revenue);
    const p25 = pdfCompRev ? Math.round(pdfCompRev.percentiles.p25 * guestMultiplier) : result.percentiles?.revenue ? Math.round(result.percentiles.revenue.p25 * guestMultiplier) : Math.round(displayRevenue * 0.7);
    const p50 = pdfCompRev ? Math.round(pdfCompRev.percentiles.p50 * guestMultiplier) : result.percentiles?.revenue ? Math.round(result.percentiles.revenue.p50 * guestMultiplier) : displayRevenue;
    const p75 = pdfCompRev ? Math.round(pdfCompRev.percentiles.p75 * guestMultiplier) : result.percentiles?.revenue ? Math.round(result.percentiles.revenue.p75 * guestMultiplier) : Math.round(displayRevenue * 1.25);
    const p90 = pdfCompRev ? Math.round(pdfCompRev.percentiles.p90 * guestMultiplier) : result.percentiles?.revenue ? Math.round(result.percentiles.revenue.p90 * guestMultiplier) : Math.round(displayRevenue * 1.45);
    
    // Break-even occupancy
    const pdfBreakEvenOcc = effectiveAdr > 0 ? Math.round(((analysisMode === 'buying' ? investment.totalAnnualExpenses : analysisMode === 'arbitrage' ? arbitrage.totalAnnualExpenses : iownit.totalAnnualExpenses) / (effectiveAdr * 365)) * 100) : 0;
    
    // Cap rate (buying only)
    const capRate = analysisMode === "buying" && purchasePrice ? ((investment.netOperatingIncome / (parseFloat(purchasePrice) || 1)) * 100).toFixed(1) : null;
    
    // DSCR (buying only)
    const annualDebtService = investment.monthlyMortgage * 12;
    const dscr = annualDebtService > 0 ? (investment.netOperatingIncome / annualDebtService).toFixed(2) : null;
    
    // AI analysis from sessionStorage
    const aiAnalysisText = typeof window !== 'undefined' ? sessionStorage.getItem('aiAnalysisForPdf') || aiAnalysis : aiAnalysis;
    
    // Strategy label
    const strategyLabel = analysisMode === "iownit" ? "I Own It (STR vs LTR)" : analysisMode === "arbitrage" ? "Rental Arbitrage" : "Investment Purchase";
    const strategyIcon = analysisMode === "iownit" ? "&#127968;" : analysisMode === "arbitrage" ? "&#128273;" : "&#127969;";
    
    // Percentile position for marker
    const percentilePosition = (() => {
      if (!hasPercentiles || displayRevenue <= p25) return 10;
      if (displayRevenue >= p90) return 90;
      if (displayRevenue <= p50) return 10 + ((displayRevenue - p25) / Math.max(p50 - p25, 1)) * 40;
      if (displayRevenue <= p75) return 50 + ((displayRevenue - p50) / Math.max(p75 - p50, 1)) * 25;
      return 75 + ((displayRevenue - p75) / Math.max(p90 - p75, 1)) * 15;
    })();
    
    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>${strategyLabel} Analysis \u2014 ${result.address || result.neighborhood} | Edge by Teeco</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    :root {
      --olive: #2b2823;
      --olive-light: #3d3830;
      --cream: #f5f4f0;
      --cream-dark: #e8e6e0;
      --gold: #b8a88a;
      --gold-light: #d4c9b0;
      --green: #22c55e;
      --green-dark: #16a34a;
      --green-bg: #ecfdf5;
      --red: #ef4444;
      --red-bg: #fef2f2;
      --yellow: #f59e0b;
      --yellow-bg: #fef3c7;
      --blue: #0ea5e9;
      --text: #2b2823;
      --text-secondary: #787060;
      --text-muted: #a09888;
      --border: #e5e3da;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text);
      line-height: 1.6;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 40px 48px;
    }
    
    .report-header {
      position: relative;
      padding: 40px;
      background: var(--olive);
      border-radius: 20px;
      color: white;
      margin-bottom: 32px;
      overflow: hidden;
    }
    .report-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 60%;
      height: 200%;
      background: radial-gradient(ellipse, rgba(184,168,138,0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      position: relative;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .brand-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--gold);
      display: inline-block;
    }
    .report-type {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--gold);
      font-weight: 600;
      padding: 6px 16px;
      border: 1px solid rgba(184,168,138,0.4);
      border-radius: 20px;
    }
    .property-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.8px;
      line-height: 1.2;
      margin-bottom: 8px;
      position: relative;
    }
    .property-location {
      font-size: 15px;
      color: var(--gold-light);
      font-weight: 400;
      margin-bottom: 20px;
    }
    .property-specs {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .spec-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: rgba(255,255,255,0.8);
    }
    .spec-divider {
      width: 1px;
      height: 16px;
      background: rgba(255,255,255,0.2);
    }
    .data-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .data-badge.pricelabs { background: rgba(14,165,233,0.2); color: #7dd3fc; }
    .data-badge.airbnb { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
    
    .deal-score-banner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px 32px;
      border-radius: 16px;
      margin-bottom: 32px;
    }
    .score-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 28px;
      flex-shrink: 0;
      border: 3px solid;
    }
    .score-label {
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      opacity: 0.7;
    }
    .score-verdict {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .score-explanation {
      font-size: 13px;
      opacity: 0.8;
      line-height: 1.5;
      margin-top: 2px;
    }
    
    .exec-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }
    .exec-card {
      background: var(--olive);
      border-radius: 16px;
      padding: 28px 20px;
      text-align: center;
      color: white;
    }
    .exec-card.highlight {
      background: linear-gradient(135deg, var(--olive) 0%, var(--olive-light) 100%);
      border: 1px solid rgba(184,168,138,0.3);
    }
    .exec-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(255,255,255,0.5);
      font-weight: 500;
      margin-bottom: 10px;
    }
    .exec-value {
      font-size: 28px;
      font-weight: 800;
      color: var(--green);
      letter-spacing: -0.5px;
    }
    .exec-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      margin-top: 6px;
    }
    
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: var(--cream);
      border-radius: 14px;
      padding: 20px 10px;
      text-align: center;
    }
    .metric-card.dark {
      background: var(--olive);
    }
    .metric-card.dark .metric-value { color: var(--green); }
    .metric-card.dark .metric-label { color: rgba(255,255,255,0.5); }
    .metric-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .metric-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 36px 0 20px 0;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--border);
    }
    .section-number {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--olive);
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section-badge {
      font-size: 9px;
      background: var(--green);
      color: white;
      padding: 3px 10px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .percentile-container {
      background: var(--cream);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .percentile-bar {
      position: relative;
      height: 8px;
      background: linear-gradient(90deg, #fecaca 0%, #fde68a 25%, #bbf7d0 50%, #86efac 75%, #22c55e 100%);
      border-radius: 4px;
      margin: 20px 0 12px 0;
    }
    .percentile-marker {
      position: absolute;
      top: -6px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--olive);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transform: translateX(-50%);
    }
    .percentile-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }
    .percentile-item {
      text-align: center;
    }
    .percentile-item .value {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
    }
    .percentile-item .label {
      font-size: 9px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .percentile-item.active .value {
      color: var(--green-dark);
      font-size: 15px;
    }
    .percentile-item.active .label {
      color: var(--green-dark);
      font-weight: 600;
    }
    
    .monthly-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin: 20px 0;
    }
    .month-card {
      background: var(--cream);
      border-radius: 12px;
      padding: 14px 6px;
      text-align: center;
    }
    .month-card.peak {
      background: var(--olive);
      color: white;
    }
    .month-card.peak .month-name { color: rgba(255,255,255,0.5); }
    .month-card.peak .month-value { color: var(--green); }
    .month-card.low { background: #fef3c7; }
    .month-name {
      font-size: 9px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .month-value {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      margin-top: 4px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .data-table td {
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table .label { color: var(--text); font-weight: 400; }
    .data-table .value { text-align: right; font-weight: 600; color: var(--text); }
    .data-table .total-row { background: var(--cream); border-radius: 8px; }
    .data-table .total-row td { font-weight: 700; font-size: 14px; }
    .data-table .positive { color: var(--green-dark); }
    .data-table .negative { color: var(--red); }
    .data-table .highlight-row { background: var(--olive); border-radius: 8px; }
    .data-table .highlight-row td { color: white; font-weight: 700; font-size: 14px; border-bottom: none; }
    .data-table .highlight-row .positive { color: var(--green); }
    .data-table .highlight-row .negative { color: #fca5a5; }
    
    .expense-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    }
    .expense-category {
      background: var(--cream);
      border-radius: 14px;
      padding: 20px;
    }
    .expense-category-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-secondary);
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--cream-dark);
    }
    .expense-line {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
    }
    .expense-line .name { color: var(--text-secondary); }
    .expense-line .amount { font-weight: 600; color: var(--text); }
    .expense-total {
      display: flex;
      justify-content: space-between;
      padding-top: 8px;
      margin-top: 8px;
      border-top: 1px solid var(--cream-dark);
      font-weight: 700;
      font-size: 13px;
    }
    
    .comp-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .comp-card:last-child { border-bottom: none; }
    .comp-rank {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: var(--cream);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      margin-right: 12px;
      flex-shrink: 0;
    }
    .comp-info { flex: 1; }
    .comp-name { font-weight: 600; color: var(--text); font-size: 12px; }
    .comp-details { font-size: 10px; color: var(--text-secondary); margin-top: 2px; }
    .comp-revenue { text-align: right; }
    .comp-revenue-value { font-weight: 700; color: var(--text); font-size: 14px; }
    .comp-revenue-details { font-size: 10px; color: var(--text-secondary); }
    
    .amenity-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .amenity-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--cream);
    }
    .amenity-item.must-have {
      background: var(--olive);
      color: white;
    }
    .amenity-item.must-have .amenity-name { color: white; }
    .amenity-item.must-have .amenity-boost { color: var(--green); }
    .amenity-item.high-impact { background: var(--green-bg); }
    .amenity-name { font-weight: 500; font-size: 11px; color: var(--text); }
    .amenity-boost { font-weight: 700; color: var(--green-dark); font-size: 12px; }
    
    .roi-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 4px;
      margin: 16px 0;
    }
    .roi-year {
      text-align: center;
      padding: 10px 4px;
      border-radius: 8px;
    }
    .roi-year.positive { background: var(--green-bg); }
    .roi-year.negative { background: var(--red-bg); }
    .roi-year .year-label {
      font-size: 9px;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .roi-year .year-value {
      font-size: 10px;
      font-weight: 700;
      margin-top: 2px;
    }
    .roi-year.positive .year-value { color: var(--green-dark); }
    .roi-year.negative .year-value { color: var(--red); }
    
    .ai-analysis {
      background: linear-gradient(135deg, #f8f7f4 0%, #f0efe8 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px;
      margin: 24px 0;
    }
    .ai-analysis-badge {
      font-size: 9px;
      background: var(--olive);
      color: var(--gold);
      padding: 3px 10px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ai-analysis-content {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.7;
      white-space: pre-wrap;
    }
    
    .callout {
      padding: 20px 24px;
      border-radius: 14px;
      margin: 16px 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .callout-icon { font-size: 24px; flex-shrink: 0; }
    .callout-title { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
    .callout-text { font-size: 12px; opacity: 0.8; }
    
    .report-footer {
      margin-top: 48px;
      padding-top: 32px;
      border-top: 2px solid var(--border);
      text-align: center;
    }
    .footer-brand { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
    .footer-url { font-size: 14px; color: var(--text); font-weight: 500; margin-top: 2px; }
    .footer-tagline { font-size: 13px; color: var(--text-secondary); font-style: italic; margin-top: 4px; }
    .footer-date { font-size: 12px; color: var(--text-muted); margin-top: 12px; }
    .footer-disclaimer {
      font-size: 9px;
      color: var(--text-muted);
      margin-top: 20px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }
    
    @page { margin: 0.4in; size: letter; }
    @media print {
      body { padding: 0; }
      .page { padding: 20px; }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    
    <!-- HEADER -->
    <div class="report-header">
      <div class="header-top">
        <div class="brand">
          <span class="brand-name">Edge by Teeco</span>
          <span class="brand-dot"></span>
        </div>
        <div class="report-type">${strategyIcon} ${strategyLabel}</div>
      </div>
      <h1 class="property-title">${result.address || result.neighborhood}</h1>
      <p class="property-location">${result.city}, ${result.state}</p>
      <div class="property-specs">
        <span class="spec-item">${result.bedrooms} Bedrooms</span>
        <span class="spec-divider"></span>
        <span class="spec-item">${result.bathrooms} Bathrooms</span>
        <span class="spec-divider"></span>
        <span class="spec-item">Sleeps ${guestCount || baselineGuests}</span>
        <span class="spec-divider"></span>
        <span class="spec-item">${propertySqft.toLocaleString()} sqft</span>
        <span class="spec-divider"></span>
        <span class="spec-item">${result.propertyType || 'Single Family'}</span>
      </div>
      ${result.dataSource && result.dataSource.includes('pricelabs') 
        ? '<div class="data-badge pricelabs">&#9989; PriceLabs Verified Data</div>' 
        : '<div class="data-badge airbnb">STR Market Data</div>'}
    </div>
    
    <!-- DEAL SCORE -->
    <div class="deal-score-banner" style="background: ${verdictBg};">
      <div class="score-circle" style="color: ${verdictColor}; border-color: ${verdictColor};">
        ${totalScore}
        <span class="score-label">Score</span>
      </div>
      <div>
        <div class="score-verdict" style="color: ${verdictColor};">${verdict}</div>
        <div class="score-explanation" style="color: ${verdictColor};">${explanation}</div>
      </div>
    </div>
    
    <!-- EXECUTIVE SUMMARY -->
    <div class="exec-grid">
      <div class="exec-card highlight">
        <p class="exec-label">Projected Annual Revenue</p>
        <p class="exec-value">${formatCurrency(displayRevenue)}</p>
        <p class="exec-sub">${formatCurrency(Math.round(displayRevenue / 12))}/month average</p>
      </div>
      <div class="exec-card">
        <p class="exec-label">Monthly Cash Flow</p>
        <p class="exec-value" style="color: ${(analysisMode === 'arbitrage' ? arbitrage.cashFlow : analysisMode === 'iownit' ? iownit.strCashFlow : investment.cashFlow) >= 0 ? 'var(--green)' : '#fca5a5'};">${formatCurrency(Math.round((analysisMode === 'arbitrage' ? arbitrage.cashFlow : analysisMode === 'iownit' ? iownit.strCashFlow : investment.cashFlow) / 12))}</p>
        <p class="exec-sub">After all expenses</p>
      </div>
      <div class="exec-card">
        <p class="exec-label">${analysisMode === 'iownit' ? 'STR vs LTR Advantage' : 'Cash-on-Cash Return'}</p>
        <p class="exec-value">${analysisMode === 'iownit' ? formatCurrency(Math.abs(iownit.monthlyDifference)) + '/mo' : (analysisMode === 'arbitrage' ? arbitrage.cashOnCashReturn : investment.cashOnCashReturn).toFixed(1) + '%'}</p>
        <p class="exec-sub">${analysisMode === 'iownit' ? (iownit.strWins ? 'STR wins' : 'LTR wins') : 'On total cash invested'}</p>
      </div>
    </div>
    
    <!-- KEY METRICS -->
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-value">${formatCurrency(effectiveAdr)}</div>
        <div class="metric-label">Avg Daily Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${effectiveOccupancy}%</div>
        <div class="metric-label">Occupancy</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatCurrency(analysisMode === 'arbitrage' ? arbitrage.totalCashNeeded : analysisMode === 'iownit' ? iownit.startupCosts : investment.totalCashNeeded)}</div>
        <div class="metric-label">${analysisMode === 'arbitrage' ? 'Cash to Start' : analysisMode === 'iownit' ? 'Setup Cost' : 'Cash Required'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${result.nearbyListings || '\u2014'}</div>
        <div class="metric-label">Active Listings</div>
      </div>
      <div class="metric-card dark">
        <div class="metric-value">${pdfBreakEvenOcc}%</div>
        <div class="metric-label">Break-Even Occ.</div>
      </div>
    </div>
    
    ${guestBonus > 0 ? `
    <div class="callout" style="background: var(--green-bg); border: 1px solid #bbf7d0;">
      <span class="callout-icon">&#128101;</span>
      <div>
        <div class="callout-title" style="color: var(--green-dark);">+${guestBonus}% Guest Capacity Bonus Applied</div>
        <div class="callout-text" style="color: var(--green-dark);">Sleeping ${guestCount} guests (vs ${baselineGuests} baseline for ${bedrooms}BR) adds ~${guestBonus}% revenue uplift based on market data.</div>
      </div>
    </div>
    ` : ''}
    
    <!-- SECTION 1: REVENUE -->
    <div class="section-header">
      <div class="section-number">1</div>
      <span class="section-title">Revenue Analysis</span>
      ${hasPercentiles ? '<span class="section-badge">Market Data</span>' : ''}
    </div>
    
    <div class="percentile-container">
      <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">Market Revenue Positioning</div>
      <div style="font-size: 11px; color: var(--text-muted);">Based on ${result.percentiles?.listingsAnalyzed || result.nearbyListings || 'comparable'} ${result.bedrooms}BR listings within 25 miles</div>
      <div class="percentile-bar">
        <div class="percentile-marker" style="left: ${Math.round(percentilePosition)}%;"></div>
      </div>
      <div class="percentile-labels">
        <div class="percentile-item">
          <div class="value">${formatCurrency(p25)}</div>
          <div class="label">25th %</div>
        </div>
        <div class="percentile-item ${revenuePercentile === 'average' ? 'active' : ''}">
          <div class="value">${formatCurrency(p50)}</div>
          <div class="label">Median</div>
        </div>
        <div class="percentile-item ${revenuePercentile === '75th' ? 'active' : ''}">
          <div class="value">${formatCurrency(p75)}</div>
          <div class="label">75th %</div>
        </div>
        <div class="percentile-item ${revenuePercentile === '90th' ? 'active' : ''}">
          <div class="value">${formatCurrency(p90)}</div>
          <div class="label">90th %</div>
        </div>
      </div>
      <div style="text-align: center; margin-top: 12px; font-size: 11px; color: var(--text-secondary);">
        Your projection: <strong style="color: var(--green-dark);">${formatCurrency(displayRevenue)}/yr</strong> 
        (${revenuePercentile === 'average' ? 'Median estimate' : revenuePercentile === '75th' ? '75th percentile' : '90th percentile'}${useCustomIncome ? ' \u2014 Custom override' : ''})
      </div>
    </div>
    
    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">Monthly Revenue Forecast</div>
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
    <p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">
      <span style="color:var(--green);">&#9679;</span> Peak: ${peakMonth.month} (${formatCurrency(peakMonth.revenue)}) &nbsp;&nbsp;
      <span style="color:var(--yellow);">&#9679;</span> Low: ${lowMonth.month} (${formatCurrency(lowMonth.revenue)}) &nbsp;&nbsp;
      Annual: <strong>${formatCurrency(monthlyRevenues.reduce((sum, m) => sum + m.revenue, 0))}</strong>
    </p>
    
    <div class="page-break"></div>
    
    <!-- SECTION 2: FINANCIAL ANALYSIS -->
    <div class="section-header">
      <div class="section-number">2</div>
      <span class="section-title">Financial Analysis</span>
      <span class="section-badge">${strategyLabel}</span>
    </div>
    
    ${analysisMode === "buying" && purchasePrice ? `
    <table class="data-table">
      <tr><td class="label">Purchase Price</td><td class="value">${formatCurrency(parseFloat(purchasePrice))}</td></tr>
      <tr><td class="label">Down Payment (${downPaymentPercent}%)</td><td class="value">${formatCurrency(investment.downPayment)}</td></tr>
      <tr><td class="label">Loan Amount (${loanTerm}yr @ ${interestRate}%)</td><td class="value">${formatCurrency(investment.loanAmount)}</td></tr>
      <tr><td class="label">Monthly Mortgage (P&amp;I)</td><td class="value">${formatCurrency(investment.monthlyMortgage)}</td></tr>
      ${capRate ? `<tr><td class="label">Cap Rate</td><td class="value">${capRate}%</td></tr>` : ''}
      ${dscr ? `<tr><td class="label">Debt Service Coverage Ratio</td><td class="value">${dscr}x</td></tr>` : ''}
      <tr class="total-row"><td class="label">Total Cash Required</td><td class="value">${formatCurrency(investment.totalCashNeeded)}</td></tr>
    </table>
    
    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin: 24px 0 12px 0;">Annual Income &amp; Expenses</div>
    <table class="data-table">
      <tr style="background: var(--green-bg);"><td class="label" style="font-weight:600;">Gross STR Revenue</td><td class="value positive">${formatCurrency(displayRevenue)}</td></tr>
      <tr><td class="label">Mortgage (P&amp;I)</td><td class="value">-${formatCurrency(investment.monthlyMortgage * 12)}</td></tr>
      <tr><td class="label">Property Tax (${propertyTaxRate}%)</td><td class="value">-${formatCurrency(investment.annualPropertyTax)}</td></tr>
      <tr><td class="label">STR Insurance</td><td class="value">-${formatCurrency(investment.annualInsurance)}</td></tr>
      <tr><td class="label">Management Fee (${managementFeePercent}%)</td><td class="value">-${formatCurrency(investment.annualManagement)}</td></tr>
      <tr><td class="label">Platform Fee (${platformFeePercent}%)</td><td class="value">-${formatCurrency(investment.annualPlatformFee)}</td></tr>
      <tr><td class="label">Maintenance (${maintenancePercent}%)</td><td class="value">-${formatCurrency(investment.annualMaintenance)}</td></tr>
      <tr><td class="label">Operating Expenses</td><td class="value">-${formatCurrency(monthlyExpenses * 12)}</td></tr>
      <tr class="total-row"><td class="label">Total Annual Expenses</td><td class="value negative">-${formatCurrency(investment.totalAnnualExpenses)}</td></tr>
      <tr class="highlight-row"><td class="label">Net Annual Cash Flow</td><td class="value ${investment.cashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(investment.cashFlow)}</td></tr>
    </table>
    ` : ''}
    
    ${analysisMode === "arbitrage" && monthlyRent ? `
    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">Cost to Control Property</div>
    <table class="data-table">
      <tr><td class="label">Monthly Rent to Landlord</td><td class="value">${formatCurrency(parseFloat(monthlyRent))}</td></tr>
      <tr><td class="label">Security Deposit</td><td class="value">${formatCurrency(arbitrage.securityDepositAmount)}</td></tr>
      <tr><td class="label">${firstLastMonth ? 'First + Last Month Rent' : 'First Month Rent'}</td><td class="value">${formatCurrency(arbitrage.firstLastMonthCost)}</td></tr>
      <tr><td class="label">Startup Costs</td><td class="value">${formatCurrency(arbitrage.startupCosts)}</td></tr>
      <tr class="total-row"><td class="label">Total Cash to Get Started</td><td class="value">${formatCurrency(arbitrage.totalCashNeeded)}</td></tr>
    </table>
    
    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin: 24px 0 12px 0;">Annual Income &amp; Expenses</div>
    <table class="data-table">
      <tr style="background: var(--green-bg);"><td class="label" style="font-weight:600;">Gross STR Revenue</td><td class="value positive">${formatCurrency(displayRevenue)}</td></tr>
      <tr><td class="label">Rent to Landlord</td><td class="value">-${formatCurrency(arbitrage.annualRent)}</td></tr>
      <tr><td class="label">Management Fee (${managementFeePercent}%)</td><td class="value">-${formatCurrency(arbitrage.annualManagement)}</td></tr>
      <tr><td class="label">Platform Fee (${platformFeePercent}%)</td><td class="value">-${formatCurrency(arbitrage.annualPlatformFee)}</td></tr>
      <tr><td class="label">Liability Insurance</td><td class="value">-${formatCurrency(arbitrage.annualInsurance)}</td></tr>
      <tr><td class="label">Operating Expenses</td><td class="value">-${formatCurrency(arbitrage.monthlyOperating * 12)}</td></tr>
      <tr class="total-row"><td class="label">Total Annual Expenses</td><td class="value negative">-${formatCurrency(arbitrage.totalAnnualExpenses)}</td></tr>
      <tr class="highlight-row"><td class="label">Net Annual Cash Flow</td><td class="value ${arbitrage.cashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(arbitrage.cashFlow)}</td></tr>
    </table>
    ` : ''}
    
    ${analysisMode === "iownit" && hudFmrData ? `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">STR Income</div>
        <table class="data-table">
          <tr style="background: var(--green-bg);"><td class="label" style="font-weight:600;">Gross Revenue</td><td class="value positive">${formatCurrency(iownit.grossRevenue)}</td></tr>
          ${iownit.annualMortgage > 0 ? `<tr><td class="label">Mortgage</td><td class="value">-${formatCurrency(iownit.annualMortgage)}</td></tr>` : ''}
          ${iownit.annualPropertyTax > 0 ? `<tr><td class="label">Property Tax</td><td class="value">-${formatCurrency(iownit.annualPropertyTax)}</td></tr>` : ''}
          <tr><td class="label">STR Insurance</td><td class="value">-${formatCurrency(iownit.annualInsurance)}</td></tr>
          <tr><td class="label">Management (${managementFeePercent}%)</td><td class="value">-${formatCurrency(iownit.annualManagement)}</td></tr>
          <tr><td class="label">Platform Fee (${platformFeePercent}%)</td><td class="value">-${formatCurrency(iownit.annualPlatformFee)}</td></tr>
          <tr><td class="label">Operating</td><td class="value">-${formatCurrency(iownit.monthlyOperating * 12)}</td></tr>
          <tr class="highlight-row"><td class="label">STR Net</td><td class="value ${iownit.strCashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(iownit.strCashFlow)}</td></tr>
        </table>
      </div>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">LTR Income (HUD FMR)</div>
        <table class="data-table">
          <tr style="background: #eff6ff;"><td class="label" style="font-weight:600;">Gross Rent (${bedrooms || 3}BR)</td><td class="value" style="color:#2563eb;">${formatCurrency(iownit.ltrGrossAnnual)}</td></tr>
          ${iownit.annualMortgage > 0 ? `<tr><td class="label">Mortgage</td><td class="value">-${formatCurrency(iownit.annualMortgage)}</td></tr>` : ''}
          ${iownit.ltrPropertyTax > 0 ? `<tr><td class="label">Property Tax</td><td class="value">-${formatCurrency(iownit.ltrPropertyTax)}</td></tr>` : ''}
          <tr><td class="label">Landlord Insurance</td><td class="value">-${formatCurrency(iownit.ltrInsurance)}</td></tr>
          <tr><td class="label">Vacancy (5%)</td><td class="value">-${formatCurrency(iownit.ltrVacancy)}</td></tr>
          <tr><td class="label">Management (8%)</td><td class="value">-${formatCurrency(iownit.ltrManagement)}</td></tr>
          <tr><td class="label">Maintenance (5%)</td><td class="value">-${formatCurrency(iownit.ltrMaintenance)}</td></tr>
          <tr class="highlight-row"><td class="label">LTR Net</td><td class="value ${iownit.ltrCashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(iownit.ltrCashFlow)}</td></tr>
        </table>
      </div>
    </div>
    <div class="callout" style="background: ${iownit.strWins ? 'var(--green-bg)' : '#eff6ff'}; border: 1px solid ${iownit.strWins ? '#bbf7d0' : '#bfdbfe'}; margin-top: 16px;">
      <span class="callout-icon">${iownit.strWins ? '&#128640;' : '&#127970;'}</span>
      <div>
        <div class="callout-title" style="color: ${iownit.strWins ? 'var(--green-dark)' : '#2563eb'};">${iownit.strWins ? 'STR wins' : 'LTR wins'} by ${formatCurrency(Math.abs(iownit.monthlyDifference))}/mo</div>
        <div class="callout-text" style="color: ${iownit.strWins ? 'var(--green-dark)' : '#2563eb'};">That's ${formatCurrency(Math.abs(iownit.annualDifference))} more per year</div>
      </div>
    </div>
    ` : ''}
    
    <!-- SECTION 3: OPERATING EXPENSES -->
    <div class="section-header no-break">
      <div class="section-number">3</div>
      <span class="section-title">Monthly Operating Expenses</span>
    </div>
    
    <div class="expense-grid no-break">
      <div class="expense-category">
        <div class="expense-category-title">Utilities</div>
        <div class="expense-line"><span class="name">Electric</span><span class="amount">${formatCurrency(electricMonthly)}</span></div>
        <div class="expense-line"><span class="name">Water/Sewer</span><span class="amount">${formatCurrency(waterMonthly)}</span></div>
        <div class="expense-line"><span class="name">Internet/WiFi</span><span class="amount">${formatCurrency(internetMonthly)}</span></div>
        <div class="expense-line"><span class="name">Trash</span><span class="amount">${formatCurrency(trashMonthly)}</span></div>
        <div class="expense-total"><span>Subtotal</span><span>${formatCurrency(utilityTotal)}/mo</span></div>
      </div>
      <div class="expense-category">
        <div class="expense-category-title">Property Care</div>
        <div class="expense-line"><span class="name">Lawn Care</span><span class="amount">${formatCurrency(lawnCareMonthly)}</span></div>
        <div class="expense-line"><span class="name">Pest Control</span><span class="amount">${formatCurrency(pestControlMonthly)}</span></div>
        <div class="expense-line"><span class="name">Maintenance</span><span class="amount">${formatCurrency(maintenanceMonthly)}</span></div>
        <div class="expense-total"><span>Subtotal</span><span>${formatCurrency(maintenanceTotal)}/mo</span></div>
      </div>
      <div class="expense-category">
        <div class="expense-category-title">Operations</div>
        <div class="expense-line"><span class="name">House Supplies</span><span class="amount">${formatCurrency(houseSuppliesMonthly)}</span></div>
        <div class="expense-line"><span class="name">Consumables</span><span class="amount">${formatCurrency(suppliesConsumablesMonthly)}</span></div>
        <div class="expense-line"><span class="name">Rental Software</span><span class="amount">${formatCurrency(rentalSoftwareMonthly)}</span></div>
        <div class="expense-total"><span>Subtotal</span><span>${formatCurrency(operationsTotal)}/mo</span></div>
      </div>
      <div class="expense-category" style="background: var(--olive); color: white;">
        <div class="expense-category-title" style="color: var(--gold); border-color: rgba(255,255,255,0.15);">Total Monthly</div>
        <div style="font-size: 28px; font-weight: 800; color: var(--green); text-align: center; padding: 16px 0;">${formatCurrency(monthlyExpenses)}</div>
        <div style="text-align: center; font-size: 11px; color: rgba(255,255,255,0.5);">${formatCurrency(monthlyExpenses * 12)}/year</div>
      </div>
    </div>
    
    ${(investment.startupCosts > 0 || arbitrage.startupCosts > 0 || iownit.startupCosts > 0) ? `
    <div class="section-header no-break">
      <div class="section-number">4</div>
      <span class="section-title">Startup Investment</span>
    </div>
    
    <table class="data-table no-break">
      ${includeDesignServices ? `<tr><td class="label">Teeco Design Services ($7/sqft x ${propertySqft.toLocaleString()} sqft)</td><td class="value">${formatCurrency(calculateDesignCost())}</td></tr>` : ''}
      ${includeSetupServices ? `<tr><td class="label">Teeco Setup Services ($13/sqft x ${propertySqft.toLocaleString()} sqft)</td><td class="value">${formatCurrency(calculateSetupCost())}</td></tr>` : ''}
      ${includeFurnishings ? `<tr><td class="label">Furnishings &amp; Decor (~$15/sqft)</td><td class="value">${formatCurrency(furnishingsCost)}</td></tr>` : ''}
      ${includeAmenities ? `<tr><td class="label">Upgrades &amp; Amenities</td><td class="value">${formatCurrency(amenitiesCost)}</td></tr>` : ''}
      <tr class="highlight-row"><td class="label">Total Startup Investment</td><td class="value">${formatCurrency(analysisMode === 'arbitrage' ? arbitrage.startupCosts : analysisMode === 'iownit' ? iownit.startupCosts : investment.startupCosts)}</td></tr>
    </table>
    ` : ''}
    
    <div class="page-break"></div>
    
    <!-- SECTION 5: COMPS -->
    ${result.comparables && result.comparables.length > 0 ? `
    <div class="section-header">
      <div class="section-number">5</div>
      <span class="section-title">Comparable Listings</span>
    </div>
    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Active short-term rental listings near this property. Revenue estimates are based on a larger dataset of ${result.percentiles?.listingsAnalyzed || result.nearbyListings || '300+'} properties.</p>
    <div>
      ${result.comparables.filter(c => !excludedCompIds.has(c.id)).slice(0, 8).map((c, i) => `
      <div class="comp-card no-break">
        <div class="comp-rank">${i + 1}</div>
        <div class="comp-info">
          <div class="comp-name">${c.name.length > 55 ? c.name.substring(0, 55) + '...' : c.name}</div>
          <div class="comp-details">${c.bedrooms} bed &#8226; ${c.bathrooms || '-'} bath &#8226; &#9733; ${c.rating || '-'} ${c.distance ? `&#8226; ${c.distance.toFixed(1)} mi` : ''}</div>
        </div>
        <div class="comp-revenue">
          <div class="comp-revenue-value">${formatCurrency(c.annualRevenue)}/yr</div>
          <div class="comp-revenue-details">${formatCurrency(c.nightPrice)}/night &#8226; ${c.occupancy}% occ</div>
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- SECTION 6: AMENITIES -->
    ${result.recommendedAmenities && result.recommendedAmenities.length > 0 ? `
    <div class="section-header no-break">
      <div class="section-number">6</div>
      <span class="section-title">Revenue-Boosting Amenities</span>
      <span class="section-badge">Market Analysis</span>
    </div>
    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Based on top-performing listings in this market. Adding these amenities can increase your revenue tier.</p>
    <div class="amenity-grid no-break">
      ${result.recommendedAmenities.slice(0, 9).map(a => `
      <div class="amenity-item ${a.priority === 'MUST HAVE' ? 'must-have' : a.priority === 'HIGH IMPACT' ? 'high-impact' : ''}">
        <span class="amenity-name">${a.name}</span>
        <span class="amenity-boost">+${a.boost}%</span>
      </div>
      `).join('')}
    </div>
    ` : ''}
    
    <!-- SECTION 7: PROJECTION -->
    ${analysisMode === "arbitrage" && monthlyRent ? `
    <div class="section-header no-break">
      <div class="section-number">7</div>
      <span class="section-title">Payback Timeline</span>
    </div>
    <table class="data-table no-break">
      <tr><td class="label">Monthly Cash Flow</td><td class="value" style="color: ${arbitrage.monthlyCashFlow >= 0 ? 'var(--green-dark)' : 'var(--red)'};">${formatCurrency(arbitrage.monthlyCashFlow)}</td></tr>
      <tr><td class="label">Payback Period</td><td class="value">${arbitrage.monthlyCashFlow > 0 ? Math.ceil(arbitrage.totalCashNeeded / arbitrage.monthlyCashFlow) + ' months' : 'N/A'}</td></tr>
      <tr><td class="label">Year 1 Profit</td><td class="value" style="color: ${arbitrage.cashFlow >= 0 ? 'var(--green-dark)' : 'var(--red)'};">${formatCurrency(arbitrage.cashFlow)}</td></tr>
      <tr><td class="label">Year 2 Cumulative (no startup costs)</td><td class="value" style="color: var(--green-dark);">${formatCurrency(arbitrage.cashFlow + (displayRevenue - arbitrage.totalAnnualExpenses + arbitrage.startupCosts))}</td></tr>
      <tr class="highlight-row"><td class="label">3-Year Projected Profit</td><td class="value positive">${formatCurrency(arbitrage.cashFlow + (displayRevenue - arbitrage.totalAnnualExpenses + arbitrage.startupCosts) * 2)}</td></tr>
    </table>
    ` : ''}
    
    ${analysisMode === "buying" && purchasePrice ? `
    <div class="section-header no-break">
      <div class="section-number">7</div>
      <span class="section-title">10-Year Investment Projection</span>
    </div>
    <div class="roi-grid no-break">
      ${(() => {
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
        return [1,2,3,4,5,6,7,8,9,10].map((year) => {
          const cumulativeCashFlow = investment.cashFlow * year;
          const principalPaid = pdfCumPrincipal[year - 1] || 0;
          const appreciation = pdfPrice * 0.03 * year;
          const totalReturn = cumulativeCashFlow + investment.downPayment + principalPaid + appreciation - investment.totalCashNeeded;
          return `<div class="roi-year ${totalReturn >= 0 ? 'positive' : 'negative'}">
            <div class="year-label">Yr ${year}</div>
            <div class="year-value">${totalReturn >= 1000 || totalReturn <= -1000 ? (totalReturn >= 0 ? '+' : '') + Math.round(totalReturn / 1000) + 'K' : formatCurrency(totalReturn)}</div>
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
      return `<table class="data-table">
        <tr><td class="label">10-Year Cumulative Cash Flow</td><td class="value" style="color: ${investment.cashFlow >= 0 ? 'var(--green-dark)' : 'var(--red)'};">${formatCurrency(investment.cashFlow * 10)}</td></tr>
        <tr><td class="label">Equity Built (Principal + 3% Appreciation)</td><td class="value">${formatCurrency(pdfEquity)}</td></tr>
        <tr class="highlight-row"><td class="label">Total 10-Year Return</td><td class="value positive">${formatCurrency(pdfTotalReturn)}</td></tr>
      </table>`;
    })()}
    <p style="font-size: 9px; color: var(--text-muted); text-align: center; margin-top: 8px;">*Assumes 3% annual appreciation with proper amortization schedule</p>
    ` : ''}
    
    <!-- AI ANALYSIS -->
    ${aiAnalysisText ? `
    <div class="page-break"></div>
    <div class="section-header">
      <div class="section-number">&#9733;</div>
      <span class="section-title">AI Investment Analysis</span>
      <span class="ai-analysis-badge">Edge AI</span>
    </div>
    <div class="ai-analysis">
      <div class="ai-analysis-content">${aiAnalysisText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/#{1,3}\s(.*?)(<br>|$)/g, '<div style="font-size:14px;font-weight:700;color:var(--text);margin:16px 0 8px 0;">$1</div>')}</div>
    </div>
    ` : ''}
    
    <!-- FOOTER -->
    <div class="report-footer">
      <div class="footer-brand">Edge by Teeco</div>
      <p class="footer-url">edge.teeco.co</p>
      <p class="footer-tagline">Your unfair advantage in STR investing</p>
      <p style="font-size: 11px; color: var(--text-secondary); margin-top: 8px;">STR Regulations: proper.insure/regulations</p>
      <p class="footer-date">Report generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p class="footer-disclaimer">This analysis is for informational purposes only and does not constitute financial, legal, or investment advice. Revenue projections are based on historical market data from ${result.dataSource?.includes('pricelabs') ? 'PriceLabs' : 'market data'} and comparable listings, and actual results may vary significantly based on property management quality, market conditions, seasonality, local regulations, and other factors. Past performance of comparable properties does not guarantee future results. Always conduct independent due diligence, consult with qualified professionals, and verify local STR regulations before making any investment decisions. Edge by Teeco is not responsible for investment outcomes based on this report.</p>
    </div>
    
  </div>
</body>
</html>
    `;
    
    return reportHTML;
  };

  const downloadPDFReport = async () => {
    if (!result) return;
    const reportHTML = generateReportHTML();
    if (!reportHTML) return;
    
    // Open print dialog with the report - use named window to avoid about:blank
    const printWindow = window.open('', 'EdgeReport');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 600);
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
    
    // When comps are excluded, recalculate from active comps only — respecting percentile selection
    if (excludedCompIds.size > 0) {
      const compRevenue = getCompBasedRevenue();
      if (compRevenue) {
        let baseRevenue = compRevenue.percentiles.p50; // default to median
        switch (revenuePercentile) {
          case "75th":
            baseRevenue = compRevenue.percentiles.p75;
            break;
          case "90th":
            baseRevenue = compRevenue.percentiles.p90;
            break;
          default:
            baseRevenue = compRevenue.percentiles.p50;
        }
        return Math.round(baseRevenue * guestMultiplier);
      }
    }
    
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
    // When comps are excluded, recalculate from active comps only — respecting percentile selection
    if (excludedCompIds.size > 0) {
      const compRevenue = getCompBasedRevenue();
      if (compRevenue) {
        let baseRevenue = compRevenue.percentiles.p50;
        switch (revenuePercentile) {
          case "75th": baseRevenue = compRevenue.percentiles.p75; break;
          case "90th": baseRevenue = compRevenue.percentiles.p90; break;
          default: baseRevenue = compRevenue.percentiles.p50;
        }
        return Math.round(baseRevenue * guestMultiplier);
      }
    }
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
    
    const analysisPrompt = `I need a comprehensive educational analysis of this STR ${analysisMode === "iownit" ? "homeowner conversion (I already own this property and want to know: STR or LTR?)" : analysisMode === "arbitrage" ? "rental arbitrage" : "investment"} deal. Please analyze every aspect and help me think like a sophisticated investor.

## PROPERTY DATA
- **Location:** ${result.address || result.neighborhood}, ${result.city}, ${result.state}
- **Property Type:** ${result.propertyType || 'Single Family'}
- **Bedrooms:** ${result.bedrooms} | **Bathrooms:** ${result.bathrooms}
- **Square Feet:** ${result.sqft || propertySqft}
- **Nearby STR Listings:** ${result.nearbyListings || 'Unknown'}
- **Strategy:** ${analysisMode === "iownit" ? "I Own It (homeowner evaluating STR vs LTR)" : analysisMode === "arbitrage" ? "Rental Arbitrage (leasing property to sublease as STR)" : "Buying to Own"}

## REVENUE PROJECTIONS
- **Projected Annual Revenue:** $${displayRevenue.toLocaleString()}
- **Average Daily Rate (ADR):** $${Math.round(displayRevenue / (365 * (result.occupancy || 55) / 100))}
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
8. **Bottom Line Assessment** - Your honest analysis and what to research next. Remind them this is educational, not financial advice.

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
      setAiAnalysis("I'm having trouble generating the analysis right now. Please try again in a moment, or reach out to hello@teeco.co for help!");
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowCreditLog(!showCreditLog); setCreditLog(getCreditLog()); }}
                className="text-xs font-medium px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: showCreditLog ? '#2b2823' : 'transparent', color: showCreditLog ? 'white' : '#787060' }}
                title="View credit activity"
              >
                Activity
              </button>
              <button
                onClick={() => setShowPaywall(true)}
                className="text-sm font-medium px-3 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ backgroundColor: creditsRemaining === 0 ? '#2b2823' : '#e5e3da', color: creditsRemaining === 0 ? 'white' : '#2b2823' }}
              >
                {creditsRemaining === 0 ? 'Get More Credits' : 'Buy More'}
              </button>
            </div>
          </div>
          
          {/* Credit Activity Log */}
          {showCreditLog && (
            <div className="max-w-6xl mx-auto mt-2 pb-2">
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e3da' }}>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid #f0efe8' }}>
                  <span className="text-xs font-semibold" style={{ color: '#2b2823' }}>Credit Activity</span>
                  <button onClick={() => setShowCreditLog(false)} className="text-xs" style={{ color: '#787060' }}>Close</button>
                </div>
                {creditLog.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm" style={{ color: '#787060' }}>No credit activity yet. Analyze a property to get started.</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#f0efe8' }}>
                    {creditLog.slice(0, 15).map((event) => (
                      <div key={event.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: event.type === 'deduct' ? '#fef2f2' : event.type === 'refund' ? '#f0fdf4' : event.type === 'purchase' ? '#eff6ff' : '#f5f4f0',
                            }}
                          >
                            <span className="text-xs">
                              {event.type === 'deduct' ? '−' : event.type === 'refund' ? '+' : event.type === 'purchase' ? '$' : '✓'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: '#2b2823' }}>
                              {event.address.length > 40 ? event.address.slice(0, 40) + '...' : event.address}
                            </p>
                            <p className="text-xs" style={{ color: '#787060' }}>
                              {event.note || (event.type === 'deduct' ? 'Credit used' : event.type === 'refund' ? 'Credit refunded' : event.type === 'free' ? 'From cache' : 'Credits added')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium" style={{ color: event.type === 'deduct' ? '#ef4444' : event.type === 'refund' ? '#22c55e' : '#787060' }}>
                            {event.type === 'deduct' ? '-1' : event.type === 'refund' ? '+1' : event.type === 'purchase' ? `+${event.creditsAfter}` : '0'}
                          </p>
                          <p className="text-xs" style={{ color: '#a09888' }}>{formatCreditEventTime(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f4f0', color: '#787060' }}>Live STR Data</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#2b2823" }}>
            How much could your<br />STR earn?
          </h1>
          <p className="text-gray-600">Revenue estimates from real STR comps near your property</p>
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
                placeholder="Enter address..."
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
                typeof window !== 'undefined' && localStorage.getItem("edge_free_preview_used") ? "Analyze (1 Credit)" : "Try It Free"
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-400 mt-2">STR revenue analysis for any US address</p>
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
            {typeof window !== 'undefined' && !localStorage.getItem('edge_free_preview_used') && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>Try free</span>
                <span className="text-xs text-gray-500">No signup needed</span>
              </div>
            )}
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
                              adr: (result.occupancy || 55) > 0 ? Math.round(displayRevenue / (365 * (result.occupancy || 55) / 100)) : result.adr,
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
                                // Comp selection state for shared view
                                compSelection: excludedCompIds.size > 0 ? {
                                  excludedIds: Array.from(excludedCompIds),
                                  sortBy: compSortBy,
                                  distanceFilter: compDistanceFilter,
                                  selectOnlyMode: selectOnlyMode,
                                  revenuePercentile: revenuePercentile,
                                } : undefined
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
                            alert(excludedCompIds.size > 0 ? 'Share link copied with your comp selections! Expires in 90 days.' : 'Share link copied! This link can only be viewed once and expires in 90 days.');
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
              {(() => {
                const compRev = excludedCompIds.size > 0 ? getCompBasedRevenue() : null;
                const gm = getGuestCountMultiplier();
                return (
              <div className="flex gap-2 sm:gap-3 mb-4 overflow-x-auto">
                {(["average", "75th", "90th"] as const).map((p) => {
                  // Use comp-based percentiles when exclusions are active, otherwise PriceLabs
                  const labelValue = compRev
                    ? Math.round((p === "average" ? compRev.percentiles.p50 : p === "75th" ? compRev.percentiles.p75 : compRev.percentiles.p90) * gm)
                    : result.percentiles?.revenue
                      ? Math.round((p === "average" ? result.percentiles.revenue.p50 : p === "75th" ? result.percentiles.revenue.p75 : result.percentiles.revenue.p90) * gm)
                      : null;
                  return (
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
                    {labelValue !== null && (
                      <span className="block text-xs opacity-75">
                        {formatCurrency(labelValue)}/yr
                      </span>
                    )}
                  </button>
                  );
                })}
              </div>
                );
              })()}

              {/* Revenue Display */}
              {(() => {
                const compRevForDisplay = excludedCompIds.size > 0 ? getCompBasedRevenue() : null;
                const gmForDisplay = getGuestCountMultiplier();
                const activeCount = result.comparables ? result.comparables.filter(c => !excludedCompIds.has(c.id)).length : 0;
                const totalCount = result.comparables?.length || 0;
                
                // Range values: use comp-based when exclusions active, otherwise PriceLabs
                const rangeP25 = compRevForDisplay
                  ? Math.round(compRevForDisplay.percentiles.p25 * gmForDisplay)
                  : result.percentiles?.revenue?.p25
                    ? Math.round(result.percentiles.revenue.p25 * gmForDisplay)
                    : Math.round(getDisplayRevenue() * 0.8);
                const rangeP75 = compRevForDisplay
                  ? Math.round(compRevForDisplay.percentiles.p75 * gmForDisplay)
                  : result.percentiles?.revenue?.p75
                    ? Math.round(result.percentiles.revenue.p75 * gmForDisplay)
                    : Math.round(getDisplayRevenue() * 1.2);
                
                return (
              <div className="text-center py-4 sm:py-6 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
                <p className="text-xs sm:text-sm font-medium mb-1" style={{ color: "#787060" }}>
                  {revenuePercentile === "average" ? "Estimated Annual Revenue" : 
                   revenuePercentile === "75th" ? "75th Percentile Revenue" : "90th Percentile Revenue"}
                </p>
                <p className="text-3xl sm:text-4xl font-bold" style={{ color: "#22c55e" }}>
                  {formatCurrency(getDisplayRevenue())}
                </p>
                {/* Exclusion indicator */}
                {excludedCompIds.size > 0 && (
                  <p className="text-[11px] font-medium mt-1 inline-block px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                    Based on {activeCount} of {totalCount} comps ({excludedCompIds.size} excluded)
                  </p>
                )}
                {/* Confidence Range - uses comp-based p25-p75 when exclusions active */}
                <p className="text-sm mt-1" style={{ color: "#787060" }}>
                  Range: {formatCurrency(rangeP25)} – {formatCurrency(rangeP75)}
                </p>
                {(result.percentiles?.revenue?.p25 || compRevForDisplay) && (
                  <p className="text-[10px] mt-0.5" style={{ color: "#a0a0a0" }}>
                    {compRevForDisplay ? `25th – 75th percentile from ${activeCount} selected comps` : '25th – 75th percentile from comparable listings'}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {excludedCompIds.size > 0 ? (
                    <>Revenue recalculated from <strong style={{ color: '#2563eb' }}>{activeCount} selected comparable listings</strong></>
                  ) : result.dataSource && result.dataSource.toLowerCase().includes('pricelabs') ? (
                    <>Based on PriceLabs analysis of <strong style={{ color: '#2563eb' }}>{result.percentiles?.listingsAnalyzed || result.nearbyListings || '300+'} comparable properties</strong> across multiple platforms</>
                  ) : (
                    <>Based on {result.percentiles?.listingsAnalyzed || result.nearbyListings || 'comparable'} nearby STR listings</>
                  )}
                </p>
                {revenuePercentile !== "average" && (
                  <p className="text-xs text-gray-400 mt-2">
                    {excludedCompIds.size > 0
                      ? (revenuePercentile === "75th" 
                          ? "75th percentile from selected comps" 
                          : "90th percentile from selected comps")
                      : result?.dataSource?.toLowerCase().includes('pricelabs')
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
                );
              })()}

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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={customAnnualIncome}
                          onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setCustomAnnualIncome(v); }}
                          placeholder="e.g. 85000"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Avg Nightly Rate ($)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          id="customAdr"
                          placeholder={`Current: $${result.adr}`}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Occupancy (%)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          id="customOccupancy"
                          placeholder={`Current: ${result.occupancy}%`}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
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
                
                {(() => {
                  const tierCompRev = excludedCompIds.size > 0 ? getCompBasedRevenue() : null;
                  const tierGm = getGuestCountMultiplier();
                  const tierP50 = tierCompRev ? Math.round(tierCompRev.percentiles.p50 * tierGm) : result.percentiles?.revenue ? Math.round(result.percentiles.revenue.p50 * tierGm) : null;
                  const tierP75 = tierCompRev ? Math.round(tierCompRev.percentiles.p75 * tierGm) : result.percentiles?.revenue ? Math.round(result.percentiles.revenue.p75 * tierGm) : null;
                  const tierP90 = tierCompRev ? Math.round(tierCompRev.percentiles.p90 * tierGm) : result.percentiles?.revenue ? Math.round(result.percentiles.revenue.p90 * tierGm) : null;
                  return (
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
                      {tierP50 !== null && (
                        <span className="text-sm font-bold" style={{ color: '#2b2823' }}>
                          {formatCurrency(tierP50)}/yr
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
                      {tierP75 !== null && (
                        <span className="text-sm font-bold" style={{ color: '#22c55e' }}>
                          {formatCurrency(tierP75)}/yr
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
                      {tierP90 !== null && (
                        <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                          {formatCurrency(tierP90)}/yr
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Unique theme, exceptional reviews, dynamic pricing mastery, premium amenities. Top 10% of hosts.</p>
                  </div>
                </div>
                  );
                })()}
                
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
              // Apply distance filter to visible comps
              const distanceFilteredComps = compDistanceFilter !== null
                ? allComps.filter(c => (c.distance || 0) <= compDistanceFilter)
                : allComps;
              const hiddenByDistance = allComps.length - distanceFilteredComps.length;
              // Sort comps based on selected sort option
              const sortedComps = [...distanceFilteredComps].sort((a, b) => {
                switch (compSortBy) {
                  case 'revenue': return (b.annualRevenue || 0) - (a.annualRevenue || 0);
                  case 'distance': return (a.distance || 999) - (b.distance || 999);
                  case 'bedrooms': return Math.abs((a.bedrooms || 0) - result.bedrooms) - Math.abs((b.bedrooms || 0) - result.bedrooms);
                  case 'occupancy': return (b.occupancy || 0) - (a.occupancy || 0);
                  case 'rating': return (b.rating || 0) - (a.rating || 0);
                  default: return (b.relevanceScore || 0) - (a.relevanceScore || 0);
                }
              });
              const comps = sortedComps;
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
                    Nearby {result.bedrooms === 6 ? "6+" : result.bedrooms}BR STR Listings
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${confidenceColor}15`, color: confidenceColor }}>
                    {confidenceLabel} Confidence
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: "#787060" }}>
                  {activeComps.length}/{allComps.length} comps included • {bedroomMatches} exact BR match{bedroomMatches !== 1 ? "es" : ""} • {avgDistance.toFixed(1)}mi avg distance
                </p>
                
                {/* Simplified Comp Controls — one clean row */}
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Smart Top 5: pick top 5 by revenue, auto-expand list
                      const top5 = [...distanceFilteredComps]
                        .sort((a, b) => (b.annualRevenue || 0) - (a.annualRevenue || 0))
                        .slice(0, 5)
                        .map(c => c.id);
                      const top5Set = new Set(top5);
                      const newExcluded = new Set(distanceFilteredComps.filter(c => !top5Set.has(c.id)).map(c => c.id));
                      setExcludedCompIds(newExcluded);
                      setSelectOnlyMode(true);
                      setCompSortBy('revenue');
                      setShowAllComps(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: selectOnlyMode && activeComps.length === 5 ? '#15803d' : '#f0fdf4',
                      color: selectOnlyMode && activeComps.length === 5 ? '#ffffff' : '#15803d',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    ⚡ Top 5
                  </button>
                  {hasExclusions && (
                    <button
                      onClick={() => { setExcludedCompIds(new Set()); setSelectOnlyMode(false); setCompSortBy('relevance'); }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ backgroundColor: '#f5f4f0', color: '#787060', border: '1px solid #e5e3da' }}
                    >
                      ↺ Reset
                    </button>
                  )}
                  <span className="flex-1" />
                  {hasExclusions && (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                      {activeComps.length} of {distanceFilteredComps.length} selected
                    </span>
                  )}
                </div>
                {/* Data source explanation */}
                {result.dataSource && result.dataSource.toLowerCase().includes('pricelabs') && (
                  <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: "#eff6ff", border: "1px solid #dbeafe" }}>
                    <p className="text-[11px]" style={{ color: "#1e40af", lineHeight: "1.5" }}>
                      Your revenue estimates above are powered by <strong>PriceLabs</strong> ({result.percentiles?.listingsAnalyzed?.toLocaleString() || result.percentiles?.totalListingsInArea?.toLocaleString() || '300+'} listings analyzed).
                      These listings below are shown for reference only &mdash; they are not the same dataset used for your revenue projections.
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
                          <p className="text-xs font-semibold" style={{ color: '#1d4ed8' }}>📅 Comp Occupancy Estimate</p>
                          <p className="text-xs mt-0.5" style={{ color: '#787060' }}>
                            Based on {realEntries.length} listing{realEntries.length !== 1 ? 's' : ''} analyzed
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
                    <p className="text-xs font-medium" style={{ color: '#0284c7' }}>📅 Estimating occupancy for top comps...</p>
                  </div>
                )}
                
                {/* Comp-based revenue recalculation banner */}
                {hasExclusions && compRevenue && (() => {
                  const bannerGm = getGuestCountMultiplier();
                  const bannerLabel = revenuePercentile === '75th' ? '75th %' : revenuePercentile === '90th' ? '90th %' : 'Median';
                  const bannerRevenue = revenuePercentile === '75th' 
                    ? Math.round(compRevenue.percentiles.p75 * bannerGm)
                    : revenuePercentile === '90th'
                      ? Math.round(compRevenue.percentiles.p90 * bannerGm)
                      : Math.round(compRevenue.percentiles.p50 * bannerGm);
                  return (
                  <div className="mb-4 p-3 rounded-xl border-2 border-dashed" style={{ borderColor: '#22c55e', backgroundColor: '#f0fdf4' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#15803d' }}>Custom Selection — {bannerLabel} of {activeComps.length} comp{activeComps.length !== 1 ? 's' : ''}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#787060' }}>
                          ${compRevenue.adr}/night avg • {compRevenue.occupancy}% avg occ
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: '#15803d' }}>{formatCurrency(bannerRevenue)}/yr</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setExcludedCompIds(new Set()); setSelectOnlyMode(false); setCompSortBy('relevance'); }}
                      className="mt-2 text-xs font-medium px-3 py-1 rounded-full transition-colors"
                      style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                    >
                      Reset — Include All Comps
                    </button>
                  </div>
                  );
                })()}
                

                
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
                              <span className="text-xs font-medium" style={{ color: '#16a34a' }} title={`Estimated: ${realOccupancyData[String(listing.id)].bookedDays}/${realOccupancyData[String(listing.id)].totalDays} days booked`}>
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
                    {showAllComps ? 'Show Less' : `See All ${comps.length} Comps`}
                  </button>
                )}
                
                <p className="text-xs mt-3 text-center" style={{ color: '#a09880' }}>
                  Tap checkboxes to include/exclude comps • Revenue updates automatically
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
                    onToggleExclude={toggleCompExclusion}
                    onSelectComp={(comp) => {
                      // No auto-scroll — selected comp details shown in sticky bar above map
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
                excludedCompIds={excludedCompIds}
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
                  Based on 25-mile market analysis of top-performing short-term rentals. These upgrades and amenities have the highest impact on revenue.
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={numDisplay(propertySqft)}
                  onChange={(e) => {
                    handleNumericChange(setPropertySqft)(e);
                    // Auto-recalculate furnishings cost unless user manually edited it
                    if (!userEditedFurnishings.current) {
                      const raw = e.target.value;
                      const newSqft = raw === '' || raw === '-' ? 0 : parseInt(raw, 10);
                      if (!isNaN(newSqft)) {
                        setFurnishingsCost(Math.round(newSqft * 15));
                      }
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200"
                  placeholder="Auto-filled from property data"
                />
                {result?.sqft > 0 && propertySqft === result.sqft && (
                  <p className="text-xs mt-1" style={{ color: '#22c55e' }}>✓ Auto-filled from property records ({result.sqft.toLocaleString()} sqft)</p>
                )}
                {result && propertySqft > 0 && propertySqft !== result?.sqft && (
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>~{propertySqft.toLocaleString()} sqft (estimated from {bedrooms || 3} bedrooms — adjust if needed)</p>
                )}
                {propertySqft === 0 && !result && (
                  <p className="text-xs text-gray-400 mt-1">Will be auto-filled when you analyze an address</p>
                )}
                {propertySqft === 0 && result && (
                  <p className="text-xs text-gray-400 mt-1">Enter square footage for accurate startup cost estimates</p>
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(furnishingsCost)}
                    onChange={(e) => { userEditedFurnishings.current = true; handleNumericChange(setFurnishingsCost)(e); }}
                    placeholder="0"
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(amenitiesCost)}
                    onChange={handleNumericChange(setAmenitiesCost)}
                    placeholder="0"
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
              <p className="text-sm text-gray-500 mb-2">Recurring costs to run your STR</p>
              {result && !userEditedExpenses.current && (
                <p className="text-xs mb-4" style={{ color: '#22c55e' }}>✓ Auto-estimated for {bedrooms || 3}BR / {guestCount || (bedrooms || 3) * 2} guests{propertySqft ? ` / ${propertySqft.toLocaleString()} sqft` : ''}{purchasePrice ? ` · adjusted for local costs` : ''}</p>
              )}
              {(!result || userEditedExpenses.current) && <div className="mb-2" />}
              
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1: Electric & Water */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Electric</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(electricMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setElectricMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Water</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(waterMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setWaterMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 2: Internet & Trash */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Internet</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(internetMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setInternetMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Trash</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(trashMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setTrashMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 3: Lawn Care & Pest Control */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Lawn Care</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(lawnCareMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setLawnCareMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Pest Control</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(pestControlMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setPestControlMonthly)(e); }}
                    placeholder="0"
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(houseSuppliesMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setHouseSuppliesMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 5: Supplies & Consumables + Maintenance */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Supplies & Consumables</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(suppliesConsumablesMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setSuppliesConsumablesMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                
                {/* Row 6: Maintenance & Rental Software */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Maintenance/Repair</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(maintenanceMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setMaintenanceMonthly)(e); }}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Rental Software</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={numDisplay(rentalSoftwareMonthly)}
                    onChange={(e) => { userEditedExpenses.current = true; handleNumericChange(setRentalSoftwareMonthly)(e); }}
                    placeholder="0"
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
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Auto-filled from property data"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-lg"
                    />
                    {purchasePrice && result?.listPrice > 0 && purchasePrice === result.listPrice.toString() && (
                      <p className="text-xs mt-1" style={{ color: '#22c55e' }}>✓ Estimated from property records</p>
                    )}
                    {!purchasePrice && result && (
                      <p className="text-xs text-gray-400 mt-1">Enter the purchase price or listing price for this property</p>
                    )}
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
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={numDisplay(insuranceAnnual)} onChange={(e) => { userEditedInsurance.current = true; handleNumericChange(setInsuranceAnnual)(e); }} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-gray-200" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "#787060" }}>Platform Fee (STR)</span>
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
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={monthlyRent}
                      onChange={(e) => { userEditedRent.current = true; setMonthlyRent(e.target.value.replace(/[^0-9]/g, '')); }}
                      placeholder="Auto-filled from HUD Fair Market Rent"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-lg"
                    />
                    {monthlyRent && hudFmrData && !userEditedRent.current && (
                      <p className="text-xs mt-1" style={{ color: '#22c55e' }}>✓ Based on HUD Fair Market Rent ({hudFmrData.year}) for {bedrooms || 3}BR in {hudFmrData.areaName || result?.city}</p>
                    )}
                    {!monthlyRent && (
                      <p className="text-xs text-gray-400 mt-1">Enter the monthly rent you&apos;d pay to the landlord</p>
                    )}
                  </div>
                  
                  {/* Arbitrage-specific inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-sm block mb-1" style={{ color: "#787060" }}>Security Deposit</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(e.target.value.replace(/[^0-9]/g, ''))}
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
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={numDisplay(landlordInsuranceMonthly)}
                        onChange={handleNumericChange(setLandlordInsuranceMonthly)}
                        placeholder="0"
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
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={iownitMortgage}
                      onChange={(e) => setIownitMortgage(e.target.value.replace(/[^0-9]/g, ''))}
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
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={numDisplay(iownitInsuranceAnnual)} onChange={handleNumericChange(setIownitInsuranceAnnual)} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-gray-200" />
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
                        <span style={{ color: "#787060" }}>Platform Fee (STR)</span>
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
                                      adr: (result.occupancy || 55) > 0 ? Math.round(displayRevenue / (365 * (result.occupancy || 55) / 100)) : result.adr,
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
                                        aiAnalysis: aiAnalysis,
                                        // Comp selection state for shared view
                                        compSelection: excludedCompIds.size > 0 ? {
                                          excludedIds: Array.from(excludedCompIds),
                                          sortBy: compSortBy,
                                          distanceFilter: compDistanceFilter,
                                          selectOnlyMode: selectOnlyMode,
                                          revenuePercentile: revenuePercentile,
                                        } : undefined
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
                                    alert(excludedCompIds.size > 0 ? 'Share link copied with your comp selections! Expires in 90 days.' : 'Share link copied! This link can only be viewed once and expires in 90 days.');
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
                      } else if (!purchasePrice) {
                        const cityMatch = findCityForAddress(search.address);
                        if (cityMatch && cityMatch.medianHomeValue > 0) {
                          setPurchasePrice(Math.round(cityMatch.medianHomeValue).toString());
                        } else {
                          const parsed = search.address.match(/,\s*([A-Z]{2})(?:\s|$|,)/i);
                          if (parsed) {
                            const bench = getStateBenchmark(parsed[1].toUpperCase());
                            if (bench && bench.medianHomePrice > 0) {
                              setPurchasePrice(Math.round(bench.medianHomePrice).toString());
                            }
                          }
                        }
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
                      {/* 75-day staleness warning */}
                      {search.timestamp && (Date.now() - search.timestamp) > 75 * 24 * 60 * 60 * 1000 && search.cachedResult && (
                        <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                          ⚠ Data is {Math.floor((Date.now() - search.timestamp) / (24 * 60 * 60 * 1000))}+ days old — re-analyze for current numbers
                        </p>
                      )}
                    </div>
                    {search.cachedResult ? (
                      search.timestamp && (Date.now() - search.timestamp) > 75 * 24 * 60 * 60 * 1000 ? (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Stale</span>
                      ) : (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Instant</span>
                      )
                    ) : (
                      <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500" title="Re-analyzing uses 1 credit">1 Credit</span>
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
              Edge data: <span style={{ color: '#787060' }}>STR Comps</span> · Live market data
            </p>
          </div>
        </div>

        {/* Founder Intro - Trust Builder */}
        <div className="mt-10 pt-8" style={{ borderTop: '1px solid #e5e3da' }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Image
              src="/founder-team.jpg"
              alt="Jeff Chheuy, founder of Edge by Teeco"
              width={80}
              height={80}
              className="rounded-full flex-shrink-0"
              style={{ objectFit: 'cover', width: '80px', height: '80px', border: '3px solid #e5e3da' }}
            />
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold" style={{ color: '#2b2823' }}>Jeff Chheuy</p>
              <p className="text-xs mt-0.5" style={{ color: '#a09880' }}>Founder, Edge by Teeco</p>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: '#4a4640' }}>
                I built Edge because when I started investing in short-term rentals, I had no idea if the deals I was looking at were actually good. I just wanted a straight answer — is this property worth it or not? So I built the tool I wish I had on my first deal. Whether you&apos;re exploring your first investment or analyzing your next one, I hope Edge gives you the confidence to move forward.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Email Modal — compact bottom sheet style */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm" style={{ boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2b2823' }}>
                <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold" style={{ color: '#2b2823' }}>Send Full Report</h3>
                <p className="text-xs" style={{ color: '#787060' }}>PDF attached automatically</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <svg className="w-4 h-4" fill="none" stroke="#787060" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && emailAddress) sendEmailReport(); }}
                placeholder="recipient@email.com"
                autoFocus
                className="flex-1 px-3 py-2.5 rounded-xl border text-sm"
                style={{ borderColor: '#d8d6cd' }}
              />
              <button
                onClick={sendEmailReport}
                disabled={!emailAddress || emailSending}
                className="px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: '#2b2823', color: '#ffffff' }}
              >
                {emailSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Toast Notification */}
      {emailToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-2" style={{ animation: 'slideDown 0.3s ease-out' }}>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg" style={{ backgroundColor: emailToast.type === 'success' ? '#2b2823' : '#dc2626', color: '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            {emailToast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
            <span className="text-sm font-medium">{emailToast.message}</span>
            <button onClick={() => setEmailToast(null)} className="ml-2 p-0.5 rounded hover:opacity-70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Email Sending Indicator */}
      {emailSending && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg" style={{ backgroundColor: '#2b2823', color: '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
            <span className="text-sm font-medium">Sending report...</span>
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
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tier: 'starter', email: authEmail }),
                      });
                      const data = await res.json();
                      if (data.success && data.url) {
                        window.open(data.url, '_blank');
                      } else if (data.fallback) {
                        window.open(`https://buy.stripe.com/9B628r5GbfOa2J03eE8AE07?prefilled_email=${encodeURIComponent(authEmail || '')}`, '_blank');
                      }
                    } catch { window.open(`https://buy.stripe.com/9B628r5GbfOa2J03eE8AE07?prefilled_email=${encodeURIComponent(authEmail || '')}`, '_blank'); }
                  }}
                  className="block w-full text-left p-3 rounded-xl border-2 cursor-pointer hover:border-gray-400 transition-all" 
                  style={{ borderColor: '#e5e5e5' }}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <p className="font-semibold text-sm" style={{ color: '#2b2823' }}>5 Credits</p>
                      <p className="text-xs" style={{ color: '#787060' }}>$1.00/analysis</p>
                    </div>
                    <p className="text-lg font-bold" style={{ color: '#2b2823' }}>$4.99</p>
                  </div>
                </button>
                
                {/* Tier 2: Pro - BEST VALUE - Where most buyers land */}
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tier: 'pro', email: authEmail }),
                      });
                      const data = await res.json();
                      if (data.success && data.url) {
                        window.open(data.url, '_blank');
                      } else if (data.fallback) {
                        window.open(`https://buy.stripe.com/9B614ngkP1XkdnEaH68AE09?prefilled_email=${encodeURIComponent(authEmail || '')}`, '_blank');
                      }
                    } catch { window.open(`https://buy.stripe.com/9B614ngkP1XkdnEaH68AE09?prefilled_email=${encodeURIComponent(authEmail || '')}`, '_blank'); }
                  }}
                  className="block w-full text-left p-4 rounded-xl border-2 cursor-pointer hover:border-green-600 transition-all relative" 
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
                </button>
                
                {/* Tier 3: Power - Price anchor that makes Pro look like a deal */}
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/stripe/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tier: 'power', email: authEmail }),
                      });
                      const data = await res.json();
                      if (data.success && data.url) {
                        window.open(data.url, '_blank');
                      } else if (data.fallback) {
                        window.open(`https://buy.stripe.com/eVq3cv7Oj1Xk6Zg7uU8AE06?prefilled_email=${encodeURIComponent(authEmail || '')}`, '_blank');
                      }
                    } catch { window.open(`https://buy.stripe.com/eVq3cv7Oj1Xk6Zg7uU8AE06?prefilled_email=${encodeURIComponent(authEmail || '')}`, '_blank'); }
                  }}
                  className="block w-full text-left p-3 rounded-xl border-2 cursor-pointer hover:border-gray-400 transition-all relative" 
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
                </button>
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
            adr: (result.occupancy || 55) > 0 ? Math.round(getDisplayRevenue() / (365 * (result.occupancy || 55) / 100)) : result.adr,
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
