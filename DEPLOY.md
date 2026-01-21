# Deploy to Vercel - Step by Step Guide

This guide walks you through deploying Edge by Teeco to Vercel and configuring the custom domain `edge.teeco.co`.

## Prerequisites

- GitHub account

- Vercel account (free tier works)

- Access to DNS settings for teeco.co domain

---

## Step 1: Push Code to GitHub

```bash
# Initialize git repository (if not already done)
cd edge-teeco-web
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Edge by Teeco STR platform"

# Create new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/edge-teeco-web.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### Option A: One-Click Deploy

1. Go to your GitHub repository

1. Click the "Deploy with Vercel" button in README (if added )

1. Follow the prompts

### Option B: Manual Import

1. Go to [vercel.com/new](https://vercel.com/new)

1. Click "Import Project"

1. Select "Import Git Repository"

1. Paste your GitHub repo URL

1. Click "Import"

### Configure Build Settings

Vercel should auto-detect these, but verify:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Build Command | pnpm build or npm run build |
| Output Directory | `.next` |
| Install Command | `pnpm install` or `npm install` |

Click **Deploy** and wait for the build to complete.

---

## Step 3: Configure Custom Domain

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Domains**

1. Enter: `edge.teeco.co`

1. Click **Add**

### In Your DNS Provider (e.g., Cloudflare, GoDaddy, Namecheap):

Add a **CNAME record**:

| Type | Name | Target | TTL |
| --- | --- | --- | --- |
| CNAME | edge | cname.vercel-dns.com | Auto/3600 |

**Alternative (A Record):**

| Type | Name | Target | TTL |
| --- | --- | --- | --- |
| A | edge | 76.76.21.21 | Auto/3600 |

### Verify Domain

- Return to Vercel Domains settings

- Wait for DNS propagation (usually 1-10 minutes)

- Vercel will show a green checkmark when verified

- SSL certificate is automatically provisioned

---

## Step 4: Environment Variables (Optional)

If you need environment variables:

1. Go to **Settings** → **Environment Variables**

1. Add variables:

| Key | Value | Environment |
| --- | --- | --- |
| NEXT_PUBLIC_GA_ID | G-XXXXXXXXXX | Production |
| SENDGRID_API_KEY | SG.xxxxx | Production |

---

## Step 5: Verify Deployment

1. Visit [https://edge.teeco.co](https://edge.teeco.co)

1. Test all pages:
  - Home page with map
  - Search functionality
  - Deal analyzer
  - Saved markets
  - State/City detail pages
  - Chat assistant

---

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard

- Ensure all dependencies are in package.json

- Verify TypeScript has no errors: `pnpm build` locally

### Domain Not Working

- Wait 24-48 hours for DNS propagation

- Verify DNS records are correct

- Check for conflicting records (e.g., existing A record )

### SSL Certificate Issues

- Vercel handles SSL automatically

- If issues persist, remove and re-add the domain

---

## Updating the Site

After making changes:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Vercel automatically deploys on push to main branch.

---

## Rollback

If a deployment has issues:

1. Go to **Deployments** in Vercel dashboard

1. Find a previous working deployment

1. Click the three dots → **Promote to Production**

---

## Support

- Vercel Docs: [https://vercel.com/docs](https://vercel.com/docs)

- Next.js Docs: [https://nextjs.org/docs](https://nextjs.org/docs)

- Contact: [hello@teeco.co](mailto:hello@teeco.co)