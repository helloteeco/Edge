

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
- [ ] Research why Airbnb scraped occupancy data is much lower than actual host occupancy
- [ ] Add last-minute booking uplift factor (Airbnb calendars show "available" but get booked last minute)
- [ ] Add seasonality-aware revenue calculation (summer peak vs winter trough)
- [ ] Add superhost/amenity premium adjustment
- [ ] Add "Host Quality Adjustment" toggle in UI (new host vs experienced host)
- [ ] Weight comps by performance quality (top performers vs average)
- [ ] Show revenue range (conservative/moderate/optimistic) instead of single number
- [ ] Use P50/P75 percentile display to show realistic range for good operators
- [ ] Fix: only 3 comps found for Oak Hill WV — need wider search radius for rural areas
