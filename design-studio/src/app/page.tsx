"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/store";

export default function LandingPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) {
      router.replace("/dashboard");
      return;
    }
    setLoaded(true);
  }, [router]);

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-brand-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber text-brand-900 font-bold text-lg">
            D
          </div>
          <span className="text-lg font-bold tracking-tight">
            Design Studio
          </span>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="rounded-lg bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20"
        >
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-8 pt-24 pb-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber/20 px-4 py-1.5 text-sm text-amber-light">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          Design Automation for Vacation Rentals
        </div>

        <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Turn 80-hour designs
          <br />
          <span className="text-amber">into same-day deliverables.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-white/70 leading-relaxed">
          Upload your Matterport or Polycam scan, and Design Studio optimizes
          sleeping arrangements, auto-selects furniture, generates mood boards,
          and exports your complete design package — all from one dashboard.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={() => router.push("/login")}
            className="btn-accent text-base px-8 py-4"
          >
            Get Started
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("features");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-lg border border-white/20 px-8 py-4 text-base font-semibold transition hover:bg-white/10"
          >
            See How It Works
          </button>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 border-t border-white/10 pt-10">
          {[
            { value: "80hrs", sub: "5hrs", label: "Design turnaround" },
            { value: "12+", sub: "guests", label: "Optimized sleeping" },
            { value: "1-click", sub: "export", label: "Deliverable package" },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber">{s.value}</span>
                <span className="text-sm text-white/40">→ {s.sub}</span>
              </div>
              <div className="mt-1 text-sm text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Features */}
      <section id="features" className="bg-brand-800 px-8 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold mb-16">
            Your entire workflow, <span className="text-amber">automated.</span>
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Scan Integration",
                desc: "Link your Matterport or Polycam scan directly. Define rooms with real dimensions.",
                icon: "📐",
              },
              {
                title: "Sleep Optimizer",
                desc: "Our algorithm maximizes guest capacity with queen-over-queen bunks while keeping rooms functional.",
                icon: "🛏️",
              },
              {
                title: "Furniture Catalog",
                desc: "Browse curated vacation rental furniture. Select items per room with quantities and pricing.",
                icon: "🪑",
              },
              {
                title: "Mood Boards",
                desc: "Build visual mood boards with color palettes and style themes to share with clients.",
                icon: "🎨",
              },
              {
                title: "AI Renderings",
                desc: "Generate photorealistic room renderings from your design selections. (Coming soon)",
                icon: "✨",
              },
              {
                title: "One-Click Export",
                desc: "Export your complete furniture list as a spreadsheet with pricing, vendors, and dimensions.",
                icon: "📊",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <div className="mb-3 text-2xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-brand-900 px-8 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold mb-16">
            From scan to deliverable in <span className="text-amber">5 steps.</span>
          </h2>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Create Project",
                desc: "Enter property details, client info, and link your 3D scan.",
              },
              {
                step: "02",
                title: "Define Rooms",
                desc: "Add rooms with dimensions. The system suggests sleeping configurations.",
              },
              {
                step: "03",
                title: "Optimize Sleeping",
                desc: "Run the optimizer to maximize guest capacity. Hit 12+ with queen/queen bunks.",
              },
              {
                step: "04",
                title: "Select Furniture",
                desc: "Browse the catalog and pick items for each room. Track budget in real-time.",
              },
              {
                step: "05",
                title: "Export & Deliver",
                desc: "Generate your furniture spreadsheet, mood boards, and renderings. Done.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber/20 text-amber font-bold text-sm">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-brand-950 px-8 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-amber/20 text-xs font-bold text-amber">
              D
            </div>
            Design Studio
          </div>
          <div className="text-xs text-white/30">
            Built for interior designers who move fast.
          </div>
        </div>
      </footer>
    </div>
  );
}
