import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Insights — STR Investment Research & Data Reports | Edge by Teeco",
  description: "Original data-driven reports on the best Airbnb and short-term rental investment markets in the US. Rankings, analysis, and insights using estimated market data covering 1,611+ cities across all 50 states.",
  openGraph: {
    title: "Market Insights — STR Investment Research | Edge by Teeco",
    description: "Original data-driven reports on the best Airbnb and short-term rental investment markets in the US. Estimated market data covering 1,611+ cities.",
    url: "https://edge.teeco.co/blog",
    siteName: "Edge by Teeco",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Market Insights — STR Investment Research | Edge by Teeco",
    description: "Original data-driven reports on the best Airbnb investment markets. Estimated market data covering 1,611+ cities.",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
