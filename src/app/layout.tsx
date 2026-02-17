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
      default: "Edge by Teeco | Free Airbnb Investment Calculator & STR Market Analysis",
      template: "%s | Edge by Teeco",
    },
    description: `Analyze any US property for Airbnb revenue, cash-on-cash return, and deal score. ${totalMarkets}+ markets tracked with real comp data. Built by an investor generating $1M+/yr.`,
    icons: {
      icon: "/favicon.ico",
    },
    metadataBase: new URL("https://edge.teeco.co"),
    alternates: {
      canonical: "https://edge.teeco.co",
    },
    openGraph: {
      title: "Free Airbnb Investment Calculator & STR Market Analysis",
      description: `${totalMarkets}+ markets analyzed \u2022 AI-powered deal analysis \u2022 Free to start. The data-driven way to find high cash flow short-term rental investments.`,
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
      title: "Free Airbnb Investment Calculator & STR Market Analysis",
      description: `${totalMarkets}+ markets analyzed \u2022 AI-powered deal analysis \u2022 Free to start. The data-driven way to find high cash flow short-term rental investments.`,
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
    other: {
      "google-site-verification": "",
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
