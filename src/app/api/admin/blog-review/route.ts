import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REVIEW_EMAIL = "jeff@teeco.co";

/**
 * GET: List all draft posts pending review
 * POST: Publish or reject a post
 */

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status") || "draft";

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, category, city_ids, tags, featured_data, status, created_at, published_at, review_notified")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  return NextResponse.json({ success: true, posts: posts || [] });
}

export async function POST(request: NextRequest) {
  try {
    const password = request.nextUrl.searchParams.get("password");
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isAuthed =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      password === ADMIN_PASSWORD;

    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, post_id } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    // notify-review doesn't need a post_id
    if (action === "notify-review") {
      return await sendReviewNotifications();
    }

    // resend-notification: reset review_notified flag and re-send
    if (action === "resend-notification") {
      await supabase
        .from("blog_posts")
        .update({ review_notified: false })
        .eq("status", "draft");
      return await sendReviewNotifications();
    }

    if (!post_id) {
      return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
    }

    if (action === "publish") {
      const { data, error } = await supabase
        .from("blog_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", post_id)
        .select("id, slug, title")
        .single();

      if (error) {
        return NextResponse.json({ error: "Failed to publish post" }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "published", post: data });
    }

    if (action === "reject") {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post_id);

      if (error) {
        return NextResponse.json({ error: "Failed to reject post" }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action. Use: publish, reject, notify-review" }, { status: 400 });
  } catch (error) {
    console.error("[BlogReview] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Send review notification emails for new draft posts
 */
async function sendReviewNotifications() {
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  // Get un-notified drafts
  const { data: drafts, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, category, featured_data, created_at")
    .eq("status", "draft")
    .eq("review_notified", false)
    .order("created_at", { ascending: false });

  if (error || !drafts || drafts.length === 0) {
    return NextResponse.json({ success: true, message: "No new drafts to notify about" });
  }

  // Build email HTML
  const postsHtml = drafts.map((post) => {
    const cityName = post.featured_data?.cityName || "Unknown";
    const stateName = post.featured_data?.stateName || "";
    const score = post.featured_data?.marketScore;

    return `
      <div style="border: 1px solid #e5e3da; border-radius: 12px; padding: 20px; margin-bottom: 16px; background: #ffffff;">
        <h3 style="margin: 0 0 8px 0; color: #2b2823; font-family: Georgia, serif;">${post.title}</h3>
        <p style="margin: 0 0 12px 0; color: #787060; font-size: 14px;">${post.description}</p>
        <div style="display: flex; gap: 12px; font-size: 13px; color: #9a9488; margin-bottom: 4px;">
          <span>📍 ${cityName}, ${stateName}</span>
          ${score ? `<span>📊 Score: ${score}/100</span>` : ""}
          <span>📁 ${post.category}</span>
        </div>
        <div style="margin-top: 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right: 8px;">
              <a href="https://edge.teeco.co/blog/${post.slug}?preview=true&password=${ADMIN_PASSWORD}" 
                 style="display: inline-block; padding: 10px 18px; background: #2b2823; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
                Preview Post
              </a>
            </td>
            <td style="padding-right: 8px;">
              <a href="https://edge.teeco.co/api/admin/quick-approve?password=${ADMIN_PASSWORD}&post_id=${post.id}" 
                 style="display: inline-block; padding: 10px 18px; background: #22c55e; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
                ✅ Approve & Publish
              </a>
            </td>
            <td>
              <a href="https://edge.teeco.co/blog/review?password=${ADMIN_PASSWORD}" 
                 style="display: inline-block; padding: 10px 18px; background: #ffffff; color: #787060; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid #e5e3da;">
                View Dashboard
              </a>
            </td>
          </tr></table>
        </div>
      </div>
    `;
  }).join("");

  const emailHtml = `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="background: linear-gradient(135deg, #2b2823 0%, #3d3a34 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-family: Georgia, serif; font-size: 20px;">📝 New Blog Drafts Ready for Review</h1>
        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">${drafts.length} new post${drafts.length > 1 ? "s" : ""} generated by Edge</p>
      </div>
      <div style="padding: 24px; background: #f5f4f0;">
        ${postsHtml}
        <div style="margin-top: 20px; padding: 16px; background: rgba(43,40,35,0.04); border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #787060; font-size: 13px;">
            Tap "Approve & Publish" to publish instantly, or "View Dashboard" to manage all drafts.
          </p>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #9a9488; font-size: 12px;">
        Edge by Teeco · 30 N. Gould St. Ste R, Sheridan WY 82801
      </div>
    </div>
  `;

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Edge by Teeco <noreply@edge.teeco.co>",
        to: [REVIEW_EMAIL],
        subject: `📝 ${drafts.length} New Blog Draft${drafts.length > 1 ? "s" : ""} Ready for Review — Edge`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("[BlogReview] Resend error:", errorData);
      return NextResponse.json({ error: "Failed to send review email" }, { status: 500 });
    }

    // Mark as notified
    const ids = drafts.map((d) => d.id);
    await supabase
      .from("blog_posts")
      .update({ review_notified: true })
      .in("id", ids);

    return NextResponse.json({
      success: true,
      message: `Review notification sent to ${REVIEW_EMAIL}`,
      drafts_notified: ids.length,
    });
  } catch (error) {
    console.error("[BlogReview] Email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
