/**
 * Client-side comp re-filtering utility.
 * Mirrors the server-side enrichListings logic so that when a user changes
 * bedrooms/bathrooms/guest count, we can re-filter the full comp set locally
 * WITHOUT making a new API call (saving Apify credits).
 */

// Haversine distance in miles
function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat2 || !lon2) return 999;
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculatePercentiles(values: number[]): { p25: number; p50: number; p75: number; p90: number } {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p25: sorted[Math.floor(sorted.length * 0.25)] || 0,
    p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
    p75: sorted[Math.floor(sorted.length * 0.75)] || 0,
    p90: sorted[Math.floor(sorted.length * 0.9)] || 0,
  };
}

// Estimate occupancy from review count (same heuristic as server)
function estimateOccupancy(reviewsCount: number, listingAgeFactor: number = 2): number {
  if (reviewsCount <= 0) return 55;
  const bookingsPerYear = (reviewsCount / listingAgeFactor) * 3;
  const nightsPerYear = bookingsPerYear * 3;
  const occupancy = Math.round((nightsPerYear / 365) * 100);
  return Math.min(85, Math.max(30, occupancy));
}

export interface Comp {
  id: number | string;
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
  source?: string;
  amenities?: string[];
  hostName?: string;
  isSuperhost?: boolean;
}

export interface RefilterResult {
  comparables: Comp[];
  avgAdr: number;
  avgOccupancy: number;
  avgAnnualRevenue: number;
  monthlyRevenue: number;
  percentiles: {
    revenue: { p25: number; p50: number; p75: number; p90: number };
    adr: { p25: number; p50: number; p75: number; p90: number };
    occupancy: { p25: number; p50: number; p75: number; p90: number };
  };
  totalListings: number;
  filteredListings: number;
}

/**
 * Re-filter the full comp set by bedroom count, recalculate relevance scores,
 * and recompute percentiles. This runs entirely in the browser.
 */
export function refilterComps(
  allComps: Comp[],
  targetLat: number,
  targetLng: number,
  targetBedrooms: number,
  targetBathrooms?: number,
  targetGuests?: number,
): RefilterResult {
  const tBath = targetBathrooms || Math.ceil(targetBedrooms / 2);
  const tGuests = targetGuests || targetBedrooms * 2;

  // Filter to similar bedroom count (within ±1)
  const bedroomFiltered = allComps.filter((l) => {
    const diff = Math.abs((l.bedrooms || targetBedrooms) - targetBedrooms);
    return targetBedrooms >= 6 ? (l.bedrooms || 0) >= 5 : diff <= 1;
  });

  // Use bedroom-filtered if we have enough, otherwise use all
  const compsForCalc = bedroomFiltered.length >= 5 ? bedroomFiltered : allComps;

  // Recalculate relevance scores and revenue for each listing
  const enriched = compsForCalc.map((listing) => {
    const nightPrice = listing.nightPrice || 150;
    const occupancy = listing.occupancy || estimateOccupancy(listing.reviewsCount || 0);
    const annualRevenue = Math.round(nightPrice * 365 * (occupancy / 100));
    const monthlyRevenue = Math.round(annualRevenue / 12);
    const distance = listing.distance || calcDistance(targetLat, targetLng, listing.latitude, listing.longitude);

    // Relevance score: lower = better match
    const bedDiff = Math.abs((listing.bedrooms || targetBedrooms) - targetBedrooms);
    const bathDiff = Math.abs((listing.bathrooms || tBath) - tBath);
    const guestDiff = Math.abs((listing.accommodates || tGuests) - tGuests);
    const distScore = Math.min(distance / 15, 1);
    const relevanceScore = (bedDiff * 40) + (bathDiff * 20) + (guestDiff * 2.5) + (distScore * 25);

    return {
      ...listing,
      occupancy,
      annualRevenue,
      monthlyRevenue,
      distance: Math.round(distance * 10) / 10,
      relevanceScore: Math.round(relevanceScore * 10) / 10,
    };
  });

  // Sort by relevance score (best match first)
  enriched.sort((a, b) => {
    if (a.relevanceScore !== b.relevanceScore) return a.relevanceScore - b.relevanceScore;
    return a.distance - b.distance;
  });

  const top30 = enriched.slice(0, 30);

  // Calculate market averages from top comps
  const adrs = top30.map((l) => l.nightPrice).filter((v) => v > 0);
  const occupancies = top30.map((l) => l.occupancy).filter((v) => v > 0);
  const revenues = top30.map((l) => l.annualRevenue).filter((v) => v > 0);

  const avgAdr = adrs.length > 0 ? Math.round(adrs.reduce((a, b) => a + b, 0) / adrs.length) : 0;
  const avgOccupancy = occupancies.length > 0 ? Math.round(occupancies.reduce((a, b) => a + b, 0) / occupancies.length) : 55;
  const avgAnnualRevenue = revenues.length > 0 ? Math.round(revenues.reduce((a, b) => a + b, 0) / revenues.length) : 0;

  return {
    comparables: top30,
    avgAdr,
    avgOccupancy,
    avgAnnualRevenue,
    monthlyRevenue: Math.round(avgAnnualRevenue / 12),
    percentiles: {
      revenue: calculatePercentiles(revenues),
      adr: calculatePercentiles(adrs),
      occupancy: calculatePercentiles(occupancies),
    },
    totalListings: allComps.length,
    filteredListings: top30.length,
  };
}
