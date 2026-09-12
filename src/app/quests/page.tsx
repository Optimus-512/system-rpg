"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/src/components/providers";
import { AuthShell } from "@/src/components/auth-shell";
import { ATTRIBUTES, DIFFICULTIES, questReward, type AttributeKey, type DifficultyKey } from "@/src/lib/game";

interface Task {
  id: string;
  title: string;
  note: string | null;
  attribute: string;
  difficulty: string;
  xp: number;
  gold: number;
  completed: boolean;
  createdAt: string;
}

const DIFF_KEYS: DifficultyKey[] = ["EASY", "NORMAL", "HARD", "BOSS"];
const ATTR_KEYS = Object.keys(ATTRIBUTES) as AttributeKey[];

function Particles({ color }: { color: string }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <span
            key={i}
            className="burst"
            style={{
              ["--px" as string]: `${Math.cos(angle) * 60}px`,
              ["--py" as string]: `${Math.sin(angle) * 60}px`,
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        );
      })}
    </>
  );
}

function QuestsInner() {
  const { user, notify, refreshCharacter, celebrateLevelUp, applyCharacter } = useGame();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [title, setTitle] = useState("");
  const [attribute, setAttribute] = useState<AttributeKey>("STRENGTH");
  const [difficulty, setDifficulty] = useState<DifficultyKey>("NORMAL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [floats, setFloats] = useState<Record<string, string[]>>({});
  const [bursts, setBursts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) setTasks((await res.json()).tasks);
    } catch {
      notify({ title: "Connection lost", body: "The System cannot reach your quests.", kind: "danger" });
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function createQuest(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      notify({ title: "The System refuses", body: "Name your quest. An unnamed quest is an excuse.", kind: "danger" });
      return;
    }
    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const preview = questReward(difficulty, user?.level ?? 1);
    setTasks((prev) => [
      {
        id: tempId, title: t, note: null, attribute, difficulty,
        xp: preview.xp, gold: preview.gold, completed: false, createdAt: new Date().toISOString(),
      },
      ...(prev ?? []),
    ]);
    setTitle("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, attribute, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks((prev) => (prev ?? []).map((x) => (x.id === tempId ? data.task : x)));
      notify({ title: "Quest accepted", body: `"${t}" enters the log. Now finish it.`, kind: "info" });
    } catch {
      setTasks((prev) => (prev ?? []).filter((x) => x.id !== tempId));
      notify({ title: "Failed to accept quest", body: "Check your connection and try again.", kind: "danger" });
    }
  }

  async function toggle(task: Task) {
    if (task.completed || busyId) return;
    setBusyId(task.id);
    // Optimistic: strike it through instantly
    setTasks((prev) => (prev ?? []).map((x) => (x.id === task.id ? { ...x, completed: true } : x)));
    setBursts((b) => ({ ...b, [task.id]: (b[task.id] ?? 0) + 1 }));
    setFloats((f) => ({ ...f, [task.id]: [...(f[task.id] ?? []), `+${task.xp} XP`] }));
    setTimeout(() => setFloats((f) => ({ ...f, [task.id]: (f[task.id] ?? []).slice(1) })), 1500);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.character) applyCharacter(data.character);
      if (data.levelUp) {
        celebrateLevelUp({ level: data.levelUp.newLevel, rank: data.rankUp?.newRank });
      }
      notify({
        title: data.grantedWeapon ? `Weapon forged: ${data.grantedWeapon}` : "Quest complete",
        body: `+${data.rewards.xp} XP · +${data.rewards.gold} gold · streak ${data.rewards.streak}d`,
        kind: "reward",
      });
    } catch {
      // Roll back on failure
      setTasks((prev) => (prev ?? []).map((x) => (x.id === task.id ? { ...x, completed: false } : x)));
      notify({ title: "The System rejected the update", body: "Your connection wavered. The quest remains open.", kind: "danger" });
    } finally {
      setBusyId(null);
      refreshCharacter();
    }
  }

  async function remove(id: string) {
    const prevTasks = tasks;
    setTasks((prev) => (prev ?? []).filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      notify({ title: "Quest abandoned", kind: "info" });
    } catch {
      setTasks(prevTasks);
      notify({ title: "Could not abandon quest", kind: "danger" });
    }
  }

  const pending = (tasks ?? []).filter((t) => !t.completed);
  const done = (tasks ?? []).filter((t) => t.completed);

  return (
    <div className="space-y-6">
      {/* ── Accept a quest ── */}
      <section className="system-window materialize" aria-labelledby="new-quest-heading">
        <div className="window-head">
          <span id="new-quest-heading" className="window-title">◈ Accept New Quest</span>
        </div>
        <form onSubmit={createQuest} className="space-y-4 p-5 sm:p-6">
          <div>
            <label htmlFor="quest-title" className="mb-1.5 block font-system text-[0.62rem] uppercase tracking-[0.2em] text-sky-300/80">
              Quest
            </label>
            <input
              id="quest-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What have you been avoiding? e.g. 30-min gym session, call mom, study chapter 4…"
              maxLength={120}
            />
          </div>

          <div>
            <span className="mb-1.5 block font-system text-[0.62rem] uppercase tracking-[0.2em] text-sky-300/80">Attribute</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Attribute">
              {ATTR_KEYS.map((k) => {
                const a = ATTRIBUTES[k];
                const active = attribute === k;
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setAttribute(k)}
                    role="radio"
                    aria-checked={active}
                    className={`system-window !rounded-sm p-3 text-left transition-all ${active ? "!border-sky-400/60" : "opacity-70 hover:opacity-100"}`}
                    style={active ? { boxShadow: `0 0 18px ${a.color}33` } : undefined}
                  >
                    <span className="text-lg" aria-hidden="true">{a.icon}</span>
                    <span className="mt-1 block font-system text-[0.6rem] uppercase tracking-[0.15em]" style={{ color: a.color }}>
                      {a.label}
                    </span>
                    <span className="mt-0.5 block text-[0.62rem] leading-tight text-slate-500">{a.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block font-system text-[0.62rem] uppercase tracking-[0.2em] text-sky-300/80">Difficulty</span>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Difficulty">
              {DIFF_KEYS.map((k) => {
                const d = DIFFICULTIES[k];
                const active = difficulty === k;
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setDifficulty(k)}
                    role="radio"
                    aria-checked={active}
                    className={`system-window !rounded-sm px-2 py-2.5 text-center transition-all ${active ? "!border-sky-400/60" : "opacity-70 hover:opacity-100"}`}
                  >
                    <span className="block font-system text-[0.65rem]" style={{ color: d.color }}>
                      {d.icon} {d.label}
                    </span>
                    <span className="block text-[0.6rem] text-slate-500">×{d.mult}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.68rem] text-slate-500">
              Reward preview: <span className="text-sky-300">+{questReward(difficulty, user?.level ?? 1).xp} XP</span> ·{" "}
              <span className="text-amber-300">+{questReward(difficulty, user?.level ?? 1).gold} G</span> · forges{" "}
              <span style={{ color: ATTRIBUTES[attribute].color }}>{ATTRIBUTES[attribute].label}</span> weapon
            </p>
            <button type="submit" className="btn">
              Accept Quest
            </button>
          </div>
        </form>
      </section>

      {/* ── Active quests ── */}
      <section aria-labelledby="active-heading">
        <h2 id="active-heading" className="mb-3 font-system text-xs uppercase tracking-[0.25em] text-slate-400">
          Active Quests · {pending.length}
        </h2>
        {tasks === null ? (
          <div className="space-y-2">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : pending.length === 0 ? (
          <div className="system-window p-6 text-center text-sm text-slate-400">
            No active quests. The System does not award the idle.
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {pending.map((task) => (
                <motion.li
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
                  className="system-window relative overflow-hidden p-4"
                >
                  {bursts[task.id] > 0 && <Particles key={bursts[task.id]} color="#38bdf8" />}
                  {(floats[task.id] ?? []).map((f, i) => (
                    <span key={i} className="float-text text-sky-300">{f}</span>
                  ))}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggle(task)}
                      disabled={busyId === task.id}
                      aria-label={`Complete quest: ${task.title}`}
                      className="h-6 w-6 shrink-0 rounded-full border-2 border-sky-400/60 transition-all hover:border-sky-300 hover:shadow-[0_0_12px_rgba(56,189,248,0.5)] focus-visible:shadow-[0_0_12px_rgba(56,189,248,0.7)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{task.title}</p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-[0.62rem] uppercase tracking-wider">
                        <span style={{ color: ATTRIBUTES[task.attribute as AttributeKey]?.color }}>
                          {ATTRIBUTES[task.attribute as AttributeKey]?.icon} {task.attribute}
                        </span>
                        <span style={{ color: DIFFICULTIES[task.difficulty as DifficultyKey]?.color }}>
                          {DIFFICULTIES[task.difficulty as DifficultyKey]?.label}
                        </span>
                        <span className="text-sky-300">+{task.xp} XP</span>
                        <span className="text-amber-300">+{task.gold} G</span>
                      </p>
                    </div>
                    <button
                      onClick={() => remove(task.id)}
                      aria-label={`Abandon quest: ${task.title}`}
                      className="btn-ghost btn !px-2 !py-1 text-[0.6rem]"
                    >
                      ✕
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {/* ── Completed today ── */}
      {done.length > 0 && (
        <section aria-labelledby="done-heading">
          <h2 id="done-heading" className="mb-3 font-system text-xs uppercase tracking-[0.25em] text-slate-500">
            Completed · {done.length}
          </h2>
          <ul className="space-y-1.5">
            {done.slice(0, 12).map((task) => (
              <li key={task.id} className="system-window flex items-center gap-3 !border-slate-700/30 p-3 opacity-60">
                <span className="text-emerald-400" aria-hidden="true">✓</span>
                <p className="min-w-0 flex-1 truncate text-sm text-slate-400 line-through">{task.title}</p>
                <span className="text-[0.62rem] text-slate-600">+{task.xp} XP</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function QuestsPage() {
  return (
    <AuthShell>
      <QuestsInner />
    </AuthShell>
  );
}
