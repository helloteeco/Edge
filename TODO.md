# Edge Calculator TODO

## Navigation & CTA Fixes - Feb 3
- [x] Live market data: Hide detailed stats when state is selected (simplified to just name, grade, and link)
- [x] Find an Agent: Changed copy to "Find a Great Agent" (kept Zillow link)
- [x] Get Financing: Link to /funding (internal Funding Quiz tab)
- [x] Design & Setup: Route to Motion link (https://app.usemotion.com/meet/stephanie-tran-6vk2/aa-coaching-interview)
- [x] End of calculator CTA: Added "Not sure about monthly costs?" with chat assistant button

## Completed Previously
- [x] Fix Re-analyze button to force fresh API call (bypass cache) and use credit with warning
- [x] Fix address display to always show user's entered address, not API response market name
- [x] Implement Market Mismatch Warning system (per-user localStorage)
- [x] Implement Informed Choice System for Limited Data Locations

## Home Value Data Accuracy - Feb 22
- [x] Audit home value accuracy across city-data.ts (Vista, Fresno flagged as way off)
- [x] Research scalable/affordable sources — Zillow ZHVI free CSV is the gold standard (21K+ cities, updated monthly)
- [x] Apply Zillow ZHVI corrections to 1,364 cities in city-data.ts (Jan 2026 ZHVI data)
- [x] Recalculate dependent metrics (RPR, DSI mortgage/expenses/net, rprRating) with corrected prices
- [x] Re-sync corrected data to Supabase (all 1,626 cities verified)
