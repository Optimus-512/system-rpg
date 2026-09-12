// ─────────────────────────────────────────────────────────────────────
//  THE SYSTEM · Item Catalog
//  Weapons & relics. Temporary weapons are granted by completing
//  REAL-WORLD quests — that is the core loop of the game.
// ─────────────────────────────────────────────────────────────────────

export type ItemType = "WEAPON" | "RELIC" | "THEME";
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface CatalogItem {
  id: string;
  name: string;
  type: ItemType;
  price: number; // 0 = not purchasable; earned only via quests
  rarity: Rarity;
  icon: string;
  desc: string;
  atk?: number; // battle power contribution
  tempHours?: number; // if set, the item expires (quest-forged weapons)
}

export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string }> = {
  COMMON: { label: "Common", color: "#9aa3b2", glow: "rgba(154,163,178,.35)" },
  RARE: { label: "Rare", color: "#38bdf8", glow: "rgba(56,189,248,.45)" },
  EPIC: { label: "Epic", color: "#a78bfa", glow: "rgba(167,139,250,.5)" },
  LEGENDARY: { label: "Legendary", color: "#fbbf24", glow: "rgba(251,191,36,.55)" },
};

export const ITEMS: CatalogItem[] = [
  // ── QUEST-FORGED WEAPONS (never sold — only real-world effort mints them) ──
  { id: "spear_of_strength", name: "Spear of Strength", type: "WEAPON", price: 0, rarity: "EPIC", icon: "🔱", desc: "Forged mid-rep. Granted when you move your body. Necessary to pierce the Weakening Willow.", atk: 30, tempHours: 36 },
  { id: "lumen_codex", name: "Lumen Codex", type: "WEAPON", price: 0, rarity: "EPIC", icon: "📖", desc: "Bound from hours of study. Burns illusion and confusion. Required against the Mind Leech.", atk: 28, tempHours: 36 },
  { id: "iron_will_blade", name: "Iron Will Blade", type: "WEAPON", price: 0, rarity: "RARE", icon: "🗡️", desc: "Tempered by the things you did NOT skip. Cuts through excuses.", atk: 22, tempHours: 36 },
  { id: "bond_chain", name: "Chain of Bonds", type: "WEAPON", price: 0, rarity: "EPIC", icon: "🔗", desc: "Every real conversation adds a link. The Leech of Loneliness cannot abide it.", atk: 26, tempHours: 36 },

  // ── SHOP WEAPONS ──
  { id: "knight_slayer", name: "Knight Slayer", type: "WEAPON", price: 400, rarity: "EPIC", icon: "⚔️", desc: "Standard issue for Ace Hunters. Reliable, brutal, elegant.", atk: 20 },
  { id: "baruka_dagger", name: "Baruka's Dagger", type: "WEAPON", price: 250, rarity: "RARE", icon: "🔪", desc: "Swift as a kept promise.", atk: 14 },
  { id: "shadow_excalibur", name: "Shadow Excalibur", type: "WEAPON", price: 1200, rarity: "LEGENDARY", icon: "🗡️", desc: "It drinks the dark you conquered and gives it back as light.", atk: 45 },

  // ── RELICS (permanent character upgrades) ──
  { id: "hunter_license", name: "Hunter's License", type: "RELIC", price: 150, rarity: "COMMON", icon: "🪪", desc: "Proof you exist to the System. +2% quest gold, forever." },
  { id: "mana_crystal", name: "Mana Crystal", type: "RELIC", price: 300, rarity: "RARE", icon: "💎", desc: "Hums near dungeons. +5% quest XP, forever." },
  { id: "monarch_crest", name: "Monarch's Crest", type: "RELIC", price: 900, rarity: "LEGENDARY", icon: "👑", desc: "The System recognizes sovereignty. +10% XP & gold, forever." },

  // ── THEMES (cosmetic interface styles) ──
  { id: "theme_default", name: "Monarch Blue", type: "THEME", price: 0, rarity: "COMMON", icon: "🌌", desc: "The default System interface. Cold, blue, awake." },
  { id: "theme_blood", name: "Crimson Gate", type: "THEME", price: 350, rarity: "EPIC", icon: "🩸", desc: "A red-tinted System. For hunters who like pressure." },
  { id: "theme_gold", name: "Sovereign Gold", type: "THEME", price: 700, rarity: "LEGENDARY", icon: "🥇", desc: "Gold-trimmed interface. The System flatters you." },
];

export const ITEM_MAP: Record<string, CatalogItem> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): CatalogItem | undefined {
  return ITEM_MAP[id];
}

/** Total attack power from equipped weapon + relics. */
export function attackPower(equipped: CatalogItem | undefined, relics: CatalogItem[]): number {
  const base = 10;
  const weapon = equipped?.atk ?? 0;
  const relicAtk = relics.reduce((s, r) => s + (r.atk ?? 0) * 0.25, 0);
  return Math.round(base + weapon + relicAtk);
}

/** Global reward multipliers from owned relics. */
export function relicMultipliers(ownedIds: string[]): { xpMult: number; goldMult: number } {
  let xpMult = 1;
  let goldMult = 1;
  if (ownedIds.includes("hunter_license")) goldMult += 0.02;
  if (ownedIds.includes("mana_crystal")) xpMult += 0.05;
  if (ownedIds.includes("monarch_crest")) { xpMult += 0.1; goldMult += 0.1; }
  return { xpMult, goldMult };
}
