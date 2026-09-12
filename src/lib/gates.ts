// ─────────────────────────────────────────────────────────────────────
//  THE SYSTEM · Gate Catalog
//  Bosses are manifestations of a sedentary life. You cannot beat them
//  with willpower alone — you need the weapon forged by the real-world
//  quest that defeats them.
// ─────────────────────────────────────────────────────────────────────

export interface Gate {
  id: string;
  name: string;
  epithet: string;
  hp: number;
  icon: string;
  desc: string;
  danger: "E" | "D" | "C" | "B" | "A" | "S";
  requiredItemId: string; // quest-forged weapon needed to deal real damage
  attribute: string; // attribute that boosts your damage
  rewardXp: number;
  rewardGold: number;
  quote: string; // what the boss whispers when you fail without the weapon
}

export const GATES: Gate[] = [
  {
    id: "weakening_willow",
    name: "The Weakening Willow",
    epithet: "Warden of the Soft Couch",
    hp: 300,
    icon: "🌳",
    desc: "Grows stronger every hour you sit still. Its roots feed on skipped workouts. Only the Spear of Strength — forged from exercise — can pierce its bark.",
    danger: "D",
    requiredItemId: "spear_of_strength",
    attribute: "STRENGTH",
    rewardXp: 120,
    rewardGold: 90,
    quote: "\"Stay. The couch is warm. The gym can wait forever…\"",
  },
  {
    id: "leech_of_loneliness",
    name: "The Leech of Loneliness",
    epithet: "Devourer of Voices",
    hp: 360,
    icon: "🦑",
    desc: "It wraps silent rooms in fog and calls it comfort. Damaged only by the Chain of Bonds — each real conversation with family or friends is a link that strangles it.",
    danger: "C",
    requiredItemId: "bond_chain",
    attribute: "BOND",
    rewardXp: 160,
    rewardGold: 120,
    quote: "\"No one is waiting to hear from you. Set the phone down.\"",
  },
  {
    id: "mind_leech",
    name: "The Mind Leech",
    epithet: "Hollow-Eyed Scholar",
    hp: 420,
    icon: "🧿",
    desc: "It feeds on unfocused hours and shapeshifts into 'I'll study tomorrow'. The Lumen Codex — bound from real study sessions — burns through its illusions.",
    danger: "C",
    requiredItemId: "lumen_codex",
    attribute: "INTELLECT",
    rewardXp: 180,
    rewardGold: 140,
    quote: "\"One more scroll. One more episode. Knowledge can wait.\"",
  },
  {
    id: "iron_laziness",
    name: "Iron Laziness",
    epithet: "The Gilded Sluggard",
    hp: 520,
    icon: "🛡️",
    desc: "A sloth in ceremonial armor. Every alarm snoozed polishes its shell. The Iron Will Blade — tempered by discipline quests — finds the gap in its guard.",
    danger: "B",
    requiredItemId: "iron_will_blade",
    attribute: "DISCIPLINE",
    rewardXp: 240,
    rewardGold: 180,
    quote: "\"Five more minutes. Five more years. What's the difference?\"",
  },
  {
    id: "monarch_of_stagnation",
    name: "The Monarch of Stagnation",
    epithet: "Final Gate · End of the Old You",
    hp: 999,
    icon: "👑",
    desc: "The accumulated weight of every skipped day, throned at the bottom of the deepest gate. It wears your old face. Bring every forged weapon. Bring the new you.",
    danger: "S",
    requiredItemId: "shadow_excalibur",
    attribute: "DISCIPLINE",
    rewardXp: 600,
    rewardGold: 500,
    quote: "\"You always come back to me. I am every excuse you ever loved.\"",
  },
];

export const GATE_MAP: Record<string, Gate> = Object.fromEntries(GATES.map((g) => [g.id, g]));

export function gateById(id: string): Gate | undefined {
  return GATE_MAP[id];
}

/** Damage model: need the forged weapon, attribute amplifies. */
export function computeDamage(gate: Gate, params: {
  hasWeapon: boolean;
  attributeLevel: number;
  attackPower: number;
}): { damage: number; reason?: string; defeated: boolean } {
  if (!params.hasWeapon) {
    return { damage: 0, reason: "Your attacks pass through it like smoke. You need the right quest-forged weapon." , defeated: false };
  }
  const attrMult = 1 + params.attributeLevel * 0.06; // each attribute point = +6%
  const damage = Math.round(params.attackPower * attrMult);
  return { damage, defeated: damage >= gate.hp };
}
