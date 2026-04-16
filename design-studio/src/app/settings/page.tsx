"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getUser, getProfile, syncProfile } from "@/lib/store";
import { isConfigured, dbGetTeamMembers } from "@/lib/supabase";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfileState] = useState(getProfile());
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    async function load() {
      if (isConfigured()) {
        const p = await syncProfile();
        if (p) {
          setProfileState(p);
          const m = await dbGetTeamMembers(p.companyId);
          setMembers(m as TeamMember[]);
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  function copyInvite() {
    if (profile?.inviteCode) {
      navigator.clipboard.writeText(profile.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-8 animate-in">
        <h1 className="text-2xl font-bold text-brand-900 mb-8">Settings</h1>

        {/* Profile */}
        <section className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-1/3 rounded bg-brand-900/10" />
              <div className="h-4 w-1/2 rounded bg-brand-900/5" />
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-brand-600">
                  Name
                </dt>
                <dd className="font-medium text-brand-900">
                  {profile?.name || getUser()?.name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-brand-600">
                  Email
                </dt>
                <dd className="font-medium text-brand-900">
                  {profile?.email || getUser()?.email || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-brand-600">
                  Role
                </dt>
                <dd className="font-medium text-brand-900 capitalize">
                  {profile?.role || "designer"}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Team */}
        <section className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Team</h2>
              {profile?.companyName && (
                <p className="text-sm text-brand-600">{profile.companyName}</p>
              )}
            </div>
          </div>

          {/* Invite Code */}
          {profile?.inviteCode && (
            <div className="mb-6 rounded-lg bg-amber/10 border border-amber/30 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-dark mb-2">
                Invite Code
              </div>
              <p className="text-sm text-brand-700 mb-3">
                Share this code with teammates so they can join your workspace
                during signup.
              </p>
              <div className="flex items-center gap-3">
                <code className="flex-1 rounded-lg bg-white px-4 py-2 text-lg font-mono font-bold text-brand-900 border border-brand-900/10">
                  {profile.inviteCode}
                </code>
                <button onClick={copyInvite} className="btn-accent btn-sm">
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-brand-900/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber/20 text-xs font-bold text-amber-dark">
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-brand-900">
                        {m.full_name}
                        {m.id === profile?.id && (
                          <span className="ml-1.5 text-[10px] text-brand-600">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-brand-600">{m.email}</div>
                    </div>
                  </div>
                  <span className="badge-neutral text-[10px] capitalize">{m.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-600">
              {isConfigured()
                ? "Loading team members..."
                : "Connect Supabase to see team members."}
            </p>
          )}
        </section>

        {/* Database Status */}
        <section className="card">
          <h2 className="text-lg font-semibold mb-4">System</h2>
          <div className="flex items-center gap-3 text-sm">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isConfigured() ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span className="text-brand-900 font-medium">
              {isConfigured() ? "Database Connected" : "Database Not Connected"}
            </span>
          </div>
          {!isConfigured() && (
            <p className="mt-2 text-xs text-brand-600">
              Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your
              .env.local file to enable database sync, team chat, and multi-user features.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
