

## Interactive Comp Map Replacement (February 2026)
- [x] Replace static Google Maps embed with interactive Leaflet map
- [x] Show target property pin (distinct marker) on the map
- [x] Show all comparable listing pins with popups (photo, ADR, revenue, bedrooms)
- [x] Comp pins should be clickable with rich info popups (like Rabbu's calculator)
- [x] Map should be scrollable/zoomable on mobile (touchscreen friendly)
- [x] Auto-fit map bounds to show target + all comps
- [x] Ensure no regressions to existing calculator features


## Fix Duplicate Address Suggestions (February 2026)
- [x] Fix address autocomplete showing duplicate/double suggestion dropdowns
- [x] Ensure only one suggestion list appears at a time


## Fix Missing Interactive Comp Map + Low Comp Count (February 2026)
- [x] Fix interactive CompMap not rendering on deployed site (added coord fallback + old cache key lookup)
- [x] Investigate why only 4 comps are returned for some addresses (rural areas have fewer listings; progressive radius already in place)


## Fix Low Comp Count — Apify Scraper Missing Listings (February 2026)
- [x] Investigate why Apify scraper returns only 4 comps when more exist on Airbnb
- [x] Fix scraping logic: accumulate across radius steps, increase maxListings to 80, deduplicate
- [ ] Verify fix with Spartanburg area address (user needs to test with fresh search)


## URGENT: Fix Apify Cost Overrun (February 2026)
- [x] Revert scrapeAirbnbComps to single-scrape approach (1 scrape, expand only on 0 results)
- [x] Restore old cache key compatibility so existing cached data is reused
- [x] Add cost guard: max 2 Apify runs per search
- [x] Reduce maxListings back to 50 to save credits per run


## Optimize Apify Scraping — Cost Cap $0.30/search (February 2026)
- [x] Single scrape per search, grab max ~240 listings from Apify
- [x] Cap Apify cost at ~$0.30 per search
- [x] Extend cache TTL from 7 days to 30 days
- [x] City-name fallback only if first scrape returns 0 results (max 2 runs)
- [x] Don't break any existing features


## BUG: Apify charged $2 but returned no results (February 2026)
- [x] Investigate why Apify charged $2 for a search that returned nothing
- [x] Check if scraping code has a bug causing expensive runs with no output
- [x] Add better error handling and timeout to prevent infinite spinner
- [x] Add cost guard to prevent expensive Apify runs


## Speed Optimization — Make Search Near-Instant (February 2026)
- [x] Fix property_cache as first-line exact-address cache (check before geocoding)
- [x] Fix market_data cache save (0 rows = cache never populating)
- [x] Widen cache radius from 2 decimal places to 1 (11km instead of 1.1km)
- [x] Add client-side property_cache check BEFORE hitting /api/mashvisor/property
- [x] Parallel geocode + cache check instead of sequential
- [x] Add progress indicators with estimated time remaining


## BUG: Calculator dynamic recalculation + comp map (February 2026)
- [x] Bedroom/bath/guest changes must dynamically recalculate revenue, ADR, occupancy, next-30-day revenue from full comp pool
- [x] Comp list must actually filter by selected bedroom count (auto-refilter on change)
- [ ] User's own 40 Airbnbs in the area don't appear in comps
- [x] Add dynamic interactive comp map to calculator page (fixed: targetCoordinates now saved/restored in all cache paths)
- [x] Map should show all comp pins, clickable to show listing details (CompMap already existed, was hidden due to missing targetCoordinates)
- [x] One-button recalculation after changing bed/bath/guest count (now auto-triggers, no button needed)


## ACCURACY: Calculator systematically underestimates rural/tourism markets (February 2026)
- [x] Research why Airbnb scraped occupancy data is much lower than actual host occupancy (calendar scraping can't distinguish blocked vs booked; review rate assumed too high)
- [x] Add last-minute booking uplift factor (15-22% based on market type, toggleable in UI)
- [x] Add seasonality-aware revenue calculation (getMarketType now classifies WV as mountain, correct seasonal patterns applied)
- [x] Add superhost/amenity premium adjustment (Host Performance Level + 6 amenity checkboxes)
- [x] Add "Host Quality Adjustment" toggle in UI (New/Average/Experienced/Professional levels)
- [x] Weight comps by performance quality (Professional = 1.5x multiplier for P85-P95 operators)
- [x] Show revenue range via adjustment breakdown tags below panel
- [x] Use P50/P75 percentile display combined with adjustment multipliers
- [x] Fix: improved estimateOccupancy formula (review rate 30%, longer avg stays for mountain/rural)


## UX OVERHAUL: Calculator layout reorganization (February 2026)
- [ ] Audit current section order and identify all scroll pain points
- [ ] Design new top-to-bottom flow that eliminates back-and-forth scrolling
- [ ] Group all adjustable inputs together in one "Settings" area (bedrooms, bath, guests, host level, amenities, percentile)
- [ ] Move revenue adjustments panel closer to the revenue display so changes are visible immediately
- [ ] Add contextual help tooltips on confusing sections
- [ ] Add "Need help?" resource links for stuck users (link to Teeco course, chat assistant)
- [ ] Ensure the flow is: Search → Results Summary → Adjust Settings → Detailed Breakdown → Comps → Map
- [ ] Remove redundant or duplicate controls
- [ ] Make it feel like a premium, polished experience (not a dev prototype)


## BUG: Comp map still not showing on calculator (February 2026)
- [x] Diagnose why CompMap component is not rendering on the calculator page (root cause: targetCoordinates missing from old property_cache entries + client-side save stripping undefined values)
- [x] Fix the root cause and ensure map shows subject property + all comps (added fallback coord reconstruction in 4 code paths + API route backfill)
- [x] Verify map is interactive (scrollable, zoomable, clickable pins) (CompMap component already supports this, was just hidden)
- [x] Position comp map in the optimal spot in the page flow for best UX (moved from inside Revenue Estimate Card to after Comparable Listings, before Calendar Heatmap)

## Quick fix: spacing between Deal Score, AI Analysis CTA, and Next Steps (February 2026)
- [x] Add proper vertical spacing between Deal Score badge, AI Analysis CTA, and Your Next Steps sections (added mt-4 to each)
- [x] Fix Deal Score breakdown tiles (Cash-on-Cash, Cash Flow, Occupancy, Data Quality) touching each other — gap-2 → gap-3

## Full spacing audit — calculator page (February 2026)
- [x] Audit and fix all spacing inconsistencies across every section of the calculator results page
