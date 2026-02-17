"use client";

import Link from "next/link";
import Image from "next/image";
import AuthHeader from "@/components/AuthHeader";
import { Footer } from "@/components/Footer";

const blogPosts = [
  {
    slug: "best-airbnb-markets-under-300k",
    title: "25 Best Airbnb Markets Under $300K in 2025",
    description: "Data-driven analysis of the most profitable short-term rental markets where median home prices are under $300,000. Ranked by STR investment grade using PriceLabs data.",
    date: "February 2025",
    readTime: "8 min read",
    category: "Market Research",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e5e3da' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #2b2823 0%, #3d3a34 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/teeco-icon-black.png" alt="Teeco" width={28} height={28} className="w-7 h-7 invert" />
              <span className="text-lg font-bold" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Edge Blog
              </span>
            </Link>
            <AuthHeader variant="dark" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            STR Investment Research
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Original data reports and market analysis powered by PriceLabs data on {new Date().getFullYear()}&apos;s best Airbnb investment markets.
          </p>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl p-5 transition-all hover:shadow-md"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d8d6cd', boxShadow: '0 2px 8px -2px rgba(43, 40, 35, 0.08)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#2b2823', color: '#ffffff' }}>
                  {post.category}
                </span>
                <span className="text-xs" style={{ color: '#787060' }}>{post.date}</span>
                <span className="text-xs" style={{ color: '#9a9488' }}>·</span>
                <span className="text-xs" style={{ color: '#787060' }}>{post.readTime}</span>
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#787060' }}>
                {post.description}
              </p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium" style={{ color: '#2b2823' }}>
                Read article
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-2xl p-6 text-center" style={{ backgroundColor: '#2b2823' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#ffffff', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Explore All Markets on Edge
          </h3>
          <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Browse investment grades, scores, and revenue data for 1,611+ US cities — completely free.
          </p>
          <div className="flex items-center justify-center gap-3">
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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
