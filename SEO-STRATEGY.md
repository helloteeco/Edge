# Edge by Teeco — SEO & Organic Growth Strategy

**Prepared for:** Jefferey Chheuy, Teeco  
**Date:** February 17, 2026  
**Status:** Technical SEO complete. Content & link building roadmap below.

---

## Executive Summary

Edge by Teeco has **zero Google indexing** today. Meanwhile, competitors like AirDNA, Rabbu, BNBCalc, and Awning collectively capture hundreds of thousands of monthly organic searches for keywords like "airbnb calculator," "short term rental investment," and "STR market analysis." The opportunity is significant: Edge already has 1,600+ city/state pages — a built-in programmatic SEO engine — but Google doesn't know they exist yet.

This document covers everything needed to go from invisible to ranking, broken into what's already done, what to do next, and what to do over time.

---

## Part 1: What's Already Done (Technical SEO)

These are the foundational requirements. Without them, nothing else matters. All are now complete.

| Item | Status | Details |
|------|--------|---------|
| Google Search Console verified | **Done** | HTML file verification method, property: `https://edge.teeco.co` |
| Sitemap submitted | **Done** | Dynamic `sitemap.xml` auto-generates from all city + state data files |
| robots.txt | **Done** | Points to sitemap, blocks `/api/`, `/share/`, `/admin/` |
| Meta title (homepage) | **Done** | "Edge by Teeco \| Airbnb Investment Calculator & STR Market Analysis" |
| Meta description (homepage) | **Done** | Dynamic market count (currently 1,600+), auto-updates as cities are added |
| Open Graph tags | **Done** | Title, description, image, URL — all set for social sharing |
| Canonical URLs | **Done** | Added to homepage, all city pages, all state pages |
| JSON-LD structured data | **Done** | WebSite schema (with search action), SoftwareApplication schema, Organization schema |
| Google verification file | **Done** | `googleb8147a9aff1f55c9.html` in `/public/` |

---

## Part 2: The Keyword Landscape — Where the Money Is

These are the keywords real investors search when looking for tools like Edge. The competitors ranking for them are getting tens of thousands of free visitors per month.

### Tier 1: High-Intent Tool Keywords (People Ready to Use a Calculator)

| Keyword | Monthly Search Volume (est.) | Current #1 | Difficulty |
|---------|------------------------------|------------|------------|
| airbnb calculator | 15,000–25,000 | AirDNA | High |
| airbnb revenue calculator | 5,000–10,000 | AirDNA | High |
| short term rental calculator | 3,000–6,000 | BNBCalc / Rabbu | Medium |
| str calculator | 1,000–2,000 | BNBCalc | Medium |
| airbnb investment calculator | 1,000–3,000 | AirDNA | Medium |
| airbnb estimator | 2,000–4,000 | Awning | Medium |
| vacation rental calculator | 1,000–2,000 | Various | Medium |

**Your play:** You already have the calculator. You need a dedicated landing page at `/airbnb-calculator` (not just `/calculator`) that's optimized for these exact terms. AirDNA's calculator page ranks #1 because the URL is literally `/airbnb-calculator`.

### Tier 2: Market Research Keywords (Investors Researching Where to Buy)

| Keyword Pattern | Example | Monthly Volume (per city) | Difficulty |
|----------------|---------|---------------------------|------------|
| airbnb market data [city] | "airbnb market data gatlinburg" | 100–500 | Low |
| short term rental investment [city] | "short term rental investment destin" | 50–200 | Low |
| best airbnb markets [state] | "best airbnb markets tennessee" | 200–1,000 | Medium |
| airbnb occupancy rate [city] | "airbnb occupancy rate smoky mountains" | 100–500 | Low |
| str revenue [city] | "str revenue panama city beach" | 50–200 | Low |

**Your play:** You already have 1,600+ city pages. This is your **programmatic SEO goldmine**. Each page should be optimized with a title like "Airbnb Market Data for Gatlinburg, TN — Revenue, Occupancy & Comps" instead of just the city name. This is how Zillow, AirDNA, and Rabbu capture millions of long-tail searches.

### Tier 3: Educational Keywords (Investors Learning, Not Yet Ready to Buy)

| Keyword | Monthly Volume | Content Type Needed |
|---------|---------------|-------------------|
| how to analyze a short term rental | 1,000–3,000 | Blog post / guide |
| airbnb cash on cash return | 500–1,500 | Blog post |
| is airbnb investing worth it 2026 | 500–2,000 | Blog post |
| best markets for airbnb 2026 | 2,000–5,000 | Data-driven blog post |
| str investment analysis | 500–1,000 | Blog post / guide |
| airbnb vs long term rental | 1,000–3,000 | Comparison blog post |

**Your play:** A blog at `/blog` with 10-15 high-quality articles targeting these terms. Each article funnels readers to the calculator. AirDNA's blog drives an estimated 40-60% of their organic traffic.

---

## Part 3: The 90-Day Action Plan

### Month 1: Foundation (Weeks 1-4)

**Priority 1: Fix City Page SEO (Programmatic SEO)**

This is the single highest-ROI action. You have 1,600+ pages that Google will start crawling. Each one needs:

- **Title tag:** "Airbnb Market Data for {City}, {State} — Revenue, Occupancy & Investment Analysis | Edge by Teeco"
- **Meta description:** "Analyze the {City} short-term rental market. Average Airbnb revenue: ${revenue}/yr. {X} active listings tracked. Calculator & comp data."
- **H1 heading:** "Short-Term Rental Market Analysis: {City}, {State}"
- **Unique content per page:** At least 200-300 words of city-specific text (market highlights, top neighborhoods, seasonal trends). This prevents Google from seeing 1,600 pages as "thin content" and ignoring them.

I can implement all of this programmatically — the data already exists in your city data files.

**Priority 2: Create `/airbnb-calculator` Landing Page**

A dedicated SEO landing page (separate from your existing `/calculator`) that:
- Targets "airbnb calculator" and related keywords in the title, H1, and body
- Includes a brief explanation of what the tool does (200+ words)
- Has the calculator embedded or a prominent CTA to use it
- Includes FAQ schema (JSON-LD) answering common questions like "How accurate is an Airbnb calculator?" and "How do I estimate Airbnb income?"

**Priority 3: Request Indexing of Top 20 Pages**

In Google Search Console → URL Inspection, manually request indexing for:
- Homepage
- Calculator page
- Top 10 city pages (your highest-traffic markets)
- Top 5 state pages
- Any blog posts you create

### Month 2: Content (Weeks 5-8)

**Priority 4: Launch a Blog**

Write (or have AI draft and you review) 5 cornerstone articles:

1. **"Best Airbnb Markets in 2026: Data-Driven Rankings"** — Link to your city pages. This is the #1 keyword opportunity.
2. **"How to Analyze a Short-Term Rental Investment (Step-by-Step)"** — Walk through using Edge's calculator. Screenshot-heavy.
3. **"Airbnb vs Long-Term Rental: Which Makes More Money?"** — Comparison with real numbers from your data.
4. **"Understanding Cash-on-Cash Return for Airbnb Investments"** — Educational, targets beginners.
5. **"Airbnb Calculator: How to Estimate STR Revenue Before You Buy"** — Directly targets the calculator keyword with a how-to angle.

Each article should be 1,500-2,500 words, include internal links to your calculator and city pages, and have proper heading structure (H2, H3).

**Priority 5: Internal Linking Structure**

Every city page should link to:
- The calculator (CTA: "Analyze a property in {City}")
- The parent state page
- 3-5 nearby city pages ("Also explore: {nearby cities}")
- Relevant blog posts

Every blog post should link to:
- The calculator
- 3-5 relevant city pages
- Other blog posts

This creates a web of internal links that helps Google understand your site structure and passes authority between pages.

### Month 3: Authority Building (Weeks 9-12)

**Priority 6: Google Business Profile**

Create a Google Business Profile for "Edge by Teeco" as a software company. This gives you:
- A branded knowledge panel when people search "Edge by Teeco"
- Local SEO signals
- A place for reviews

**Priority 7: Social Signals & Link Building**

Post your best content on:
- **BiggerPockets forums** — The #1 real estate investor community. Answer questions about STR analysis and link to your calculator. This is where your exact target audience lives.
- **Reddit** — r/AirBnB, r/realestateinvesting, r/ShortTermRentals. Be helpful first, link second.
- **LinkedIn** — Post data insights from your market analysis. "The top 10 STR markets by cash-on-cash return in 2026" type content.
- **X/Twitter** — Share city market data snapshots. Investors love data.
- **YouTube** — Even one video showing how to use the calculator would rank for "airbnb calculator tutorial."

**Priority 8: Get Listed on Comparison/Review Sites**

Reach out to or submit Edge to:
- Product Hunt (free launch)
- G2 / Capterra (software review sites)
- "Best Airbnb tools" roundup articles (many accept submissions)
- BiggerPockets tool directory

Each listing = a backlink = more authority in Google's eyes.

---

## Part 4: Quick Wins I Can Implement Right Now

These are code changes I can make immediately without any external accounts:

| Quick Win | Impact | Effort |
|-----------|--------|--------|
| Optimize all 1,600+ city page title tags programmatically | **High** — each page targets a unique long-tail keyword | 1 hour |
| Optimize all city page meta descriptions with dynamic revenue data | **High** — improves click-through rate from search results | 1 hour |
| Add FAQ schema to calculator page | **Medium** — can trigger rich results in Google | 30 min |
| Create `/airbnb-calculator` redirect or landing page | **High** — targets the #1 keyword | 1 hour |
| Add internal links from city pages to calculator | **Medium** — improves crawlability and user flow | 1 hour |
| Add "nearby markets" links to each city page | **Medium** — creates internal link network | 2 hours |
| Add breadcrumb schema to city/state pages | **Low-Medium** — improves search result appearance | 30 min |

---

## Part 5: What to Expect (Realistic Timeline)

| Milestone | Timeline | What You'll See |
|-----------|----------|----------------|
| Pages start getting indexed | 1-2 weeks | Search Console shows increasing page count |
| First organic impressions | 2-4 weeks | Search Console shows impressions for long-tail city keywords |
| First organic clicks | 4-8 weeks | A few clicks per day from city-specific searches |
| City pages ranking page 1 for long-tail keywords | 2-3 months | "airbnb market data {small city}" type queries |
| Blog posts ranking for educational keywords | 3-6 months | If content is published consistently |
| Calculator page competing for "airbnb calculator" | 6-12 months | Requires sustained content + backlinks |
| Meaningful organic traffic (1,000+ visits/month) | 4-8 months | Compound effect of all pages being indexed |

The key insight: **you're not competing for one keyword. You're competing with 1,600+ pages, each targeting a unique city.** That's your edge (pun intended). AirDNA has this. Rabbu has this. Now you have it too — but only if each page has unique, optimized content.

---

## Part 6: What You Need to Do (Your Action Items)

| Action | Why | Time Needed |
|--------|-----|-------------|
| Request indexing of homepage + calculator in Search Console | Fast-tracks your most important pages | 5 minutes |
| Create a Google Business Profile for Edge by Teeco | Branded search presence + reviews | 15 minutes |
| Post on BiggerPockets introducing Edge | Your #1 target audience, free, high-quality backlink | 30 minutes |
| Share the calculator on your social media | Social signals + direct traffic | 10 minutes |
| Check Search Console weekly | Monitor indexing progress, fix any errors | 5 min/week |
| Consider writing (or commissioning) 1 blog post per week | Content is the long-term growth engine | 2-3 hours/week |

---

## Part 7: The Competitive Advantage You Already Have

Most competitors charge for their data:
- **AirDNA**: $99-499/month
- **Mashvisor**: $59-299/month  
- **BNBCalc**: $39-99/month

**Edge offers free market data for 1,600+ cities and affordable per-analysis pricing.** That's a real advantage because:
1. Browsing city/state market data is genuinely free — no credit card, no signup required
2. 3 free property analyses let investors try the calculator before committing
3. Per-analysis credits are dramatically cheaper than $99-499/month subscriptions
4. Price comparison content ("AirDNA vs Edge by Teeco") naturally favors you on cost

The combination of **affordable pricing + 1,600+ free city data pages + real PriceLabs data** is genuinely differentiated. The only thing missing is Google knowing you exist — and we just fixed that.

---

## Summary

| Category | Status |
|----------|--------|
| Technical SEO (meta tags, sitemap, structured data, verification) | **Complete** |
| Google Search Console setup | **Complete** |
| Programmatic SEO (city page optimization) | **Ready to implement** |
| Content strategy (blog) | **Roadmap provided** |
| Link building & authority | **Roadmap provided** |
| Ongoing monitoring | **Your weekly 5-min check** |

The foundation is laid. Google will start crawling within days. The question now is: do you want me to implement the city page title/description optimization and the `/airbnb-calculator` landing page? Those are the two highest-impact next steps I can do right now.
