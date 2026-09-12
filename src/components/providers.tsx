"use client";

// ─────────────────────────────────────────────────────────────────────
//  Providers: session state, character state, notifications.
//  Optimistic by design — the UI updates before the server answers.
// ─────────────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// ── Types shared client-side ──
export interface CharacterUser {
  id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  gold: number;
  rank: string;
  title: string;
  intellect: number;
  strength: number;
  discipline: number;
  bond: number;
  currentStreak: number;
  longestStreak: number;
  wins: number;
  losses: number;
  questsDoneToday: number;
  inventory: InventoryRow[];
}

export interface InventoryRow {
  id: string;
  itemId: string;
  equipped: boolean;
  durability: number;
  expiresAt: string | null;
  item: {
    id: string;
    name: string;
    type: string;
    rarity: string;
    icon: string;
    desc: string;
    price: number;
    atk?: number;
    tempHours?: number;
  } | null;
}

export interface CharacterStats {
  xpNeeded: number;
  xpPercent: number;
  attack: number;
  power: number;
  rankMeta: { rank: string; title: string; color: string; flavor: string };
  nextRank: { rank: string; minLevel: number; levelsAway: number } | null;
  multipliers: { xpMult: number; goldMult: number };
  questDoneToday: boolean;
}

interface Toast {
  id: number;
  title: string;
  body?: string;
  kind: "info" | "reward" | "danger" | "gold";
}

interface LevelUpEvent {
  level: number;
  rank?: string;
}

interface GameContextValue {
  user: CharacterUser | null;
  stats: CharacterStats | null;
  loading: boolean;
  refreshCharacter: () => Promise<void>;
  applyCharacter: (payload: { user: CharacterUser; stats?: CharacterStats }) => void;
  logout: () => Promise<void>;
  toasts: Toast[];
  notify: (t: Omit<Toast, "id">) => void;
  levelUp: LevelUpEvent | null;
  celebrateLevelUp: (e: LevelUpEvent) => void;
  clearLevelUp: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <Providers>");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CharacterUser | null>(null);
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);
  const toastId = useRef(0);

  const refreshCharacter = useCallback(async () => {
    try {
      const res = await fetch("/api/character", { cache: "no-store" });
      if (res.status === 401) {
        setUser(null);
        setStats(null);
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setStats(data.stats);
      }
    } catch {
      // Offline: keep showing current optimistic state.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCharacter();
  }, [refreshCharacter]);

  const applyCharacter = useCallback((payload: { user: CharacterUser; stats?: CharacterStats }) => {
    setUser(payload.user);
    if (payload.stats) setStats(payload.stats);
  }, []);

  const notify = useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    setStats(null);
  }, []);

  const celebrateLevelUp = useCallback((e: LevelUpEvent) => setLevelUp(e), []);
  const clearLevelUp = useCallback(() => setLevelUp(null), []);

  const value = useMemo(
    () => ({ user, stats, loading, refreshCharacter, applyCharacter, logout, toasts, notify, levelUp, celebrateLevelUp, clearLevelUp }),
    [user, stats, loading, refreshCharacter, applyCharacter, logout, toasts, notify, levelUp, celebrateLevelUp, clearLevelUp]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
