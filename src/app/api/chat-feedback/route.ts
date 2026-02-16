import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST: Submit feedback (like/dislike) for a chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, session_id, message_index, rating, feedback_text, message_content, user_query } = body;

    if (!rating || !["up", "down"].includes(rating)) {
      return NextResponse.json({ error: "Invalid rating. Must be 'up' or 'down'." }, { status: 400 });
    }

    if (typeof message_index !== "number" || message_index < 0) {
      return NextResponse.json({ error: "Invalid message_index." }, { status: 400 });
    }

    // Check if user already rated this specific message
    if (email && session_id) {
      const { data: existing } = await supabase
        .from("chat_feedback")
        .select("id, rating")
        .eq("user_email", email)
        .eq("session_id", session_id)
        .eq("message_index", message_index)
        .maybeSingle();

      if (existing) {
        // If same rating, remove it (toggle off)
        if (existing.rating === rating) {
          await supabase.from("chat_feedback").delete().eq("id", existing.id);
          return NextResponse.json({ status: "removed", rating: null });
        }
        // If different rating, update it
        const { error } = await supabase
          .from("chat_feedback")
          .update({ rating, feedback_text: feedback_text || null })
          .eq("id", existing.id);
        if (error) throw error;
        return NextResponse.json({ status: "updated", rating });
      }
    }

    // Insert new feedback
    const { error } = await supabase.from("chat_feedback").insert({
      user_email: email || null,
      session_id: session_id || null,
      message_index,
      rating,
      feedback_text: feedback_text || null,
      message_content: message_content ? message_content.slice(0, 2000) : null,
      user_query: user_query ? user_query.slice(0, 500) : null,
    });

    if (error) throw error;

    return NextResponse.json({ status: "created", rating });
  } catch (err) {
    console.error("[chat-feedback] Error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

// GET: Get feedback for a session (to restore UI state)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const session_id = searchParams.get("session_id");

  if (!email || !session_id) {
    return NextResponse.json({ feedback: {} });
  }

  try {
    const { data, error } = await supabase
      .from("chat_feedback")
      .select("message_index, rating")
      .eq("user_email", email)
      .eq("session_id", session_id);

    if (error) throw error;

    // Return as a map: { messageIndex: rating }
    const feedbackMap: Record<number, string> = {};
    (data || []).forEach((row: { message_index: number; rating: string }) => {
      feedbackMap[row.message_index] = row.rating;
    });

    return NextResponse.json({ feedback: feedbackMap });
  } catch (err) {
    console.error("[chat-feedback] Error:", err);
    return NextResponse.json({ feedback: {} });
  }
}
