import { NextRequest, NextResponse } from "next/server";
import { createMagicToken } from "@/lib/magic-token";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Resend API key - MUST be set in environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY environment variable is not set");
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Strict rate limiting for auth endpoints
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`auth:${clientIP}`, RATE_LIMITS.strict);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait a minute before trying again." },
        { status: 429 }
      );
    }

    const { email, redirectPath } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Generate signed magic token (15 minute expiry)
    const token = createMagicToken(normalizedEmail, 15);

    // Build magic link URL - always use production domain
    const baseUrl = "https://edge.teeco.co";
    
    // Always redirect to /calculator which has the token verification handler
    // Store the original redirect path in the token if needed for future use
    const targetPath = "/calculator";
    const magicLink = `${baseUrl}${targetPath}?token=${encodeURIComponent(token)}`;

    // Send email via Resend REST API
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Edge by Teeco <noreply@edge.teeco.co>",
          to: [normalizedEmail],
          subject: "Sign in to Edge by Teeco",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #ffffff;">
              <div style="max-width: 400px; margin: 0 auto; padding: 24px 16px;">
                <!-- Sign In Button - FIRST so it's visible in preview -->
                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${magicLink}" style="display: inline-block; background: #2b2823; color: white; font-size: 18px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 12px;">
                    Sign In to Edge
                  </a>
                </div>
                
                <!-- Brief explanation -->
                <p style="color: #787060; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0; text-align: center;">
                  Tap the button above to sign in securely.
                </p>
                
                <!-- Expiry note -->
                <p style="color: #a0a0a0; font-size: 12px; margin: 0 0 24px 0; text-align: center;">
                  Link expires in 15 minutes.
                </p>
                
                <!-- Divider -->
                <div style="border-top: 1px solid #e5e5e5; margin: 0 0 16px 0;"></div>
                
                <!-- Footer -->
                <p style="color: #a0a0a0; font-size: 11px; margin: 0; text-align: center;">
                  Edge by Teeco • <a href="https://edge.teeco.co" style="color: #787060;">edge.teeco.co</a>
                </p>
              </div>
            </body>
            </html>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("Resend API error:", errorData);
        return NextResponse.json(
          { success: false, error: "Failed to send email. Please try again." },
          { status: 500 }
        );
      }

      const responseData = await emailResponse.json();
      console.log("Email sent successfully:", responseData);
      return NextResponse.json({ success: true });

    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return NextResponse.json(
        { success: false, error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
