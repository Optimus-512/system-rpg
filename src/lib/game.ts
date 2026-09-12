// ─────────────────────────────────────────────────────────────────────
//  THE SYSTEM · Core Game Engine
//  Non-linear leveling, rank ascension, reward math.
//  All values flow through here so the whole game stays balanced.
// ─────────────────────────────────────────────────────────────────────

/** XP required to advance FROM level L to L+1. Non-linear: each level costs more. */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

/** Cumulative XP required to reach a given level (for rank display). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevel(l);
  return total;
}

/** The Ten Ranks — from E (Awakened Nobody) to NATIONAL LEVEL (Shadow Monarch). */
export const RANKS = [
  { rank: "E", title: "Awakened Nobody", color: "#9aa3b2", minLevel: 1, flavor: "The weakest hunter. Even the System hesitates to scan you." },
  { rank: "D", title: "Aspirant", color: "#4ade80", minLevel: 5, flavor: "A spark. The gates begin to notice you." },
  { rank: "C", title: "Quest Seeker", color: "#38bdf8", minLevel: 10, flavor: "Discipline is your blade now." },
  { rank: "B", title: "Dungeon Raider", color: "#a78bfa", minLevel: 18, flavor: "Guilds would fight to recruit you." },
  { rank: "A", title: "Ace Hunter", color: "#fbbf24", minLevel: 28, flavor: "Your name echoes in the Hunter's Bureau." },
  { rank: "S", title: "Sovereign Candidate", color: "#fb7185", minLevel: 40, flavor: "Nations know your face." },
  { rank: "NATIONAL", title: "Shadow Monarch", color: "#c084fc", minLevel: 55, flavor: "ARISE. The System kneels." },
] as const;

export function rankForLevel(level: number): (typeof RANKS)[number] {
  let current: (typeof RANKS)[number] = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) current = r;
  return current;
}

export function nextRank(level: number): (typeof RANKS)[number] | null {
  return RANKS.find((r) => r.minLevel > level) ?? null;
}

/** Attribute metadata — every quest raises exactly one of these. */
export const ATTRIBUTES = {
  INTELLECT: { key: "INTELLECT", label: "Intellect", icon: "🧠", color: "#38bdf8", desc: "Study, reading, deep work, courses" },
  STRENGTH: { key: "STRENGTH", label: "Strength", icon: "⚔️", color: "#fb7185", desc: "Gym, running, calisthenics, sport" },
  DISCIPLINE: { key: "DISCIPLINE", label: "Discipline", icon: "🗡️", color: "#a78bfa", desc: "Waking early, no doom-scrolling, cleaning" },
  BOND: { key: "BOND", label: "Bond", icon: "🤝", color: "#4ade80", desc: "Family calls, friends, conversations" },
} as const;

export type AttributeKey = keyof typeof ATTRIBUTES;
export const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTES) as AttributeKey[];

export const DIFFICULTIES = {
  EASY: { key: "EASY", label: "E-Rank", mult: 1.0, icon: "▽", color: "#9aa3b2", durMinutes: 0 },
  NORMAL: { key: "NORMAL", label: "C-Rank", mult: 1.5, icon: "◆", color: "#38bdf8", durMinutes: 0 },
  HARD: { key: "HARD", label: "A-Rank", mult: 2.2, icon: "❖", color: "#fbbf24", durMinutes: 0 },
  BOSS: { key: "BOSS", label: "S-Rank", mult: 3.5, icon: "✦", color: "#fb7185", durMinutes: 0 },
} as const;

export type DifficultyKey = keyof typeof DIFFICULTIES;
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as DifficultyKey[];

/** XP/gold for a quest — the server is the single source of truth. */
export function questReward(difficulty: DifficultyKey, level: number) {
  const d = DIFFICULTIES[difficulty] ?? DIFFICULTIES.NORMAL;
  const base = 20 + level * 2;
  return {
    xp: Math.max(10, Math.round(base * d.mult)),
    gold: Math.max(5, Math.round(base * 0.6 * d.mult)),
  };
}

/** Daily streak bonus multiplier: +5% per streak day, capped at +50%. */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(0.5, streak * 0.05);
}

/** Attribute points gained per completed quest. */
export function attributeGain(difficulty: DifficultyKey): number {
  return { EASY: 1, NORMAL: 1, HARD: 2, BOSS: 3 }[difficulty] ?? 1;
}

export interface LevelUpResult { leveledUp: boolean; levelsGained: number; newLevel: number; newRank: string; rankUp: boolean }

/** Apply XP to a character, handling multi-level jumps. Pure function. */
export function applyXp(level: number, xp: number, gainedXp: number): { level: number; xp: number } & LevelUpResult {
  let newLevel = level;
  let newXp = xp + gainedXp;
  let levelsGained = 0;
  while (newXp >= xpForLevel(newLevel)) {
    newXp -= xpForLevel(newLevel);
    newLevel += 1;
    levelsGained += 1;
  }
  const r = rankForLevel(newLevel);
  const rankUp = rankForLevel(level).rank !== r.rank;
  return { level: newLevel, xp: newXp, leveledUp: levelsGained > 0, levelsGained, newLevel, newRank: r.rank, rankUp };
}

/** "YYYY-MM-DD" in the user's local day. Streaks use this on the server. */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

/** Compute new streak given last date key and whether activity already counted today. */
export function nextStreak(lastStreakDate: string | null, streak: number, longest: number, alreadyToday: boolean) {
  if (alreadyToday) return { currentStreak: streak, longestStreak: longest, changed: false };
  const t = todayKey();
  const cur = lastStreakDate === yesterdayKey() ? streak + 1 : 1;
  return { currentStreak: cur, longestStreak: Math.max(longest, cur), changed: true, today: t };
}

/** PvP power score — used for friend battles and leaderboard weighting. */
export function powerScore(u: { level: number; intellect: number; strength: number; discipline: number; bond: number; wins: number }): number {
  const attrs = u.intellect + u.strength + u.discipline + u.bond;
  return u.level * 10 + attrs * 5 + u.wins * 15;
}
