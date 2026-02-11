import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Contact Us | Edge by Teeco",
  description: "Get in touch with the Edge by Teeco team - We'd love to hear from you",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#e5e3da" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #2b2823 0%, #3d3a34 50%, #2b2823 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="flex items-center gap-3 mb-4">
            <Image src="/teeco-icon-black.png" alt="Teeco" width={32} height={32} className="w-8 h-8 invert" />
            <span className="text-xl font-bold text-white" style={{ fontFamily: "Source Serif Pro, Georgia, serif" }}>
              Edge by Teeco
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Source Serif Pro, Georgia, serif" }}>
            Contact Us
          </h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            We&apos;d love to hear from you
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main Contact Card */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-6"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #d8d6cd",
            boxShadow: "0 2px 8px -2px rgba(43, 40, 35, 0.08)",
          }}
        >
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac" }}
            >
              <svg className="w-8 h-8" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#2b2823", fontFamily: "Source Serif Pro, Georgia, serif" }}>
              Get in Touch
            </h2>
            <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: "#787060" }}>
              Whether you have a question about our platform, need help with your analysis, or want to explore partnership 
              opportunities, we&apos;re here to help.
            </p>
          </div>

          {/* Email CTA */}
          <div className="text-center mb-8">
            <a
              href="mailto:hello@teeco.co"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "#2b2823",
                color: "#ffffff",
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              hello@teeco.co
            </a>
          </div>

          {/* Topics Grid */}
          <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: "#2b2823" }}>
            What can we help you with?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0", border: "1px solid #e5e3da" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">📊</span>
                <h4 className="font-semibold text-sm" style={{ color: "#2b2823" }}>Analysis Questions</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#787060" }}>
                Need help understanding your STR analysis results? Questions about revenue projections, comp data, or deal scores? 
                We&apos;re happy to walk you through it.
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0", border: "1px solid #e5e3da" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🐛</span>
                <h4 className="font-semibold text-sm" style={{ color: "#2b2823" }}>Bug Reports</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#787060" }}>
                Found something that doesn&apos;t look right? Let us know what happened and we&apos;ll fix it. Screenshots are always 
                helpful!
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0", border: "1px solid #e5e3da" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">💡</span>
                <h4 className="font-semibold text-sm" style={{ color: "#2b2823" }}>Feature Requests</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#787060" }}>
                Have an idea that would make Edge better? We build based on user feedback. Tell us what you need and we&apos;ll 
                see what we can do.
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0", border: "1px solid #e5e3da" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🤝</span>
                <h4 className="font-semibold text-sm" style={{ color: "#2b2823" }}>Partnerships</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#787060" }}>
                Interested in partnering with Teeco? Whether you&apos;re a real estate agent, property manager, or content creator, 
                let&apos;s talk.
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0", border: "1px solid #e5e3da" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">💳</span>
                <h4 className="font-semibold text-sm" style={{ color: "#2b2823" }}>Billing &amp; Credits</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#787060" }}>
                Questions about your credits, payments, or subscription? We&apos;ll sort it out quickly.
              </p>
            </div>

            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0", border: "1px solid #e5e3da" }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🏠</span>
                <h4 className="font-semibold text-sm" style={{ color: "#2b2823" }}>Coaching &amp; Consulting</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#787060" }}>
                Ready to take your STR investing to the next level? Ask about Teeco&apos;s design + setup service and 1-on-1 coaching.
              </p>
            </div>
          </div>
        </div>

        {/* Response Time */}
        <div
          className="rounded-2xl p-5 mb-6 text-center"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #d8d6cd",
            boxShadow: "0 2px 8px -2px rgba(43, 40, 35, 0.08)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#2b2823" }}>
            ⚡ We typically respond within 24 hours
          </p>
          <p className="text-xs mt-1" style={{ color: "#787060" }}>
            For urgent matters, include &quot;URGENT&quot; in your subject line
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/terms" className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "#787060" }}>
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "#787060" }}>
              Privacy Policy
            </Link>
            <Link href="/cookies" className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "#787060" }}>
              Cookie Policy
            </Link>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80"
            style={{ color: "#2b2823" }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
