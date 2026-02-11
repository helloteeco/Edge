import { describe, it, expect } from "vitest";
import { refilterComps, type Comp } from "./refilterComps";

// Helper to create a mock comp
function mockComp(overrides: Partial<Comp> = {}): Comp {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Test Listing",
    url: "https://airbnb.com/rooms/123",
    image: null,
    bedrooms: 3,
    bathrooms: 2,
    accommodates: 6,
    sqft: 0,
    nightPrice: 200,
    occupancy: 60,
    monthlyRevenue: 3600,
    annualRevenue: 43200,
    rating: 4.8,
    reviewsCount: 50,
    propertyType: "Entire home",
    distance: 5,
    latitude: 35.0,
    longitude: -82.0,
    relevanceScore: 10,
    source: "apify",
    ...overrides,
  };
}

describe("refilterComps", () => {
  const targetLat = 35.0;
  const targetLng = -82.0;

  it("filters comps by bedroom count (±1 range)", () => {
    const comps: Comp[] = [
      mockComp({ bedrooms: 1, nightPrice: 100 }),
      mockComp({ bedrooms: 2, nightPrice: 150 }),
      mockComp({ bedrooms: 2, nightPrice: 160 }),
      mockComp({ bedrooms: 3, nightPrice: 200 }),
      mockComp({ bedrooms: 3, nightPrice: 210 }),
      mockComp({ bedrooms: 4, nightPrice: 250 }),
      mockComp({ bedrooms: 4, nightPrice: 260 }),
      mockComp({ bedrooms: 5, nightPrice: 300 }),
      mockComp({ bedrooms: 6, nightPrice: 400 }),
    ];

    // Filter for 3 bedrooms → should include 2, 3, 4 (±1) — 6 comps match, >= 5 threshold
    const result = refilterComps(comps, targetLat, targetLng, 3);
    const bedroomCounts = result.comparables.map((c) => c.bedrooms);
    // All returned comps should be within ±1 of target (2, 3, or 4)
    expect(bedroomCounts.every((b) => b >= 2 && b <= 4)).toBe(true);
    // Should NOT include 1br, 5br, or 6br
    expect(bedroomCounts).not.toContain(1);
    expect(bedroomCounts).not.toContain(5);
    expect(bedroomCounts).not.toContain(6);
  });

  it("falls back to all comps if fewer than 5 match bedroom filter", () => {
    const comps: Comp[] = [
      mockComp({ bedrooms: 1, nightPrice: 100 }),
      mockComp({ bedrooms: 1, nightPrice: 110 }),
      mockComp({ bedrooms: 5, nightPrice: 300 }),
      mockComp({ bedrooms: 6, nightPrice: 400 }),
    ];

    // Filter for 3 bedrooms → only 0 match ±1, should fall back to all
    const result = refilterComps(comps, targetLat, targetLng, 3);
    expect(result.comparables.length).toBe(4);
  });

  it("calculates correct percentiles", () => {
    const comps: Comp[] = Array.from({ length: 20 }, (_, i) =>
      mockComp({
        bedrooms: 3,
        nightPrice: 100 + i * 20,
        annualRevenue: (100 + i * 20) * 365 * 0.6,
      })
    );

    const result = refilterComps(comps, targetLat, targetLng, 3);
    expect(result.percentiles.revenue.p25).toBeGreaterThan(0);
    expect(result.percentiles.revenue.p50).toBeGreaterThan(result.percentiles.revenue.p25);
    expect(result.percentiles.revenue.p75).toBeGreaterThan(result.percentiles.revenue.p50);
    expect(result.percentiles.adr.p50).toBeGreaterThan(0);
  });

  it("returns correct averages", () => {
    const comps: Comp[] = [
      mockComp({ bedrooms: 3, nightPrice: 200, occupancy: 60, annualRevenue: 43800 }),
      mockComp({ bedrooms: 3, nightPrice: 300, occupancy: 70, annualRevenue: 76650 }),
    ];

    const result = refilterComps(comps, targetLat, targetLng, 3);
    expect(result.avgAdr).toBe(250); // (200+300)/2
    expect(result.avgOccupancy).toBe(65); // (60+70)/2
  });

  it("sorts by relevance score (exact bedroom match first)", () => {
    const comps: Comp[] = [
      mockComp({ bedrooms: 4, nightPrice: 250, latitude: 35.0, longitude: -82.0 }),
      mockComp({ bedrooms: 3, nightPrice: 200, latitude: 35.0, longitude: -82.0 }),
      mockComp({ bedrooms: 2, nightPrice: 150, latitude: 35.0, longitude: -82.0 }),
    ];

    const result = refilterComps(comps, targetLat, targetLng, 3);
    // Exact match (3br) should be first
    expect(result.comparables[0].bedrooms).toBe(3);
  });

  it("limits to 30 comps max", () => {
    const comps: Comp[] = Array.from({ length: 50 }, (_, i) =>
      mockComp({ bedrooms: 3, nightPrice: 100 + i })
    );

    const result = refilterComps(comps, targetLat, targetLng, 3);
    expect(result.comparables.length).toBeLessThanOrEqual(30);
  });

  it("handles empty comp set", () => {
    const result = refilterComps([], targetLat, targetLng, 3);
    expect(result.comparables.length).toBe(0);
    expect(result.avgAdr).toBe(0);
    expect(result.avgOccupancy).toBe(55); // default
    expect(result.avgAnnualRevenue).toBe(0);
  });

  it("handles 6+ bedrooms filter (>= 5)", () => {
    const comps: Comp[] = [
      mockComp({ bedrooms: 3, nightPrice: 200 }),
      mockComp({ bedrooms: 5, nightPrice: 350 }),
      mockComp({ bedrooms: 6, nightPrice: 400 }),
      mockComp({ bedrooms: 7, nightPrice: 500 }),
      mockComp({ bedrooms: 8, nightPrice: 600 }),
      mockComp({ bedrooms: 10, nightPrice: 800 }),
    ];

    const result = refilterComps(comps, targetLat, targetLng, 6);
    // For 6+ bedrooms, should include bedrooms >= 5
    const bedroomCounts = result.comparables.map((c) => c.bedrooms);
    expect(bedroomCounts.every((b) => b >= 5)).toBe(true);
    expect(bedroomCounts).not.toContain(3);
  });
});
