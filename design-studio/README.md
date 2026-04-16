# Design Studio

Vacation rental interior design automation platform. Takes an 80-hour design process and compresses it into same-day deliverables.

## Features

- **Sleep Optimizer** — Algorithm maximizes guest capacity using queen-over-queen bunks, respects room dimensions, keeps primary suites comfortable
- **Room Planner** — Define rooms with dimensions, quick-setup from property details
- **Furniture Catalog** — 50+ curated items with per-room selection and real-time budget tracking
- **Mood Boards** — Visual boards with preset color palettes and style themes
- **3D Scan Viewer** — Embedded Matterport tours, Polycam scans, and Spoak project links
- **Team Chat** — Real-time messaging per project for designer collaboration
- **Activity Feed** — Track who did what on each project
- **One-Click Export** — Furniture CSV, sleep plan, and full design brief
- **AI Rendering Prompts** — Auto-generate prompts for Midjourney/DALL-E based on your design selections

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (runs on port 3100)
npm run dev
```

The app works immediately in **offline mode** (localStorage only). For multi-user features, set up Supabase below.

## Supabase Setup (for teams)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/migrations/001_initial_schema.sql`
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. In Supabase Auth settings, disable email confirmation for faster testing (optional)
5. Restart the dev server

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add your environment variables
4. Deploy

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Realtime)
- localStorage fallback for offline use

## Project Structure

```
src/
├── app/           # Pages (login, signup, dashboard, projects, settings)
├── components/    # UI components (RoomPlanner, SleepOptimizer, FurniturePicker, etc.)
├── lib/           # Core logic (types, store, sleep-optimizer, furniture-catalog, supabase)
supabase/
└── migrations/    # SQL schema with RLS policies
```

## Workflow

1. **Create Project** — Property details, client info, scan links
2. **Define Rooms** — Dimensions, features, floor assignments
3. **Optimize Sleeping** — Run the algorithm to maximize guest capacity
4. **Select Furniture** — Browse catalog, pick items per room
5. **Build Mood Board** — Color palettes and style direction
6. **Export** — Download CSV, sleep plan, and design brief
