"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthHeader from "@/components/AuthHeader";

// Existing hardcoded post — kept as-is with a fixed date for sorting
const staticPosts = [
  {
    slug: "best-airbnb-markets-under-300k",
    title: "25 Best Airbnb Markets Under $300K in 2026",
    description: "Data-driven analysis of the most profitable short-term rental markets where median home prices are under $300,000. Ranked by STR investment grade using estimated market data.",
    date: "February 2026",
    fullDate: "February 1, 2026",
    sortDate: "2026-02-01T00:00:00Z",
    readTime: "8 min read",
    category: "Market Research",
    emoji: "📊",
    isStatic: true,
  },
];

interface DynamicPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  featured_data: {
    cityName?: string;
    stateName?: string;
    marketScore?: number;
    strMonthlyRevenue?: string;
  };
  status: string;
  published_at: string | null;
  created_at: string;
}

const categoryConfig: Record<string, { emoji: string; label: string }> = {
  "city-dive": { emoji: "🏙️", label: "City Deep Dive" },
  "roundup": { emoji: "📊", label: "Market Roundup" },
  "guide": { emoji: "📚", label: "Investment Guide" },
};

// Unified post type for merged sorting
interface UnifiedPost {
  key: string;
  slug: string;
  title: string;
  description: string;
  sortDate: string;
  fullDate: string;
  readTime: string;
  categoryEmoji: string;
  categoryLabel: string;
  isStatic: boolean;
  marketScore?: number;
  strMonthlyRevenue?: string;
}

export default function BlogPage() {
  const [dynamicPosts, setDynamicPosts] = useState<DynamicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/blog-posts?limit=50");
        if (res.ok) {
          const data = await res.json();
          setDynamicPosts(data.posts || []);
        }
      } catch (err) {
        console.error("Failed to fetch blog posts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  // Merge static + dynamic posts, sort by date (newest first)
  const allPosts = useMemo(() => {
    const merged: UnifiedPost[] = [];

    // Add static posts
    for (const post of staticPosts) {
      merged.push({
        key: `static-${post.slug}`,
        slug: post.slug,
        title: post.title,
        description: post.description,
        sortDate: post.sortDate,
        fullDate: post.fullDate,
        readTime: post.readTime,
        categoryEmoji: post.emoji,
        categoryLabel: post.category,
        isStatic: true,
      });
    }

    // Add dynamic posts
    for (const post of dynamicPosts) {
      const cat = categoryConfig[post.category] || { emoji: "📝", label: post.category };
      const dateObj = new Date(post.published_at || post.created_at);
      const fullDate = dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const wordCount = 900;
      const readTime = `${Math.max(3, Math.ceil(wordCount / 200))} min read`;

      merged.push({
        key: post.id,
        slug: post.slug,
        title: post.title,
        description: post.description,
        sortDate: post.published_at || post.created_at,
        fullDate,
        readTime,
        categoryEmoji: cat.emoji,
        categoryLabel: cat.label,
        isStatic: false,
        marketScore: post.featured_data?.marketScore,
        strMonthlyRevenue: post.featured_data?.strMonthlyRevenue,
      });
    }

    // Sort newest first
    merged.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

    return merged;
  }, [dynamicPosts]);

  // Filter by search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return allPosts;
    const q = searchQuery.toLowerCase().trim();
    return allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.description.toLowerCase().includes(q) ||
        post.categoryLabel.toLowerCase().includes(q)
    );
  }, [allPosts, searchQuery]);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4 page-header-row">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/teeco-icon-black.png" alt="Teeco" width={28} height={28} className="w-7 h-7 invert" />
              <span className="text-lg font-bold" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Edge
              </span>
            </Link>
            <AuthHeader variant="dark" />
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            <Link href="/" className="hover:underline" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Home</Link>
            <span>/</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Market Insights</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Market Insights
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Original data reports and STR investment research using estimated market data. Every report draws from Edge&apos;s database of {new Date().getFullYear() >= 2025 ? '1,611' : '1,600'}+ US markets.
          </p>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
              fill="none"
              stroke="#9a9488"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d8d6cd',
                color: '#2b2823',
                boxShadow: '0 1px 3px -1px rgba(43, 40, 35, 0.06)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2b2823';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(43, 40, 35, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d8d6cd';
                e.currentTarget.style.boxShadow = '0 1px 3px -1px rgba(43, 40, 35, 0.06)';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                style={{ color: '#9a9488' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* All posts — merged and sorted newest first */}
          {filteredPosts.map((post) => (
            <Link
              key={post.key}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl overflow-hidden transition-all hover:shadow-md active:scale-[0.99]"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <div className="px-5 pt-4 pb-0 flex items-center gap-2 flex-wrap">
                <span className="text-lg">{post.categoryEmoji}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#2b2823', color: '#ffffff' }}>
                  {post.categoryLabel}
                </span>
                <span className="text-xs" style={{ color: '#787060' }}>{post.fullDate}</span>
                <span className="text-xs" style={{ color: '#9a9488' }}>·</span>
                <span className="text-xs" style={{ color: '#787060' }}>{post.readTime}</span>
              </div>
              <div className="px-5 py-4">
                <h2 className="text-lg font-bold mb-1.5" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#787060' }}>
                  {post.description}
                </p>
                {/* Inline data teaser for city dives */}
                {post.marketScore && (
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#9a9488' }}>
                    <span>Edge Score: {post.marketScore}/100</span>
                    {post.strMonthlyRevenue && (
                      <span>${Number(post.strMonthlyRevenue).toLocaleString()}/mo revenue</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-3 text-sm font-medium" style={{ color: '#2b2823' }}>
                  {post.isStatic ? "Read report" : "Read article"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}

          {/* No results from search */}
          {!loading && searchQuery && filteredPosts.length === 0 && (
            <div className="text-center py-8" style={{ color: '#9a9488' }}>
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-sm font-medium">No articles matching &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#2b2823', borderTopColor: 'transparent' }} />
            </div>
          )}
        </div>

        {/* More Coming Soon — only show if no dynamic posts yet and no search */}
        {!loading && dynamicPosts.length === 0 && !searchQuery && (
          <div className="mt-6 rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(43, 40, 35, 0.04)', border: '1px dashed #d8d6cd' }}>
            <p className="text-sm" style={{ color: '#9a9488' }}>
              More reports coming soon — covering top markets by cash flow, best states for STR investing, seasonal vs. year-round markets, and more.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl p-6 text-center" style={{ backgroundColor: '#2b2823' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Explore All Markets on Edge
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Browse investment grades, scores, and revenue data for 1,611+ US cities — free AI assistant, interactive map, and property calculator.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/search"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
            >
              Search Markets
            </Link>
            <Link
              href="/calculator"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
            >
              Analyze a Property
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
            >
              View US Map
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
