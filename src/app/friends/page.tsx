"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/src/components/providers";
import { AuthShell } from "@/src/components/auth-shell";

interface Hunter {
  id: string;
  username: string;
  level: number;
  rank: string;
  title?: string;
  power?: number;
  wins?: number;
  losses?: number;
}

interface BattleEvent {
  at: string;
  text: string;
  kind: "hit" | "crit" | "miss" | "win" | "lose";
}

interface BattleResult {
  won: boolean;
  winnerId: string;
  log: BattleEvent[];
  bounty: number;
  message: string;
}

function rankColor(rank: string) {
  return rank === "NATIONAL" ? "#c084fc" : rank === "S" ? "#fb7185" : rank === "A" ? "#fbbf24" : rank === "B" ? "#a78bfa" : rank === "C" ? "#38bdf8" : rank === "D" ? "#4ade80" : "#9aa3b2";
}

function FriendsInner() {
  const { user, notify, applyCharacter } = useGame();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Hunter[]>([]);
  const [friends, setFriends] = useState<Hunter[]>([]);
  const [incoming, setIncoming] = useState<Array<{ from: Hunter }>>([]);
  const [outgoing, setOutgoing] = useState<Array<{ to: Hunter }>>([]);
  const [busy, setBusy] = useState(false);
  const [duelBusyId, setDuelBusyId] = useState<string | null>(null);
  const [battle, setBattle] = useState<BattleResult | null>(null);
  const [revealed, setRevealed] = useState(0);

  const load = useCallback(
    async (query?: string) => {
      try {
        const url = query ? `/api/friends?q=${encodeURIComponent(query)}` : "/api/friends";
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setFriends(data.friends);
          setIncoming(data.incoming);
          setOutgoing(data.outgoing);
          if (query) setResults(data.results);
        }
      } catch {
        notify({ title: "Connection lost", body: "The alliance registry is unreachable.", kind: "danger" });
      }
    },
    [notify]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => load(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q, load]);

  async function act(action: "add" | "accept" | "remove", userId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });
      const data = await res.json();
      notify(
        res.ok
          ? { title: "Alliance updated", body: data.message, kind: "info" }
          : { title: "Refused", body: data.error, kind: "danger" }
      );
      await load(q.trim() || undefined);
    } catch {
      notify({ title: "Connection lost", kind: "danger" });
    } finally {
      setBusy(false);
    }
  }

  // Reveal battle log line by line
  useEffect(() => {
    if (!battle) return;
    setRevealed(0);
    const iv = setInterval(() => {
      setRevealed((r) => {
        if (r >= battle.log.length) {
          clearInterval(iv);
          return r;
        }
        return r + 1;
      });
    }, 550);
    return () => clearInterval(iv);
  }, [battle]);

  async function duel(friend: Hunter) {
    if (duelBusyId) return;
    setDuelBusyId(friend.id);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: friend.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify({ title: "Duel refused", body: data.error, kind: "danger" });
        return;
      }
      if (data.character) applyCharacter(data.character);
      setBattle(data);
      notify({
        title: data.won ? "Duel won" : "Duel lost",
        body: data.won ? `+${data.bounty} gold bounty.` : "Train. Return stronger.",
        kind: data.won ? "gold" : "danger",
      });
    } catch {
      notify({ title: "Connection lost", body: "The duel never began.", kind: "danger" });
    } finally {
      setDuelBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="materialize">
        <h1 className="font-system text-xl font-black text-sky-100 text-glow">◈ Alliances</h1>
        <p className="mt-1 text-sm text-slate-400">
          No hunter clears the S-Rank gates alone. Find allies. Duel them to sharpen both blades.
        </p>
      </div>

      {/* ── Search ── */}
      <section className="system-window materialize">
        <div className="window-head">
          <span className="window-title">◈ Seek Hunters</span>
        </div>
        <div className="p-5">
          <label htmlFor="hunter-search" className="sr-only">Search hunters by name</label>
          <input
            id="hunter-search"
            className="input"
            placeholder="Search by hunter name… (min 2 letters)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={30}
          />
          {results.length > 0 && (
            <ul className="mt-3 space-y-2">
              {results.map((h) => (
                <li key={h.id} className="flex items-center gap-3 border border-sky-400/10 bg-sky-400/[0.03] p-3">
                  <span className="rank-badge h-8 w-8 text-xs" style={{ color: rankColor(h.rank) }}>
                    {h.rank === "NATIONAL" ? "★" : h.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{h.username}</p>
                    <p className="text-[0.62rem] text-slate-500">Lv.{h.level} {h.power ? `· ${h.power} PWR` : ""}</p>
                  </div>
                  <button onClick={() => act("add", h.id)} disabled={busy} className="btn !py-1.5 !text-[0.62rem]">
                    + Ally
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && results.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">No hunter by that name. The System knows everyone — spelling matters.</p>
          )}
        </div>
      </section>

      {/* ── Requests ── */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {incoming.length > 0 && (
            <div className="system-window p-5">
              <h2 className="font-system text-xs uppercase tracking-[0.25em] text-emerald-300">Incoming · {incoming.length}</h2>
              <ul className="mt-3 space-y-2">
                {incoming.map((r) => (
                  <li key={r.from.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-200">{r.from.username} <span className="text-slate-500">Lv.{r.from.level}</span></span>
                    <button onClick={() => act("accept", r.from.id)} disabled={busy} className="btn !py-1.5 !text-[0.62rem]">Accept</button>
                    <button onClick={() => act("remove", r.from.id)} disabled={busy} className="btn btn-ghost !py-1.5 !text-[0.62rem]">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outgoing.length > 0 && (
            <div className="system-window p-5">
              <h2 className="font-system text-xs uppercase tracking-[0.25em] text-slate-400">Awaiting reply · {outgoing.length}</h2>
              <ul className="mt-3 space-y-2">
                {outgoing.map((r) => (
                  <li key={r.to.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-400">{r.to.username} <span className="text-slate-600">Lv.{r.to.level}</span></span>
                    <button onClick={() => act("remove", r.to.id)} disabled={busy} className="btn btn-ghost !py-1.5 !text-[0.62rem]">Cancel</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Allies ── */}
      <section aria-labelledby="allies-heading">
        <h2 id="allies-heading" className="mb-3 font-system text-xs uppercase tracking-[0.25em] text-slate-400">
          Your Allies · {friends.length}
        </h2>
        {friends.length === 0 ? (
          <div className="system-window p-6 text-center text-sm text-slate-400">
            No alliances yet. Even the Shadow Monarch started alone — but didn&apos;t stay that way.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((f, i) => (
              <motion.article
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="system-window scan p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="rank-badge h-10 w-10 text-sm" style={{ color: rankColor(f.rank) }}>
                    {f.rank === "NATIONAL" ? "★" : f.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-system text-sm font-bold text-sky-100">{f.username}</p>
                    <p className="text-[0.62rem] text-slate-500">Lv.{f.level} · {f.title}</p>
                  </div>
                </div>
                <p className="mt-3 text-[0.65rem] text-slate-500">
                  {f.wins ?? 0}W / {f.losses ?? 0}L {f.power ? `· ${f.power} PWR` : ""}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => duel(f)}
                    disabled={duelBusyId === f.id}
                    className="btn btn-danger flex-1 !py-2 !text-[0.62rem]"
                    aria-label={`Duel ${f.username}`}
                  >
                    {duelBusyId === f.id ? "Fighting…" : "⚔ Duel"}
                  </button>
                  <button onClick={() => act("remove", f.id)} disabled={busy} className="btn btn-ghost !py-2 !px-3" aria-label={`Remove ally ${f.username}`}>
                    ✕
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {/* ── Battle modal ── */}
      <AnimatePresence>
        {battle && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBattle(null)}
            role="dialog"
            aria-label="Duel result"
          >
            <motion.div
              initial={{ scale: 0.9, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="system-window w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="window-head">
                <span className="window-title">◈ Duel Log</span>
                <span className={`text-[0.6rem] uppercase tracking-widest ${battle.won ? "text-amber-300" : "text-rose-300"}`}>
                  {battle.won ? "Victory" : "Defeat"}
                </span>
              </div>
              <div className="max-h-[50vh] space-y-1.5 overflow-y-auto p-5" aria-live="polite">
                {battle.log.slice(0, revealed).map((e, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-xs leading-relaxed ${
                      e.kind === "crit" ? "text-amber-300" : e.kind === "miss" ? "text-slate-500" : e.kind === "win" ? "text-emerald-300" : e.kind === "lose" ? "text-rose-300" : "text-slate-300"
                    }`}
                  >
                    <span className="mr-2 opacity-40">◆</span>
                    {e.text}
                  </motion.p>
                ))}
              </div>
              <div className="border-t border-sky-400/10 p-4">
                <p className="text-center text-sm text-slate-300">{battle.message}</p>
                <button onClick={() => setBattle(null)} className="btn mt-3 w-full">Close Log</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <AuthShell>
      <FriendsInner />
    </AuthShell>
  );
}
