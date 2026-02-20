import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RESEND_API_KEY = process.env.RESEND_API_KEY;

/**
 * Twice-weekly newsletter sender
 * Sends recent published blog posts to opted-in subscribers
 * 
 * Triggered by Vercel cron every Tuesday and Thursday at 10am EST (15:00 UTC)
 */
async function handleSendNewsletter(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const password = request.nextUrl.searchParams.get("password");
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

    const isAuthed =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      password === ADMIN_PASSWORD;

    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    // Get published posts that haven't been emailed yet
    const { data: posts, error: postsError } = await supabase
      .from("blog_posts")
      .select("id, slug, title, description, category, featured_data, published_at")
      .eq("status", "published")
      .eq("email_sent", false)
      .order("published_at", { ascending: false })
      .limit(5);

    if (postsError || !posts || posts.length === 0) {
      return NextResponse.json({ success: true, message: "No new posts to send" });
    }

    // Get opted-in subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("email_preferences")
      .select("email, unsubscribe_token, frequency, interests")
      .eq("newsletter_opted_in", true)
      .neq("frequency", "none");

    if (subError || !subscribers || subscribers.length === 0) {
      return NextResponse.json({ success: true, message: "No subscribers to send to" });
    }

    // Build newsletter HTML
    const postsHtml = posts.map((post) => {
      const fd = post.featured_data || {};
      const categoryEmoji = post.category === "city-dive" ? "🏙️" : post.category === "roundup" ? "📊" : "📚";
      const categoryLabel = post.category === "city-dive" ? "City Deep Dive" : post.category === "roundup" ? "Market Roundup" : "Investment Guide";

      return `
        <div style="border: 1px solid #e5e3da; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span>${categoryEmoji}</span>
            <span style="background: #2b2823; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${categoryLabel}</span>
          </div>
          <h3 style="margin: 0 0 8px 0; color: #2b2823; font-family: Georgia, serif; font-size: 18px;">
            <a href="https://edge.teeco.co/blog/${post.slug}" style="color: #2b2823; text-decoration: none;">${post.title}</a>
          </h3>
          <p style="margin: 0 0 12px 0; color: #787060; font-size: 14px; line-height: 1.5;">${post.description}</p>
          ${fd.marketScore ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #9a9488;">Edge Score: ${fd.marketScore}/100${fd.strMonthlyRevenue ? ` · $${Number(fd.strMonthlyRevenue).toLocaleString()}/mo revenue` : ""}</p>` : ""}
          <a href="https://edge.teeco.co/blog/${post.slug}" 
             style="display: inline-block; padding: 8px 20px; background: #2b2823; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
            Read Article →
          </a>
        </div>
      `;
    }).join("");

    const postTitles = posts.map(p => p.title).join(", ");
    const subject = posts.length === 1
      ? `${posts[0].title} — Edge Market Insights`
      : `${posts.length} New Market Insights — Edge by Teeco`;

    // Send to each subscriber individually (for unique unsubscribe links)
    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      const emailHtml = `
        <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="background: linear-gradient(135deg, #2b2823 0%, #3d3a34 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-family: Georgia, serif; font-size: 22px;">Edge Market Insights</h1>
            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">New research from Edge by Teeco</p>
          </div>
          <div style="padding: 24px; background: #f5f4f0;">
            ${postsHtml}
            <div style="margin-top: 16px; text-align: center;">
              <a href="https://edge.teeco.co/blog" style="color: #2b2823; font-size: 14px; font-weight: 600;">View all articles on Edge →</a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; border-top: 1px solid #e5e3da;">
            <p style="margin: 0 0 8px 0; color: #9a9488; font-size: 12px;">
              You're receiving this because you signed up for Edge by Teeco market insights.
            </p>
            <p style="margin: 0; color: #9a9488; font-size: 12px;">
              <a href="https://edge.teeco.co/unsubscribe?token=${sub.unsubscribe_token}" style="color: #787060; text-decoration: underline;">Unsubscribe</a>
              · Edge by Teeco · 30 N. Gould St. Ste R, Sheridan WY 82801
            </p>
          </div>
        </div>
      `;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Edge by Teeco <noreply@edge.teeco.co>",
            to: [sub.email],
            subject,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          sent++;
        } else {
          failed++;
          const err = await emailRes.json();
          console.error(`[Newsletter] Failed to send to ${sub.email}:`, err);
        }

        // Rate limit: small delay between sends
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        failed++;
        console.error(`[Newsletter] Error sending to ${sub.email}:`, err);
      }
    }

    // Mark posts as emailed
    const postIds = posts.map((p) => p.id);
    await supabase
      .from("blog_posts")
      .update({ email_sent: true })
      .in("id", postIds);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      posts_included: posts.length,
      subscribers_total: subscribers.length,
    });
  } catch (error) {
    console.error("[Newsletter] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleSendNewsletter(request);
}

export async function POST(request: NextRequest) {
  return handleSendNewsletter(request);
}
