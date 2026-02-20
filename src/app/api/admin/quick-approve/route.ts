import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

/**
 * GET-based one-click approve endpoint for email links.
 * Publishes a draft post and redirects to a clean confirmation page.
 * 
 * Usage: /api/admin/quick-approve?password=XXX&post_id=YYY
 */
export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  const postId = request.nextUrl.searchParams.get("post_id");

  if (password !== ADMIN_PASSWORD) {
    const url = new URL("/blog/review", request.nextUrl.origin);
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  if (!postId) {
    const url = new URL("/blog/review", request.nextUrl.origin);
    url.searchParams.set("password", password);
    url.searchParams.set("error", "missing_post_id");
    return NextResponse.redirect(url);
  }

  // Check post exists and is a draft
  const { data: post, error: fetchError } = await supabase
    .from("blog_posts")
    .select("id, slug, title, status")
    .eq("id", postId)
    .single();

  if (fetchError || !post) {
    const url = new URL("/blog/review", request.nextUrl.origin);
    url.searchParams.set("password", password);
    url.searchParams.set("error", "post_not_found");
    return NextResponse.redirect(url);
  }

  if (post.status === "published") {
    // Already published — redirect to the live post
    const url = new URL(`/blog/review`, request.nextUrl.origin);
    url.searchParams.set("password", password);
    url.searchParams.set("approved", post.slug);
    url.searchParams.set("title", post.title);
    url.searchParams.set("already", "true");
    return NextResponse.redirect(url);
  }

  // Publish the post
  const { error: updateError } = await supabase
    .from("blog_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (updateError) {
    const url = new URL("/blog/review", request.nextUrl.origin);
    url.searchParams.set("password", password);
    url.searchParams.set("error", "publish_failed");
    return NextResponse.redirect(url);
  }

  // Redirect to confirmation page
  const url = new URL("/blog/review", request.nextUrl.origin);
  url.searchParams.set("password", password);
  url.searchParams.set("approved", post.slug);
  url.searchParams.set("title", post.title);
  return NextResponse.redirect(url);
}
