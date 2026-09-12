"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/src/components/providers";
import { AuthShell } from "@/src/components/auth-shell";

interface GateView {
  id: string;
  name: string;
  epithet: string;
  hp: number;
  icon: string;
  desc: string;
  danger: string;
  requiredItemId: string;
  attribute: string;
  rewardXp: number;
  rewardGold: number;
  quote: string;
  hasWeapon: boolean;
  weaponName: string;
  attrLevel: number;
  yourDamage: number;
  oneShot: boolean;
  hitsNeeded: number;
  defeats: number;
  attempts: number;
}

interface AttackResult {
  victory: boolean;
  dealt: number;
  reason: string | null;
  rewards: { xp: number; gold: number } | null;
  durabilityNote: string | null;
  bossQuote: string | null;
  message?: string;
}

function GatesInner() {
  const { notify, applyCharacter, celebrateLevelUp, refreshCharacter } = useGame();
  const [gates, setGates] = useState<GateView[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ gate: GateView; r: AttackResult } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/gates", { cache: "no-store" });
      if (res.ok) setGates((await res.json()).gates);
    } catch {
      notify({ title: "Connection lost", body: "The Gates are unreachable.", kind: "danger" });
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function attack(gate: GateView) {
    if (busyId) return;
    setBusyId(gate.id);
    setShakingId(gate.id);
    try {
      const res = await fetch("/api/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateId: gate.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify({ title: "The Gate rejects you", body: data.error, kind: "danger" });
        return;
      }
      setResult({ gate, r: data });
      if (data.character) applyCharacter(data.character);
      if (data.victory) {
        notify({
          title: `Gate cleared: ${gate.name}`,
          body: `+${data.rewards.xp} XP · +${data.rewards.gold} gold`,
          kind: "gold",
        });
      }
    } catch {
      notify({ title: "The connection wavered", body: "Your strike never landed. Try again.", kind: "danger" });
    } finally {
      setBusyId(null);
      setTimeout(() => setShakingId(null), 600);
      refreshCharacter();
      load();
    }
  }

  return (
    <div className="space-y-5">
      <div className="materialize">
        <h1 className="font-system text-xl font-black text-sky-100 text-glow">◈ Gates</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Each Gate is a manifestation of a sedentary life. Willpower alone passes through them like smoke —
          only weapons <span className="text-sky-300">forged by real-world quests</span> deal true damage.
        </p>
      </div>

      {gates === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-64 w-full" />
          <div className="skeleton h-64 w-full" />
          <div className="skeleton h-64 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {gates.map((gate, i) => {
            const locked = !gate.hasWeapon;
            return (
              <motion.article
                key={gate.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`system-window gate-card relative overflow-hidden ${locked ? "gate-locked" : ""} ${
                  shakingId === gate.id ? "boss-shake" : ""
                }`}
              >
                <div className="window-head">
                  <span className="window-title">
                    {gate.danger}-Rank Gate
                  </span>
                  <span className="text-[0.6rem] uppercase tracking-widest text-slate-500">
                    {gate.defeats > 0 ? `Cleared ×${gate.defeats}` : "Uncleared"}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <motion.span
                      className="text-5xl"
                      aria-hidden="true"
                      animate={locked ? {} : { y: [0, -6, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {gate.icon}
                    </motion.span>
                    <div className="min-w-0">
                      <h2 className="font-system text-sm font-bold uppercase tracking-[0.12em] text-sky-100">
                        {gate.name}
                      </h2>
                      <p className="mt-0.5 text-[0.68rem] italic text-slate-500">{gate.epithet}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-400">{gate.desc}</p>

                  {/* HP bar */}
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between font-system text-[0.6rem] uppercase tracking-[0.2em] text-slate-500">
                      <span>HP {gate.hp}</span>
                      <span className={locked ? "text-rose-400" : "text-emerald-300"}>
                        Your strike: {locked ? "0" : gate.yourDamage}
                        {!locked && gate.oneShot ? " · ONE-SHOT" : !locked ? ` · ${gate.hitsNeeded} hits` : ""}
                      </span>
                    </div>
                    <div className="xp-track" style={{ height: 7 }}>
                      <div
                        className="xp-fill"
                        style={{
                          width: `${Math.min(100, ((locked ? 0 : gate.yourDamage) / gate.hp) * 100)}%`,
                          background: locked
                            ? "linear-gradient(90deg, #7f1d1d88, #fb7185)"
                            : "linear-gradient(90deg, #fb718588, #fb7185)",
                          boxShadow: "0 0 10px rgba(251,113,133,0.6)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Requirement */}
                  <div className={`mt-3 border px-3 py-2 text-xs ${locked ? "border-rose-400/30 bg-rose-400/5 text-rose-300" : "border-emerald-400/30 bg-emerald-400/5 text-emerald-300"}`}>
                    {locked ? (
                      <>🔒 Requires: <strong>{gate.weaponName}</strong> — complete a{" "}
                        <span className="capitalize">{gate.attribute.toLowerCase()}</span> quest to forge it.
                      </>
                    ) : (
                      <>⚔ {gate.weaponName} in your grasp. {gate.attribute} lvl {gate.attrLevel} amplifies your strike.</>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[0.65rem] text-slate-500">
                      Bounty: <span className="text-sky-300">{gate.rewardXp} XP</span> ·{" "}
                      <span className="text-amber-300">{gate.rewardGold} G</span>
                    </p>
                    <button
                      onClick={() => attack(gate)}
                      disabled={busyId === gate.id || busyId !== null}
                      className={`btn ${locked ? "btn-danger" : "btn-gold"} !px-5`}
                      aria-label={`${locked ? "Strike" : "Challenge"} ${gate.name}`}
                    >
                      {busyId === gate.id ? "Striking…" : locked ? "Strike Anyway" : "Challenge"}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* ── Battle result modal ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setResult(null)}
            role="dialog"
            aria-label="Gate battle result"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30, filter: "blur(8px)" }}
              animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="system-window w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="window-head">
                <span className="window-title">{result.r.victory ? "◈ Gate Cleared" : "◈ Strike Deflected"}</span>
                <span className="text-[0.6rem] tracking-widest text-slate-500">{result.gate.name}</span>
              </div>
              <div className="p-6 text-center">
                <motion.p
                  className="text-6xl"
                  aria-hidden="true"
                  animate={result.r.victory ? { scale: [0.6, 1.15, 1], rotate: [0, 8, 0] } : { x: [0, -8, 8, 0] }}
                  transition={{ duration: 0.6 }}
                >
                  {result.r.victory ? "💥" : result.gate.icon}
                </motion.p>

                {result.r.victory ? (
                  <>
                    <p className="mt-3 font-system text-lg font-black uppercase tracking-[0.2em] text-amber-300 text-glow-gold">
                      Victory
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      You dealt <span className="text-rose-300">{result.r.dealt}</span> damage. The {result.gate.name} dissolves into motes of light.
                    </p>
                    <p className="mt-3 font-system text-sm">
                      <span className="text-sky-300">+{result.r.rewards?.xp} XP</span> ·{" "}
                      <span className="text-amber-300">+{result.r.rewards?.gold} G</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 font-system text-sm uppercase tracking-[0.2em] text-rose-300 text-glow-danger">
                      The Gate Endures
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {result.r.reason ?? `You dealt ${result.r.dealt} of ${result.gate.hp} damage.`}
                    </p>
                    <p className="mt-4 border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs italic text-rose-200/90">
                      {result.r.bossQuote ?? result.gate.quote}
                    </p>
                  </>
                )}

                {result.r.durabilityNote && (
                  <p className="mt-3 text-[0.68rem] text-slate-500">{result.r.durabilityNote}</p>
                )}

                <button onClick={() => setResult(null)} className="btn mt-6 w-full">
                  Return
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GatesPage() {
  return (
    <AuthShell>
      <GatesInner />
    </AuthShell>
  );
}
