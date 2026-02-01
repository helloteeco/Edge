import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setToken, cleanupExpiredTokens } from "@/lib/auth-store";
import { Resend } from "resend";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || "re_4sjg6f75_8V1zJk4yk5B2cTkHkStJdUtQ");

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // Clean up old tokens
    cleanupExpiredTokens();

    // Generate new token (15 minute expiry)
    const token = generateToken();
    setToken(token, email, 15 * 60 * 1000);

    // Build magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    "https://edge.teeco.co");
    const magicLink = `${baseUrl}/calculator?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    // Send email via Resend
    try {
      const { data, error } = await resend.emails.send({
        from: "Edge by Teeco <noreply@edge.teeco.co>",
        to: [email],
        subject: "Sign in to Edge by Teeco",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: #2b2823; padding: 32px; text-align: center;">
                <img src="https://edge.teeco.co/teeco-logocopy.PNG" alt="Teeco" style="height: 40px;" />
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 32px;">
                <h1 style="color: #2b2823; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
                  Sign in to Edge
                </h1>
                <p style="color: #787060; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
                  Click the button below to securely sign in to your STR investment calculator.
                </p>
                
                <!-- Button -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${magicLink}" style="display: inline-block; background: #2b2823; color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 12px;">
                    Sign In
                  </a>
                </div>
                
                <p style="color: #a0a0a0; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                  This link expires in 15 minutes. If you didn't request this email, you can safely ignore it.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9f9f9; padding: 24px 32px; border-top: 1px solid #e5e5e5;">
                <p style="color: #a0a0a0; font-size: 12px; margin: 0; text-align: center;">
                  Edge by Teeco • STR Investment Calculator<br>
                  <a href="https://edge.teeco.co" style="color: #787060;">edge.teeco.co</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error("Resend API error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to send email. Please try again." },
          { status: 500 }
        );
      }

      console.log("Email sent successfully:", data);
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
