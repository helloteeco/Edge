import { NextResponse } from "next/server";
import { saveQuizLead } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, quizAnswers, recommendedMethods } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const success = await saveQuizLead(email, quizAnswers || {}, recommendedMethods || []);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save quiz lead" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in quiz-leads API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
