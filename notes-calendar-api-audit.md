# Calendar API Audit — Can We Get Real Airbnb Calendar Data?

## Option 1: Airbnb's Public Calendar API (getPublicListingCalendar)
- Endpoint exists: `https://www.airbnb.com/api/v3/PdpAvailabilityCalendar` (or v2 calendar_months)
- Takes: listing ID, month, year, count (months)
- Returns: array of calendar days with availability and price
- **No auth required** — public endpoint, same as explore_tabs we already use
- Uses the same public API key we already have (`d306zoyjsyarp7ifhu67rjxn52tv0t20`)
- This would give REAL booked/available dates per listing

## Option 2: Apify Scraper ($10/mo)
- Already existed before, was replaced for speed/cost reasons
- Would work but adds latency and cost

## Current Approach
- Estimated from review count + seasonal patterns
- Deterministic pseudo-random per date
- Directionally correct but specific dates are fabricated

## Recommendation
Option 1 is the clear winner — we can call Airbnb's public calendar endpoint directly for each comp, 
same way we already call explore_tabs. No new API key needed, no new cost.

## Concerns
- Rate limiting: fetching calendar for 8 comps = 8 API calls
- Speed: adds ~2-4 seconds to the occupancy fetch
- Airbnb could block/change the endpoint (same risk as explore_tabs)
