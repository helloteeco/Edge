# Calculator Audit Findings

## Date: Feb 1, 2026

## Test Configuration
- Property: 123 Main St, Gatlinburg, TN 37738
- Bedrooms: 3
- Bathrooms: 2
- Sleeps: 12 guests

## What's Working Well ✅

### 1. Revenue Display
- **Estimated Annual Revenue**: $95,462
- **Monthly**: $7,955/month
- **Guest capacity bonus**: +36% (sleeps 12 vs standard 6) - SHOWING CORRECTLY

### 2. Percentile Selection
- Average: $70,193/yr
- 75th %: $106,047/yr
- 90th %: $140,729/yr

### 3. Monthly Revenue Forecast Chart
- Y-axis labels showing ($3k to $11k range)
- Clear seasonal variation visible
- Peak months (Jul, Aug): $10k
- Low months (Jan, Feb): $6k
- Color coding: Green (Peak), Blue (Average), Orange (Low)

### 4. Monthly Revenue Projection Grid
- All 12 months displayed with values
- Jan: $5,556, Feb: $5,935, Mar: $7,198, Apr: $7,955
- May: $8,713, Jun: $9,597, Jul: $9,976, Aug: $9,597
- Sep: $7,955, Oct: $7,198, Nov: $6,314, Dec: $6,819
- **Projected Annual Total**: $95,462 ✓ (matches header)

### 5. Comparable Listings
- Top 5 listings showing with clickable links
- Shows: name, beds, baths, type, annual revenue, nightly rate, occupancy, rating

### 6. Market Metrics
- Avg Nightly Rate: $144
- Occupancy: 46%
- Active Listings: 5

## Areas to Review Further
- PDF download functionality
- Startup costs section
- Investment analysis calculations
- Recommended amenities section
