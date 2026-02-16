"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer
      className="w-full mt-12 mb-24"
      style={{ borderTop: "1px solid #d8d6cd" }}
    >
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <Image
              src="/teeco-icon-black.png"
              alt="Teeco"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span
              className="text-base font-bold"
              style={{
                color: "#2b2823",
                fontFamily: "Source Serif Pro, Georgia, serif",
              }}
            >
              Edge by Teeco
            </span>
          </Link>
          <p className="text-xs text-center" style={{ color: "#9a9488" }}>
            Your unfair advantage in STR investing
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
          <Link
            href="/terms"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: "#787060" }}
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: "#787060" }}
          >
            Privacy Policy
          </Link>
          <Link
            href="/cookies"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: "#787060" }}
          >
            Cookie Policy
          </Link>
          <Link
            href="/contact"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: "#787060" }}
          >
            Contact Us
          </Link>
        </div>

        {/* Copyright */}
        <p
          className="text-[11px] text-center leading-relaxed"
          style={{ color: "#a0a0a0" }}
        >
          © {new Date().getFullYear()} Teeco LLC. All rights reserved.
          <br />
          For educational and informational purposes only. Not financial, legal, or investment advice.
        </p>
      </div>
    </footer>
  );
}
