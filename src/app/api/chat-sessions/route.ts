import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: List sessions for a user, or load a single session
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const sessionId = searchParams.get("id");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Load single session
  if (sessionId) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_email", normalizedEmail)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session: data });
  }

  // List all sessions for user (most recent first, limit 50)
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, has_images, created_at, updated_at")
    .eq("user_email", normalizedEmail)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error listing chat sessions:", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }

  return NextResponse.json({ sessions: data || [] });
}

// POST: Create or update a session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, sessionId, title, messages, has_images } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Update existing session
    if (sessionId) {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title !== undefined) updateData.title = title;
      if (messages !== undefined) updateData.messages = messages;
      if (has_images !== undefined) updateData.has_images = has_images;

      const { data, error } = await supabase
        .from("chat_sessions")
        .update(updateData)
        .eq("id", sessionId)
        .eq("user_email", normalizedEmail)
        .select()
        .single();

      if (error) {
        console.error("Error updating chat session:", error);
        return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
      }
      return NextResponse.json({ session: data });
    }

    // Create new session
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_email: normalizedEmail,
        title: title || "New Chat",
        messages: messages || [],
        has_images: has_images || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chat session:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Chat sessions API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a session
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const sessionId = searchParams.get("id");

  if (!email || !sessionId) {
    return NextResponse.json({ error: "Email and session ID are required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_email", email.toLowerCase().trim());

  if (error) {
    console.error("Error deleting chat session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
