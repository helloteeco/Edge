# Edge by Teeco - Web App Updates

## 1. Address Calculator (Rabbu-Style)
- [x] Build address input page where user can paste full address
- [x] Parse address to identify City, County, State
- [x] Return STR score and supporting metrics
- [x] Clean, simple UX similar to Rabbu

## 2. Fix Primary CTA Button
- [x] Fix "Ready to Start Investing?" button
- [x] Redirect to https://teeco.co/fund-your-financial-freedom

## 3. Metrics & Ranking System Overhaul
- [x] Audit current scoring logic
- [x] Fix inconsistency (e.g., SC shows "Strong Buy" but 80% F-rank markets)
- [x] Ensure state scores reflect underlying market scores

## 4. Normalize & Verify All Market Data
- [x] Audit all metrics across cities, counties, states
- [x] Normalize values consistently
- [x] Ensure ranks (A-F) are mathematically consistent

## 5. Redefine STR Scoring Model
- [x] Cash-on-cash return: Strong if 20%+ (35 points)
- [x] Appreciation: Assume ~3% annual (5 points)
- [x] Legality: STR-friendly scoring (15 points)
- [x] Landlord friendliness: State-level factor (10 points)
- [x] Affordability: Target $250K or less home price (25 points)
- [x] Low saturation bonus (10 points)
- [x] Document weight for each metric
- [x] Bias toward rural, affordable, self-managed STRs

## Scoring Model Documentation

### Total: 100 Points

| Metric | Weight | Criteria |
|--------|--------|----------|
| Cash-on-Cash (RPR) | 35 pts | 20%+ = 35, 18%= 30, 15%= 25, 12%= 18, 10%= 12, 8%= 6, <8%= 0 |
| Affordability | 25 pts | <$150K = 25, <$200K = 22, <$250K = 18, <$300K = 12, <$400K = 6, >$400K = 0 |
| STR Legality | 15 pts | Legal = 15, Restricted = 5 |
| Landlord Friendly | 10 pts | Based on state landlord-friendliness index |
| Low Saturation | 10 pts | <2/1K = 10, <3/1K = 8, <4/1K = 6, <5/1K = 4, <7/1K = 2, >7/1K = 0 |
| Appreciation | 5 pts | >5% = 5, >3% = 4, >2% = 3, >0% = 2, <0% = 0 |

### Grade Thresholds
- A+ = 85+ points
- A = 75-84 points
- B+ = 65-74 points
- B = 55-64 points
- C = 45-54 points
- D = 35-44 points
- F = <35 points

### State Scoring
State grades are calculated as the average score of the top 50% performing cities in that state.
This prevents a few poor markets from unfairly penalizing an otherwise strong state.


# Add Markets and Replace RPR with Cash on Cash

- [x] Copy all cities/counties from mobile app to web app
- [x] Replace Revenue to Price Ratio (RPR) with Cash on Cash return
- [x] Update scoring model to use Cash on Cash
- [x] Update all UI components to display Cash on Cash

# Brand Redesign & Scoring Fix (January 2026)

## Market Headroom Scoring Fix
- [x] Fix Market Headroom scoring for small tourism towns (e.g., Berlin, OH)
- [x] Add population-adjusted scoring that considers tourism context
- [x] Ensure high listings-per-thousand doesn't unfairly penalize tourism destinations

## Teeco Brand Redesign
- [x] Update tailwind.config.js with strict Teeco brand colors only
- [x] Update globals.css with Teeco brand styling
- [x] Redesign homepage with premium Teeco branding
- [x] Update Navigation component with Teeco brand colors
- [x] Update TopMarkets component with Teeco brand styling
- [x] Update search page with Teeco brand styling
- [x] Update calculator page with Teeco brand styling
- [x] Update city detail page with Teeco brand styling
- [x] Update state page with Teeco brand styling
- [x] Update saved page with Teeco brand styling
- [x] Update funding page with Teeco brand styling
- [x] Update analyzer page with Teeco brand styling
- [x] Update ChatAssistant component with Teeco brand colors
- [x] Update USMap component with Teeco brand colors

## Teeco Brand Colors (Strict Palette)
- Black: #000000 (headlines, primary text)
- Gray: #2b2823 (dark accents, buttons)
- Mocha: #787060 (secondary text, muted elements)
- Cream: #e5e3da (backgrounds, cards)
- White: #ffffff (clean backgrounds)
- Border: #d8d6cd (subtle borders)


# Option B - Polish Launch (January 2026)

## Critical Fixes
- [x] Remove search result limits (now showing all 318 results: 50 states + 268 cities)
- [x] Fix Hidden Gems filter criteria (now returns 32 high-quality markets)

## Visual Polish
- [x] Replace emoji nav icons with clean SVG icons (Map, Search, Calculator, Saved, Funding)
- [x] Update map legend colors (B/B+ changed from black to teal for clearer hierarchy)
- [x] Fix map filter button active state styling (consistent Teeco brand)
- [x] Update chat button styling (changed to mocha #787060)
- [x] Remove emoji icons from search filter buttons (clean text-only labels)


# Comparable Airbnb Listings Feature (January 2026)

## Feature: View Comparable Listings
- [x] Add "View Comparable Listings on Airbnb" button to city detail pages
- [x] Add "View Comparable Listings on Airbnb" button to address calculator results
- [x] Link opens Airbnb search for that city/location (uses Airbnb coral #FF5A5F)
- [x] Clean button styling consistent with Teeco brand


# Edge Deal Calculator Rebuild (January 2026)

## Module 1: Address Input
- [x] Clean address input with auto-parse
- [x] Market lookup from existing city data (268 markets)
- [x] State-level fallback for unknown cities (50 states)

## Module 2: Property Profile (Editable)
- [x] Bedrooms, bathrooms, property type dropdowns
- [x] Purchase price (editable)
- [x] All auto-filled values are editable

## Module 3: Market Benchmark + Cohort Controls
- [x] Show market ADR & occupancy (low/base/high)
- [x] Editable benchmark values
- [x] Research Comps on Airbnb link
- [x] City Data badge for transparency

## Module 4: Assumptions Sliders (6 max)
- [x] ADR adjustment slider (±20%)
- [x] Occupancy adjustment slider (±20%)
- [x] Cleaning cost per stay ($50-$300)
- [x] Management fee % (0-30%)
- [x] Down payment % (10-50%)
- [x] Interest rate (4-10%)
- [x] Seasonality patterns (Year-Round, Summer Peak, Winter Peak)

## Module 5: Outputs + STR vs LTR Compare
- [x] Annual gross revenue with low/base/high ranges
- [x] NOI and monthly cash flow
- [x] Cash-on-cash return with range
- [x] LTR comparison panel with editable inputs
- [x] Break-even occupancy calculation
- [x] STR wins/LTR wins verdict

## Technical Requirements
- [x] Pure calculation functions in deal-calculator.ts
- [x] Deterministic low/base/high ranges
- [x] Client-side state only (no backend)
- [x] Confidence scoring (HIGH/MEDIUM/LOW) based on data source


# Calculator Rebuild - Match Teeco Spreadsheet (January 2026)

## Verified Formulas to Implement
- [ ] Mortgage P&I: M = P × [r(1+r)^n] / [(1+r)^n - 1]
- [ ] PMI: ~0.5-1% of loan annually when down payment < 20%
- [ ] Gross Income: ADR × Occupancy % × 30 days
- [ ] NOI: Gross Income - Operating Expenses
- [ ] Cap Rate: NOI / Purchase Price
- [ ] Cash Flow: NOI - Debt Service
- [ ] Cash on Cash: Annual Cash Flow / Total Cash Invested
- [ ] Payback Period: Total Invested / Monthly Cash Flow

## Startup Costs Section (Total Cash to Close)
- [ ] Down Payment ($)
- [ ] Closing Costs (% or $)
- [ ] Reno/Rehab budget
- [ ] Furnishings ($15-20/sq ft estimate)
- [ ] Amenities budget
- [ ] Holding Costs
- [ ] Legal fees

## Detailed Expenses (15+ line items)
- [ ] CapEx Reserve (5% of gross)
- [ ] Electric
- [ ] Water
- [ ] Gas
- [ ] Trash
- [ ] Internet
- [ ] Lawn Care
- [ ] House Supplies
- [ ] Pest Control
- [ ] Rental Management Software
- [ ] Property Tax (auto-estimate 1.5% of price)
- [ ] Home Insurance
- [ ] Management Fee %
- [ ] Cleaning (per stay or monthly)
- [ ] Business License

## Validation & Warnings
- [ ] Flag property tax if >3% of home value
- [ ] Show red indicators for negative cash flow
- [ ] Show yellow indicators for marginal deals (<5% CoC)
- [ ] Validate all inputs are reasonable

## UX Features
- [ ] Quick Mode (simple inputs) vs Detailed Mode (all fields)
- [ ] Collapsible expense sections
- [ ] Auto-calculate furnishing estimate from sq ft
- [ ] Real-time calculation updates


# Calculator UX Improvements - Make Worth $1,000/year

## User Feedback Issues
- [ ] Remove cap rate (focus on single family, cash-on-cash only)
- [ ] Market benchmark section is confusing and hard to use
- [ ] ADR adjustment slider is confusing - users don't know what premium to set
- [ ] Need more accurate data based on address, bedrooms, bathrooms, guest capacity
- [ ] Focus on showing clear annual revenue estimate

## Research Tasks
- [ ] Research AirDNA, Mashvisor, Rabbu pricing and features
- [ ] Identify what makes $1,000/year tools valuable
- [ ] Document competitor feature comparison


# Simplified Calculator Build

## Remove
- [ ] Remove cap rate display
- [ ] Remove ADR adjustment slider
- [ ] Remove occupancy adjustment slider
- [ ] Remove Low/Base/High benchmark inputs
- [ ] Remove confusing market benchmark section

## Add/Change
- [ ] Auto-calculate ADR based on bedrooms (1BR=base, 2BR=+20%, 3BR=+35%, 4BR=+50%, 5BR+=+65%)
- [ ] Auto-calculate occupancy from market data
- [ ] Show big "Estimated Annual Revenue" number at top
- [ ] Add clear methodology section explaining calculations
- [ ] Keep cash-on-cash as hero metric
- [ ] Keep STR vs LTR comparison
- [ ] Keep all expense inputs from spreadsheet


## Fix Inflated Revenue Values (Airbtics Integration)
- [x] Remove RURAL_CORRECTION multipliers from Mashvisor API route
- [x] Add Airbtics API integration as primary data source
- [x] Update calculator to use Airbtics with Mashvisor fallback
- [x] Test Oak Hill, WV shows ~$66k/year (not $610k) ✅ Now showing $66,388/yr
- [x] Verify all revenue calculations are accurate
- [x] Fix x12 multiplication bug in percentile display
- [x] Add Nominatim geocoding for address-to-coordinates conversion


## Calculator Optimization for Investor-Ready Reports (February 2026)
- [x] Fix NaN values in Monthly Revenue Forecast chart
- [x] Fix NaN values in Monthly Revenue Projection grid
- [x] Upgrade to Airbtics report/all ($0.50) for 30+ comparable listings
- [x] Fix Airbtics data extraction (kpis structure, comps field names)
- [x] Add city-level geocoding fallback for addresses not found
- [x] Add PDF download button for investor reports
- [x] Ensure all data fields populate correctly
- [x] Make calculator reliable for $250K investment decisions


## Calculator Improvements (February 2026 - Part 2)
- [ ] Fix seasonality to show realistic monthly variation (not flat $9k/month)
- [ ] Use Airbtics monthly_occupancy data when available for accurate seasonal patterns
- [ ] Improve comp selection - prioritize closest within 25mi radius
- [ ] Filter comps by similar bedroom/bath count
- [ ] Show top 5 most relevant comps
- [ ] Ensure comp links are clickable and go to Airbnb listings
- [x] Add recommended amenities section for reaching 90th percentile

## PDF Export Redesign (February 2026)
- [x] Redesign PDF with professional investment report layout
- [x] Add executive summary with key investment highlights
- [x] Include guest count/sleeps info in PDF header
- [x] Add startup costs breakdown to PDF
- [x] Fix monthly revenue to show seasonal variation (not flat)
- [x] Add visual hierarchy and better formatting
- [x] Remove unnecessary elements (timestamps, about:blank)

## Final Calculator Enhancements (February 2026)
- [x] Fix Y-axis scaling on monthly revenue chart to show seasonal variation
- [x] Add save report functionality to Saved section
- [x] Add notes feature for saved properties
- [x] Add email report option
- [x] Add ROI timeline chart (10-year projection)
- [x] Update PDF with ROI timeline and all helpful info for sharing


## User Authentication & Email Collection (February 2026)
- [x] Create users database/storage for email collection
- [x] Store user emails when they sign in via magic link
- [x] Track signup date and last login for each user
- [x] Create admin API to export email list
- [x] Link saved properties to user accounts by email
- [x] Sync saved properties across devices for logged-in users
- [x] Add 60-minute cache expiration for recent searches (API compliance)
- [x] Update PDF export with new Teeco logo


## Issues to Fix (February 2026)
- [x] Magic link emails not actually being sent (need email service integration) - Resend integrated
- [x] edge.teeco.co site not loading - site is working fine

- [x] Fix magic link click to auto-login users (not require re-signin) - Using JWT tokens
- [x] Load saved data tied to user email after login
- [x] Make calculator accessible after magic link verification


## Resources Section Update (February 2026)
- [x] Replace Funding section with Resources section
- [x] Add "Watch Teeco's Free Training" link to Circle community
- [x] Add Airbnb Agent resource
- [x] Add Airbnb Lender resource
- [x] Add Airbnb Designer resource
- [x] Add Airbnb Set Up Team resource
- [x] Add Airbnb Cohost resource


## Bug Fix - Magic Link Verification (February 2026)
- [x] Fix magic link verification error - removed file system dependency for Vercel serverless

- [x] Fix auth persistence - check localStorage directly in handleAnalyzeClick


## Amenities Improvements (February 2026)
- [ ] Rename "Premium Amenities" to "Upgrades & Amenities"
- [ ] Expand amenities search to 25-mile radius
- [ ] Show percentage impact of each amenity on nightly rates
- [ ] Categorize amenities by impact (Must Have, Revenue Boosters, Nice to Have)


## Legend Fixes (February 2026)
- [ ] Fix STR Grade legend: Replace teal with light green for B/B+ grades
- [ ] Fix Home Prices legend order: Show from worst (>$450K red) to best (<$200K green)
- [ ] Ensure consistent green gradient: emerald-400 (light) → emerald-600 (dark) for best values
- [x] Verify all 8 map tabs use same color scale pattern
- [x] Fix teal color issue - changed from green to emerald palette for true green appearance


## Build Warnings & Mobile UX (February 2026)
- [x] Fix Image optimization warnings - replace <img> with Next.js <Image /> in:
  - [x] src/app/calculator/page.tsx (lines 1607, 3445)
  - [x] src/app/page.tsx (line 116)
  - [x] src/app/privacy/page.tsx (line 15)
  - [x] src/app/terms/page.tsx (line 15)
  - [x] src/components/AuthModal.tsx (line 96)
- [ ] Fix city search dynamic route error
- [x] Add touch-swipe gestures for mobile map tab navigation

## Tab Order UX Improvement (February 2026)
- [x] Reorder map tabs: STR Grade first, then familiar → technical
  - New order: STR Grade → Home Prices → Appreciation → Days on Market → Price Cuts % → Migration → Inventory Level → Inventory Growth


## Double-Tap Save Feature (February 2026)
- [x] Add double-tap gesture detection on city/state cards
- [x] Show Instagram-style heart animation when item is saved
- [x] Add floating heart button that scrolls with card content
- [x] Subtle feedback to confirm save action


## Save Limit Feature (February 2026)
- [ ] Implement 10-save limit for cities and states combined
- [ ] Show friendly notification when limit is reached
- [ ] Display save count on floating button (e.g., "7/10")
- [ ] Heart animation shakes when at limit instead of popping
