import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ChatAssistant } from "@/components/ChatAssistant";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { StructuredData } from "@/components/StructuredData";
import { getMarketCounts } from "@/data/helpers";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Required: all pages use client hooks (usePathname, useState, useEffect, localStorage)
// Without this, Next.js tries to statically pre-render and fails
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const counts = getMarketCounts();
  const totalMarkets = counts.total.toLocaleString();
  const analyzedMarkets = counts.withFullData.toLocaleString();

  return {
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 1,
      interactiveWidget: "resizes-visual",
    },
    title: {
      default: "Edge by Teeco | Airbnb Investment Calculator & STR Market Data for 1,600+ Cities",
      template: "%s | Edge by Teeco",
    },
    description: `Free AI-powered STR market analysis for ${totalMarkets}+ US cities. Browse revenue, occupancy & investment grades. Property calculator with real Airbnb comps. Funding quiz with 48+ strategies. Built by investors, for investors.`,
    icons: {
      icon: "/favicon.ico",
    },
    metadataBase: new URL("https://edge.teeco.co"),
    alternates: {
      canonical: "https://edge.teeco.co",
    },
    openGraph: {
      title: `Airbnb Investment Calculator & STR Market Data for ${totalMarkets}+ Cities`,
      description: `Free AI agent, market data for ${totalMarkets}+ cities, funding quiz with 48+ strategies, and property calculator with real Airbnb comps. The data-driven way to find STR investments.`,
      type: "website",
      url: "https://edge.teeco.co",
      siteName: "Edge by Teeco",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `Edge by Teeco - Interactive US map showing STR investment opportunities across ${totalMarkets}+ markets`,
        },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `Airbnb Investment Calculator & STR Market Data for ${totalMarkets}+ Cities`,
      description: `Free AI agent, market data for ${totalMarkets}+ cities, funding quiz with 48+ strategies, and property calculator with real Airbnb comps. The data-driven way to find STR investments.`,
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      "google-site-verification": "B3E6SS2DPKxjOfrvYQ1-I89sgdwpCy9QZv4iP_erD_o",
    },
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen bg-slate-50 text-slate-900">
        <StructuredData />
        <div className="flex flex-col min-h-screen">
          <main className="flex-1 pb-20">
            {children}
            <Footer />
          </main>
          <Navigation />
          <ChatAssistant />
          <ServiceWorkerRegistrar />
        </div>
      </body>
    </html>
  );
}
