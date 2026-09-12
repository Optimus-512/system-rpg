"use client";

import React, { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "./providers";

// ── Toasts ──────────────────────────────────────────────────────────
export function Notifications() {
  const { toasts } = useGame();

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed right-4 top-20 z-[90] flex w-[min(92vw,340px)] flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 40, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={`toast px-4 py-3 ${t.kind === "danger" ? "!border-rose-400/50" : t.kind === "gold" ? "!border-amber-400/50" : ""}`}
          >
            <p
              className={`font-system text-[0.7rem] uppercase tracking-[0.2em] ${
                t.kind === "danger" ? "text-rose-300" : t.kind === "gold" ? "text-amber-300" : t.kind === "reward" ? "text-emerald-300" : "text-sky-300"
              }`}
            >
              <span className="mr-2 opacity-60">◆</span>
              {t.title}
            </p>
            {t.body && <p className="mt-1 text-sm leading-snug text-slate-300">{t.body}</p>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Level Up overlay ────────────────────────────────────────────────
function Particles({ color }: { color: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = (i / 26) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 90 + Math.random() * 150;
        return {
          px: `${Math.cos(angle) * dist}px`,
          py: `${Math.sin(angle) * dist}px`,
          size: 3 + Math.random() * 4,
          delay: Math.random() * 0.25,
          color,
        };
      }),
    [color]
  );
  return (
    <>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 8px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.px, y: p.py, opacity: 0, scale: 0.2 }}
          transition={{ duration: 1.1 + Math.random() * 0.5, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

export function LevelUpOverlay() {
  const { levelUp, clearLevelUp } = useGame();

  useEffect(() => {
    if (!levelUp) return;
    const t = window.setTimeout(clearLevelUp, 3600);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") clearLevelUp();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [levelUp, clearLevelUp]);

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearLevelUp}
          role="alert"
          aria-label={`Level up! You are now level ${levelUp.level}${levelUp.rank ? `, rank ${levelUp.rank}` : ""}`}
        >
          <div className="relative flex flex-col items-center text-center">
            <Particles color={levelUp.rank ? "#c084fc" : "#38bdf8"} />

            {/* Expanding rings */}
            {[0, 0.25, 0.5].map((d) => (
              <motion.span
                key={d}
                className={`absolute left-1/2 top-1/2 h-56 w-56 rounded-full border ${levelUp.rank ? "border-purple-400/60" : "border-sky-400/60"}`}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 1.2, delay: d, ease: "easeOut" }}
              />
            ))}

            <motion.p
              className={`font-system text-sm uppercase tracking-[0.5em] ${levelUp.rank ? "text-purple-300 text-glow" : "text-sky-300 text-glow"}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {levelUp.rank ? "Rank Ascension" : "Level Up"}
            </motion.p>

            <motion.h1
              className={`font-system mt-2 text-6xl font-black sm:text-8xl ${levelUp.rank ? "text-purple-200 text-glow" : "text-sky-100 text-glow"}`}
              initial={{ scale: 0.6, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
            >
              LV. {levelUp.level}
            </motion.h1>

            {levelUp.rank && (
              <motion.p
                className="font-system mt-2 text-2xl font-bold uppercase tracking-[0.3em] text-purple-300 text-glow"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                RANK {levelUp.rank}
              </motion.p>
            )}

            <motion.p
              className="mt-4 max-w-xs text-sm text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              The System acknowledges your growth. Continue, Player.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
