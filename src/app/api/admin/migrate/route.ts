import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// One-time migration endpoint to add is_admin column
// Visit: https://edge.teeco.co/api/admin/migrate?password=YOUR_ADMIN_PASSWORD
// This is safe to run multiple times (uses IF NOT EXISTS)

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  const ADMIN_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "teeco2024admin";

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Add is_admin column if it doesn't exist
    const { error: err1 } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"
    });

    if (err1) {
      // If RPC doesn't exist, try direct approach
      // Supabase doesn't support raw SQL via the client library without an RPC
      // So we'll use a workaround: try to select is_admin and if it fails, we know it doesn't exist
      const { error: checkErr } = await supabase
        .from("users")
        .select("is_admin")
        .limit(1);

      if (checkErr && checkErr.message.includes("is_admin")) {
        results.push("❌ is_admin column does NOT exist yet. You need to add it manually in Supabase SQL Editor.");
        results.push("Run this SQL: ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;");
      } else if (checkErr) {
        results.push(`⚠️ Error checking column: ${checkErr.message}`);
      } else {
        results.push("✅ is_admin column already exists!");
      }
    } else {
      results.push("✅ Migration successful - is_admin column added");
    }

    // Try to verify the column exists
    const { data, error: verifyErr } = await supabase
      .from("users")
      .select("email, is_admin")
      .limit(1);

    if (verifyErr) {
      results.push(`⚠️ Verification: ${verifyErr.message}`);
    } else {
      results.push(`✅ Verification: Column accessible. Sample: ${JSON.stringify(data)}`);
    }

    return NextResponse.json({ 
      success: true, 
      results,
      instructions: "If the column doesn't exist, go to supabase.com → your project → SQL Editor and run: ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Migration failed", 
      details: String(error),
      instructions: "Go to supabase.com → your project → SQL Editor and run: ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"
    }, { status: 500 });
  }
}
