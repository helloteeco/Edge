import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ChatAssistant } from "@/components/ChatAssistant";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Edge by Teeco - STR Investment Analysis",
  description: "Your unfair advantage in STR investing. Data-driven market analysis for short-term rental investments across 600+ US markets.",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://edge.teeco.co"),
  openGraph: {
    title: "Edge by Teeco",
    description: "Your unfair advantage in STR investing. Data-driven market analysis for short-term rental investments.",
    type: "website",
    url: "https://edge.teeco.co",
    siteName: "Edge by Teeco",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Edge by Teeco - Your unfair advantage in STR investing",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Edge by Teeco",
    description: "Your unfair advantage in STR investing. Data-driven market analysis for short-term rental investments.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Force dynamic rendering for all pages
export const dynamic = "force-dynamic";

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
          </main>
          <Navigation />
          <ChatAssistant />
        </div>
      </body>
    </html>
  );
}
