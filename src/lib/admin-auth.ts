import { NextRequest, NextResponse } from "next/server";

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getAdminPassword(): string | undefined {
  return nonEmpty(process.env.ADMIN_PASSWORD);
}

export function adminPasswordMatches(password: string | null | undefined): boolean {
  const expected = getAdminPassword();
  return Boolean(expected && password && password === expected);
}

/** Password-only admin routes. Missing ADMIN_PASSWORD fails closed. */
export function rejectUnlessAdminPassword(
  password: string | null | undefined
): NextResponse | null {
  if (!getAdminPassword()) {
    return NextResponse.json(
      { error: "Admin authentication is not configured" },
      { status: 500 }
    );
  }
  if (!adminPasswordMatches(password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Routes that already accepted either a Vercel cron bearer token or the admin password.
 * Succeeds only when one of those configured values matches. If neither is set, fails closed.
 */
export function authorizeCronOrPassword(request: NextRequest): NextResponse | null {
  const cronSecret = nonEmpty(process.env.CRON_SECRET);
  const authHeader = request.headers.get("authorization");
  const password = request.nextUrl.searchParams.get("password");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }
  if (adminPasswordMatches(password)) {
    return null;
  }
  if (!cronSecret && !getAdminPassword()) {
    return NextResponse.json(
      { error: "Admin authentication is not configured" },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Precache and city-refresh routes. The PriceLabs key is not accepted here.
 * Manual calls use PRECACHE_ADMIN_SECRET. Scheduled calls use CRON_SECRET.
 */
export function authorizePrecache(request: NextRequest): NextResponse | null {
  const cronSecret = nonEmpty(process.env.CRON_SECRET);
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }

  const adminSecret = nonEmpty(process.env.PRECACHE_ADMIN_SECRET);
  const provided =
    request.nextUrl.searchParams.get("secret") ||
    request.headers.get("x-api-key") ||
    (authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null);

  if (adminSecret && provided && provided === adminSecret) {
    return null;
  }
  if (!cronSecret && !adminSecret) {
    return NextResponse.json(
      { error: "Admin authentication is not configured" },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Routes protected by ADMIN_API_KEY. Missing key fails closed. */
export function rejectUnlessAdminApiKey(
  provided: string | null | undefined
): NextResponse | null {
  const expected = nonEmpty(process.env.ADMIN_API_KEY);
  if (!expected) {
    return NextResponse.json(
      { error: "Admin authentication is not configured" },
      { status: 500 }
    );
  }
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
