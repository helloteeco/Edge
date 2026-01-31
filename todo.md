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
- [ ] Remove search result limits (show all 269 markets, all 50 states)
- [ ] Fix Hidden Gems filter criteria to return results

## Visual Polish
- [ ] Replace emoji nav icons with clean SF Symbol-style icons
- [ ] Update map legend colors to match Teeco brand
- [ ] Fix map filter button active state styling
- [ ] Update chat button styling to match brand
