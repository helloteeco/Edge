import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "25 Best Airbnb Markets Under $300K in 2025 — Data from PriceLabs | Edge by Teeco",
  description: "Data-driven rankings of the most profitable Airbnb investment markets under $300,000. Scored on cash-on-cash return, occupancy, revenue, and regulation. Powered by PriceLabs data covering 1,611+ US cities.",
  openGraph: {
    title: "25 Best Airbnb Markets Under $300K in 2025",
    description: "Data-driven rankings of the most profitable Airbnb markets under $300K. Scored on cash-on-cash return, occupancy, revenue, and regulation using PriceLabs data.",
    url: "https://edge.teeco.co/blog/best-airbnb-markets-under-300k",
    siteName: "Edge by Teeco",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "25 Best Airbnb Markets Under $300K in 2025",
    description: "Data-driven rankings of the most profitable Airbnb markets under $300K. Powered by PriceLabs data.",
  },
  alternates: {
    canonical: "https://edge.teeco.co/blog/best-airbnb-markets-under-300k",
  },
};

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
