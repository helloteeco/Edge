import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { ChatAssistant } from "@/components/ChatAssistant";

export const metadata: Metadata = {
  title: "Edge by Teeco - STR Investment Analysis",
  description: "Find your next short-term rental investment with data-driven market analysis",
  icons: {
    icon: "/favicon.ico",
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
    <html lang="en">
      <body className="antialiased min-h-screen bg-background">
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
