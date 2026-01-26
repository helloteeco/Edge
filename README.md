# Edge by Teeco - STR Investment Analysis Platform

A Next.js web application for analyzing short-term rental (STR) investment opportunities across the United States. Built for deployment at https://edge.teeco.co

## Features

- **Interactive US Map**: Visual heat map showing market scores by state
- **Market Search**: Search and filter cities/states by various metrics
- **Deal Analyzer**: Calculate ROI, cash flow, and investment metrics
- **Saved Markets**: Save and track favorite investment opportunities
- **Funding Resources**: Information about STR financing options
- **AI Chat Assistant**: Get help with STR investing questions
- **Mentorship Survey**: Qualify leads for 1:1 mentorship program

## Tech Stack

- **Framework**: Next.js 13.5 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd edge-teeco-web

# Install dependencies
pnpm install

# Copy environment variables (optional)
cp .env.example .env.local

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page with US map
│   ├── search/            # Market search page
│   ├── analyzer/          # Deal analyzer tool
│   ├── saved/             # Saved markets page
│   ├── funding/           # Funding resources
│   ├── state/[id]/        # State detail page
│   └── city/[id]/         # City detail page
├── components/            # React components
│   ├── Navigation.tsx     # Bottom navigation bar
│   ├── ChatAssistant.tsx  # AI chat widget
│   ├── USMap.tsx          # Interactive US map
│   └── TopMarkets.tsx     # Top markets list
└── data/                  # Static data files
    ├── city-data.ts       # City market data
    ├── state-data.ts      # State market data
    └── helpers.ts         # Data helper functions
```

## Deploy to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/edge-teeco-web)

### Manual Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/edge-teeco-web.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Configure Domain**
   - In Vercel project settings, go to "Domains"
   - Add `edge.teeco.co`
   - Follow DNS configuration instructions:
     - Add CNAME record: `edge` → `cname.vercel-dns.com`
     - Or A record: `@` → `76.76.21.21`

4. **Environment Variables** (Optional)
   - In Vercel project settings, go to "Environment Variables"
   - Add any variables from `.env.example` as needed

### Domain Settings Checklist

| Setting | Value |
|---------|-------|
| Domain | edge.teeco.co |
| Type | CNAME |
| Target | cname.vercel-dns.com |
| SSL | Auto (Vercel handles this) |

## Key Metrics Explained

| Metric | Description |
|--------|-------------|
| **Market Score** | Overall investment score (0-100) |
| **RPR** | Revenue-to-Price Ratio (annual revenue / property price) |
| **ADR** | Average Daily Rate |
| **Occupancy** | Average occupancy rate |
| **DSI** | Debt Service Index (ability to cover mortgage) |
| **Saturation** | Market competition level |

## Customization

### Colors
Edit `tailwind.config.ts` to change the color scheme:

```typescript
colors: {
  primary: "#0D9488",      // Teal accent
  "primary-dark": "#0F766E",
  background: "#FFFFFF",
  surface: "#F5F5F5",
  foreground: "#11181C",
  muted: "#687076",
  // ...
}
```

### Data
Market data is stored in `src/data/`. To update:
1. Edit `city-data.ts` for city-level data
2. Edit `state-data.ts` for state-level data
3. Run `pnpm build` to verify changes

## License

Proprietary - Teeco LLC

## Support

For questions or issues, contact hello@teeco.co
