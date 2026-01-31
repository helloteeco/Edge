# Edge by Teeco: Roadmap to Compete with AirDNA & Mashvisor

**Prepared for:** Teeco Team  
**Date:** January 31, 2026  
**Author:** Manus AI

---

## Executive Summary

This document outlines a phased strategy to transform Edge from a market discovery tool into a full-featured STR investment platform capable of competing with AirDNA ($400-600/year) and Mashvisor ($480-1,200/year). The roadmap is organized into four phases spanning 6-12 months, with clear deliverables, cost estimates, and what you need to provide at each stage.

---

## Current State vs. Competitors

| Feature | Edge (Today) | AirDNA | Mashvisor |
|---------|--------------|--------|-----------|
| Market coverage | 268 cities, 50 states | All US zip codes | All US zip codes |
| Revenue estimates | Market averages + BR adjustment | Property-specific from scraped data | Property-specific from aggregated data |
| Data source | Manual research + Census | Airbnb/VRBO scraping (10+ years) | Multiple data partners |
| Comparable listings | Link to Airbnb search | In-app comp analysis | In-app comp analysis |
| Deal calculator | Full spreadsheet logic | Basic | Advanced |
| STR vs LTR comparison | Yes | No | Yes |
| Price | TBD | $400-600/year | $480-1,200/year |

**Edge's Advantages:** STR vs LTR comparison, spreadsheet-accurate calculations, clean UX, Teeco brand trust.

**Edge's Gaps:** Property-specific revenue estimates, comp data, nationwide coverage.

---

## Phase 1: Expand Market Coverage (2-4 weeks)

### Goal
Increase from 268 markets to 800+ markets covering 80% of STR-viable areas.

### What I'll Do
1. Aggregate public data sources (Census, Zillow median prices, AirDNA public reports) for top 1,000 US markets
2. Build automated data pipeline to update market stats quarterly
3. Add county-level data for rural tourism areas

### What You Need to Provide
- Nothing required (I can use public data)
- Optional: List of specific markets your students ask about most

### Cost Estimate
| Item | Cost |
|------|------|
| My time | ~8-10 hours |
| Data sources | Free (public data) |
| **Total** | **$0** |

### Deliverable
800+ markets with ADR, occupancy, and median home price data.

---

## Phase 2: Property-Specific Revenue Estimates (4-6 weeks)

### Goal
Move from market averages to property-specific estimates based on bedrooms, amenities, and location quality.

### What I'll Do
1. Build a regression model using public Airbnb listing data to estimate ADR based on:
   - Bedrooms (1-6+)
   - Bathrooms
   - Property type (house, condo, cabin)
   - Amenities (pool, hot tub, waterfront)
   - Location tier (urban, suburban, rural, resort)
2. Create "confidence bands" showing low/base/high estimates
3. Add "premium factor" calculator for unique properties

### What You Need to Provide
- Access to 50-100 real deal analyses from your students (anonymized) to validate the model
- Feedback on which property characteristics matter most in your experience

### Cost Estimate
| Item | Cost |
|------|------|
| My time | ~20-30 hours |
| Data sources | Free (public Airbnb data) |
| **Total** | **$0** |

### Deliverable
Property-specific revenue estimates with 85%+ accuracy for typical markets.

---

## Phase 3: Real Comp Data Integration (6-8 weeks)

### Goal
Show actual comparable Airbnb listings with real ADR and occupancy data.

### Options

**Option A: Mashvisor API ($200-500/month)**

| Pros | Cons |
|------|------|
| Instant access to comp data | Ongoing monthly cost |
| Reliable, legal data source | Dependent on third party |
| Quick to implement (1-2 weeks) | Limited customization |

**Option B: Build Your Own Data Pipeline ($2,000-5,000 one-time)**

| Pros | Cons |
|------|------|
| Full control over data | 4-6 weeks to build |
| No ongoing API costs | Requires maintenance |
| Can customize for your needs | Higher upfront investment |

**Option C: Partner with AirDNA (Negotiated)**

| Pros | Cons |
|------|------|
| Best data quality | Expensive ($500-2,000/month) |
| Industry standard | May have usage restrictions |
| Credibility boost | Dependent on third party |

### My Recommendation
Start with **Option A (Mashvisor API)** at $200/month. This gets you real comp data immediately. If Edge generates $1,000/year × 50 users = $50,000/year, the $2,400/year API cost is easily justified.

### What You Need to Provide
- Decision on which option to pursue
- Budget approval for API costs (if Option A or C)
- If Option B: Server/hosting for data pipeline

### Cost Estimate (Option A)
| Item | Cost |
|------|------|
| My time to integrate | ~15-20 hours |
| Mashvisor API | $200-500/month |
| **Year 1 Total** | **$2,400-6,000** |

### Deliverable
Real comparable listings with actual ADR, occupancy, and revenue data for any US address.

---

## Phase 4: Premium Features (8-12 weeks)

### Goal
Add features that justify $1,000/year pricing.

### Feature Roadmap

| Feature | Value to Users | Effort |
|---------|---------------|--------|
| **Saved deal portfolio** | Track multiple properties, compare side-by-side | 2 weeks |
| **PDF deal reports** | Professional reports for lenders/partners | 1 week |
| **Market alerts** | Email when new markets meet criteria | 2 weeks |
| **Historical trends** | Show ADR/occupancy trends over time | 3 weeks |
| **Regulation tracker** | Alert users to STR regulation changes | 2 weeks |
| **ROI projections** | 5-year cash flow projections with appreciation | 1 week |

### What You Need to Provide
- Prioritization of which features matter most to your students
- Beta testers willing to provide feedback
- Content for regulation tracker (or budget for legal research)

### Cost Estimate
| Item | Cost |
|------|------|
| My time | ~40-60 hours |
| Email service (alerts) | $20-50/month |
| PDF generation | Free (built-in) |
| **Total** | **$240-600/year** |

---

## Pricing Strategy

Based on competitor analysis and feature parity:

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Market explorer, basic calculator (limited to 3 analyses/month) |
| **Pro** | $49/month or $399/year | Unlimited analyses, comp data, saved portfolios |
| **Team** | $99/month or $799/year | Everything + PDF reports, market alerts, 5 users |

### Revenue Projections

| Scenario | Users | Revenue |
|----------|-------|---------|
| Conservative | 50 Pro users | $20,000/year |
| Moderate | 150 Pro users | $60,000/year |
| Optimistic | 300 Pro + 20 Team | $135,000/year |

---

## Total Investment Summary

| Phase | Timeline | My Time | External Costs | Total |
|-------|----------|---------|----------------|-------|
| Phase 1: Market Expansion | 2-4 weeks | 10 hours | $0 | $0 |
| Phase 2: Property Estimates | 4-6 weeks | 25 hours | $0 | $0 |
| Phase 3: Comp Data | 6-8 weeks | 20 hours | $2,400-6,000/year | $2,400-6,000 |
| Phase 4: Premium Features | 8-12 weeks | 50 hours | $240-600/year | $240-600 |
| **Total Year 1** | **6-12 months** | **~105 hours** | **$2,640-6,600** | **$2,640-6,600** |

---

## Recommended Next Steps

1. **Immediate (This Week):** I expand market coverage to 800+ markets (Phase 1) — no cost, immediate value.

2. **Next Month:** I build property-specific revenue model (Phase 2) — you provide 50 real deal analyses for validation.

3. **Month 2-3:** You decide on comp data strategy (Phase 3) — I recommend starting with Mashvisor API trial.

4. **Month 3-6:** I build premium features (Phase 4) — you prioritize which features matter most.

---

## What Makes This Winnable

Edge has three advantages competitors don't:

1. **Teeco Brand:** Your students already trust you. AirDNA and Mashvisor are tools; Edge is part of an ecosystem.

2. **STR vs LTR Comparison:** Neither AirDNA nor Mashvisor does this well. It's a genuine differentiator.

3. **Education Integration:** You can bundle Edge with courses, coaching, and community. Competitors can't.

The goal isn't to out-data AirDNA. It's to be the tool Teeco students use because it's built for how they actually analyze deals.

---

## Questions?

Let me know which phase you want to start with, and I'll begin immediately.
