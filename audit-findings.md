# Calculator Audit Findings

## 1. PDF Export - Missing Sections

Currently includes:
- Header with address, bedrooms, bathrooms
- Estimated Annual Revenue (highlighted)
- Market Metrics (ADR, Occupancy, Active Listings)
- Revenue Percentiles (25th, 50th, 75th)
- Investment Analysis table
- Comparable Listings table

**Missing from PDF:**
- Monthly Revenue Forecast chart/data
- Recommended Amenities section
- Startup Costs breakdown
- Monthly Operating Expenses breakdown

## 2. Teeco Setup Services Pricing

Location: `calculateSetupCost()` function at line 520
Current: `propertySqft * 20` ($20/sqft)
Change to: `propertySqft * 13` ($13/sqft)

## 3. Misc Expenses Field

Need to add:
- State variable: `const [miscMonthly, setMiscMonthly] = useState(0);`
- Add to `calculateMonthlyExpenses()` function
- Add input field in the Monthly Operating Expenses section

## 4. Comp vs Revenue Discrepancy Analysis

**Root Cause Identified:**

The annual revenue estimate ($53,995) comes from Airbtics' **50th percentile** calculation across ALL listings in the market that match the bedroom count.

The comparables shown are **individual listings** with their actual LTM (Last Twelve Months) revenue. These specific listings may be:
- Underperforming properties
- Properties with lower occupancy
- Properties with fewer amenities
- Properties that haven't been optimized

The percentile data represents the statistical distribution of ALL listings, while comps are just a sample of nearby properties.

**This is actually correct behavior** - the comps show what existing properties are earning, while the percentile shows what's possible in the market.

## 5. Guest Count Weighting

Current filtering:
- Bedrooms: within ±1 of selected
- Distance: within 25 miles
- Revenue: must have revenue data

**Proposed enhancement:**
Add `accommodates` (guest count) to the Airbtics API request and use it for:
1. More accurate percentile estimates (larger capacity = more revenue)
2. Better comp filtering (match similar guest capacity)

The Airbtics API already accepts `accommodates` parameter - we just need to:
1. Add guest count selector to the UI
2. Pass it to the API
3. Weight comps by guest count similarity
