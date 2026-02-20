"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  city_ids: string[];
  tags: string[];
  featured_data: {
    cityName?: string;
    stateName?: string;
    stateCode?: string;
    marketScore?: number;
    avgAdr?: number;
    occupancy?: number;
    strMonthlyRevenue?: number;
  };
  status: string;
  created_at: string;
  published_at: string | null;
  review_notified: boolean;
}

export default function BlogReviewPage() {
  const searchParams = useSearchParams();
  const password = searchParams.get("password") || "";
  const approvedSlug = searchParams.get("approved") || "";
  const approvedTitle = searchParams.get("title") || "";
  const alreadyPublished = searchParams.get("already") === "true";
  const errorParam = searchParams.get("error") || "";

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"draft" | "published" | "rejected">("draft");

  // Handle redirect params from quick-approve
  useEffect(() => {
    if (approvedSlug) {
      if (alreadyPublished) {
        setMessage({
          type: "success",
          text: `"${approvedTitle || approvedSlug}" was already published.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `"${approvedTitle || approvedSlug}" is now live on the blog!`,
        });
      }
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        unauthorized: "Invalid password. Access denied.",
        missing_post_id: "No post ID provided.",
        post_not_found: "Post not found. It may have been deleted.",
        publish_failed: "Failed to publish the post. Please try again from the dashboard.",
      };
      setMessage({
        type: "error",
        text: errorMessages[errorParam] || "An error occurred.",
      });
    }
  }, [approvedSlug, approvedTitle, alreadyPublished, errorParam]);

  const fetchPosts = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog-review?password=${password}&status=${status}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to fetch posts" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to server" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (password) {
      fetchPosts(filter);
    } else {
      setLoading(false);
      if (!errorParam) {
        setMessage({ type: "error", text: "Missing password parameter" });
      }
    }
  }, [password, filter]);

  const handleAction = async (postId: string, action: "publish" | "reject") => {
    setActionLoading(postId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/blog-review?password=${password}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, post_id: postId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: action === "publish"
            ? `"${data.post?.title || "Post"}" is now live on the blog!`
            : "Post rejected and archived.",
        });
        // Remove from list
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        setMessage({ type: "error", text: data.error || "Action failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to server" });
    }
    setActionLoading(null);
  };

  if (!password && !errorParam) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf9f6", fontFamily: "Georgia, serif" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h1 style={{ color: "#2b2823", fontSize: "24px", marginBottom: "12px" }}>Access Denied</h1>
          <p style={{ color: "#787060" }}>A valid password is required to access blog review.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf9f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)", padding: "24px 20px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "14px" }}>
            ← Back to Edge
          </Link>
          <h1 style={{ margin: "12px 0 4px 0", color: "#ffffff", fontFamily: "Georgia, serif", fontSize: "24px" }}>
            Blog Review Dashboard
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
            Review, approve, or reject AI-generated blog posts before they go live.
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 20px 0" }}>

        {/* Status message */}
        {message && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "12px",
              marginBottom: "20px",
              background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
              color: message.type === "success" ? "#166534" : "#991b1b",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            <div>{message.text}</div>
            {message.type === "success" && approvedSlug && (
              <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a
                  href={`/blog/${approvedSlug}`}
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    background: "#166534",
                    color: "#ffffff",
                    textDecoration: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  View Live Post →
                </a>
                <a
                  href={`/blog`}
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    background: "#ffffff",
                    color: "#166534",
                    textDecoration: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #bbf7d0",
                  }}
                >
                  View Blog Listing
                </a>
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        {password && (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {(["draft", "published", "rejected"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: filter === status ? "2px solid #2b2823" : "1px solid #e5e3da",
                    background: filter === status ? "#2b2823" : "#ffffff",
                    color: filter === status ? "#ffffff" : "#787060",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {status === "draft" ? `📝 Drafts` : status === "published" ? `✅ Published` : `❌ Rejected`}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9a9488" }}>
                <p style={{ fontSize: "16px" }}>Loading posts...</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && posts.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9a9488" }}>
                <p style={{ fontSize: "40px", marginBottom: "12px" }}>
                  {filter === "draft" ? "📭" : filter === "published" ? "📰" : "🗑️"}
                </p>
                <p style={{ fontSize: "16px", fontWeight: 500 }}>
                  No {filter} posts
                </p>
                <p style={{ fontSize: "14px", marginTop: "4px" }}>
                  {filter === "draft" ? "All caught up! New drafts generate daily at 3am EST." : ""}
                </p>
              </div>
            )}

            {/* Post cards */}
            {!loading && posts.map((post) => (
              <div
                key={post.id}
                style={{
                  border: "1px solid #e5e3da",
                  borderRadius: "14px",
                  padding: "24px",
                  marginBottom: "16px",
                  background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <h2 style={{ margin: "0 0 8px 0", color: "#2b2823", fontFamily: "Georgia, serif", fontSize: "20px", lineHeight: 1.3 }}>
                  {post.title}
                </h2>
                <p style={{ margin: "0 0 14px 0", color: "#787060", fontSize: "14px", lineHeight: 1.5 }}>
                  {post.description}
                </p>

                {/* Meta info */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "13px", color: "#9a9488", marginBottom: "16px" }}>
                  {post.featured_data?.cityName && (
                    <span>📍 {post.featured_data.cityName}, {post.featured_data.stateCode || post.featured_data.stateName}</span>
                  )}
                  {post.featured_data?.marketScore && (
                    <span>📊 Score: {post.featured_data.marketScore}/100</span>
                  )}
                  {post.featured_data?.strMonthlyRevenue && (
                    <span>💰 ${post.featured_data.strMonthlyRevenue.toLocaleString()}/mo</span>
                  )}
                  <span>📁 {post.category}</span>
                  <span>🕐 {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: "#f5f4f0",
                          color: "#787060",
                          fontSize: "12px",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <a
                    href={`/blog/${post.slug}?preview=true&password=${password}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "10px 20px",
                      background: "#2b2823",
                      color: "#ffffff",
                      textDecoration: "none",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: 600,
                    }}
                  >
                    👁️ Preview
                  </a>

                  {filter === "draft" && (
                    <>
                      <button
                        onClick={() => handleAction(post.id, "publish")}
                        disabled={actionLoading === post.id}
                        style={{
                          padding: "10px 20px",
                          background: actionLoading === post.id ? "#86efac" : "#22c55e",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: actionLoading === post.id ? "wait" : "pointer",
                          opacity: actionLoading === post.id ? 0.7 : 1,
                        }}
                      >
                        {actionLoading === post.id ? "Publishing..." : "✅ Approve & Publish"}
                      </button>
                      <button
                        onClick={() => handleAction(post.id, "reject")}
                        disabled={actionLoading === post.id}
                        style={{
                          padding: "10px 20px",
                          background: "#ffffff",
                          color: "#ef4444",
                          border: "1px solid #fecaca",
                          borderRadius: "10px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: actionLoading === post.id ? "wait" : "pointer",
                        }}
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}

                  {filter === "published" && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "10px 20px",
                        background: "#22c55e",
                        color: "#ffffff",
                        textDecoration: "none",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      View Live →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "#9a9488", fontSize: "12px" }}>
          Edge by Teeco · Blog Review Dashboard
        </p>
      </div>
    </div>
  );
}
