import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight analytics endpoint for tracking user engagement events.
 * Currently logs to console (visible in Vercel logs) and could be extended
 * to write to Supabase or any analytics service.
 *
 * Events are fire-and-forget from the client — never blocks the UI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, tab, detail } = body;

    if (!event || !tab) {
      return NextResponse.json({ error: "Missing event or tab" }, { status: 400 });
    }

    // Log to server console (visible in Vercel function logs)
    console.log(
      `[Analytics] ${new Date().toISOString()} | ${event} | tab=${tab}${detail ? ` | detail=${detail}` : ""}`
    );

    // Future: write to Supabase analytics table
    // await supabase.from('analytics_events').insert({ event, tab, detail, created_at: new Date() });

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail loudly — analytics should be invisible
    return NextResponse.json({ ok: true });
  }
}
