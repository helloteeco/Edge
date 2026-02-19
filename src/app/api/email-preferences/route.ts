import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET: Get email preferences by email or unsubscribe token
 * POST: Update email preferences (opt-in/out)
 */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email && !token) {
      return NextResponse.json({ error: "Email or token required" }, { status: 400 });
    }

    let query = supabase.from("email_preferences").select("*");
    if (token) {
      query = query.eq("unsubscribe_token", token);
    } else if (email) {
      query = query.eq("email", email.toLowerCase().trim());
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: "Preferences not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        email: data.email,
        newsletter_opted_in: data.newsletter_opted_in,
        frequency: data.frequency,
        interests: data.interests,
      },
    });
  } catch (error) {
    console.error("[EmailPreferences] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, newsletter_opted_in, frequency, interests } = body;

    if (!email && !token) {
      return NextResponse.json({ error: "Email or unsubscribe token required" }, { status: 400 });
    }

    // Build update object — only include fields that were provided
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof newsletter_opted_in === "boolean") updates.newsletter_opted_in = newsletter_opted_in;
    if (frequency) updates.frequency = frequency;
    if (interests) updates.interests = interests;

    let query;
    if (token) {
      query = supabase.from("email_preferences").update(updates).eq("unsubscribe_token", token);
    } else {
      const normalizedEmail = email.toLowerCase().trim();
      // Upsert: create if doesn't exist
      const { data: existing } = await supabase
        .from("email_preferences")
        .select("id")
        .eq("email", normalizedEmail)
        .single();

      if (existing) {
        query = supabase.from("email_preferences").update(updates).eq("email", normalizedEmail);
      } else {
        query = supabase.from("email_preferences").insert({
          email: normalizedEmail,
          newsletter_opted_in: newsletter_opted_in !== false,
          frequency: frequency || "biweekly",
          interests: interests || ["city-dives", "roundups", "guides"],
        });
      }
    }

    const { error } = await query;
    if (error) {
      console.error("[EmailPreferences] Update error:", error);
      return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EmailPreferences] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
