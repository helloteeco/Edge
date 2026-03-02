import { NextRequest, NextResponse } from 'next/server';

/**
 * IndexNow API route — Notifies search engines (Bing, Yandex, Naver, Seznam)
 * about new or updated URLs for instant indexing.
 * 
 * Usage: POST /api/indexnow with body { urls: ["https://edge.teeco.co/blog/..."] }
 * Called automatically after blog post approval/publication.
 * 
 * IndexNow key is served at /indexnow-key.txt (see public directory)
 */

const INDEXNOW_KEY = 'edge-teeco-indexnow-2026';
const HOST = 'https://edge.teeco.co';

export async function POST(request: NextRequest) {
  try {
    // Verify internal call (simple auth check)
    const authHeader = request.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const urls: string[] = body.urls || [];

    if (urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    // Submit to IndexNow (Bing endpoint — shared with Yandex, Naver, Seznam)
    const indexNowPayload = {
      host: 'edge.teeco.co',
      key: INDEXNOW_KEY,
      keyLocation: `${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000), // IndexNow limit: 10,000 URLs per request
    };

    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(indexNowPayload),
    });

    // Also submit sitemap ping to Google (free, no API key needed)
    const googlePing = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(`${HOST}/sitemap.xml`)}`,
      { method: 'GET' }
    ).catch(() => null);

    return NextResponse.json({
      success: true,
      indexNowStatus: response.status,
      googlePingStatus: googlePing?.status || 'skipped',
      urlsSubmitted: urls.length,
    });
  } catch (error) {
    console.error('[IndexNow] Error:', error);
    return NextResponse.json({ error: 'Failed to submit URLs' }, { status: 500 });
  }
}

// GET endpoint to verify the key
export async function GET() {
  return new NextResponse(INDEXNOW_KEY, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
