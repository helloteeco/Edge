import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Public API: Get published blog posts
 * Used by the /blog listing page to show dynamic posts
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Also allow preview mode for admin
    const preview = url.searchParams.get("preview") === "true";
    const password = url.searchParams.get("password");
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

    let query = supabase
      .from("blog_posts")
      .select("id, slug, title, description, category, tags, featured_data, status, published_at, created_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (preview && password === ADMIN_PASSWORD) {
      // Admin preview: show drafts too
      query = query.in("status", ["published", "draft"]);
    } else {
      // Public: only published
      query = query.eq("status", "published");
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("[BlogPosts] Error:", error);
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      posts: posts || [],
    });
  } catch (error) {
    console.error("[BlogPosts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
