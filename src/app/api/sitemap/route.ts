import { NextRequest, NextResponse } from 'next/server';
import { getAllCities, getAllStates } from '@/data/helpers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izyfqnavncdcdwkldlih.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0';

const baseUrl = 'https://edge.teeco.co';
const CITIES_PER_SITEMAP = 500;

function buildUrlEntry(loc: string, priority: string, changefreq: string, lastmod: string): string {
  return `<url>\n<loc>${loc}</loc>\n<lastmod>${lastmod}</lastmod>\n<changefreq>${changefreq}</changefreq>\n<priority>${priority}</priority>\n</url>`;
}

function wrapUrlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

function xmlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

/**
 * Dynamic sitemap API — serves the full sitemap or sub-sitemaps.
 * 
 * Routes:
 *   GET /api/sitemap              → Sitemap index (links to sub-sitemaps)
 *   GET /api/sitemap?type=pages   → Static pages
 *   GET /api/sitemap?type=states  → All 50 state pages
 *   GET /api/sitemap?type=blog    → All blog posts (dynamic from Supabase)
 *   GET /api/sitemap?type=cities&page=1  → City pages (paginated, 500 per page)
 *   GET /api/sitemap?type=all     → Full monolithic sitemap (all URLs)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'index';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const now = new Date().toISOString().split('T')[0];

  // ── PAGES SUB-SITEMAP ──
  if (type === 'pages') {
    const entries = [
      buildUrlEntry(baseUrl, '1.0', 'weekly', now),
      buildUrlEntry(`${baseUrl}/calculator`, '0.9', 'weekly', now),
      buildUrlEntry(`${baseUrl}/airbnb-calculator`, '0.9', 'weekly', now),
      buildUrlEntry(`${baseUrl}/search`, '0.8', 'weekly', now),
      buildUrlEntry(`${baseUrl}/blog`, '0.8', 'daily', now),
      buildUrlEntry(`${baseUrl}/funding`, '0.7', 'monthly', now),
      buildUrlEntry(`${baseUrl}/terms`, '0.2', 'yearly', now),
      buildUrlEntry(`${baseUrl}/privacy`, '0.2', 'yearly', now),
      buildUrlEntry(`${baseUrl}/cookies`, '0.2', 'yearly', now),
      buildUrlEntry(`${baseUrl}/contact`, '0.3', 'yearly', now),
    ];
    return xmlResponse(wrapUrlset(entries));
  }

  // ── STATES SUB-SITEMAP ──
  if (type === 'states') {
    const states = getAllStates();
    const entries = states.map(s =>
      buildUrlEntry(`${baseUrl}/state/${s.abbreviation.toLowerCase()}`, '0.8', 'monthly', now)
    );
    return xmlResponse(wrapUrlset(entries));
  }

  // ── BLOG SUB-SITEMAP (dynamic from Supabase) ──
  if (type === 'blog') {
    const entries: string[] = [];
    // Static blog post
    entries.push(buildUrlEntry(`${baseUrl}/blog/best-airbnb-markets-under-300k`, '0.8', 'monthly', now));

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (posts) {
        for (const post of posts) {
          if (post.slug !== 'best-airbnb-markets-under-300k') {
            const lastmod = post.published_at ? post.published_at.split('T')[0] : now;
            entries.push(buildUrlEntry(`${baseUrl}/blog/${post.slug}`, '0.7', 'monthly', lastmod));
          }
        }
      }
    } catch (e) {
      console.error('[API Sitemap] Failed to fetch blog posts:', e);
    }

    return xmlResponse(wrapUrlset(entries));
  }

  // ── CITIES SUB-SITEMAP (paginated) ──
  if (type === 'cities') {
    const cities = getAllCities();
    const start = (page - 1) * CITIES_PER_SITEMAP;
    const end = start + CITIES_PER_SITEMAP;
    const slice = cities.slice(start, end);

    if (slice.length === 0) {
      return NextResponse.json({ error: 'No cities for this page' }, { status: 404 });
    }

    const entries = slice.map(city =>
      buildUrlEntry(`${baseUrl}/city/${city.id}`, '0.6', 'monthly', now)
    );
    return xmlResponse(wrapUrlset(entries));
  }

  // ── FULL MONOLITHIC SITEMAP ──
  if (type === 'all') {
    const entries: string[] = [];

    // Pages
    entries.push(buildUrlEntry(baseUrl, '1.0', 'weekly', now));
    entries.push(buildUrlEntry(`${baseUrl}/calculator`, '0.9', 'weekly', now));
    entries.push(buildUrlEntry(`${baseUrl}/airbnb-calculator`, '0.9', 'weekly', now));
    entries.push(buildUrlEntry(`${baseUrl}/search`, '0.8', 'weekly', now));
    entries.push(buildUrlEntry(`${baseUrl}/blog`, '0.8', 'daily', now));
    entries.push(buildUrlEntry(`${baseUrl}/funding`, '0.7', 'monthly', now));
    entries.push(buildUrlEntry(`${baseUrl}/terms`, '0.2', 'yearly', now));
    entries.push(buildUrlEntry(`${baseUrl}/privacy`, '0.2', 'yearly', now));
    entries.push(buildUrlEntry(`${baseUrl}/cookies`, '0.2', 'yearly', now));
    entries.push(buildUrlEntry(`${baseUrl}/contact`, '0.3', 'yearly', now));
    entries.push(buildUrlEntry(`${baseUrl}/blog/best-airbnb-markets-under-300k`, '0.8', 'monthly', now));

    // Blog
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      if (posts) {
        for (const post of posts) {
          if (post.slug !== 'best-airbnb-markets-under-300k') {
            const lastmod = post.published_at ? post.published_at.split('T')[0] : now;
            entries.push(buildUrlEntry(`${baseUrl}/blog/${post.slug}`, '0.7', 'monthly', lastmod));
          }
        }
      }
    } catch (e) {
      console.error('[API Sitemap] Failed to fetch blog posts:', e);
    }

    // States
    const states = getAllStates();
    for (const s of states) {
      entries.push(buildUrlEntry(`${baseUrl}/state/${s.abbreviation.toLowerCase()}`, '0.8', 'monthly', now));
    }

    // Cities
    const cities = getAllCities();
    for (const city of cities) {
      entries.push(buildUrlEntry(`${baseUrl}/city/${city.id}`, '0.6', 'monthly', now));
    }

    return xmlResponse(wrapUrlset(entries));
  }

  // ── SITEMAP INDEX (default) ──
  const cities = getAllCities();
  const totalCityPages = Math.ceil(cities.length / CITIES_PER_SITEMAP);

  let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  indexXml += `<sitemap>\n<loc>${baseUrl}/api/sitemap?type=pages</loc>\n<lastmod>${now}</lastmod>\n</sitemap>\n`;
  indexXml += `<sitemap>\n<loc>${baseUrl}/api/sitemap?type=states</loc>\n<lastmod>${now}</lastmod>\n</sitemap>\n`;
  indexXml += `<sitemap>\n<loc>${baseUrl}/api/sitemap?type=blog</loc>\n<lastmod>${now}</lastmod>\n</sitemap>\n`;
  for (let i = 1; i <= totalCityPages; i++) {
    indexXml += `<sitemap>\n<loc>${baseUrl}/api/sitemap?type=cities&amp;page=${i}</loc>\n<lastmod>${now}</lastmod>\n</sitemap>\n`;
  }
  indexXml += `</sitemapindex>`;

  return xmlResponse(indexXml);
}
