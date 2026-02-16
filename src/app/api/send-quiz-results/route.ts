import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface FundingResult {
  name: string;
  category: string;
  riskLevel: string;
  description: string;
  typicalTerms: string;
  bestFor: string[];
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`quiz-results:${clientIP}`, { limit: 5, windowSeconds: 600 });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many emails sent. Please wait a few minutes." },
        { status: 429 }
      );
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Email service not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, results } = body as { email: string; results: FundingResult[] };

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required." },
        { status: 400 }
      );
    }

    if (!results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: "Quiz results are required." },
        { status: 400 }
      );
    }

    const categoryLabels: Record<string, string> = {
      traditional: "Traditional Loan",
      creative: "Creative Strategy",
      alternative: "Alternative Source",
      government: "Government Program",
      equity: "Equity-Based",
      retirement: "Retirement-Based",
    };

    const riskColors: Record<string, { bg: string; text: string }> = {
      low: { bg: "#dcfce7", text: "#166534" },
      medium: { bg: "#fef9c3", text: "#854d0e" },
      high: { bg: "#fee2e2", text: "#991b1b" },
    };

    // Build results HTML rows
    const resultsHtml = results.slice(0, 5).map((method, idx) => {
      const risk = riskColors[method.riskLevel] || riskColors.medium;
      const category = categoryLabels[method.category] || method.category;
      return `
        <div style="background: #ffffff; border: 1px solid #e5e3da; border-radius: 12px; padding: 20px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: ${idx === 0 ? '#2b2823' : '#e5e3da'}; color: ${idx === 0 ? '#ffffff' : '#2b2823'}; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;">
              ${idx === 0 ? '⭐ Top Match' : `#${idx + 1}`}
            </span>
            <span style="background: ${risk.bg}; color: ${risk.text}; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px;">
              ${method.riskLevel.charAt(0).toUpperCase() + method.riskLevel.slice(1)} Risk
            </span>
          </div>
          <h3 style="color: #2b2823; font-size: 17px; font-weight: 700; margin: 0 0 4px 0; font-family: 'Source Serif Pro', Georgia, serif;">
            ${method.name}
          </h3>
          <p style="color: #787060; font-size: 11px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">
            ${category} · ${method.typicalTerms}
          </p>
          <p style="color: #4a4639; font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
            ${method.description}
          </p>
          <p style="color: #787060; font-size: 12px; margin: 0;">
            <strong>Common use cases:</strong> ${method.bestFor.slice(0, 3).join(' · ')}
          </p>
        </div>
      `;
    }).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f4f0;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Header -->
    <div style="background: #2b2823; border-radius: 16px 16px 0 0; padding: 28px 32px; text-align: center;">
      <p style="color: #b8a88a; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0; font-weight: 600;">Edge by Teeco</p>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">Your Funding Quiz Results</h1>
    </div>
    
    <!-- Intro -->
    <div style="background: #ffffff; padding: 28px 32px; border-bottom: 1px solid #e5e3da;">
      <p style="color: #2b2823; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
        Here are the funding strategies that match your situation, based on your quiz answers.
      </p>
      <p style="color: #787060; font-size: 13px; line-height: 1.5; margin: 0;">
        We matched ${results.length} strategies from our database of 48+ options. Your top ${Math.min(results.length, 5)} are below.
      </p>
    </div>
    
    <!-- Results -->
    <div style="background: #f5f4f0; padding: 24px 20px;">
      ${resultsHtml}
    </div>
    
    <!-- CTA -->
    <div style="background: #ffffff; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e3da;">
      <p style="color: #787060; font-size: 13px; margin: 0 0 16px 0;">Explore all 48+ funding strategies and learn more:</p>
      <a href="https://edge.teeco.co/funding" style="display: inline-block; background: #2b2823; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 10px;">
        View All Funding Options
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background: #2b2823; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;">
      <p style="color: #b8a88a; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">Edge by Teeco</p>
      <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 0 0 8px 0;">Find, Analyze & Fund Short-Term Rentals</p>
      <a href="https://edge.teeco.co" style="color: #b8a88a; font-size: 11px;">edge.teeco.co</a>
      <p style="color: rgba(255,255,255,0.25); font-size: 9px; margin: 12px 0 0 0; line-height: 1.5;">
        This information is for educational purposes only and does not constitute financial, legal, or investment advice. 
        Always consult with qualified professionals before making financial decisions.
      </p>
    </div>
    
  </div>
</body>
</html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Edge by Teeco <noreply@edge.teeco.co>",
        to: [email.toLowerCase().trim()],
        subject: "Your Funding Quiz Results | Edge by Teeco",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("[SendQuizResults] Resend API error:", errorData);
      return NextResponse.json(
        { success: false, error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    const responseData = await emailResponse.json();
    console.log("[SendQuizResults] Email sent successfully:", responseData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SendQuizResults] Error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
