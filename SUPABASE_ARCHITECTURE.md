# Edge by Teeco — Supabase Data Architecture

## Current State: 14 Tables

The Edge platform currently uses 14 Supabase tables across four functional domains: user management, property analysis, market intelligence, and lead generation. This document provides a complete audit of the existing schema, identifies gaps, and proposes a long-term caching and data lifecycle strategy.

---

## 1. Existing Table Inventory

### User & Auth Domain

| Table | Purpose | Key Columns | TTL / Lifecycle |
|-------|---------|-------------|-----------------|
| `users` | User accounts, credits, auth | email, credits, plan, last_login_at | Permanent |
| `credit_purchases` | Stripe payment records | user_email, amount, stripe_session_id | Permanent (financial records) |

### Property Analysis Domain

| Table | Purpose | Key Columns | TTL / Lifecycle |
|-------|---------|-------------|-----------------|
| `property_cache` | Full analysis results cache | address, data (jsonb), expires_at | **90-day TTL** |
| `saved_properties` | User-saved analyses | user_email, address, annual_revenue, custom_inputs | Permanent (user data) |
| `shared_analyses` | Shareable analysis links | share_id, address, analysis_data (jsonb) | Permanent (shared URLs must not break) |
| `analysis_log` | Every search logged for analytics | address, city, state, annual_revenue, adr, occupancy | Permanent (analytics) |

### Comp & Occupancy Domain

| Table | Purpose | Key Columns | TTL / Lifecycle |
|-------|---------|-------------|-----------------|
| `airbnb_comp_cache` | Cached Apify comp scrape results | cache_key, latitude, longitude, bedrooms, listings (jsonb) | **24-hour TTL** |
| `airbnb_occupancy_cache` | Calendar-based occupancy data | room_id, occupancy_rate, booked_days, peak_months | **168-hour (7-day) TTL** |
| `market_data` | Airbtics market-level data | city, state, adr, occupancy, revenue | **90-day TTL** |

### Market Intelligence Domain

| Table | Purpose | Key Columns | TTL / Lifecycle |
|-------|---------|-------------|-----------------|
| `cities` | Searchable city index | name, state, slug | Permanent (reference data) |
| `market_save_counts` | Popularity tracking (saves per market) | market_id, market_type, save_count | Permanent (analytics) |
| `limited_data_locations` | Locations with sparse data + nearest market fallback | city, state, nearest_market_city, distance_miles | Permanent (reference data) |

### Lead Generation Domain

| Table | Purpose | Key Columns | TTL / Lifecycle |
|-------|---------|-------------|-----------------|
| `quiz_leads` | Funding quiz email captures | email, quiz_answers, created_at | Permanent (marketing) |
| `coaching_leads` | Coaching interest captures | email, interest_level, created_at | Permanent (marketing) |

---

## 2. Data Classification

### Private & Valuable (Must Protect)

These tables contain proprietary data that gives Edge its competitive advantage:

- **`analysis_log`** — Every search ever run. This is a goldmine for understanding which markets are hot, what investors are looking at, and trending addresses. Over time this becomes a proprietary dataset no competitor has.
- **`airbnb_comp_cache`** — Scraped Airbnb listing data including pricing, ratings, and locations. This costs real money (Apify credits) to acquire.
- **`airbnb_occupancy_cache`** — Calendar-based occupancy data. Extremely valuable — this is the same data AirDNA charges $250/yr for.
- **`market_data`** — Airbtics market-level intelligence. Costs $0.50 per API call.

### User Data (Must Protect for Privacy)

- **`users`** — Email addresses, credit balances, subscription plans
- **`saved_properties`** — User's personal investment research
- **`credit_purchases`** — Payment records
- **`quiz_leads`** / **`coaching_leads`** — Marketing leads

### Reference Data (Low Sensitivity)

- **`cities`** — Public city data
- **`limited_data_locations`** — Nearest-market mappings
- **`market_save_counts`** — Aggregate popularity (no PII)
- **`shared_analyses`** — Intentionally public (shared links)

---

## 3. Caching Strategy & TTL Recommendations

### Current Issues

1. **Comp cache is too short (24h)** — Airbnb listings don't change that fast. A 7-day cache would save significant Apify costs while keeping data fresh enough.
2. **Occupancy cache is good (7 days)** — Calendar data changes weekly, so this is appropriate.
3. **Property cache (90 days) is appropriate** — Market conditions shift quarterly.
4. **No cache warming** — All caches are populated on-demand. Popular markets should be pre-warmed.

### Recommended TTL Updates

| Table | Current TTL | Recommended TTL | Rationale |
|-------|-------------|-----------------|-----------|
| `airbnb_comp_cache` | 24 hours | **7 days** | Listings don't change daily; saves 7x Apify costs |
| `airbnb_occupancy_cache` | 7 days | **14 days** | Calendar patterns are stable over 2 weeks |
| `property_cache` | 90 days | **90 days** (keep) | Good balance of freshness vs cost |
| `market_data` | 90 days | **90 days** (keep) | Market-level data is stable |

### Cache Warming Strategy

Create a scheduled job (Vercel Cron or external) that pre-warms caches for the top 50 most-searched addresses from `analysis_log`:

```sql
-- Top 50 most-searched addresses in last 30 days
SELECT address, city, state, COUNT(*) as search_count
FROM analysis_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY address, city, state
ORDER BY search_count DESC
LIMIT 50;
```

---

## 4. Proposed New Tables

### `comp_listings` — Normalized Comp Data (Long-Term Storage)

Instead of storing raw Apify JSON blobs in `airbnb_comp_cache`, normalize the most valuable fields into a dedicated table for long-term retention and querying.

```sql
CREATE TABLE comp_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL UNIQUE,
  name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  bedrooms INT,
  bathrooms INT,
  accommodates INT,
  property_type TEXT,
  nightly_rate NUMERIC(10,2),
  rating NUMERIC(3,2),
  review_count INT,
  superhost BOOLEAN DEFAULT FALSE,
  listing_url TEXT,
  thumbnail_url TEXT,
  amenities JSONB,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_price_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_comp_listings_location ON comp_listings (city, state);
CREATE INDEX idx_comp_listings_geo ON comp_listings USING GIST (
  ST_MakePoint(longitude, latitude)
);
CREATE INDEX idx_comp_listings_bedrooms ON comp_listings (bedrooms);
```

**Why:** Every time we scrape comps, we're paying for data we throw away after 24 hours. By normalizing into `comp_listings`, we build a permanent database of every Airbnb listing we've ever seen. Over time, this becomes a proprietary dataset worth significant value.

**Lifecycle:** Never delete. Update `last_seen_at` and `nightly_rate` on each scrape. Mark `is_active = false` if not seen in 90 days.

### `comp_price_history` — Track Pricing Over Time

```sql
CREATE TABLE comp_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES comp_listings(room_id),
  nightly_rate NUMERIC(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_room ON comp_price_history (room_id, recorded_at);
```

**Why:** Tracking how nightly rates change over time lets Edge show pricing trends — a feature AirDNA charges premium for. "This listing was $150/night last month, now $200/night" is extremely valuable intelligence.

**Lifecycle:** Keep 12 months of history. Purge records older than 1 year via scheduled cleanup.

### `occupancy_snapshots` — Historical Occupancy Tracking

```sql
CREATE TABLE occupancy_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  month TEXT NOT NULL,  -- e.g., "2026-02"
  occupancy_rate NUMERIC(5,2),
  booked_days INT,
  total_days INT,
  avg_nightly_rate NUMERIC(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, month)
);

CREATE INDEX idx_occ_snapshots_room ON occupancy_snapshots (room_id);
CREATE INDEX idx_occ_snapshots_month ON occupancy_snapshots (month);
```

**Why:** Instead of throwing away occupancy data after 14 days, store monthly snapshots. This builds a historical occupancy dataset that shows seasonal patterns over years — something only AirDNA has today.

**Lifecycle:** Permanent. This data only grows more valuable over time.

### `market_trends` — Aggregated Market Intelligence

```sql
CREATE TABLE market_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  month TEXT NOT NULL,  -- e.g., "2026-02"
  avg_adr NUMERIC(10,2),
  avg_occupancy NUMERIC(5,2),
  avg_revenue NUMERIC(12,2),
  listing_count INT,
  avg_rating NUMERIC(3,2),
  median_price NUMERIC(12,2),
  search_count INT DEFAULT 0,  -- from analysis_log
  save_count INT DEFAULT 0,    -- from market_save_counts
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city, state, month)
);

CREATE INDEX idx_market_trends_location ON market_trends (city, state);
CREATE INDEX idx_market_trends_month ON market_trends (month);
```

**Why:** Monthly aggregated market data lets Edge show "Gatlinburg ADR is up 12% vs last year" — a premium feature that competitors charge for.

**Lifecycle:** Permanent. Aggregate from `comp_listings` and `analysis_log` monthly via a cron job.

---

## 5. Data Pipeline Architecture

### On Every Analysis (Current Flow + Enhancements)

```
User enters address
  → Geocode (Nominatim)
  → Check property_cache (90-day TTL)
    → HIT: Return cached result
    → MISS:
      → Fetch Airbtics data ($0.50)
      → Fetch Apify comps (scrape)
        → UPSERT into comp_listings (permanent)     ← NEW
        → Cache in airbnb_comp_cache (7-day TTL)
      → Build analysis result
      → Cache in property_cache (90-day TTL)
      → Log in analysis_log (permanent)
      → Return result

  → Background (async, non-blocking):
    → Fetch occupancy calendars for top 5 comps
      → UPSERT into occupancy_snapshots (permanent) ← NEW
      → Cache in airbnb_occupancy_cache (14-day TTL)
    → Update comp_price_history for seen listings    ← NEW
```

### Monthly Cron Job (New)

```
Every 1st of the month:
  → Aggregate comp_listings by city/state → market_trends
  → Aggregate analysis_log search counts → market_trends.search_count
  → Aggregate market_save_counts → market_trends.save_count
  → Clean comp_price_history older than 12 months
  → Mark comp_listings not seen in 90 days as is_active = false
```

---

## 6. Storage Estimates

| Table | Growth Rate | Est. Size at 10K Users |
|-------|-------------|------------------------|
| `users` | ~10K rows | < 1 MB |
| `analysis_log` | ~500/day | ~50 MB/year |
| `comp_listings` | ~100 new/day | ~20 MB/year |
| `comp_price_history` | ~500/day | ~30 MB/year |
| `occupancy_snapshots` | ~150/month | ~5 MB/year |
| `market_trends` | ~270 rows/month | < 1 MB/year |
| `property_cache` | ~500 active | ~10 MB (self-cleaning) |
| `airbnb_comp_cache` | ~200 active | ~5 MB (self-cleaning) |

**Total estimated storage:** Under 200 MB/year — well within Supabase free tier (500 MB) for the first year, and trivial on paid plans.

---

## 7. Security Recommendations

1. **Row Level Security (RLS)** — Enable RLS on `users`, `saved_properties`, `credit_purchases`. Users should only read/write their own data.
2. **Service Role Key** — API routes should use the service role key (not anon key) for server-side operations. The anon key is currently hardcoded in the client — this should be moved to environment variables.
3. **Backup Strategy** — Enable Supabase Point-in-Time Recovery (PITR) for the database. The `analysis_log` and `comp_listings` tables are irreplaceable proprietary data.
4. **API Rate Limiting** — Add rate limiting to the analysis API to prevent abuse and protect Apify/Airbtics credit spend.

---

## 8. Implementation Priority

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| **P0** | Extend `airbnb_comp_cache` TTL from 24h to 7 days | 5 min | Saves 7x Apify costs |
| **P0** | Enable RLS on user tables | 30 min | Security |
| **P1** | Create `comp_listings` table + upsert on every scrape | 2 hours | Builds proprietary dataset |
| **P1** | Create `occupancy_snapshots` table + upsert on every scrape | 1 hour | Historical occupancy data |
| **P2** | Create `comp_price_history` + track pricing | 1 hour | Pricing trends feature |
| **P2** | Create `market_trends` + monthly cron | 3 hours | Market intelligence |
| **P3** | Cache warming for top 50 addresses | 2 hours | Faster UX for popular markets |
| **P3** | Move anon key to env vars | 30 min | Security hardening |

---

## 9. Summary

The current Supabase setup is functional but leaves valuable data on the table. Every Apify scrape produces comp data that gets thrown away after 24 hours. Every occupancy calendar scrape produces seasonal patterns that expire after 7 days. By normalizing this data into permanent tables (`comp_listings`, `occupancy_snapshots`, `comp_price_history`, `market_trends`), Edge builds a proprietary dataset that compounds in value over time — the same kind of dataset that makes AirDNA worth $500M+.

The total additional storage cost is negligible (under 200 MB/year), and the implementation effort is roughly 10 hours of development. The result is a data moat that no competitor can replicate without spending the same time and money scraping.
