# Edge Deal Calculator - Audit & Recommendations

## ChatGPT Suggestions Assessment

### What's Good (Keep)

| Suggestion | Why It Works |
|------------|--------------|
| 5 stacked modules on single page | Clean UX, no navigation friction |
| Low/base/high ranges | Honest about uncertainty, builds trust |
| All auto-filled values editable | Users hate locked fields |
| STR vs LTR comparison | Answers the real investor question |
| Seasonality multipliers | Critical for accuracy in vacation markets |
| Confidence scoring (rule-based) | Transparent, not fake AI |
| Pure functions + unit tests | Maintainable, debuggable |

### What Needs Adjustment

| Suggestion | Problem | My Recommendation |
|------------|---------|-------------------|
| 12-month seasonality array | Too complex for first input | Default to 3 presets: "Year-round", "Summer peak", "Winter peak" with option to customize |
| Cohort radius controls (3/5/10/15 mi) | We don't have geo data | Replace with "Similar markets" toggle using our existing state/county data |
| Mock API layer | Adds complexity | Use static lookup from existing city-data.ts instead |
| 6 sliders max | Good constraint, but which 6? | ADR, Occupancy, Down Payment %, Interest Rate, Management %, Cleaning Cost |
| PMI optional | Edge case, adds clutter | Skip for v1, most STR investors put 20%+ down |
| Break-even occupancy | Great feature | Keep, simple formula: (LTR profit + expenses) / (ADR * 365) |

### What's Missing (I'll Add)

| Feature | Why It Matters |
|---------|----------------|
| Property tax estimate | Major expense, can't ignore |
| Insurance estimate | Required for accurate NOI |
| CapEx reserve | Responsible investing practice |
| Clear "How we calculated this" tooltips | Builds trust, educates users |
| Mobile-first layout | Your users are on phones |

---

## My Recommended Architecture

### State Schema (Simplified)

```typescript
interface DealCalculatorState {
  // Module 1: Address
  address: string;
  marketId: string | null;
  
  // Module 2: Property Profile
  property: {
    bedrooms: number;
    bathrooms: number;
    type: 'house' | 'condo' | 'cabin' | 'apartment';
    purchasePrice: number;
    isAutoFilled: boolean;
  };
  
  // Module 3: Market Benchmark
  benchmark: {
    adr: { low: number; base: number; high: number };
    occupancy: { low: number; base: number; high: number };
    source: 'market_data' | 'user_estimate';
  };
  
  // Module 4: Assumptions
  assumptions: {
    adrAdjustment: number; // -20% to +20%
    occupancyAdjustment: number; // -20% to +20%
    downPaymentPct: number; // 10-100%
    interestRate: number; // 4-10%
    managementPct: number; // 0-30%
    cleaningCost: number; // per stay
    avgStayLength: number; // nights
    seasonality: 'year_round' | 'summer_peak' | 'winter_peak' | 'custom';
  };
  
  // Module 5: LTR Comparison
  ltrComparison: {
    monthlyRent: number;
    vacancyPct: number;
    repairsPct: number;
    managementPct: number;
  };
}
```

### Calculation Engine (Key Formulas)

**Revenue:**
```
Annual Revenue = ADR × Occupancy × 365 × Seasonality Factor
```

**Expenses:**
```
Mortgage = standard amortization formula
Property Tax = Purchase Price × 1.2% (default, editable)
Insurance = Purchase Price × 0.5% (default, editable)
Management = Revenue × Management %
Cleaning = (365 / Avg Stay Length) × Cleaning Cost
Utilities = $200/month default (editable)
CapEx Reserve = Revenue × 5%
```

**Returns:**
```
NOI = Revenue - All Expenses (excluding mortgage principal)
Cash Flow = NOI - Mortgage Payment
Cash-on-Cash = (Annual Cash Flow / Total Cash Invested) × 100
```

**Break-even Occupancy:**
```
Required Occupancy = (LTR Annual Profit + STR Expenses) / (ADR × 365)
```

---

## UX Decisions

1. **Progressive disclosure** - Start with address, reveal modules as user progresses
2. **Sticky outputs** - Keep key numbers visible while scrolling
3. **Instant updates** - No "Calculate" button, everything updates on input change
4. **Mobile-first** - Stack everything vertically, large touch targets
5. **Honest defaults** - Conservative estimates, not optimistic projections

---

## What I Will NOT Build

- Fake "AI confidence" scores
- Cohort radius controls (we don't have the data)
- Complex seasonality editor (v2 feature)
- Authentication or saved deals (out of scope)
- Backend API calls (all client-side)

---

## Estimated Build Time

| Component | Time |
|-----------|------|
| Calculation engine + tests | 1 hour |
| UI modules (5 total) | 2 hours |
| STR vs LTR comparison | 30 min |
| Assumptions drawer | 30 min |
| Polish + testing | 1 hour |
| **Total** | **5 hours** |

Ready to proceed when you approve.


---

# Competitive Audit: Edge vs AirDNA Rentalizer vs Rabbu Calculator (Feb 2026)

## Feature-by-Feature Comparison

| Feature | AirDNA | Rabbu | Edge (Current) | Priority |
|---------|--------|-------|-----------------|----------|
| **Comp Map (interactive)** | ✅ Scrollable, zoomable | ✅ Map with pins | ✅ Just added (Leaflet) | ✅ Done |
| **Comp bed/bath/guest matching** | ✅ Primary filter + relevance index | ✅ Bedroom filter | ✅ Just improved (relevance score) | ✅ Done |
| **Click comp → Airbnb** | ✅ | ✅ | ✅ (map + list) | ✅ Done |
| **Custom comp selection** | ✅ Add/remove from map | ✅ Include/exclude toggle | ❌ Not yet | 🔴 HIGH |
| **Confidence score** | ✅ High/Medium/Low | ❌ | ❌ | 🟡 MEDIUM |
| **Comp calendar view** | ❌ | ✅ (occupancy + pricing by day) | ❌ | 🟡 MEDIUM |
| **Seasonality chart** | ✅ | ✅ (with 25th/75th percentile) | ✅ (monthly forecast) | ✅ Done |
| **Percentile toggles** | ✅ | ✅ (25th/75th) | ✅ (25th/50th/75th/90th) | ✅ Done |
| **Revenue breakdown** | Annual, Monthly, ADR | ADR, Occ, RevPAN | Annual, Monthly, ADR, Occ, RevPAN | ✅ Done |
| **ROI calculator** | NOI, Cap Rate | Cap Rate, CoC, Gross Yield | CoC, Net Income (no Cap Rate) | ✅ Good |
| **Arbitrage mode** | ❌ | ❌ | ✅ Unique advantage | ✅ Edge wins |
| **AI analysis** | ❌ | ❌ | ✅ Unique advantage | ✅ Edge wins |
| **Deal score/grade** | ❌ | ❌ | ✅ (A+ to F) | ✅ Edge wins |
| **Amenity recommendations** | ❌ | ❌ | ✅ (market-specific) | ✅ Edge wins |
| **Startup costs** | ❌ | ❌ | ✅ (Teeco integration) | ✅ Edge wins |
| **Next steps checklist** | ❌ | ❌ | ✅ | ✅ Edge wins |
| **Share preview cards** | ❌ | ❌ | ✅ (OG image) | ✅ Edge wins |
| **Weekly data refresh** | Monthly | Weekly | On-demand (Apify scrape) | ✅ Edge wins |
| **Comp photos** | ✅ (thumbnails) | ✅ | ❌ (images in data but not shown) | 🔴 HIGH |
| **Comp count shown** | 20-50+ | 10-30 | Up to 30 | ✅ Comparable |

---

## What Edge Already Does BETTER Than Both

1. **Arbitrage Calculator** — Neither AirDNA nor Rabbu offer rental arbitrage analysis. Edge has a full arbitrage mode with rent input, upfront costs, and payback period. This is a major differentiator.

2. **AI-Powered Analysis** — The "Get AI Analysis" feature provides personalized investment insights that neither competitor offers. This is like getting a $500 consultation for free.

3. **Deal Score (A+ to F)** — Neither competitor grades deals. Edge's scoring system gives instant clarity on deal quality.

4. **Amenity Revenue Boost** — Market-specific amenity recommendations with estimated revenue impact (e.g., "Hot Tub +22%"). Neither competitor does this.

5. **Startup Cost Estimation** — Built-in Teeco design/setup cost calculator. Unique to Edge.

6. **Share Preview Cards** — Beautiful OG image cards for sharing via text/social. Neither competitor has this.

7. **On-Demand Fresh Data** — Apify scrapes live Airbnb data per search vs. AirDNA's monthly refresh.

---

## What Needs Improvement to Match/Beat Competitors

### 🔴 HIGH PRIORITY

1. **Show Comp Photos in List**
   - AirDNA and Rabbu both show thumbnail images for each comp
   - Edge already scrapes `image` data from Apify but doesn't display it
   - **Action**: Add thumbnail images to the comp list items
   - **Effort**: Small (data already exists)

2. **Custom Comp Selection (Include/Exclude)**
   - Both AirDNA and Rabbu let users toggle individual comps on/off
   - When a comp is excluded, the revenue estimate recalculates
   - **Action**: Add checkboxes to comp list + map markers; recalculate averages on toggle
   - **Effort**: Medium (needs state management + recalculation logic)

3. **Comp Data Enrichment via Apify Individual Scraping**
   - Currently comps come from search results only (limited data)
   - AirDNA shows per-comp: actual revenue, actual occupancy, actual ADR (from calendar data)
   - **Action**: For top 10 comps, run a secondary Apify scrape on individual listing pages to get calendar/pricing data
   - **Effort**: Medium-High (additional Apify cost per analysis, ~$0.01-0.05 per listing)
   - **Alternative**: Use the review count heuristic (already implemented) but label it as "estimated"

4. **Occupancy Estimation Accuracy**
   - Current: Uses review count heuristic (reviews/year × 3 = bookings)
   - AirDNA: Uses actual calendar scraping for real occupancy
   - Rabbu: Uses forward-looking calendar data (next 30 days)
   - **Action**: Scrape individual listing calendars via Apify for top comps to get real blocked/available dates
   - **Effort**: High (requires per-listing scraping)
   - **Alternative**: Label current estimates clearly as "estimated based on review velocity" and add a confidence indicator

### 🟡 MEDIUM PRIORITY

5. **Confidence Score**
   - AirDNA shows High/Medium/Low confidence based on comp quality
   - **Action**: Calculate from: number of comps, bedroom match %, distance spread, review count
   - **Effort**: Small (pure frontend calculation)

6. **Comp Calendar View**
   - Rabbu shows a calendar view per comp with pricing and availability
   - **Action**: Would require per-listing calendar scraping (expensive)
   - **Alternative**: Show "booking pattern" estimate based on seasonality data
   - **Effort**: High if real data, Low if estimated

7. **Forward-Looking Revenue (Next 30 Days)**
   - Rabbu shows ADR and occupancy for the next 30 days specifically
   - **Action**: Use Apify check-in/check-out date parameters to get forward pricing
   - **Effort**: Medium (already supported in the scrape URL, just need to parse differently)

### 🟢 LOW PRIORITY (Nice to Have)

8. **Comp Amenity Comparison** — Show which amenities each comp has. Data already partially scraped.

9. **Revenue Growth Trend** — Show YoY revenue change for the market.

10. **Neighborhood Walkability/Transit Scores** — Integrate Walk Score API (free tier: 5,000/day).

---

## Recommended Action Plan

### Phase 1: Quick Wins (can do now)
1. ✅ Show comp photos in the listing cards (data already exists)
2. ✅ Add confidence score indicator based on comp quality
3. ✅ Label estimated vs. actual data clearly

### Phase 2: Competitive Parity (4-8 hours)
4. Custom comp selection (include/exclude toggle)
5. Forward-looking 30-day revenue estimate
6. Comp amenity display

### Phase 3: Competitive Advantage (Future)
7. Per-listing calendar scraping for real occupancy
8. Revenue growth trends
9. Walk Score integration

---

## Summary

Edge already wins on: Arbitrage mode, AI analysis, deal scoring, amenity recommendations, share cards, startup costs, fresh data.

Edge needs to match on: Comp photos, custom comp selection, confidence scoring, occupancy accuracy.

Edge can leapfrog with: Per-listing calendar data (real occupancy), forward-looking pricing, and the existing AI analysis that neither competitor has.
