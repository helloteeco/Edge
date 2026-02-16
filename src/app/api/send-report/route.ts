import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`send-report:${clientIP}`, { limit: 10, windowSeconds: 600 });

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
    const { recipientEmail, senderEmail, reportHtml, propertyAddress, strategy, summary } = body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required." },
        { status: 400 }
      );
    }

    if (!reportHtml || !propertyAddress) {
      return NextResponse.json(
        { success: false, error: "Report data is required." },
        { status: 400 }
      );
    }

    // Build the email HTML wrapper
    const senderName = senderEmail || "An Edge by Teeco user";
    const strategyLabel = strategy || "STR Investment";

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
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">${strategyLabel} Analysis</h1>
    </div>
    
    <!-- Intro -->
    <div style="background: #ffffff; padding: 28px 32px; border-bottom: 1px solid #e5e3da;">
      <p style="color: #2b2823; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>${senderName}</strong> shared an investment analysis with you for:
      </p>
      <div style="background: #f5f4f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;">
        <p style="color: #2b2823; font-size: 17px; font-weight: 700; margin: 0 0 4px 0;">${propertyAddress}</p>
        <p style="color: #787060; font-size: 13px; margin: 0;">Strategy: ${strategyLabel}</p>
      </div>
      ${summary ? `
      <div style="border-left: 3px solid #b8a88a; padding-left: 16px; margin: 16px 0;">
        <p style="color: #2b2823; font-size: 13px; line-height: 1.6; margin: 0; white-space: pre-line;">${summary}</p>
      </div>
      ` : ''}
    </div>
    
    <!-- CTA -->
    <div style="background: #ffffff; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e3da;">
      <p style="color: #787060; font-size: 13px; margin: 0 0 16px 0;">The full analysis report is attached below. You can also run your own analysis:</p>
      <a href="https://edge.teeco.co/calculator" style="display: inline-block; background: #2b2823; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 10px;">
        Analyze a Property
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background: #2b2823; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;">
      <p style="color: #b8a88a; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">Edge by Teeco</p>
      <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 0 0 8px 0;">Your unfair advantage in STR investing</p>
      <a href="https://edge.teeco.co" style="color: #b8a88a; font-size: 11px;">edge.teeco.co</a>
      <p style="color: rgba(255,255,255,0.25); font-size: 9px; margin: 12px 0 0 0; line-height: 1.5;">
        This analysis is for informational and educational purposes only and does not constitute financial, legal, or investment advice.
      </p>
    </div>
    
  </div>
</body>
</html>
    `;

    // Send via Resend with the full report HTML as an attachment
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Edge by Teeco <noreply@edge.teeco.co>",
        to: [recipientEmail.toLowerCase().trim()],
        subject: `${strategyLabel} Analysis — ${propertyAddress} | Edge by Teeco`,
        html: emailHtml,
        attachments: [
          {
            filename: `Edge-Report-${propertyAddress.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 60)}.html`,
            content: Buffer.from(reportHtml).toString("base64"),
            type: "text/html",
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("[SendReport] Resend API error:", errorData);
      return NextResponse.json(
        { success: false, error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    const responseData = await emailResponse.json();
    console.log("[SendReport] Email sent successfully:", responseData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SendReport] Error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
