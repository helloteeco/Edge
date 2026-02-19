# Automated Blog + Email Newsletter System — Implementation Proposal

**For:** Edge by Teeco (edge.teeco.co)
**Date:** February 18, 2026
**Status:** Proposal — awaiting approval before any code changes

---

## The Opportunity

Edge currently has 13,381 cities across 51 states in its database, with 629 cities having full STR investment data (revenue, occupancy, ADR, cash-on-cash, market scores, regulation status). This is a goldmine for programmatic SEO — each city is a potential long-tail keyword target. Combined with 20 authenticated users and growing, there is a clear path to building an automated content engine that drives organic traffic and nurtures leads via email.

---

## Part 1: Content Strategy

### What Gets Published

The system would generate **one blog post per day**, rotating through three content categories. Each post is data-driven, pulling real numbers from your Supabase `cities` and `market_data` tables — not generic AI filler.

| Category | Frequency | Example Title | SEO Target |
|----------|-----------|---------------|------------|
| **City Deep Dive** | 3x/week | "Airbnb Investing in Gatlinburg, TN: 2026 Data & Analysis" | "[city] airbnb investment", "[city] short term rental" |
| **Thematic Roundup** | 2x/week | "Top 10 Mountain Markets for Airbnb Under $250K" | "best airbnb markets [theme]", "cheap airbnb investment cities" |
| **Educational Guide** | 2x/week | "How to Estimate Airbnb Occupancy Before You Buy" | "airbnb occupancy rate", "how to analyze short term rental" |

**City Deep Dives** are the SEO powerhouse. With 629 data-rich cities, that is over 20 months of daily content before repeating a single city. Each post would include the city's actual STR grade, average revenue, occupancy rate, ADR, median home price, regulation status, and a link to the full city page on Edge. This creates a natural internal linking structure that strengthens the entire site's SEO.

**Thematic Roundups** aggregate data across cities — "Best Airbnb Markets Near the Beach," "Top Cash-on-Cash Markets in the Southeast," "Cities Where STR Regulations Are Investor-Friendly." These target broader keywords and showcase Edge's data breadth.

**Educational Guides** build authority and trust. Topics like "STR vs LTR: When Does Airbnb Make Sense?", "Understanding Cash-on-Cash Return for Rental Properties," or "How to Read an Airbnb Market Score." These are evergreen, high-value content that positions Edge as the go-to resource for new Airbnb investors.

### Content Quality Guardrails

Every post must pass these checks before publishing:

1. **Real data only** — All numbers come from the database, never hallucinated. If a city lacks data, it does not get a deep dive.
2. **Actionable insights** — Every post ends with a concrete next step (run the calculator, explore the city page, compare markets).
3. **Internal links** — Each post links to at least 2 relevant Edge pages (city pages, calculator, other blog posts).
4. **SEO metadata** — Unique title tag, meta description, Open Graph tags, canonical URL, structured data (Article schema).
5. **Disclosure** — Posts note they are "data-powered by Edge" (not hiding the automated nature, but framing it as data journalism).

---

## Part 2: Technical Architecture

### Option A: Build-Time Generation (Recommended)

Blog posts are generated as **static Next.js pages** during a daily build, stored as markdown/MDX in the repo or as JSON in Supabase. This approach is simpler, faster, and free of runtime AI costs.

**How it works:**

```
Daily Cron (Vercel, 6 AM UTC)
    → /api/admin/generate-blog
        → Picks next topic from rotation queue
        → Queries Supabase for real market data
        → Calls AI (OpenAI/Anthropic) to write article using data + template
        → Saves to Supabase `blog_posts` table
        → Triggers Vercel redeploy (ISR revalidation)
    → New blog post is live at /blog/[slug]
```

**New database table: `blog_posts`**

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| slug | text | URL slug (e.g., "airbnb-investing-gatlinburg-tn-2026") |
| title | text | Full article title |
| description | text | Meta description (150 chars) |
| category | text | "city-dive", "roundup", or "guide" |
| content | text | Full article body (HTML or MDX) |
| city_ids | text[] | Related city IDs (for internal linking) |
| tags | text[] | SEO tags (e.g., ["tennessee", "mountain", "under-300k"]) |
| featured_image_url | text | OG image URL |
| status | text | "draft", "published", "archived" |
| published_at | timestamptz | Publication date |
| email_sent | boolean | Whether newsletter was sent for this post |
| created_at | timestamptz | Auto |

**Why this approach:** Blog posts are static content — they do not change after publishing. Generating them once and serving as static pages gives the best SEO performance (fast load times, fully rendered HTML for crawlers) and costs nothing to serve at scale.

### Option B: Fully Dynamic (Not Recommended)

Generate posts on-the-fly when users visit. This is slower, more expensive, and worse for SEO because crawlers may not wait for AI generation. Mentioning it only for completeness.

### AI Content Generation

The system would use your server's built-in LLM capability (or OpenAI API if you prefer) with carefully crafted prompts that inject real data. The prompt template for a City Deep Dive would look like:

```
Write a 1,200-word blog post about Airbnb investing in {city}, {state}.

Use ONLY these verified data points:
- STR Grade: {grade} ({market_score}/100)
- Average Monthly Revenue: ${revenue}
- Occupancy Rate: {occupancy}%
- Average Daily Rate: ${adr}
- Median Home Price: ${home_price}
- Cash-on-Cash Return: {coc}%
- Regulation Status: {regulation}
- Population: {population}

Write for someone considering their first Airbnb investment.
Tone: knowledgeable but approachable, like a friend who happens to be a data analyst.
Include: market overview, key metrics breakdown, pros/cons, who this market is best for.
End with: a call-to-action to run the numbers on Edge's calculator.
Do NOT invent any statistics not provided above.
```

This ensures every article is grounded in real data while being readable and valuable.

---

## Part 3: Email Newsletter System

### User Preferences (New `email_preferences` table)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| email | text | User email (FK to users) |
| newsletter_opted_in | boolean | Default: true for new signups |
| frequency | text | "daily", "weekly", "none" |
| interests | text[] | ["city-dives", "roundups", "guides"] |
| unsubscribe_token | text | Unique token for one-click unsubscribe |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### Opt-In Flow

When a user signs up through Edge (magic link auth), they are **opted in by default** to a weekly digest. This is CAN-SPAM compliant as long as:

1. The signup form clearly states "You'll receive weekly market insights" (or similar disclosure).
2. Every email includes a one-click unsubscribe link.
3. Unsubscribe requests are honored within 10 business days (we would honor instantly).
4. The "From" address is accurate ("Edge by Teeco <noreply@edge.teeco.co>").
5. The physical mailing address is included in the email footer.

### Opt-Out Flow

Three ways to unsubscribe:

1. **One-click unsubscribe** — Link in every email footer (`/api/email/unsubscribe?token=xxx`) that immediately sets `newsletter_opted_in = false`.
2. **Email preferences page** — `/settings/email` where logged-in users can choose frequency (daily/weekly/none) and content interests.
3. **Account settings** — Toggle in the existing user profile/account area.

### Email Sending Infrastructure

You already use **Resend** for magic link emails (from `noreply@edge.teeco.co`). The newsletter would use the same Resend account, which keeps things simple. Resend's free tier allows 3,000 emails/month, and their paid tier starts at $20/month for 50,000 emails.

**Newsletter email format:**

```
From: Edge by Teeco <insights@edge.teeco.co>
Subject: "Gatlinburg, TN: $4,200/mo Airbnb Revenue — Is It Worth It?"

[Premium HTML email with:]
- Article summary (3-4 paragraphs)
- Key data points in a visual card
- "Read Full Analysis →" button linking to the blog post
- "Run the Numbers →" button linking to the calculator
- Unsubscribe link in footer
- Physical address in footer
```

### Sending Schedule

A **Vercel cron job** runs daily at 8 AM EST:

1. Check if today's blog post has `email_sent = false`
2. Query users where `newsletter_opted_in = true` and frequency matches
3. For weekly subscribers: only send on Mondays (digest of that week's posts)
4. For daily subscribers: send each new post
5. Send via Resend API in batches (respect rate limits)
6. Mark `email_sent = true`

---

## Part 4: Implementation Phases

If you approve this plan, I would implement it in this order:

| Phase | What | Risk to Existing App | Estimated Effort |
|-------|------|---------------------|-----------------|
| 1 | Create `blog_posts` and `email_preferences` tables in Supabase | None — new tables only | Low |
| 2 | Build `/api/admin/generate-blog` endpoint (AI content generation) | None — new API route only | Medium |
| 3 | Build dynamic `/blog/[slug]` page that reads from `blog_posts` table | Low — adds a new route, existing blog post stays | Medium |
| 4 | Update `/blog` listing page to show both hardcoded + dynamic posts | Low — additive change to existing page | Low |
| 5 | Add email preference fields to users table + unsubscribe endpoint | None — new columns + new route | Low |
| 6 | Build newsletter sending cron (`/api/admin/send-newsletter`) | None — new cron job | Medium |
| 7 | Add email preferences UI to user account area | Low — additive UI | Low |
| 8 | Add Vercel cron entries for daily generation + daily sending | Low — new cron entries in vercel.json | Low |
| 9 | Generate first batch of 7 posts to seed the blog | None | Low |

**Total risk to existing app: Very low.** Every piece is additive — new tables, new routes, new pages. The only modification to existing code is updating the `/blog` listing page to also show dynamic posts alongside the existing hardcoded one.

---

## Part 5: Costs

| Item | Cost | Notes |
|------|------|-------|
| AI generation (1 post/day) | ~$0.05-0.15/day | GPT-4o or Claude, ~1,200 words per post |
| Resend emails | Free (under 3,000/mo) | Paid tier $20/mo if you exceed |
| Vercel cron | Free | Included in Vercel plan |
| Supabase storage | Free | Well within free tier limits |
| **Total monthly** | **~$2-5/mo** (AI only) | Until email volume exceeds 3K/mo |

---

## Questions for You Before I Start

1. **AI provider preference?** Your server already has built-in LLM access. Should I use that, or do you prefer OpenAI/Anthropic directly? (Built-in is simplest, zero additional API keys.)

2. **Email frequency default?** I suggested weekly for new signups. Would you prefer daily, or let users choose during signup?

3. **Content tone?** The existing blog post is data-heavy and analytical. Should the daily posts match that style, or be slightly more conversational/educational?

4. **Physical address for CAN-SPAM?** Every marketing email legally requires a physical mailing address in the footer. What address should I use?

5. **Start with city deep dives first?** I'd recommend seeding the first 7 posts (one week) as city deep dives for the top-graded markets, then adding roundups and guides in week 2. Sound good?

6. **Should the blog generation run automatically from day one, or would you prefer to review/approve each post before it goes live?** (I can build a "draft → review → publish" workflow if you want editorial control.)
