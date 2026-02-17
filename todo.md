

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
- [x] Build curated static dataset of ~65 known restricted/banned cities (zero API cost)
- [x] Default all other cities to legal/moderate (statistically accurate)
- [x] On-demand AI enrichment when users visit city pages (cached in Supabase)
- [x] Integrate regulation penalties into scoring (cap grades for banned/hostile)
- [x] Add regulation warning banner + permit difficulty info on city detail pages
- [x] Auto-refresh stale data after 90 days
- [x] Show last verified date for data freshness
- [x] Enhanced Regulation Status section with legality/permit badges
- [x] No existing features removed

## AUDIT: Ensure all sorting, grades, and maps use regulation-adjusted data (February 2026)
- [x] Audit all places where cities are sorted/ranked (search, state pages, top markets, trending)
- [x] Fix sorting to use regulation-penalized scores so banned cities sort to bottom
- [x] Verify search results sort by adjusted grade (best first, banned last)
- [x] Verify state detail pages sort cities by adjusted grade
- [x] Verify Top Markets / homepage rankings use adjusted grades
- [x] Ensure interactive maps (STR grade tab) reflect adjusted grades dynamically
- [x] Ensure map colors/weights use regulation-adjusted scores
- [x] Fix regulation field in FlatCity to use curated data (was using old strStatus)
- [x] Add adjustedScore to ScoringBreakdown that caps numeric score to match grade cap
- [x] Create /api/admin/sync-scores endpoint to update Supabase market_score values
- [x] Run sync-scores to update Supabase after deployment
- [x] No existing features removed

## SYSTEM: Future-proof state scoring + auto-updating maps (February 2026)
- [x] Audit why California shows grade C (46/100) — old algo averaged top 50% of 143 cities, pulling in D/F cities
- [x] Redesign state scoring: top-N performer algorithm (top 20%, min 3, max 10) with breadth penalty
- [x] Ensure all state scores dynamically recalculate when cities are added/changed
- [x] Ensure interactive maps auto-update colors/grades when new markets are added
- [x] Build Supabase auto-sync: daily Vercel cron at 7am UTC calls /api/admin/sync-scores
- [x] Verify all 50 states have correct dynamically-calculated grades
- [x] Stability tested: adding 50 F-cities to KY drops only 2pts, adding 100 F-cities to CA drops 0pts
- [x] No existing features removed

## BUG FIXES: Calculator/Analysis page (February 2026)
- [x] Fix double-tap to save/unsave not working on analysis sheets (wrapped calculator page in DoubleTapSave)
- [x] Fix "Numbers not making sense?" section spacing — added pb-16 to StuckHelper wrapper

## FEATURE: Founder intro trust section on calculator page (February 2026)
- [x] Add founder photo to public directory
- [x] Add personal founder intro section (Jeff Chheuy) to calculator page
- [x] Rewrite founder intro copy — remove pricing/competitor references, make it welcoming to newcomers and experienced investors alike

## FIX: Adjusted inputs must persist across PDF export, share cards, and saved reports (February 2026)
- [x] Audit which adjustable inputs exist on the calculator page
- [x] Fix PDF export: now derives effective ADR from adjusted revenue, shows correct values in highlights and AI prompt
- [x] Fix share cards: all 3 share call sites now derive ADR from adjusted revenue
- [x] Fix saved reports: customInputs now passed as JSON in URL params and restored on calculator page load

## AUDIT: API cost safety + FMR long-term rental fix (February 2026)
- [x] Audit all external API calls (Mashvisor/PriceLabs) — confirmed: only fires on Analyze button, never on instant/history/saved views
- [x] Fix FMR (Fair Market Rent) data fetch — root cause: Nominatim returns full state names ("California") but FMR API expected abbreviations ("CA"). Added normalizeState() converter.

## BUG: Re-analyzing saved/history deals uses another credit (February 2026)
- [x] Audit the flow when user opens a saved/history report to find where the extra API call happens
- [x] Fix so saved/history re-analysis reads from cache, not paid APIs
- [x] No existing features changed

## UX BUG: Leading zero in expense inputs (February 2026)
- [x] Fix leading zero issue in Monthly Operating Expenses inputs (Electric shows "0100" instead of "100")
- [x] Ensure all numeric inputs strip leading zeros on change and on blur
- [x] No existing features changed
## FEATURE: Credits activity log (February 2026)
- [x] Add credits usage history showing when credits were spent vs refunded
- [x] Store credit events in localStorage or Supabase
- [x] Show activity log in credits banner UIthe credits UI

## FEATURE: Offline-first caching with service worker (February 2026)
- [x] Implement service worker for caching analysis results
- [x] App works with cached data even without connectivity
- [x] Graceful fallback when offline

## UX FIX: Sqft and Price inputs auto-populating on clear (February 2026)
- [x] Fix sqft input: allow fully clearing the field without fallback to 1500
- [x] Fix price input: allow fully clearing the field without auto-populating
- [x] Auto-fill sqft from API data (Zillow property details) when analysis runs
- [x] Auto-fill estimated property value from Zillow when analysis runs
- [x] Both fields remain fully editable after auto-fill
- [x] No other features changed

## BUG: Sqft and Purchase Price not auto-filling from analysis data (February 2026)
- [x] Fix: listPrice from analysis result should always populate Purchase Price when > 0
- [x] Fix: sqft from analysis result should always populate Property Square Footage when > 0
- [x] Zillow lookup should be fallback only when analysis data has no sqft/price
- [x] Added Redfin as primary property details source (more reliable than Zillow from server)
- [x] Added OSM/Nominatim as tertiary fallback for sqft
- [x] Bedroom-based estimate shown with label when no real data available
- [x] Ensure existing auto-fill from analysis result still works
- [x] No features removed

## FEATURE: Smart Search Filters (February 2026)
- [x] Add collapsible Smart Filters panel to search page
- [x] Score range filter (slider, 0-90)
- [x] Home value range filter (price bracket presets: Under 200K to 750K+)
- [x] ADR range filter (nightly rate bracket presets: Under 150 to 400+)
- [x] Monthly revenue range filter (Under 3K to 8K+)
- [x] Regulation status filter (Legal / Restricted / All)
- [x] Sort by dropdown (Score, Home Value High/Low, ADR, Revenue, Cash-on-Cash)
- [x] Show active filter count badge
- [x] Show key metrics (Home Value, ADR, Revenue, CoC) on city cards
- [x] Keep existing filter tabs (Featured, All Cities, States, etc.) untouched
- [x] No existing features changed

## UX FIX: Smart Filters panel too large on mobile (February 2026)
- [ ] Make filter panel compact — reduce vertical space
- [ ] Ensure page scrolls so users can reach results below filters
- [ ] No existing features changed

## FEATURE: Dynamic search filters + remove redundancy (February 2026)
- [x] Make all filter brackets dynamic (computed from actual city data percentiles)
- [x] Audit quick-filter tabs for redundancy with smart filters
- [x] Removed "Score 70+" and "Hidden Gems" tabs (fully covered by Smart Filters)
- [x] Kept: Featured, All Cities, States, Cities tabs
- [x] Filters auto-adjust when new cities are added to data (buildBrackets uses p25/p50/p75)
- [x] No existing features changed or deleted

## BUG FIX: Search filters not functional/accurate (February 2026)
- [ ] Audit all filter logic (score, home value, ADR, revenue, regulation, sort)
- [ ] Fix any broken filter conditions — ensure each filter actually works
- [ ] Ensure filters work with real city data fields (correct field names)
- [ ] Make filters fully dynamic — auto-adjust when new cities added
- [ ] Test each filter individually and in combination
- [ ] No other features changed

## BUG FIX: Search filters not functional/accurate (February 2026)
- [ ] Audit all filter logic — filters must apply to ALL tabs (Featured, All Cities, States, Cities)
- [ ] Fix: Featured tab bypasses smart filters — must filter featured cities too
- [ ] Fix: States tab must filter by state-level metrics (avg home value, avg ADR, etc.)
- [ ] Fix: Each filter (score, home value, ADR, revenue, regulation) must actually work
- [ ] Fix: Sort must work across all tabs
- [ ] Make filters fully dynamic — auto-adjust when new cities added
- [ ] No other features changed

## BUG: Filter panel takes full screen on mobile, blocks scrolling and tapping (February 2026)
- [x] Make filter panel collapsible — auto-collapse after selecting a filter so results are visible
- [x] Ensure bottom elements (Sort By) are accessible above the tab bar
- [ ] No other features changed

## Calculator Auto-Populate
- [x] Auto-populate purchase price from city median home price
- [ ] Auto-populate rent estimate for arbitrage calculator
- [ ] Auto-populate realistic STR expenses based on bedroom count and guest capacity for all 3 calculators

## Low-Priority Cosmetic Fixes
- [ ] Fix "Trending Markets" section - populate dynamically or hide when empty
- [ ] Fix funding count to be dynamic (not hardcoded "45")
- [ ] Fix "rural" wording in funding subtitle
- [ ] Fix "County County" double-word in OG images
- [x] Add /map redirect to home page
- [x] Make calculator expenses dynamic based on bedroom count, guest count, and city cost of living
- [x] Auto-populate house size, bed/bath count, guest count from city data
- [x] Make expense estimates adjust for inflation/economy changes dynamically
- [x] Research and recalibrate STR expense auto-populate with real-world benchmarks by property size and guest count
- [x] Fix Purchase Price field to auto-populate with median home value for the analyzed city (not blank)
- [x] Ensure changing purchase price dynamically recalculates entire analysis (mortgage, expenses, insurance, ROI)

## AUDIT: External API costs and paid services inventory (February 2026)
- [x] Audit all API keys and environment variables for paid services
- [x] Trace all external API fetch calls in backend API routes
- [x] Trace all external API fetch calls in frontend code
- [x] Audit third-party infrastructure services (Supabase, Vercel, domain, etc.)
- [x] Calculate per-search cost breakdown and monthly recurring costs
- [x] Deliver comprehensive cost audit report

## API Consolidation: Kill Apify, Promote Geoapify, Clean Dead Routes (February 2026)
- [x] Replace Apify calendar scraping with review-based occupancy estimation (keep per-comp occupancy badges visible)
- [x] Convert CompCalendar heatmap to use estimated data instead of scraped calendar data
- [x] Keep "Real Calendar Occupancy" banner but relabel as occupancy comparison using existing data
- [x] Promote Geoapify to primary autocomplete in /api/geocode, demote Google Places to fallback
- [x] Delete dead route: /api/airbnb-comps (Apify listing scraper, never called)
- [x] Delete dead route: /api/property-search (Mashvisor, never called)
- [x] Delete dead route: /api/airbtics (Airbtics, never called)
- [x] Verify all fallback chains still work after changes
- [x] Syntax check and build verification

## Future-Proofing: Harden city data pipeline for zero-effort expansion (February 2026)
- [ ] Audit every consumer of city data for consistency gaps when new cities are added
- [ ] Audit caching layer (Supabase property_cache, analysis_log) for new-city handling
- [ ] Audit city card rendering for missing-field edge cases and defensive defaults
- [ ] Auto-generate STR regulation fallback so no manual str-regulations.ts entry needed
- [ ] Ensure scoring, grades, verdicts, and all card features auto-propagate for any new city
- [ ] Verify state-level aggregation stays stable when city count changes

## Re-audit: Verify dead routes removed + accurate cost report (February 2026)
- [x] Verify dead API routes (airbnb-comps, property-search, airbtics) are deleted
- [x] Audit all remaining connected APIs with accurate per-call costs
- [x] Research PriceLabs actual pricing ($0.50/call per user report)
- [x] Deliver clean cost breakdown report

## Cost Optimization: Pre-cache cron biweekly (February 2026)
- [x] Change pre-cache cron from weekly (Monday 6am) to biweekly (1st and 15th of each month)
- [x] Commit and push to deploy

## Bug Fix: Recent Searches not showing on desktop (February 2026)
- [ ] Fix Recent Searches section not rendering on desktop/laptop view (works on mobile)
- [x] Commit and push to deploy

## Credit System Audit + Recent Searches Sync (February 2026)
- [x] Audit full credit consumption flow (when deducted, edge cases, refund risks)
- [x] Create Supabase recent_searches table for cross-device sync
- [x] Implement sync logic: save to both localStorage + Supabase on analysis complete
- [x] On page load: fetch from Supabase for signed-in users, merge with local
- [x] Update button wording: 'Analyze Free' for first use, then 'Analyze (1 Credit)' after
- [x] Add 90-day expiration on cached results with 75-day staleness warning
- [x] Add 're-analyze uses a credit' note on expired recent searches
- [x] Commit and push to deploy

## Comprehensive Credit System Audit (February 2026)
- [x] Audit credit deduction flow: race conditions, double-deductions, failure-without-refund
- [x] Audit credit refund flow: abuse vectors, over-refunding, edge cases
- [x] Audit credit purchase flow: Stripe webhook integrity, replay attacks, missed fulfillment
- [x] Audit free preview system: bypass vectors, multi-device abuse
- [x] Audit cache system: credit bypass via cache manipulation, cost leaks
- [x] Audit rate limiting and API abuse vectors
- [x] Fix all critical issues found
- [x] Compile and deliver comprehensive audit report

## FIX: Replace Stripe Payment Links with server-side Checkout Sessions (February 2026)
- [x] Audit current payment link URLs and pricing tiers in calculator page
- [x] Create /api/stripe/checkout API route that creates Checkout Sessions with locked customer_email
- [x] Update calculator frontend to call new checkout route instead of opening payment link URLs
- [x] Verify Stripe webhook still handles checkout.session.completed correctly
- [ ] Commit and push to deploy


## FEATURE: Universal STR Regulation Cards for ALL 1,444+ Cities (February 2026)
- [x] Unify regulation card into single reusable RegulationCard component for consistent display
- [x] Make enrichment trigger for ALL cities (curated, default, and future) not just default-source
- [x] Show regulation card on every city page regardless of status (legal/restricted/banned)
- [x] Cache AI enrichment results in Supabase so each city only researched once per 30 days
- [x] Ensure new states/cities added in future auto-get regulation cards without code changes
- [x] Adaptive card styling: green (legal), yellow (restricted), red (banned)
- [x] Adaptive guidance text: "Before You Invest" for legal, "How to Verify" for restricted/banned
- [x] TypeScript compilation passes with zero errors
- [x] Push to GitHub for Vercel auto-deploy

## UI: Shorten Mobile Hero Header (February 2026)
- [x] Reduce vertical spacing/padding in hero section on mobile
- [x] Make Ask Edge AI more prominent above the fold
- [x] Keep all existing content and features intact

## UI: Mobile Hero Refinements (February 2026)
- [x] Shorter single-line headline on mobile
- [x] Tighter description paragraph — one clear line
- [x] Remove redundant AI badges, keep only Analyze Free CTA
- [x] Reduce gap between hero and AI chat card for seamless flow

## FEATURE: Photo Upload to AI Chat (February 2026)
- [x] Add photo/image picker button next to chat input
- [x] Encode selected image as base64 and send to /api/chat
- [x] Update /api/chat to pass images to OpenAI vision API
- [x] Show image thumbnail preview in chat messages
- [x] AI analyzes property photos/listing screenshots with market data context

## FEATURE: Saved Chat History (February 2026)
- [x] Create Supabase chat_sessions table (user_id, title, messages, timestamps)
- [x] Build API endpoints: save session, load sessions, load single session
- [x] Add chat history list UI (slide-out or dropdown)
- [x] Auto-save conversations for logged-in users
- [x] "New Chat" button to start fresh conversation
- [x] Load and continue previous conversations

## FEATURE: Soft login gate after 3 chat messages (February 2026)
- [x] Show inline banner after 3rd message: "Sign in to save this conversation"
- [x] Banner is dismissible, doesn't block chat
- [x] If user signs in mid-conversation, auto-save current conversation
- [x] No other features changed

## UI: Hero polish + accessibility (February 2026)
- [x] Move "Analyze a Deal Free" CTA below stats or make it outline/secondary style
- [x] Simplify stats row: 2 clearer numbers instead of 3 confusing ones
- [x] Add subtle green left-border accent to prompt chips for better tappability
- [x] Tighten gap below AI chat card
- [x] Replace "Sign Out" text with user icon (dropdown with Sign Out inside)
- [x] Ensure all changes meet WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text)
- [x] Minimum 44px touch targets for all interactive elements
- [x] No other features changed

## FEATURE: Pre-made avatar picker for account icon (February 2026)
- [x] Generate 16 SVG avatars (investor personas, animals, abstract)
- [x] Build AvatarPicker component (grid modal with avatar options)
- [x] Integrate into AuthHeader dropdown (show selected avatar, "Change Avatar" option)
- [x] Save selected avatar to localStorage
- [x] Show selected avatar in header circle instead of generic person icon
- [x] 44px touch targets, accessible labels
- [x] No other features changed

## FIX: Shorten AI chat input placeholder text (February 2026)
- [x] Shorten placeholder so it fits on mobile without being cut off
- [x] No other features changed

## FEATURE: Chat history retention policy (February 2026)
- [x] Add 'pinned' boolean column to chat_sessions table in Supabase
- [x] Auto-delete unpinned conversations older than 90 days
- [x] Cap at 50 conversations per user (oldest unpinned deleted first)
- [x] Allow users to pin/star up to 5 conversations (exempt from auto-delete)
- [x] Pinned chats show at top of history list with star icon
- [x] Pin/unpin toggle button on each session in history
- [x] No other features changed

## FIX: Match city header share button to floating share icon (February 2026)
- [x] Update the up-arrow share icon in city header to paper plane style matching the floating action button
- [x] Apply to all cities consistently
- [x] No other features changed

## AI Response Action Buttons (February 2026)
- [x] Copy button on each AI response (clipboard icon, "Copied!" toast)
- [x] Share button on each AI response (paper plane icon, native share sheet, branded footer with edge.teeco.co)
- [x] Like button (thumbs up, highlights green, saves to Supabase)
- [x] Dislike button (thumbs down, highlights red, optional "What went wrong?" input, saves to Supabase)
- [x] Create chat_feedback Supabase table (user_email, session_id, message_index, rating, feedback_text, message_content, user_query, created_at)
- [x] No other features changed

## FIX: Magic link redirect to originating page (February 2026)
- [x] Store the current page URL when user clicks sign in (before sending magic link)
- [x] After magic link verification, redirect to stored URL instead of always /calculator
- [x] Works for all pages: home, search, city, state, calculator, saved, funding
- [x] No other features changed

## Rebrand: Replace "Airbnb" with "Short-Term Rental" / "STR" in user-facing text (February 2026)
- [x] Update main headline on home page (page.tsx) → "Find, Analyze & Fund Short-Term Rentals"
- [x] Update meta description (layout.tsx)
- [x] Update calculator page user-facing text (calculator/page.tsx)
- [x] Update city page user-facing text (city/[id]/page.tsx)
- [x] Update CompMap component user-facing text (CompMap.tsx)
- [x] Update AIChatHero suggested prompts (AIChatHero.tsx)
- [x] Update ChatAssistant text (ChatAssistant.tsx)
- [x] Update StuckHelper text (StuckHelper.tsx)
- [x] Update RegulationCard text (RegulationCard.tsx)
- [x] Keep API/backend Airbnb references unchanged (they reference the actual Airbnb API)
- [x] Keep "View on Airbnb" links unchanged (they link to actual Airbnb.com)
- [x] No other features changed

## Legal: External Links & Third-Party Services Disclaimer (February 2026)
- [x] Add "External Links & Third-Party Services" section to Terms of Service page
- [x] Add affiliate disclosure language (future-proofing)
- [x] No other features changed

## Fix misleading "Analyze Free" language — make credits model transparent (February 2026)
- [x] Calculator button: "Try It Free" for first visit, "Analyze (1 Credit)" after
- [x] Calculator subtitle: "STR revenue analysis for any US address" (removed "Free")
- [x] Calculator "No signup required" — only shows for first-time visitors
- [x] Home page button: "Analyze a Property →" (removed "Free")
- [x] Home page feature: "1 free analysis to try, 3 more when you sign up" (fully transparent)
- [x] AuthModal "3 free property analyses" — kept (accurate in context)
- [x] AuthModal "Get Started Free" — kept (signing up is free)
- [x] OG meta images — removed "Free" from STR analysis descriptions
- [x] No other features changed

## Search Page: Compact header + Performance fix (February 2026)
- [x] Compact the header — less vertical space, results visible sooner
- [x] Move search bar, filters, and tabs into a tighter layout
- [x] Remove redundant elements (search icon circle, excess padding)
- [x] Fix slow tab-switch: add API-level caching (Cache-Control headers + client-side cache)
- [x] Add client-side caching so switching tabs doesn't re-fetch
- [x] Ensure caching scales well as more cities are added (LRU eviction, 5min TTL)
- [x] No existing features or functions changed

## Fix slow page navigation + consistent account icon (February 2026)
- [x] Diagnose slow tab navigation: memoization was missing for heavy data computations
- [x] Fix: memoized getAllCities(), getAllStates(), getMarketCounts() to avoid re-computation
- [x] Note: force-dynamic MUST stay in root layout (removing it breaks all pages — usePathname needs client context)
- [x] Add AuthHeader to Saved page (was the only main page missing it)
- [x] All pages now have consistent account icon: Map, Search, Calculator, Saved, Funding, City, State
- [x] No other features changed

## BUG: Bottom tab bar navigation broken on search page (February 2026)
- [x] Bottom tabs (Map, Calculator, Saved, Funding) don't work when on the Search page
- [x] Root cause: removing force-dynamic broke static generation (usePathname needs client context)
- [x] Fix: restored force-dynamic in root layout with explanatory comment
- [x] No other features changed

## BUG FIX: Search page multiple issues (February 2026)
- [x] Bottom tab navigation — fixed by restoring force-dynamic (broken build caused failed hydration)
- [x] "All Cities" tab button — code was correct, broken hydration caused click events to fall through
- [x] Account icon — code was correct (flex justify-between), broken hydration prevented proper rendering
- [x] City counts are dynamic — getMarketCounts() reads from data files, auto-updates when cities added
- [x] No other features changed

## FIX: Inconsistent account icon positioning on Search and Funding pages (February 2026)
- [x] Fix account icon on Search page — should be in top-right header like Map/Calculator/Saved
- [x] Fix account icon on Funding page — should be in top-right header like Map/Calculator/Saved
- [x] No other features changed

## FIX: Truncated text on mobile — Search subtitle, Funding subtitle, Calculator placeholder (February 2026)
- [x] Shorten Search page subtitle so it fits on mobile without "..."
- [x] Shorten Funding page subtitle so it fits on mobile without "..."
- [x] Shorten Calculator input placeholder so it fits on mobile without "..."
- [ ] No other features changed

## FIX: Search subtitle Unicode escape and Calculator comps wording (February 2026)
- [x] Fix Search subtitle showing raw \u2022 instead of bullet character
- [x] Fix Calculator "30+ real STR comps" — not always 30 comps
- [ ] No other features changed

## FIX: Coaching Survey — tracking, delivery, and legal wording (February 2026)
- [x] Save coaching survey submissions (email + answers) to database for admin tracking (was already working)
- [x] Show results/info after email submission instead of doing nothing
- [x] Change wording from "recommendations/advice" to educational information only
- [ ] No other features changed

## AUDIT: Full legal language review across entire web app (February 2026)
- [x] Scan all user-facing text for legally risky language (advice, recommend, guarantee, should, must, etc.)
- [x] Change risky wording to educational/informational framing
- [x] Ensure disclaimers are present where needed
- [x] No design or functionality changes

## UPDATE: Try asking prompts in ChatAssistant (February 2026)
- [x] Update 6 prompts to guide users through full Edge experience (Map, Search, Calculator, Funding)
- [x] No other features changed

## FIX: Try asking prompts box too tall on mobile (February 2026)
- [x] Make prompts layout more compact (2-column grid or wrap layout)

## AUDIT: Funding quiz flow — questions, scoring, results, admin recording (February 2026)
- [ ] Audit all 8 quiz questions and answer options for accuracy
- [ ] Audit scoring/matching logic for correctness
- [ ] Audit results display for educational accuracy
- [ ] Verify submissions are recorded in admin (not shown to users)
- [ ] Report findings before making changes

## FIX: Funding quiz — send real results email + wording fixes (February 2026)
- [x] Make "Email me results" button actually send a real email with quiz results
- [x] Include proper disclaimer in the email
- [x] Change "Your Top Recommendations" → "Strategies That Match Your Situation"
- [x] Change "Best Match" → "Top Match"
- [x] No other features changed

## REFINE: Chat bubble menu design (February 2026)
- [x] Clean up crowded chat bubble menu — tighter spacing, shorter text, better hierarchy
- [x] No feature changes

## DESIGN: Condense map state info card + STR status wording (February 2026)
- [x] Condense state info card on map page — reduce vertical height so less scrolling needed on mobile
- [x] Change "Restricted" STR status wording to something less discouraging (Airbnbs exist everywhere)
- [x] Keep "Friendly" as is
- [x] Update STR status labels across all pages (map, search, city, state)
- [x] No major feature changes — design/wording only

## DATA: Add missing smaller cities near key regions + national park gateways (February 2026)
- [x] Save backup checkpoint before any changes (tag: backup-before-city-expansion)
- [x] Audit existing 1,472 cities to avoid duplicates
- [x] Add missing cities near New River Gorge, WV (12 cities: Oak Hill, Summersville, Ansted, Mt Hope, Princeton, Bluefield, etc.)
- [x] Add missing cities near Greenville, SC area (17 cities: Travelers Rest, Greer, Simpsonville, Clemson, Anderson, Seneca, etc.)
- [x] Add missing cities near Gainesville, FL area (19 cities: Alachua, Newberry, High Springs, Ocala, Everglades City, etc.)
- [x] Add missing cities near Toledo, OH area (18 cities: Perrysburg, Maumee, Bowling Green, Findlay, Peninsula, etc.)
- [x] Add missing national park gateway towns across the US (100+ cities across 28 states)
- [x] Integrate all new cities in exact same data format as existing entries (167 total new cities)
- [x] Verify TypeScript compiles (0 errors), no new duplicates (0 added), all connections intact
- [x] Push to GitHub and verify deployment — total markets: 1,472 → 1,639

## Cost Control: Lower daily free preview cap (February 2026)
- [x] Change DAILY_FREE_PREVIEW_CAP from 200 to 75

## Security: Handle Stripe chargebacks and refunds (February 2026)
- [x] Add charge.refunded handler to webhook — claw back credits when refund issued
- [x] Add charge.disputed handler to webhook — claw back credits on chargeback
- [x] Log all clawbacks in credit_transactions audit trail

## Bug Fix: Pinch-to-zoom on comp map triggers heart animation (February 2026)
- [x] Fix two-finger pinch-to-zoom on calculator comp map triggering the heart/like animation
- [x] Keep double-tap-to-like working elsewhere

## Admin: API usage tracking on admin dashboard (February 2026)
- [x] Add billing cycle tracking to admin dashboard API (supabase.ts) + Billing Cycle tab UI
- [x] Show PriceLabs search usage meter, current bill, projected bill, cycle revenue, P/L
- [x] Show daily breakdown table with per-day API calls and costs, cost thresholds

## Bug Fix: Initial revenue display shows unfiltered average before bedroom filter (February 2026)
- [ ] Diagnose why initial load shows revenue across ALL bedroom sizes (91 comps) instead of filtering by property's bedroom count
- [ ] Fix initial display to pre-filter by bedroom count so revenue doesn't jump dramatically when user adjusts
- [ ] No major feature changes

## FIX: Confusing guest filter pill labels (February 2026)
- [x] Fix guest filter pills showing confusing "6+ 16" label — make labels intuitive and self-explanatory
- [x] Add 5+ BR filter pill to bedroom filters for large property analysis

## POLISH: Investor-grade comp filter UX (February 2026)
- [x] Rethink filter labels from $100K investor perspective — every label must be instantly self-explanatory
- [x] Fix count display format — parenthesized counts should read as "X of Y comps match" not random numbers
- [x] Make filter groupings logical for investment analysis (proximity → property match → amenity premium)
- [x] Ensure active/inactive states are unmistakable at a glance
- [x] Add 5+ BR filter for large property investors
- [x] No features deleted

## FIX: Sleeps 12+ guest filter pill not visible (February 2026)
- [x] Show Sleeps 12+ pill always, grayed out when 0 comps match (same pattern as amenity pills)

## CLEANUP: Remove amenity filter pills (February 2026)
- [x] Remove amenity filter pills (Hot Tub, Sauna, Pool, Game Room, Pet Friendly) — data source doesn't support them

## POLISH: Calendar estimated data disclaimer (February 2026)
- [x] Make it clearly visible that comp calendar data is estimated, not real-time Airbnb availability

## SEO: Dynamic meta tags, structured data, canonical URLs, sitemap (February 2026)
- [x] Fix stale market count in meta description (671 → dynamic count from data)
- [x] Fix stale market count in OG description (1000+ → dynamic)
- [x] Improve title tag for better keyword targeting (Airbnb, calculator, free)
- [x] Add canonical URLs to all pages
- [x] Add JSON-LD structured data (WebSite, SoftwareApplication, Organization)
- [x] Add dynamic sitemap.xml that auto-updates as cities/states are added
- [x] Make all counts dynamic so they never go stale again
- [x] No existing features changed

## SEO: Get Edge indexed by Google (February 2026)
- [ ] Check if edge.teeco.co is currently indexed by Google
- [ ] Set up Google Search Console verification
- [ ] Submit sitemap.xml to Google
- [ ] Request indexing of key pages
- [ ] Provide user with ongoing SEO roadmap

## BUG: PDF monthly forecast does not match annual revenue estimate (February 2026)
- [x] Audit PDF generation to ensure monthly forecast numbers add up to annual revenue
- [x] Ensure PDF captures most recently adjusted inputs/outputs from calculator (fixed: uses pScale ratio matching UI chart)
- [x] Make this the standard: PDF must always reflect current calculator state

## UI: City card spacing between More Markets and Ready to Invest (February 2026)
- [x] Add proper spacing (mt-4) between "More Markets in [State]" section and "Ready to Invest?" CTA
- [x] Make this the standard for all city pages

## UI: SEO/GEO text must be at very bottom of city pages (February 2026)
- [x] Move SEO/GEO summary text below breadcrumbs (Home / State / City) to very bottom
- [x] Text should be the last content before the footer
- [x] Make this the standard for all pages (city + state pages fixed, homepage already at bottom)

## AUDIT: Blog methodology accuracy and dynamic data (February 2026)
- [x] Verified blog methodology text matches actual scoring algorithm weights
- [x] Verified blog data (stats, city list) is truly dynamic from live data
- [x] Fixed discrepancies found

## ACCURACY: Cut guest capacity bonus in half (February 2026)
- [x] Found guest capacity bonus formula in calculator code
- [x] Cut the bonus multiplier in half (e.g., +24% → +12%) to prevent overestimation
- [x] Real-world validation: property sleeping 12 makes $65K/yr, calculator shows $77K — too high
- [x] Make this the standard: conservative estimates prevent bad buying decisions

## FIX: Blog methodology discrepancy — down payment (February 2026)
- [x] Blog says "25% down" but actual scoring code uses 20% down + 3% closing costs
- [x] Fixed methodology box to match real code (20% down, 3% closing costs)
- [x] Updated blog year from 2025 to 2026

## UI: Move funding CTA higher on page (February 2026)
- [x] Moved "Need Help Finding the Right Financing?" CTA section up between quiz results and AI helper
- [x] Did not change any links or content, just reposition the section
- [x] Made this the standard placement going forward

## BUG: Bottom tab bar missing on blog pages (February 2026)
- [x] Removed duplicate Footer from blog listing page (root layout already renders it)
- [x] Removed duplicate Footer from individual blog post page
- [x] Added pb-20 to blog pages so content doesn't overlap fixed tab bar
- [x] Updated blog listing + layout metadata year from 2025 to 2026
- [x] Tab bar now persists on all blog pages (root layout handles Navigation globally)
