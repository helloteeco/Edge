# Data Flow Audit — What Powers Each Feature

## Comp Map (CompMap.tsx)
- **Data source:** `result.comparables` → comes from `enriched` array in `/api/mashvisor/property`
- **enriched** comes from `enrichListings(scrapeResult.listings, ...)` 
- **scrapeResult** comes from `fetchAirbnbDirect()` — the FREE Airbnb explore_tabs API
- **Coordinates:** Each listing has lat/lng from Airbnb Direct API
- **Target pin:** Geocoded via Nominatim (free)
- **MASHVISOR/RAPIDAPI: NOT INVOLVED AT ALL** — despite the route name
- **APIFY: NOT INVOLVED AT ALL**
- **SAFE TO KEEP: YES — zero changes needed**

## Comp Cards (listing cards below map)
- **Data source:** Same `result.comparables` from Airbnb Direct API
- **Per-comp occupancy:** `listing.occupancy` from `estimateOccupancy(reviewsCount)` — review-based heuristic
- **Per-comp "📅 real occ" badge:** From `realOccupancyData[id]` — THIS IS APIFY
- **SAFE after Apify removal:** Yes — falls back to review-based estimate (already the fallback path)

## Revenue/ADR/Occupancy Headlines
- **Primary:** PriceLabs (paid, ~$0.05-0.10/search)
- **Fallback:** Airbnb-derived from enrichListings() — review-based occupancy + nightly prices
- **APIFY: NOT INVOLVED**
- **MASHVISOR: NOT INVOLVED**

## Calendar Heatmap (CompCalendar.tsx)
- **Data source:** `realOccupancyData` — THIS IS APIFY (daily calendar per listing)
- **After Apify removal:** This component won't render (conditional on realOccupancyData having entries)
- **No data loss in analysis numbers**

## "Real Calendar Occupancy" Banner
- **Data source:** `realOccupancyData` — THIS IS APIFY
- **After Apify removal:** Banner won't render
- **No data loss in analysis numbers**

## Seasonality Graph
- **Data source:** Google Trends (free npm package) + market-type fallback patterns
- **APIFY: NOT INVOLVED**

## Address Autocomplete
- **Primary:** Google Places API (paid, ~$0.003/request)
- **Fallback 1:** Geoapify (free, 3000/day)
- **Fallback 2:** Nominatim (free)

## Mashvisor/RapidAPI Usage
- `/api/mashvisor/property` — **DOES NOT CALL MASHVISOR** despite the route name. Uses PriceLabs + Airbnb Direct.
- `/api/mashvisor/cities` — Called from state/[id] page but fetchLiveCities() is DEFINED but NEVER INVOKED (no button/trigger)
- `/api/mashvisor/neighborhoods` — Same: defined but never invoked
- `/api/property-search` — Uses Mashvisor but is DEAD CODE (never called from any frontend)
- **Conclusion:** Mashvisor/RapidAPI is effectively unused in production
