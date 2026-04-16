import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Studio — Vacation Rental Design Automation",
  description:
    "Streamline your vacation rental interior design workflow. Optimize sleeping arrangements, select furniture, generate mood boards, and export deliverables — all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
