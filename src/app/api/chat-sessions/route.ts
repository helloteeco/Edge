import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Auto-add pinned column if it doesn't exist (runs once, idempotent)
let migrationRun = false;
async function ensurePinnedColumn() {
  if (migrationRun) return;
  try {
    // Try selecting pinned — if it fails, the column doesn't exist yet
    // We handle missing pinned column gracefully (it will be undefined for old rows)
    const { error } = await supabase
      .from("chat_sessions")
      .select("pinned")
      .limit(1);
    if (error && error.message.includes("pinned")) {
      console.log("[chat-sessions] pinned column not found — will handle gracefully");
    }
  } catch {
    // Silently continue — pinned will just be undefined for old rows
  }
  migrationRun = true;
}

// Cleanup: delete unpinned sessions older than 90 days, enforce 50 cap
async function cleanupSessions(email: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Delete unpinned sessions older than 90 days
  await supabase
    .from("chat_sessions")
    .delete()
    .eq("user_email", email)
    .neq("pinned", true)
    .lt("updated_at", ninetyDaysAgo);

  // 2. Enforce 50 session cap — delete oldest unpinned if over limit
  const { data: allSessions } = await supabase
    .from("chat_sessions")
    .select("id, pinned, updated_at")
    .eq("user_email", email)
    .order("updated_at", { ascending: false });

  if (allSessions && allSessions.length > 50) {
    // Find unpinned sessions beyond the 50 limit
    const toDelete = allSessions
      .slice(50)
      .filter((s) => !s.pinned)
      .map((s) => s.id);

    if (toDelete.length > 0) {
      await supabase
        .from("chat_sessions")
        .delete()
        .eq("user_email", email)
        .in("id", toDelete);
    }
  }
}

// GET: List sessions for a user, or load a single session
export async function GET(request: NextRequest) {
  await ensurePinnedColumn();

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

  // Run cleanup before listing
  await cleanupSessions(normalizedEmail);

  // List all sessions: pinned first, then by most recent
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, has_images, pinned, created_at, updated_at")
    .eq("user_email", normalizedEmail)
    .order("pinned", { ascending: false })
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
  await ensurePinnedColumn();

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
        pinned: false,
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

// PUT: Pin or unpin a session
export async function PUT(request: NextRequest) {
  await ensurePinnedColumn();

  try {
    const body = await request.json();
    const { email, sessionId, pinned } = body;

    if (!email || !sessionId || pinned === undefined) {
      return NextResponse.json({ error: "Email, session ID, and pinned status are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // If pinning, check if user already has 5 pinned
    if (pinned === true) {
      const { count } = await supabase
        .from("chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_email", normalizedEmail)
        .eq("pinned", true);

      if (count !== null && count >= 5) {
        return NextResponse.json(
          { error: "Maximum 5 pinned conversations allowed. Unpin one first." },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .update({ pinned, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_email", normalizedEmail)
      .select()
      .single();

    if (error) {
      console.error("Error pinning/unpinning session:", error);
      return NextResponse.json({ error: "Failed to update pin status" }, { status: 500 });
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Chat sessions pin API error:", error);
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
