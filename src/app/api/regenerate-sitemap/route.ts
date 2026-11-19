import { NextRequest, NextResponse } from 'next/server';
import { getAllCities, getAllStates } from '@/data/helpers';
import { getSupabaseClient } from '@/lib/supabase';
import { rejectUnlessAdminPassword } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const baseUrl = 'https://edge.teeco.co';

function buildUrlEntry(loc: string, priority: string, changefreq: string, lastmod: string): string {
  return `<url>\n<loc>${loc}</loc>\n<lastmod>${lastmod}</lastmod>\n<changefreq>${changefreq}</changefreq>\n<priority>${priority}</priority>\n</url>`;
}

function wrapUrlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

/**
 * API route to regenerate all static sitemap XML files.
 * Called by the daily-blog cron after publishing a new post,
 * or manually via POST /api/regenerate-sitemap.
 * 
 * This updates the blog sitemap with any new posts and regenerates
 * the sitemap index. City/state sitemaps are also refreshed.
 * 
 * The actual XML files are served from /public as static files,
 * but since we can't write to /public at runtime on Vercel,
 * this route returns the XML content that should replace the files.
 * 
 * For Vercel: Use revalidation or ISR to keep sitemaps fresh.
 * The /api/sitemap route always returns the latest dynamic content.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const denied = rejectUnlessAdminPassword(token);
  if (denied) return denied;

  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Fetch blog posts
  let blogEntries: string[] = [];
  try {
    const supabase = getSupabaseClient();
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    // Always include the static blog post
    blogEntries.push(buildUrlEntry(`${baseUrl}/blog/best-airbnb-markets-under-300k`, '0.8', 'monthly', now));

    if (posts) {
      for (const post of posts) {
        if (post.slug !== 'best-airbnb-markets-under-300k') {
          const lastmod = post.published_at ? post.published_at.split('T')[0] : now;
          blogEntries.push(buildUrlEntry(`${baseUrl}/blog/${post.slug}`, '0.7', 'monthly', lastmod));
        }
      }
    }
  } catch (e) {
    console.error('[Regenerate Sitemap] Failed to fetch blog posts:', e);
    blogEntries = [buildUrlEntry(`${baseUrl}/blog/best-airbnb-markets-under-300k`, '0.8', 'monthly', now)];
  }

  // Count totals
  const states = getAllStates();
  const cities = getAllCities();

  return NextResponse.json({
    success: true,
    counts: {
      pages: 10,
      states: states.length,
      blog: blogEntries.length,
      cities: cities.length,
      total: 10 + states.length + blogEntries.length + cities.length,
    },
    blogSitemapXml: wrapUrlset(blogEntries),
    message: `Sitemap data generated. Blog sitemap has ${blogEntries.length} entries. Use /api/sitemap for the full dynamic sitemap.`,
  });
}
