"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/src/components/providers";
import { AuthShell } from "@/src/components/auth-shell";

interface Leader {
  id: string;
  username: string;
  level: number;
  rank: string;
  title: string;
  power: number;
  position: number;
  currentStreak: number;
  wins: number;
  losses: number;
}

function rankColor(rank: string) {
  return rank === "NATIONAL" ? "#c084fc" : rank === "S" ? "#fb7185" : rank === "A" ? "#fbbf24" : rank === "B" ? "#a78bfa" : rank === "C" ? "#38bdf8" : rank === "D" ? "#4ade80" : "#9aa3b2";
}

function LeaderboardInner() {
  const { notify } = useGame();
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setLeaders(data.leaders);
          setMeId(data.me?.id ?? null);
        }
      } catch {
        notify({ title: "Connection lost", body: "The rankings are unreachable.", kind: "danger" });
      }
    })();
  }, [notify]);

  const podium = (leaders ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="materialize">
        <h1 className="font-system text-xl font-black text-sky-100 text-glow">◈ Hunter Rankings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Power = level, attributes, and duels won. The System sees all. Climb.
        </p>
      </div>

      {leaders === null ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      ) : leaders.length === 0 ? (
        <div className="system-window p-8 text-center text-sm text-slate-400">
          No hunters ranked yet. Be the first name the System records.
        </div>
      ) : (
        <>
          {/* Podium */}
          {podium.length === 3 && (
            <div className="grid grid-cols-3 items-end gap-3" aria-hidden="true">
              {[podium[1], podium[0], podium[2]].map((l, idx) => {
                const heights = ["h-20", "h-28", "h-16"];
                const colors = ["#a78bfa", "#fbbf24", "#38bdf8"];
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center"
                  >
                    <span className="rank-badge mb-2 h-9 w-9 text-sm" style={{ color: rankColor(l.rank) }}>
                      {l.rank === "NATIONAL" ? "★" : l.rank}
                    </span>
                    <p className="max-w-full truncate font-system text-[0.65rem] uppercase tracking-widest text-slate-300">
                      {l.username}
                    </p>
                    <p className="text-[0.6rem] text-slate-500">{l.power} PWR</p>
                    <div
                      className={`mt-2 w-full ${heights[idx]} rounded-t-sm border-t border-x ${idx === 1 ? "!border-amber-400/60" : "!border-sky-400/40"}`}
                      style={{
                        background: `linear-gradient(180deg, ${colors[idx]}22, transparent)`,
                        boxShadow: `0 0 24px ${colors[idx]}22`,
                      }}
                    >
                      <p className={`pt-2 text-center font-system text-lg font-black ${idx === 1 ? "text-amber-300" : "text-slate-400"}`}>
                        {l.position}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="system-window overflow-hidden materialize">
            <div className="window-head">
              <span className="window-title">◈ Full Rankings</span>
              <span className="text-[0.6rem] tracking-widest text-slate-500">{leaders.length} Hunters</span>
            </div>
            <ul>
              {leaders.map((l) => {
                const isMe = l.id === meId;
                return (
                  <li
                    key={l.id}
                    className={`flex items-center gap-3 border-b border-sky-400/5 px-4 py-3 last:border-0 sm:px-5 ${
                      isMe ? "bg-sky-400/10 !border-l-2 !border-l-sky-400" : ""
                    }`}
                  >
                    <span className={`w-8 shrink-0 text-center font-system text-sm font-bold ${l.position <= 3 ? "text-amber-300" : "text-slate-500"}`}>
                      {l.position}
                    </span>
                    <span
                      className="rank-badge h-8 w-8 shrink-0 text-xs"
                      style={{ color: rankColor(l.rank) }}
                      aria-label={`Rank ${l.rank}`}
                    >
                      {l.rank === "NATIONAL" ? "★" : l.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${isMe ? "text-sky-200" : "text-slate-200"}`}>
                        {l.username}
                        {isMe && <span className="ml-2 font-system text-[0.58rem] uppercase tracking-widest text-sky-400">(You)</span>}
                      </p>
                      <p className="truncate text-[0.65rem] text-slate-500">
                        Lv.{l.level} · {l.title}
                      </p>
                    </div>
                    <div className="hidden gap-4 text-right sm:flex">
                      <span className="chip" title="Streak">▲ {l.currentStreak}d</span>
                      <span className="chip" title="Duel record">{l.wins}W / {l.losses}L</span>
                    </div>
                    <span className="w-16 shrink-0 text-right font-system text-sm text-violet-300" title="Power score">
                      {l.power}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <AuthShell>
      <LeaderboardInner />
    </AuthShell>
  );
}
