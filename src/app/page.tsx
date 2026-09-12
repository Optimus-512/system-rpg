import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "THE SYSTEM — Your Life Is the Game",
  description:
    "The start of every great story is the day you stop waiting. Turn real quests into XP, forge weapons, break Gates, and rise from E-Rank to Shadow Monarch.",
};

const RANKS_PREVIEW = [
  { r: "E", label: "Awakened Nobody", color: "#9aa3b2" },
  { r: "D", label: "Aspirant", color: "#4ade80" },
  { r: "C", label: "Quest Seeker", color: "#38bdf8" },
  { r: "B", label: "Dungeon Raider", color: "#a78bfa" },
  { r: "A", label: "Ace Hunter", color: "#fbbf24" },
  { r: "S", label: "Sovereign Candidate", color: "#fb7185" },
  { r: "★", label: "Shadow Monarch", color: "#c084fc" },
];

const GATES_PREVIEW = [
  { icon: "🌳", name: "The Weakening Willow", break: "Gym · Running · Training → Spear of Strength" },
  { icon: "🦑", name: "The Leech of Loneliness", break: "Call family · Meet friends → Chain of Bonds" },
  { icon: "🧿", name: "The Mind Leech", break: "Study · Deep work → Lumen Codex" },
  { icon: "🛡️", name: "Iron Laziness", break: "Wake early · No scrolling → Iron Will Blade" },
];

export default function Landing() {
  return (
    <div className="relative">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <p
          className="materialize font-system text-[0.65rem] uppercase tracking-[0.5em] text-sky-400/80 sm:text-xs"
          style={{ animationDelay: "0.1s" }}
        >
          ◈ Notification ◈
        </p>

        <h1
          className="materialize font-system mt-6 text-4xl font-black leading-tight text-sky-100 text-glow sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "0.35s" }}
        >
          THE SYSTEM
        </h1>

        <p
          className="materialize mt-4 max-w-xl text-base text-slate-400 sm:text-lg"
          style={{ animationDelay: "0.6s" }}
        >
          The start of every great story is the day you stop waiting.
          <br />
          Your real quests — study, training, discipline, connection —
          <br className="hidden sm:block" /> become XP. Weapons. Gates that break.
        </p>

        <p
          className="materialize mt-8 font-system text-xs uppercase tracking-[0.3em] text-slate-500"
          style={{ animationDelay: "0.8s" }}
        >
          You have acquired the qualifications to be a Player.
        </p>

        <div className="materialize mt-10 flex flex-col items-center gap-3 sm:flex-row" style={{ animationDelay: "1s" }}>
          <Link href="/login?mode=register" className="btn pulse-glow !px-10 !py-4 !text-sm">
            Begin Your Awakening
          </Link>
          <Link href="/login" className="btn btn-ghost !px-8 !py-4">
            I Have Already Awakened
          </Link>
        </div>

        <div className="materialize mt-14 flex max-w-2xl flex-wrap justify-center gap-2" style={{ animationDelay: "1.2s" }} aria-label="Hunter ranks">
          {RANKS_PREVIEW.map((r) => (
            <span
              key={r.r}
              className="rank-badge px-3 py-1.5 text-xs"
              style={{ color: r.color, boxShadow: `0 0 12px ${r.color}33` }}
              title={r.label}
            >
              {r.r}
              <span className="ml-2 hidden font-body text-[0.65rem] normal-case tracking-normal opacity-80 sm:inline">
                {r.label}
              </span>
            </span>
          ))}
        </div>

        <div className="mt-16 animate-bounce text-sky-400/50" aria-hidden="true">▼</div>
      </section>

      {/* ── THE GATES ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6" aria-labelledby="gates-heading">
        <p className="text-center font-system text-[0.65rem] uppercase tracking-[0.4em] text-rose-400/80">
          ⚠ Danger Detected ⚠
        </p>
        <h2 id="gates-heading" className="mt-4 text-center font-system text-2xl font-bold text-sky-100 sm:text-3xl">
          The Gates Are Open
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-slate-400">
          They are the living shape of every skipped day. They cannot be bribed, ignored, or postponed.
          Each one falls only to a weapon forged by real-world action.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {GATES_PREVIEW.map((g, i) => (
            <div key={g.name} className="system-window scan gate-card p-5" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center gap-3">
                <span className="text-3xl float-y" aria-hidden="true" style={{ animationDelay: `${i * 0.4}s` }}>
                  {g.icon}
                </span>
                <h3 className="font-system text-sm uppercase tracking-[0.15em] text-sky-100">{g.name}</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                <span className="text-rose-300/90">Weakness:</span> {g.break}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE LOOP ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-32 sm:px-6" aria-labelledby="loop-heading">
        <h2 id="loop-heading" className="text-center font-system text-2xl font-bold text-sky-100 sm:text-3xl">
          The Loop That Changes You
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-4">
          {[
            { step: "01", title: "Accept Quest", body: "Name the real thing you keep postponing. Give it a rank." },
            { step: "02", title: "Complete It", body: "One checkbox. The System pays out XP, gold, streaks, and forges a weapon." },
            { step: "03", title: "Break the Gate", body: "Spend the weapon on the boss that feeds on your avoidance." },
            { step: "04", title: "Ascend", body: "Level up. Rank up. Armor your life in momentum instead of excuses." },
          ].map((s) => (
            <div key={s.step} className="system-window p-5">
              <p className="font-system text-2xl font-black text-sky-400/30">{s.step}</p>
              <h3 className="mt-2 font-system text-xs uppercase tracking-[0.2em] text-sky-200">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/login?mode=register" className="btn btn-gold !px-12 !py-4 !text-sm">
            Arise
          </Link>
        </div>
      </section>

      <footer className="border-t border-sky-400/10 py-8 text-center">
        <p className="font-system text-[0.6rem] uppercase tracking-[0.3em] text-slate-600">
          THE SYSTEM · Your life is the game · Keep playing
        </p>
      </footer>
    </div>
  );
}
