import { NextResponse } from 'next/server';
import { getAllCities, getAllStates } from '@/data/helpers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izyfqnavncdcdwkldlih.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0';

/**
 * API route that serves the sitemap as clean XML.
 * This bypasses Next.js page routing and security headers that may
 * interfere with Google Search Console's sitemap fetcher.
 * 
 * Submit https://edge.teeco.co/api/sitemap in Google Search Console.
 */
export async function GET() {
  const baseUrl = 'https://edge.teeco.co';
  const now = new Date().toISOString();

  // Static pages
  const staticUrls = [
    { loc: baseUrl, priority: '1.0', changefreq: 'weekly' },
    { loc: `${baseUrl}/calculator`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${baseUrl}/airbnb-calculator`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${baseUrl}/search`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/blog`, priority: '0.8', changefreq: 'daily' },
    { loc: `${baseUrl}/funding`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${baseUrl}/terms`, priority: '0.2', changefreq: 'yearly' },
    { loc: `${baseUrl}/privacy`, priority: '0.2', changefreq: 'yearly' },
    { loc: `${baseUrl}/cookies`, priority: '0.2', changefreq: 'yearly' },
    { loc: `${baseUrl}/contact`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${baseUrl}/blog/best-airbnb-markets-under-300k`, priority: '0.8', changefreq: 'monthly' },
  ];

  // Dynamic blog posts from Supabase
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
          staticUrls.push({
            loc: `${baseUrl}/blog/${post.slug}`,
            priority: '0.7',
            changefreq: 'monthly',
          });
        }
      }
    }
  } catch (e) {
    console.error('[API Sitemap] Failed to fetch blog posts:', e);
  }

  // State pages
  const states = getAllStates();
  const stateUrls = states.map((state) => ({
    loc: `${baseUrl}/state/${state.abbreviation.toLowerCase()}`,
    priority: '0.8',
    changefreq: 'monthly',
  }));

  // City pages
  const cities = getAllCities();
  const cityUrls = cities.map((city) => ({
    loc: `${baseUrl}/city/${city.id}`,
    priority: '0.6',
    changefreq: 'monthly',
  }));

  const allUrls = [...staticUrls, ...stateUrls, ...cityUrls];

  // Build XML manually for maximum compatibility
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `<url>
<loc>${u.loc}</loc>
<lastmod>${now}</lastmod>
<changefreq>${u.changefreq}</changefreq>
<priority>${u.priority}</priority>
</url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      // Explicitly remove security headers that might confuse Google's fetcher
      'X-Robots-Tag': 'noindex', // Sitemap itself shouldn't be indexed, only its URLs
    },
  });
}
