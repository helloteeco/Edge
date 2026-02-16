import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ChatAssistant } from "@/components/ChatAssistant";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    interactiveWidget: "resizes-visual",
  },
  title: "Edge by Teeco - STR Investment Analysis",
  description: "Find high cash flow short-term rental markets with AI-powered analysis. 671 markets tracked, instant deal analysis, and expert resources.",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://edge.teeco.co"),
  openGraph: {
    title: "Find Your Next STR Investment",
    description: "1000+ markets analyzed • AI-powered deal analysis • Free to start. The data-driven way to find high cash flow short-term rental investments.",
    type: "website",
    url: "https://edge.teeco.co",
    siteName: "Edge by Teeco",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Edge by Teeco - Interactive US map showing STR investment opportunities across 671 markets",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Your Next STR Investment",
    description: "1000+ markets analyzed • AI-powered deal analysis • Free to start. The data-driven way to find high cash flow short-term rental investments.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen bg-slate-50 text-slate-900">
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
