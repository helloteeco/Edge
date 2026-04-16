import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function isConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _client = createClient(url, key);
  }
  return _client;
}

// ── Auth helpers ──

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  companyName: string
) {
  const sb = getSupabase();

  // 1. Create auth user
  const { data: authData, error: authErr } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (authErr) throw authErr;
  if (!authData.user) throw new Error("Signup failed");

  // 2. Create or find company
  let companyId: string;
  const { data: existing } = await sb
    .from("companies")
    .select("id")
    .eq("name", companyName)
    .maybeSingle();

  if (existing) {
    companyId = existing.id;
  } else {
    const { data: newCo, error: coErr } = await sb
      .from("companies")
      .insert({ name: companyName })
      .select("id")
      .single();
    if (coErr) throw coErr;
    companyId = newCo.id;
  }

  // 3. Create profile
  const { error: profErr } = await sb.from("profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    email,
    company_id: companyId,
    role: "designer",
  });
  if (profErr) throw profErr;

  return authData;
}

export async function signIn(email: string, password: string) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = getSupabase();
  await sb.auth.signOut();
}

export async function getCurrentSession() {
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session;
}

export async function getCurrentProfile() {
  const sb = getSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("profiles")
    .select("*, companies(id, name, invite_code)")
    .eq("id", user.id)
    .single();
  return data;
}

export async function joinCompanyByCode(inviteCode: string) {
  const sb = getSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: company, error: findErr } = await sb
    .from("companies")
    .select("id")
    .eq("invite_code", inviteCode)
    .single();
  if (findErr || !company) throw new Error("Invalid invite code");

  const { error } = await sb
    .from("profiles")
    .update({ company_id: company.id })
    .eq("id", user.id);
  if (error) throw error;
}

// ── Database operations ──

export async function dbGetProjects() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function dbGetProject(id: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function dbSaveProject(
  project: {
    id: string;
    name: string;
    status: string;
    data: Record<string, unknown>;
    updatedAt: string;
  },
  companyId: string,
  userId: string
) {
  const sb = getSupabase();
  const { error } = await sb.from("projects").upsert(
    {
      id: project.id,
      company_id: companyId,
      created_by: userId,
      name: project.name,
      status: project.status,
      data: project.data,
      updated_at: project.updatedAt,
    },
    { onConflict: "id" }
  );
  if (error) console.error("dbSaveProject error:", error);
}

export async function dbDeleteProject(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) console.error("dbDeleteProject error:", error);
}

// ── Chat ──

export async function dbSendMessage(
  projectId: string,
  userId: string,
  message: string
) {
  const sb = getSupabase();
  const { error } = await sb
    .from("chat_messages")
    .insert({ project_id: projectId, user_id: userId, message });
  if (error) throw error;
}

export async function dbGetMessages(projectId: string, limit = 100) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("chat_messages")
    .select("*, profiles(full_name, email)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export function subscribeToChat(
  projectId: string,
  callback: (msg: Record<string, unknown>) => void
) {
  const sb = getSupabase();
  const channel = sb
    .channel(`chat-${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

// ── Activity Log ──

export async function dbLogActivity(
  projectId: string,
  userId: string,
  action: string,
  details?: string
) {
  const sb = getSupabase();
  await sb
    .from("activity_log")
    .insert({ project_id: projectId, user_id: userId, action, details });
}

export async function dbGetActivity(projectId: string, limit = 50) {
  const sb = getSupabase();
  const { data } = await sb
    .from("activity_log")
    .select("*, profiles(full_name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ── Team ──

export async function dbGetTeamMembers(companyId: string) {
  const sb = getSupabase();
  const { data } = await sb
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, created_at")
    .eq("company_id", companyId)
    .order("created_at");
  return data ?? [];
}

// ── Realtime project sync ──

export function subscribeToProject(
  projectId: string,
  callback: (project: Record<string, unknown>) => void
) {
  const sb = getSupabase();
  const channel = sb
    .channel(`project-${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "projects",
        filter: `id=eq.${projectId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}
