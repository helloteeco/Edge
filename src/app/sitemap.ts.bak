import { MetadataRoute } from 'next';
import { getAllCities, getAllStates } from '@/data/helpers';
import { createClient } from '@supabase/supabase-js';

// Supabase client for fetching published blog posts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izyfqnavncdcdwkldlih.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eWZxbmF2bmNkY2R3a2xkbGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTI2NzAsImV4cCI6MjA4NTYyODY3MH0.aPzW5ZcbUP6PEJwxK3sEBtNc2SaZj5kDeyUNIAcn6n0';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://edge.teeco.co';
  const now = new Date();

  // ═══════════════════════════════════════════════════════════
  // STATIC PAGES — Core pages with highest priority
  // ═══════════════════════════════════════════════════════════
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/calculator`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/airbnb-calculator`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/funding`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    // Static blog post (hardcoded)
    { url: `${baseUrl}/blog/best-airbnb-markets-under-300k`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  // ═══════════════════════════════════════════════════════════
  // DYNAMIC BLOG POSTS — Fetched from Supabase
  // ═══════════════════════════════════════════════════════════
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (posts) {
      blogPages = posts
        .filter(p => p.slug !== 'best-airbnb-markets-under-300k') // Avoid duplicate with static
        .map(post => ({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: post.published_at ? new Date(post.published_at) : now,
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        }));
    }
  } catch (e) {
    // Silently fail — static sitemap still works without dynamic blog posts
    console.error('[Sitemap] Failed to fetch blog posts:', e);
  }

  // ═══════════════════════════════════════════════════════════
  // STATE PAGES — 50 states, high priority for geo-targeting
  // ═══════════════════════════════════════════════════════════
  const states = getAllStates();
  const statePages: MetadataRoute.Sitemap = states.map((state) => ({
    url: `${baseUrl}/state/${state.abbreviation.toLowerCase()}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8, // Increased from 0.7 — state pages are important geo landing pages
  }));

  // ═══════════════════════════════════════════════════════════
  // CITY PAGES — 1,611 cities, the core of the site
  // ═══════════════════════════════════════════════════════════
  const cities = getAllCities();
  const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${baseUrl}/city/${city.id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages, ...statePages, ...cityPages];
}
