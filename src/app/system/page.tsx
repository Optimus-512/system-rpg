"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/src/components/providers";
import { AuthShell } from "@/src/components/auth-shell";
import { ATTRIBUTES } from "@/src/lib/game";

function StatBar({ label, icon, value, color, delay }: { label: string; icon: string; value: number; color: string; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.min(100, (value / 60) * 100)), 150);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-system text-[0.65rem] uppercase tracking-[0.2em]" style={{ color }}>
          {icon} {label}
        </span>
        <span className="font-system text-xs font-bold text-slate-200">{value}</span>
      </div>
      <div className="xp-track" style={{ height: 7 }}>
        <motion.div
          className="xp-fill"
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: `linear-gradient(90deg, ${color}66, ${color})`, boxShadow: `0 0 10px ${color}88` }}
        />
      </div>
    </div>
  );
}

function StatusWindow() {
  const { user, stats } = useGame();

  if (!user || !stats) {
    return (
      <div className="system-window p-6">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton mt-6 h-8 w-full" />
        <div className="skeleton mt-3 h-24 w-full" />
      </div>
    );
  }

  const attrs = [
    { ...ATTRIBUTES.INTELLECT, value: user.intellect },
    { ...ATTRIBUTES.STRENGTH, value: user.strength },
    { ...ATTRIBUTES.DISCIPLINE, value: user.discipline },
    { ...ATTRIBUTES.BOND, value: user.bond },
  ];

  const equipped = user.inventory.find((i) => i.equipped && i.item?.type === "WEAPON");
  const directiveDone = stats.questDoneToday;

  return (
    <div className="space-y-5">
      {/* ── Identity window ── */}
      <section className="system-window materialize" aria-labelledby="status-heading">
        <div className="window-head">
          <span id="status-heading" className="window-title">◈ Status Window</span>
          <span className="text-[0.6rem] uppercase tracking-widest text-slate-500">Daily Report</span>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="font-system text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">{user.title}</p>
              <h1 className="mt-1 font-system text-3xl font-black text-sky-100 text-glow">{user.username}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="chip">
                  <span className="text-sky-300">LV.</span> {user.level}
                </span>
                <span className="chip">
                  <span className="text-amber-300">◉</span> {user.gold} G
                </span>
                <span className="chip">
                  <span className="text-orange-300">▲</span> {user.currentStreak}d streak <span className="text-slate-600">(best {user.longestStreak}d)</span>
                </span>
                <span className="chip">
                  <span className="text-rose-300">⚔</span> ATK {stats.attack}
                </span>
                <span className="chip">
                  <span className="text-violet-300">✦</span> Power {stats.power}
                </span>
              </div>
            </div>

            {/* Big rank sigil */}
            <div className="relative flex h-24 w-24 items-center justify-center" aria-hidden="true">
              <motion.span
                className="rank-badge absolute inset-0 text-4xl"
                style={{
                  color: stats.rankMeta.color,
                  boxShadow: `0 0 30px ${stats.rankMeta.color}44, inset 0 0 20px ${stats.rankMeta.color}22`,
                }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                {user.rank === "NATIONAL" ? "★" : user.rank}
              </motion.span>
            </div>
          </div>

          {/* XP */}
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between font-system text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
              <span>Level {user.level}</span>
              <span>
                {user.xp} / {stats.xpNeeded} XP · {stats.xpPercent}%
              </span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${stats.xpPercent}%` }} />
            </div>
            {stats.nextRank && (
              <p className="mt-2 text-[0.68rem] text-slate-500">
                Rank <span style={{ color: "#a78bfa" }}>{stats.nextRank.rank}</span> opens at Level {stats.nextRank.minLevel} —{" "}
                {stats.nextRank.levelsAway} more level{stats.nextRank.levelsAway === 1 ? "" : "s"}.
              </p>
            )}
          </div>

          {/* Multipliers */}
          <p className="mt-4 text-[0.68rem] text-slate-500">
            Relic bonus: <span className="text-emerald-300">×{stats.multipliers.xpMult.toFixed(2)} XP</span> ·{" "}
            <span className="text-amber-300">×{stats.multipliers.goldMult.toFixed(2)} Gold</span>
          </p>
        </div>
      </section>

      {/* ── Attributes + Daily directive ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="system-window materialize" aria-labelledby="attr-heading" style={{ animationDelay: "0.1s" }}>
          <div className="window-head">
            <span id="attr-heading" className="window-title">◈ Attributes</span>
          </div>
          <div className="space-y-4 p-6">
            {attrs.map((a, i) => (
              <StatBar key={a.key} label={a.label} icon={a.icon} value={a.value} color={a.color} delay={0.15 + i * 0.08} />
            ))}
            <p className="pt-1 text-[0.68rem] text-slate-500">Complete quests to raise these. Your attributes amplify gate damage.</p>
          </div>
        </section>

        <section className="system-window materialize" aria-labelledby="directive-heading" style={{ animationDelay: "0.2s" }}>
          <div className="window-head">
            <span id="directive-heading" className="window-title">◈ Daily Directive</span>
            <span className={`text-[0.6rem] uppercase tracking-widest ${directiveDone ? "text-emerald-300" : "text-rose-300"}`}>
              {directiveDone ? "Secured" : "Pending"}
            </span>
          </div>
          <div className="p-6">
            {directiveDone ? (
              <div>
                <p className="text-sm leading-relaxed text-slate-300">
                  Today&apos;s quest is complete. The chain holds at{" "}
                  <span className="text-orange-300">{user.currentStreak} day{user.currentStreak === 1 ? "" : "s"}</span>.
                  Tomorrow the System expects you again — the streak multiplier protects all future rewards.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link href="/quests" className="btn">More Quests</Link>
                  <Link href="/gates" className="btn btn-ghost">Hunt the Gates</Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-relaxed text-slate-300">
                  No quest completed today.
                  {user.currentStreak >= 3
                    ? ` Your ${user.currentStreak}-day streak is exposed — one quest preserves the multiplier.`
                    : " The System does not beg. It simply watches."}
                </p>
                <Link href="/quests" className="btn mt-4 pulse-glow">
                  Accept a Quest Now
                </Link>
              </div>
            )}

            {equipped?.item && (
              <div className="mt-5 border-t border-sky-400/10 pt-4">
                <p className="font-system text-[0.6rem] uppercase tracking-[0.25em] text-slate-500">Equipped</p>
                <p className="mt-1.5 text-sm text-sky-100">
                  {equipped.item.icon} {equipped.item.name}
                  <span className="ml-2 text-[0.68rem] text-slate-500">
                    {equipped.item.tempHours ? "forged · temporary" : `ATK +${equipped.item.atk ?? 0}`}
                  </span>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SystemPage() {
  return (
    <AuthShell>
      <StatusWindow />
    </AuthShell>
  );
}
