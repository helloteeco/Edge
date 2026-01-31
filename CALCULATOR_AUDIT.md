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
