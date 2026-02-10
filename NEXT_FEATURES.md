# Edge: Next 5 Features — Architecture & Implementation Guide

**Updated:** February 10, 2026  
**Purpose:** Forward-looking architecture so each feature can be built incrementally without refactoring existing code.

---

## Feature 1: PDF Deal Reports (Export & Share)

**Why next:** Users already save analyses and share OG preview cards. The natural next step is a downloadable PDF report they can hand to lenders, partners, or keep for records. This is the #1 feature that justifies a paid tier — AirDNA charges $20/report.

**What it does:**
- One-tap "Export PDF" button on any completed analysis
- Professional report with: property photo (from Zillow/Google), revenue projections, comp breakdown, expense assumptions, CoC return, and STR grade
- Branded with Edge/Teeco logo and user's name
- Shareable via link (already have `shared_analyses` table)

**Data already available:**
- `AnalysisResult` object has all financial data
- `ComparableListing[]` has comp details
- `shared_analyses` Supabase table stores shareable snapshots
- OG card generation logic in `/api/og/route.tsx` can be adapted

**Implementation approach:**
- Use `@react-pdf/renderer` (React-based PDF generation) or `puppeteer` (HTML-to-PDF) on the server
- Create `/api/report/route.ts` that accepts an analysis ID or address, fetches from `property_cache` or `shared_analyses`, and returns a PDF stream
- Add "Export PDF" button to the calculator results section (next to Save Report and Share buttons)

**Supabase schema (new table):**
```sql
CREATE TABLE generated_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email),
  address TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  custom_inputs JSONB,           -- user's expense overrides, purchase price, etc.
  pdf_url TEXT,                   -- S3/Supabase Storage URL of generated PDF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  report_type TEXT DEFAULT 'standard'  -- 'standard', 'detailed', 'lender'
);
```

**Files to create:**
- `src/app/api/report/route.ts` — PDF generation endpoint
- `src/components/ReportTemplate.tsx` — React component for PDF layout
- `src/lib/pdf-generator.ts` — Shared PDF generation logic

---

## Feature 2: Side-by-Side Property Comparison

**Why next:** Users save multiple analyses (up to 10 reports). The obvious next action is comparing 2-3 properties head-to-head to decide which deal to pursue. This is a core AirDNA Pro feature.

**What it does:**
- Select 2-3 saved reports from the Saved tab
- Side-by-side comparison table: revenue, CoC, expenses, comp quality, amenity gaps, STR grade
- Visual "winner" indicators per metric
- Exportable as PDF (builds on Feature 1)

**Data already available:**
- `savedReports` state in `/saved/page.tsx` has all report data
- Each report links to full `cachedResult` in localStorage or `property_cache`
- `CompAmenityComparison` component already does amenity comparison across comps — can be adapted for cross-property comparison

**Implementation approach:**
- Add multi-select mode to Saved Reports tab (checkbox on each card)
- New route `/compare` that receives selected report IDs via query params
- Comparison grid component that normalizes metrics across properties

**Files to create:**
- `src/app/compare/page.tsx` — Comparison page
- `src/components/PropertyComparisonGrid.tsx` — Side-by-side grid
- Add multi-select UI to `src/app/saved/page.tsx`

**Supabase schema (no new tables needed):**
- Reads from existing `saved_properties` and `property_cache`
- Optionally log comparisons to `analysis_log` for analytics

---

## Feature 3: Market Alerts & Watchlist

**Why next:** Users bookmark markets (cities/states) in the Saved tab. The next step is proactive notifications when market conditions change — a new listing hits the market, occupancy trends shift, or a regulation change occurs.

**What it does:**
- "Watch" button on market pages (cities, states)
- Weekly email digest: "Your watched markets this week"
- Alerts for: significant ADR changes (>10%), new comp listings in saved property areas, occupancy trend shifts
- In-app notification badge on Saved tab

**Data already available:**
- `market_save_counts` tracks which markets users save
- `market_data` has historical market stats
- `analysis_log` tracks all searches (can detect trending markets)
- User email in `users` table

**Implementation approach:**
- Create a cron job (Vercel Cron or external) that runs weekly
- Compare current market data vs 7-day-ago snapshot
- Send email via Resend/SendGrid to users who have that market saved
- Store alert preferences in user profile

**Supabase schema (new tables):**
```sql
CREATE TABLE market_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES users(email),
  market_id TEXT NOT NULL,        -- city slug or state code
  market_type TEXT NOT NULL,      -- 'city' or 'state'
  alert_types TEXT[] DEFAULT ARRAY['adr_change', 'occupancy_change'],
  frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE market_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  adr NUMERIC,
  occupancy NUMERIC,
  revenue NUMERIC,
  listing_count INTEGER,
  data JSONB,                     -- full snapshot for detailed comparison
  UNIQUE(market_id, snapshot_date)
);
```

**Files to create:**
- `src/app/api/alerts/route.ts` — Alert management CRUD
- `src/app/api/cron/market-digest/route.ts` — Weekly digest cron
- `src/lib/email-templates.ts` — Email template for market digest
- `src/components/MarketWatchButton.tsx` — Watch/unwatch toggle

---

## Feature 4: Historical Trend Charts (Revenue & Occupancy Over Time)

**Why next:** The calculator already shows `revenueChange` and `occupancyChange` as text labels ("up", "down", "stable"). Users want to see the actual trend line — is this market heating up or cooling down? AirDNA's biggest selling point is 5+ years of historical data.

**What it does:**
- Interactive line chart on calculator results page showing 12-24 months of ADR, occupancy, and revenue trends
- Seasonal pattern visualization (which months are peak/off-peak)
- Year-over-year comparison
- Market-level trends on city/state pages

**Data already available:**
- `AnalysisResult.historical` array already has `{ year, month, occupancy, adr, revenue }` data from Mashvisor API
- `market_data` table has market-level stats
- Mashvisor API returns historical data in the neighborhood endpoint

**Implementation approach:**
- Use `recharts` or `chart.js` (lightweight, React-friendly)
- Add collapsible "Market Trends" section to calculator results
- Pull historical data from `AnalysisResult.historical` (already fetched)
- For city/state pages, aggregate from `market_data` or make dedicated API call

**Files to create:**
- `src/components/TrendChart.tsx` — Reusable trend line chart
- `src/components/SeasonalityChart.tsx` — Monthly heatmap/bar chart
- Add chart section to calculator results in `src/app/calculator/page.tsx`

**Supabase schema (extend existing):**
```sql
-- Add to market_data table or create dedicated table
CREATE TABLE market_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id TEXT NOT NULL,        -- city slug
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  adr NUMERIC,
  occupancy NUMERIC,
  revenue NUMERIC,
  listing_count INTEGER,
  data_source TEXT DEFAULT 'mashvisor',
  UNIQUE(market_id, year, month)
);
```

---

## Feature 5: Regulation & Zoning Checker

**Why next:** The #1 risk in STR investing is buying a property where short-term rentals are banned or heavily restricted. No competitor does this well. This would be a genuine differentiator that justifies premium pricing.

**What it does:**
- Automatic regulation check when analyzing a property
- Traffic-light indicator: Green (STR-friendly), Yellow (restrictions apply), Red (banned/moratorium)
- Details: permit requirements, occupancy limits, tax rates, HOA restrictions
- Link to local ordinance source
- Community-sourced updates (users can flag regulation changes)

**Data sources:**
- Granicus/MuniCode for municipal codes (free to scrape)
- AirDNA's regulation database (if API available)
- Manual curation for top 100 markets initially
- User-submitted updates over time

**Implementation approach:**
- Start with a curated database of top 100 markets' regulation status
- Display as a badge/section on calculator results
- Allow authenticated users to submit regulation updates (moderated)
- Gradually expand coverage through community contributions

**Supabase schema (new tables):**
```sql
CREATE TABLE str_regulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  county TEXT,
  status TEXT NOT NULL,           -- 'allowed', 'restricted', 'banned', 'unknown'
  permit_required BOOLEAN,
  permit_cost NUMERIC,
  occupancy_tax_rate NUMERIC,
  max_nights_per_year INTEGER,    -- null = unlimited
  owner_occupied_only BOOLEAN DEFAULT FALSE,
  zoning_restrictions TEXT,
  source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  last_verified_by TEXT,          -- user email or 'system'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city, state)
);

CREATE TABLE regulation_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  regulation_id UUID REFERENCES str_regulations(id),
  submitted_by TEXT REFERENCES users(email),
  change_description TEXT NOT NULL,
  source_url TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to create:**
- `src/app/api/regulations/route.ts` — Regulation lookup API
- `src/components/RegulationBadge.tsx` — Traffic-light badge component
- `src/components/RegulationDetails.tsx` — Expandable regulation info
- `src/app/admin/regulations/page.tsx` — Admin panel for managing regulations

---

## Implementation Priority & Dependencies

| # | Feature | Effort | Revenue Impact | Dependencies |
|---|---------|--------|----------------|-------------|
| 1 | PDF Deal Reports | 1 week | High (paywall feature) | None |
| 2 | Side-by-Side Comparison | 1 week | Medium (retention) | None |
| 3 | Market Alerts | 2 weeks | High (engagement + email capture) | Email service (Resend) |
| 4 | Historical Trend Charts | 1 week | Medium (data depth) | None (data already exists) |
| 5 | Regulation Checker | 3 weeks | Very High (unique differentiator) | Manual data curation |

**Recommended order:** 1 → 4 → 2 → 3 → 5

Feature 1 (PDF) is the fastest to ship and most directly monetizable. Feature 4 (trends) uses data that's already being fetched but not displayed. Feature 2 (comparison) builds on the saved reports infrastructure. Feature 3 (alerts) requires email infrastructure. Feature 5 (regulations) requires the most manual data work but has the highest long-term differentiation value.

---

## Shared Infrastructure Needed

These utilities would benefit multiple features above:

1. **Email service integration** — Needed for alerts (Feature 3) and could enhance auth flow. Recommend Resend ($0 for 3,000 emails/month).

2. **PDF generation pipeline** — Needed for Feature 1 and Feature 2. Set up once, reuse for both.

3. **Cron job infrastructure** — Needed for Feature 3 (market digests) and Feature 5 (regulation verification). Vercel Cron supports up to daily jobs on Pro plan.

4. **Chart library** — Needed for Feature 4 and useful for Feature 2 comparison visualizations. Recommend `recharts` (React-native, lightweight).
