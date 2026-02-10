import { NextResponse } from "next/server";
import { saveCoachingLead } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, budget, timeline, experience, source } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const success = await saveCoachingLead(
      email,
      budget || "",
      timeline || "",
      experience || "",
      source || "assistant"
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save coaching lead" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in coaching-leads API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
