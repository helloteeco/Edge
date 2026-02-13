

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
- [x] Fix spacing between Total Startup Costs bar, Monthly Operating Expenses card, and Investment Calculator section (added mt-2 to both cards)
- [x] Fix comp map initial zoom — too zoomed out, should focus on subject property and comps area (filtered outliers, maxZoom 15, min clamp at 10)
- [x] DEFINITIVE FIX: CompMap tiles misaligned, pins not visible — fixed invalidateSize timing, CSS loading, verified locally with both static and dynamic import tests


## FIX: Map showing scattered comps across US + expandable comp cards (February 2026)
- [x] Backend: Remove comp-coordinate reconstruction, always geocode actual address for targetCoordinates
- [x] Backend: Always recalculate distance from geocoded address (never trust cached distance from different center)
- [x] Frontend: Always use geocoded address coords for map center pin, never fall back to comp coordinates
- [x] CompMap: Add strict coordinate validation — reject comps with 0/0 coords or >50mi from target
- [x] Expandable comp cards: Show 5 initially, "See All X Comps" button to expand to full 30
- [x] Test with multiple locations to verify map centers correctly and shows only nearby comps

## BUG: Vercel build failed after map/comp fix (February 2026)
- [x] Identify and fix Vercel build error from latest push
- [x] Ensure no features are removed in the fix

## BUG: CompMap showing no comps due to 50mi filter being too aggressive (February 2026)
- [x] Remove 50mi distance filter from CompMap — show ALL comps returned by backend
- [x] Ensure subject property pin always shows on map (median-of-comps fallback when geocode is slow)
- [x] Remove comp-coordinate reconstruction in handleAnalyze cache path (always geocode instead)
- [x] Remove comp-coordinate fallback in cache save (use geocoded targetCoords state)
- [x] Remove zoom-10 clamp in CompMap bounds fitting (comps can span wide areas)
- [x] Keep all existing features intact

## FIX: Backend returning distant comps instead of nearby ones (February 2026)
- [x] Diagnose: Airbnb API already uses bounding box (15-50mi), but CACHED data from property_cache had stale distant comps
- [x] Added distance filtering (50mi) to property_cache STEP 0 in backend API route
- [x] Added distance filtering (50mi) to frontend property_cache hit path (the primary cache path)
- [x] Re-sort filtered comps by relevance (bedroom match + distance) after filtering
- [x] Backend enrichListings already had bedroom/guest relevance matching (was working correctly)
- [x] Map and comp list now only show nearby, relevant comps

## FIX: Share link preview cards showing generic OG tags instead of page-specific (February 2026)
- [x] Audit all share buttons across the site to identify which pages have share functionality
- [x] Fix share/[id]/layout.tsx: add hardcoded Supabase fallback (was crashing with ! assertion)
- [x] Fix share/[id]/layout.tsx: always generate custom OG tags (was blocking for already-viewed links)
- [x] Calculator share links already include address, revenue, metrics in OG tags via /api/og ✅
- [x] City page share links already include city name, STR grade, metrics via /api/og/city ✅
- [x] State page share links already include state name, metrics via /api/og/state ✅
- [x] Verified all OG image routes work correctly
- [x] No features removed — only fixed env var fallback and view-count OG blocking

## BUG: "Failed to fetch county list from HUD" in calculator STR vs LTR comparison (February 2026)
- [x] Diagnosed: HUD API returns 403 Forbidden (token expired or government API down)
- [x] Added RentData.org scraping fallback — parses county FMR tables from public pages
- [x] Primary: tries HUD API first, falls back to RentData.org if HUD fails
- [x] STR vs LTR comparison now works regardless of HUD API status

## FEATURE: Authenticated Like System with Counts and Trending (February 2026)
- [x] Create user_likes database table (user_email, market_id, market_type, unique constraint)
- [x] Update /api/market-saves with toggle endpoint, user-specific tracking, 10-like cap
- [x] Enforce 10-like cap per user — returns error if limit reached
- [x] Require sign-in to like — shows sign-in prompt modal if not authenticated
- [x] Show like count on city cards in search results
- [x] Show like count on TopMarkets city cards
- [x] Show like count on FloatingActionPill (city/state detail pages)
- [x] Create TrendingMarkets component (most liked markets)
- [x] Add TrendingMarkets section to home page below TopMarkets
- [x] Existing save/heart system still works — this is additive
- [x] No core features changed

## FEATURE: Extend auth session persistence (reduce magic link fatigue)
- [x] Audit current auth/session configuration — found 24-hour expiry hardcoded in 2 files
- [x] Extend session duration to 30 days (calculator/page.tsx + AuthHeader.tsx)
- [x] localStorage already persists across visits and Vercel deploys — no cookie changes needed
- [x] No changes to magic link flow or any existing features

## BUG: "Failed to create share link" error appears after successful share (February 2026)
- [x] Diagnosed: navigator.share() throws AbortError when user dismisses iOS share sheet, caught by generic error handler
- [x] Fixed both green share buttons on calculator page to ignore AbortError (FloatingActionPill already handled it)
- [x] No features removed

## FIX: FMR data always failing — "Unable to fetch FMR data from any source" (February 2026)
- [x] Diagnose why both HUD API and RentData.org fallback are failing
- [x] Implement robust FMR solution that never shows error to users
- [x] Ensure STR vs LTR comparison always displays data
- [x] No existing features removed

## FEATURE: County-level FMR caching in Supabase (February 2026)
- [x] Create fmr_cache table in Supabase (state, county/city, bedroom data, timestamp)
- [x] Check cache before calling HUD API or RentData.org
- [x] Store successful FMR results in cache for instant repeat lookups
- [x] Cache TTL of 90 days (FMR data changes annually)
- [x] No existing features removed

## FEATURE: Enhanced STR vs LTR comparison UI with bar chart (February 2026)
- [x] Add visual bar chart comparing STR vs LTR income side-by-side
- [x] Show revenue, expenses, and net cash flow bars for both strategies
- [x] Make chart mobile-friendly and visually polished
- [x] No existing features removed

## BUG: Bottom tab bar floats when mobile keyboard opens (February 2026)
- [x] Fix tab bar to stay fixed at viewport bottom when keyboard is open on mobile
- [x] No existing features removed

## FEATURE: Hybrid STR Regulation Risk System (February 2026)
- [ ] Build curated static dataset of ~200 known restricted/banned cities (zero API cost)
- [ ] Default all other cities to legal/moderate (statistically accurate)
- [ ] On-demand AI enrichment when users visit city pages (cached in Supabase)
- [ ] Integrate regulation penalties into scoring (cap grades for banned/hostile)
- [ ] Add regulation warning banner + permit difficulty info on city detail pages
- [ ] Auto-refresh stale data after 90 days
- [ ] Show last verified date for data freshness
- [ ] No existing features removed
