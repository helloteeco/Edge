import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Cookie Policy | Edge by Teeco",
  description: "Cookie Policy for Edge by Teeco - How we use cookies and similar technologies",
};

export default function CookiePolicyPage() {
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
            Cookie Policy
          </h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Last updated: February 11, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #d8d6cd",
            boxShadow: "0 2px 8px -2px rgba(43, 40, 35, 0.08)",
          }}
        >
          <div className="prose prose-gray max-w-none" style={{ color: "#2b2823" }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              1. What Are Cookies
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. 
              They are widely used to make websites work more efficiently, provide a better user experience, and give website 
              owners useful information about how their site is being used.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              2. How We Use Cookies
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              Edge by Teeco (&quot;the Service&quot;), operated by Teeco LLC, uses cookies and similar technologies for the following purposes:
            </p>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Essential Cookies</h3>
              <p className="mb-3 leading-relaxed" style={{ color: "#4a4640" }}>
                These cookies are strictly necessary for the Service to function. They enable core features such as:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-1" style={{ color: "#4a4640" }}>
                <li>User authentication and session management</li>
                <li>Security features and fraud prevention</li>
                <li>Remembering your login state across pages</li>
                <li>Processing payments through Stripe</li>
              </ul>
              <p className="leading-relaxed" style={{ color: "#4a4640" }}>
                Without these cookies, the Service cannot function properly. They are set automatically when you use the Service 
                and cannot be turned off.
              </p>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#2b2823" }}>Functional Cookies</h3>
              <p className="leading-relaxed" style={{ color: "#4a4640" }}>
                These cookies allow the Service to remember choices you make and provide enhanced functionality, such as:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1" style={{ color: "#4a4640" }}>
                <li>Saving your preferred property search settings</li>
                <li>Remembering recently analyzed properties</li>
                <li>Storing your saved/bookmarked properties locally</li>
                <li>Maintaining your calculator inputs between sessions</li>
              </ul>
            </div>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              3. Cookies We Do NOT Use
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We believe in respecting your privacy. Edge by Teeco does <strong>not</strong> use:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-1" style={{ color: "#4a4640" }}>
              <li><strong>Advertising cookies</strong> — We do not serve ads or use ad-tracking cookies</li>
              <li><strong>Third-party tracking cookies</strong> — We do not allow third parties to place tracking cookies on our site</li>
              <li><strong>Social media tracking cookies</strong> — We do not embed social media trackers</li>
              <li><strong>Cross-site tracking cookies</strong> — We do not track your activity across other websites</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              4. Third-Party Services
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              Some third-party services we use may set their own cookies. These include:
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm" style={{ color: "#4a4640" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #d8d6cd" }}>
                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: "#2b2823" }}>Service</th>
                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: "#2b2823" }}>Purpose</th>
                    <th className="text-left py-2 font-semibold" style={{ color: "#2b2823" }}>More Info</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e5e3da" }}>
                    <td className="py-2 pr-4">Stripe</td>
                    <td className="py-2 pr-4">Payment processing</td>
                    <td className="py-2">
                      <a href="https://stripe.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
                        Stripe Privacy
                      </a>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e3da" }}>
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2 pr-4">Authentication &amp; database</td>
                    <td className="py-2">
                      <a href="https://supabase.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
                        Supabase Privacy
                      </a>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e3da" }}>
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2 pr-4">Hosting &amp; analytics</td>
                    <td className="py-2">
                      <a href="https://vercel.com/legal/privacy-policy" className="underline" target="_blank" rel="noopener noreferrer">
                        Vercel Privacy
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              5. Local Storage
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              In addition to cookies, we use browser local storage to save your preferences and cached data locally on your 
              device. This includes saved properties, recent searches, and calculator settings. This data never leaves your 
              device and is not transmitted to our servers unless you explicitly choose to sync or share it.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              6. Managing Cookies
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              You can control and manage cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-1" style={{ color: "#4a4640" }}>
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block cookies from specific sites</li>
              <li>Block all cookies</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Please note that blocking essential cookies may prevent you from using certain features of the Service, 
              including logging in and purchasing credits.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              7. Changes to This Cookie Policy
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data 
              practices. When we make changes, we will update the &quot;Last updated&quot; date at the top of this page. We encourage 
              you to review this Cookie Policy periodically to stay informed about how we use cookies.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              8. Contact Us
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              If you have any questions about our use of cookies, please contact us:
            </p>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
              <p className="font-semibold" style={{ color: "#2b2823" }}>Teeco LLC</p>
              <p style={{ color: "#4a4640" }}>Email: <a href="mailto:hello@teeco.co" className="underline">hello@teeco.co</a></p>
              <p style={{ color: "#4a4640" }}>Website: <a href="https://teeco.co" className="underline">teeco.co</a></p>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/terms" className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "#787060" }}>
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "#787060" }}>
              Privacy Policy
            </Link>
            <Link href="/contact" className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "#787060" }}>
              Contact Us
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
