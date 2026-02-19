"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AuthHeader from "@/components/AuthHeader";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  content: string;
  tags: string[];
  featured_data: {
    cityName?: string;
    stateName?: string;
    stateCode?: string;
    population?: number;
    marketScore?: number;
    hasFullData?: boolean;
    cashOnCash?: string;
    avgAdr?: string;
    occupancy?: string;
    strMonthlyRevenue?: string;
    medianHomeValue?: string;
    regulation?: string;
  };
  city_ids: string[];
  status: string;
  published_at: string | null;
  created_at: string;
}

export default function DynamicBlogPost() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const preview = searchParams.get("preview");
        const password = searchParams.get("password");
        let url = `/api/blog-posts/${slug}`;
        if (preview && password) {
          url += `?preview=true&password=${password}`;
        }
        const res = await fetch(url);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        if (data.post) {
          setPost(data.post);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchPost();
  }, [slug, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#e5e3da" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#2b2823", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "#787060" }}>Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#e5e3da" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>Article Not Found</h1>
          <p className="text-sm mb-4" style={{ color: "#787060" }}>This article may have been removed or doesn&apos;t exist yet.</p>
          <Link href="/blog" className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: "#2b2823", color: "#ffffff" }}>
            Back to Market Insights
          </Link>
        </div>
      </div>
    );
  }

  const fd = post.featured_data;
  const categoryLabel = post.category === "city-dive" ? "City Deep Dive" : post.category === "roundup" ? "Market Roundup" : "Investment Guide";
  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : new Date(post.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Estimate read time from content length
  const wordCount = post.content.replace(/<[^>]+>/g, "").split(/\s+/).length;
  const readTime = Math.max(3, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#e5e3da" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4 page-header-row">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/teeco-icon-black.png" alt="Teeco" width={28} height={28} className="w-7 h-7 invert" />
              <span className="text-lg font-bold" style={{ color: "#ffffff", fontFamily: "Source Serif Pro, Georgia, serif" }}>
                Edge
              </span>
            </Link>
            <AuthHeader variant="dark" />
          </div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
            <Link href="/" className="hover:underline" style={{ color: "rgba(255, 255, 255, 0.6)" }}>Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:underline" style={{ color: "rgba(255, 255, 255, 0.6)" }}>Market Insights</Link>
            <span>/</span>
            <span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{fd.cityName || post.title}</span>
          </div>
          {/* Draft badge */}
          {post.status === "draft" && (
            <div className="mb-3 px-3 py-1.5 rounded-lg inline-block text-xs font-bold" style={{ backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>
              DRAFT — Preview Only
            </div>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" }}>
              {categoryLabel}
            </span>
            <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>{dateStr} · {readTime} min read</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "#ffffff", fontFamily: "Source Serif Pro, Georgia, serif" }}>
            {post.title}
          </h1>
          <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            {post.description}
          </p>
        </div>
      </div>

      {/* Key Stats (if city has full data) */}
      {fd.hasFullData && (
        <div className="max-w-3xl mx-auto px-4 -mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
            {([
              fd.strMonthlyRevenue ? { label: "Monthly Revenue", value: `$${Number(fd.strMonthlyRevenue).toLocaleString()}` } : null,
              fd.medianHomeValue ? { label: "Median Home Value", value: `$${Number(fd.medianHomeValue).toLocaleString()}` } : null,
              fd.cashOnCash ? { label: "Cash-on-Cash", value: `${fd.cashOnCash}%` } : null,
              fd.occupancy ? { label: "Occupancy", value: `${fd.occupancy}%` } : null,
              fd.marketScore ? { label: "Edge Score", value: `${fd.marketScore}/100` } : null,
              fd.avgAdr ? { label: "Avg Daily Rate", value: `$${fd.avgAdr}` } : null,
            ].filter((s): s is { label: string; value: string } => s !== null)).slice(0, 4).map((stat, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #d8d6cd" }}>
                <div className="text-lg font-bold" style={{ color: "#2b2823" }}>{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#787060" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 py-4">
        <div
          className="blog-content"
          style={{ color: "#2b2823", lineHeight: 1.75 }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6" style={{ borderTop: "1px solid #d8d6cd" }}>
            {post.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: "rgba(43, 40, 35, 0.06)", color: "#787060" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl p-6 text-center" style={{ backgroundColor: "#2b2823" }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: "#ffffff", fontFamily: "Source Serif Pro, Georgia, serif" }}>
            {fd.cityName ? `Explore ${fd.cityName} on Edge` : "Explore Markets on Edge"}
          </h3>
          <p className="text-sm mb-4" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            See the full data breakdown, investment grade, and revenue estimates — free.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {fd.cityName && post.city_ids?.[0] && (
              <Link
                href={`/city/${post.city_ids[0]}`}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "#22c55e", color: "#ffffff" }}
              >
                View {fd.cityName} Data
              </Link>
            )}
            <Link
              href="/search"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" }}
            >
              Search All Markets
            </Link>
          </div>
        </div>
      </article>

      {/* Blog content styles */}
      <style jsx global>{`
        .blog-content p { margin-bottom: 16px; font-size: 15px; }
        .blog-content h2 { font-size: 22px; font-weight: 700; margin: 32px 0 12px 0; font-family: "Source Serif Pro", Georgia, serif; color: #2b2823; }
        .blog-content h3 { font-size: 18px; font-weight: 600; margin: 24px 0 8px 0; color: #2b2823; }
        .blog-content a { color: #2b2823; text-decoration: underline; text-underline-offset: 2px; }
        .blog-content a:hover { color: #22c55e; }
        .blog-content ul, .blog-content ol { margin: 12px 0; padding-left: 24px; }
        .blog-content li { margin-bottom: 6px; font-size: 15px; }
        .blog-content strong { font-weight: 600; }
        .blog-content blockquote { border-left: 3px solid #d8d6cd; padding-left: 16px; margin: 16px 0; color: #787060; font-style: italic; }
      `}</style>
    </div>
  );
}
