import Link from "next/link";

import Image from "next/image";

export const metadata = {
  title: "Privacy Policy | Edge by Teeco",
  description: "Privacy Policy for Edge by Teeco - How we collect, use, and protect your data",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Last updated: February 2, 2026
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
              1. Introduction
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Teeco LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates Edge by Teeco (the &quot;Service&quot;). This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read 
              this policy carefully. By using the Service, you consent to the practices described in this Privacy Policy.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              2. Information We Collect
            </h2>
            
            <h3 className="text-lg font-medium mb-3" style={{ color: "#2b2823" }}>
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: "#4a4640" }}>
              <li><strong>Account Information:</strong> Email address used for authentication via magic link</li>
              <li><strong>Property Searches:</strong> Addresses and property details you search for analysis</li>
              <li><strong>Saved Properties:</strong> Properties you choose to save to your account</li>
              <li><strong>Payment Information:</strong> Processed securely by Stripe (we do not store card details)</li>
              <li><strong>Communications:</strong> Any messages you send to us or through the AI assistant</li>
            </ul>

            <h3 className="text-lg font-medium mb-3" style={{ color: "#2b2823" }}>
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 mb-6 space-y-2" style={{ color: "#4a4640" }}>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Service</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
              <li><strong>IP Address:</strong> For security, rate limiting, and approximate location</li>
              <li><strong>Cookies:</strong> Session cookies for authentication and preferences</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              3. How We Use Your Information
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2" style={{ color: "#4a4640" }}>
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and manage your account</li>
              <li>Send you service-related communications (account verification, purchase confirmations)</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              4. Information Sharing and Disclosure
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2" style={{ color: "#4a4640" }}>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our Service (Stripe for payments, Supabase for data storage, Vercel for hosting, OpenAI for AI features)</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or legal process</li>
              <li><strong>Protection of Rights:</strong> To protect the rights, property, or safety of Teeco LLC, our users, or others</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              5. Third-Party Services
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              Our Service integrates with the following third-party services, each with their own privacy policies:
            </p>
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ backgroundColor: "#f5f4f0" }}>
                    <th className="border p-3 text-left font-semibold" style={{ borderColor: "#d8d6cd", color: "#2b2823" }}>Service</th>
                    <th className="border p-3 text-left font-semibold" style={{ borderColor: "#d8d6cd", color: "#2b2823" }}>Purpose</th>
                    <th className="border p-3 text-left font-semibold" style={{ borderColor: "#d8d6cd", color: "#2b2823" }}>Privacy Policy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>Stripe</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>Payment processing</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd" }}><a href="https://stripe.com/privacy" className="underline" style={{ color: "#2b2823" }}>stripe.com/privacy</a></td>
                  </tr>
                  <tr style={{ backgroundColor: "#fafaf8" }}>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>Supabase</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>Database and authentication</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd" }}><a href="https://supabase.com/privacy" className="underline" style={{ color: "#2b2823" }}>supabase.com/privacy</a></td>
                  </tr>
                  <tr>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>OpenAI</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>AI assistant features</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd" }}><a href="https://openai.com/privacy" className="underline" style={{ color: "#2b2823" }}>openai.com/privacy</a></td>
                  </tr>
                  <tr style={{ backgroundColor: "#fafaf8" }}>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>Vercel</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd", color: "#4a4640" }}>Website hosting</td>
                    <td className="border p-3" style={{ borderColor: "#d8d6cd" }}><a href="https://vercel.com/legal/privacy-policy" className="underline" style={{ color: "#2b2823" }}>vercel.com/legal/privacy-policy</a></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              6. Data Security
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We implement appropriate technical and organizational security measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2" style={{ color: "#4a4640" }}>
              <li>HTTPS encryption for all data transmission</li>
              <li>Secure authentication via magic links (no passwords stored)</li>
              <li>Rate limiting to prevent abuse</li>
              <li>Regular security audits and updates</li>
              <li>Access controls limiting employee access to personal data</li>
            </ul>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, 
              we cannot guarantee absolute security.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              7. Data Retention
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We retain your personal information for as long as your account is active or as needed to provide you services. 
              We may retain certain information as required by law or for legitimate business purposes (e.g., transaction records 
              for accounting). You may request deletion of your account and associated data by contacting us.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              8. Your Rights and Choices
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              Depending on your location, you may have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2" style={{ color: "#4a4640" }}>
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate personal information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
            </ul>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              To exercise these rights, please contact us at{" "}
              <a href="mailto:privacy@teeco.co" className="underline" style={{ color: "#2b2823" }}>privacy@teeco.co</a>.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              9. California Privacy Rights (CCPA)
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), 
              including the right to know what personal information we collect, the right to delete your information, and the 
              right to opt-out of the sale of personal information. We do not sell personal information. To exercise your CCPA 
              rights, contact us at{" "}
              <a href="mailto:privacy@teeco.co" className="underline" style={{ color: "#2b2823" }}>privacy@teeco.co</a>.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              10. Children&apos;s Privacy
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Our Service is not intended for children under 18 years of age. We do not knowingly collect personal information 
              from children under 18. If you are a parent or guardian and believe your child has provided us with personal 
              information, please contact us immediately.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              11. International Data Transfers
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Your information may be transferred to and processed in countries other than your country of residence. These 
              countries may have different data protection laws. By using our Service, you consent to the transfer of your 
              information to the United States and other countries where our service providers operate.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              12. Cookies and Tracking
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We use essential cookies for authentication and session management. These cookies are necessary for the Service 
              to function properly. We do not use advertising or tracking cookies. You can configure your browser to refuse 
              cookies, but this may limit your ability to use certain features of the Service.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              13. Changes to This Privacy Policy
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the 
              new Privacy Policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after 
              changes constitutes acceptance of the updated Privacy Policy.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              14. Contact Us
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
              <p className="font-semibold" style={{ color: "#2b2823" }}>Teeco LLC</p>
              <p style={{ color: "#4a4640" }}>Privacy Inquiries: <a href="mailto:privacy@teeco.co" className="underline">privacy@teeco.co</a></p>
              <p style={{ color: "#4a4640" }}>General Support: <a href="mailto:support@teeco.co" className="underline">support@teeco.co</a></p>
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
            <Link href="/cookies" className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: "#787060" }}>
              Cookie Policy
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
