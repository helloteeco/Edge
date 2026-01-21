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
  description: "Find your next short-term rental investment with data-driven market analysis",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Edge by Teeco - STR Investment Analysis",
    description: "Find your next short-term rental investment with data-driven market analysis",
    type: "website",
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
