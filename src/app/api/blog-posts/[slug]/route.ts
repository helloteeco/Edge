import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Get a single blog post by slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const preview = url.searchParams.get("preview") === "true";
    const password = url.searchParams.get("password");
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

    let query = supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug);

    if (preview && password === ADMIN_PASSWORD) {
      // Admin preview: allow drafts
      query = query.in("status", ["published", "draft"]);
    } else {
      // Public: only published
      query = query.eq("status", "published");
    }

    const { data: post, error } = await query.single();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("[BlogPost] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
