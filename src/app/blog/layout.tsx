import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "STR Investment Research & Market Reports | Edge by Teeco",
  description: "Original data reports on the best Airbnb and short-term rental investment markets in the US. Powered by PriceLabs data covering 1,611+ cities across all 50 states.",
  openGraph: {
    title: "STR Investment Research & Market Reports | Edge by Teeco",
    description: "Original data reports on the best Airbnb and short-term rental investment markets in the US. Powered by PriceLabs data covering 1,611+ cities.",
    url: "https://edge.teeco.co/blog",
    siteName: "Edge by Teeco",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "STR Investment Research | Edge by Teeco",
    description: "Original data reports on the best Airbnb investment markets. Powered by PriceLabs data.",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
