import Link from "next/link";

import Image from "next/image";

export const metadata = {
  title: "Terms of Service | Edge by Teeco",
  description: "Terms of Service for Edge by Teeco - STR Investment Analysis Platform",
};

export default function TermsPage() {
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
            Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              By accessing or using Edge by Teeco (&quot;the Service&quot;), operated by Teeco LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), 
              you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              2. Description of Service
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Edge by Teeco provides short-term rental (STR) investment analysis tools, including property revenue estimates, 
              market data visualization, funding strategy information, and AI-powered investment guidance. The Service is designed 
              for educational and informational purposes to help users evaluate potential STR investments.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              3. Not Financial or Investment Advice
            </h2>
            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "#fef3c7", border: "1px solid #fcd34d" }}>
              <p className="font-semibold mb-2" style={{ color: "#92400e" }}>Important Disclaimer</p>
              <p style={{ color: "#a16207" }}>
                The information provided through the Service is for <strong>educational and informational purposes only</strong> and 
                does not constitute financial, investment, legal, or tax advice. All projections, estimates, and analyses are based 
                on third-party data and algorithms that may not reflect actual market conditions or property performance.
              </p>
              <p className="mt-2" style={{ color: "#a16207" }}>
                You should always conduct your own due diligence and consult with qualified professionals (real estate agents, 
                attorneys, CPAs, mortgage professionals) before making any investment decisions.
              </p>
            </div>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              4. User Accounts and Credits
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              <strong>Account Creation:</strong> To access certain features, you must create an account using a valid email address. 
              You are responsible for maintaining the confidentiality of your account and for all activities under your account.
            </p>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              <strong>Credits System:</strong> The Service operates on a credit-based system. Free users receive a limited number of 
              property analyses. Additional credits may be purchased through our payment system. Credits are non-transferable and 
              non-refundable except as required by law.
            </p>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              <strong>Subscription Plans:</strong> Subscription plans provide unlimited access during the subscription period. 
              Subscriptions automatically renew unless cancelled before the renewal date.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              5. Payment Terms
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              All payments are processed securely through Stripe. By making a purchase, you agree to Stripe&apos;s terms of service. 
              Prices are listed in US dollars and are subject to change. We reserve the right to modify pricing with reasonable notice.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              6. Refund Policy
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Due to the digital nature of our service, credit purchases are generally non-refundable once credits have been used. 
              If you experience technical issues that prevent you from using purchased credits, please contact us at{" "}
              <a href="mailto:support@teeco.co" className="underline" style={{ color: "#2b2823" }}>support@teeco.co</a> within 
              7 days of purchase for assistance. Subscription refunds may be considered on a case-by-case basis.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              7. Data Accuracy and Sources
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              Our property analysis data is sourced from third-party providers including Airbtics and Mashvisor. While we strive 
              for accuracy, we do not guarantee the completeness, accuracy, or reliability of any data or projections. Market 
              conditions, property management quality, and other factors can significantly impact actual performance.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              8. Acceptable Use
            </h2>
            <p className="mb-4 leading-relaxed" style={{ color: "#4a4640" }}>
              You agree not to:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2" style={{ color: "#4a4640" }}>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Scrape, copy, or redistribute our data without permission</li>
              <li>Use automated systems to access the Service beyond normal usage</li>
              <li>Resell or commercially exploit the Service without authorization</li>
              <li>Interfere with or disrupt the Service or servers</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              9. Intellectual Property
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              The Service, including its design, features, content, and underlying technology, is owned by Teeco LLC and protected 
              by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express 
              written permission.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              10. Limitation of Liability
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TEECO LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR INVESTMENT LOSSES, 
              ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE 
              IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              11. Indemnification
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              You agree to indemnify and hold harmless Teeco LLC, its officers, directors, employees, and agents from any claims, 
              damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of 
              any third-party rights.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              12. Modifications to Terms
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We reserve the right to modify these Terms at any time. We will notify users of material changes via email or 
              through the Service. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              13. Termination
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other 
              reason at our discretion. Upon termination, your right to use the Service ceases immediately.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              14. Governing Law
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard 
              to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Texas.
            </p>

            <h2 className="text-xl font-semibold mb-4" style={{ color: "#2b2823" }}>
              15. Contact Information
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: "#4a4640" }}>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#f5f4f0" }}>
              <p className="font-semibold" style={{ color: "#2b2823" }}>Teeco LLC</p>
              <p style={{ color: "#4a4640" }}>Email: <a href="mailto:support@teeco.co" className="underline">support@teeco.co</a></p>
              <p style={{ color: "#4a4640" }}>Website: <a href="https://teeco.co" className="underline">teeco.co</a></p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
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
