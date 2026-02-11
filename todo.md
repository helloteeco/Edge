

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
- [ ] Investigate why Apify charged $2 for a search that returned nothing
- [ ] Check if scraping code has a bug causing expensive runs with no output
- [ ] Add better error handling and timeout to prevent infinite spinner
- [ ] Add cost guard to prevent expensive Apify runs
