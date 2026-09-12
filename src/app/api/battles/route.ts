import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError, characterPayload } from "@/src/lib/api";
import { powerScore, applyXp, rankForLevel } from "@/src/lib/game";
import { itemById, attackPower } from "@/src/lib/items";

// ─────────────────────────────────────────────────────────────────────
//  PVP BATTLES — friendly duels between allied hunters.
//  Power = level, attributes, equipped weapon, and duel record.
//  Deterministic combat with a seeded shake so underdogs can win.
// ─────────────────────────────────────────────────────────────────────

interface Fighter {
  id: string;
  username: string;
  level: number;
  intellect: number;
  strength: number;
  discipline: number;
  bond: number;
  wins: number;
  losses: number;
  atk: number;
}

interface LogEvent { at: string; text: string; kind: "hit" | "crit" | "miss" | "win" | "lose" }

function seededShake(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Deterministic value in [-1, 1]
  return ((h >>> 0) % 2000 - 1000) / 1000;
}

function simulate(me: Fighter, foe: Fighter): { winnerId: string; log: LogEvent[] } {
  const log: LogEvent[] = [];
  let myHp = 100 + me.level * 5;
  let foeHp = 100 + foe.level * 5;
  let turn = 0;
  const seedBase = `${me.id}:${foe.id}:${Date.now()}`;
  let roll = 0;

  while (myHp > 0 && foeHp > 0 && turn < 40) {
    const attackerIsMe = turn % 2 === 0;
    const a = attackerIsMe ? me : foe;
    const d = attackerIsMe ? foe : me;
    const shake = seededShake(`${seedBase}:${turn}`);
    roll++;
    const crit = shake > 0.55;
    const miss = shake < -0.7;
    let dmg = Math.max(3, Math.round((a.atk + a.level * 2) * (0.8 + Math.abs(shake) * 0.4)));
    if (crit) dmg = Math.round(dmg * 1.6);

    if (miss) {
      log.push({ at: `t${turn}`, text: `${a.username}'s strike passes through ${d.username} like smoke.`, kind: "miss" });
    } else {
      if (attackerIsMe) foeHp -= dmg;
      else myHp -= dmg;
      log.push({ at: `t${turn}`, text: `${a.username} ${crit ? "lands a CRITICAL —" : "strikes"} ${d.username} for ${dmg}.`, kind: crit ? "crit" : "hit" });
    }
    turn++;
  }

  const winnerId = myHp >= foeHp ? me.id : foe.id;
  log.push({ at: "end", text: `${winnerId === me.id ? me.username : foe.username} stands. The duel is recorded.`, kind: winnerId === me.id ? "win" : "lose" });
  return { winnerId, log };
}

async function toFighter(userId: string): Promise<Fighter | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { inventory: true } });
  if (!u) return null;
  const now = Date.now();
  const live = u.inventory.filter((i) => !(i.expiresAt && i.expiresAt.getTime() < now));
  const equippedRow = live.find((i) => i.equipped && itemById(i.itemId)?.type === "WEAPON");
  const equippedItem = equippedRow ? itemById(equippedRow.itemId) : undefined;
  const relics = live
    .filter((i) => itemById(i.itemId)?.type === "RELIC")
    .map((i) => itemById(i.itemId)!)
    .filter(Boolean);
  return {
    id: u.id,
    username: u.username,
    level: u.level,
    intellect: u.intellect,
    strength: u.strength,
    discipline: u.discipline,
    bond: u.bond,
    wins: u.wins,
    losses: u.losses,
    atk: attackPower(equippedItem, relics),
  };
}

export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const body = await req.json().catch(() => null);
    const parsed = z.object({ opponentId: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422);

    const opponentId = parsed.data.opponentId;
    if (opponentId === s.userId) return fail("You cannot duel yourself.", 400);

    // Must be allies to duel — keeps PvP social, not hostile.
    const ally = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { fromId: s.userId, toId: opponentId },
          { fromId: opponentId, toId: s.userId },
        ],
      },
    });
    if (!ally) return fail("You may only duel your allies. Send a friend request first.", 403);

    const me = await toFighter(s.userId);
    const foe = await toFighter(opponentId);
    if (!me || !foe) return fail("Hunter data unavailable.", 404);

    const { winnerId, log } = simulate(me, foe);
    const iWon = winnerId === me.id;

    // Best of record: winner +1 win / loser +1 loss. Stakes: small gold bounty.
    const bounty = 50;
    const updateWinner = prisma.user.update({
      where: { id: winnerId },
      data: { wins: { increment: 1 }, gold: { increment: bounty } },
    });
    const loserId = iWon ? foe.id : me.id;
    const updateLoser = prisma.user.update({
      where: { id: loserId },
      data: { losses: { increment: 1 } },
    });
    await prisma.$transaction([updateWinner, updateLoser]);

    await prisma.battle.create({
      data: {
        challengerId: me.id,
        defenderId: foe.id,
        winnerId,
        log: JSON.stringify(log),
      },
    });

    const character = await characterPayload(s.userId);
    return ok({
      won: iWon,
      winnerId,
      log,
      bounty,
      character,
      message: iWon
        ? `Victory over ${foe.username}. +${bounty} gold bounty. The System has taken note.`
        : `${foe.username} prevails. The System does not pity — it waits for your next quest. Train. Return.`,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET() {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const battles = await prisma.battle.findMany({
      where: { OR: [{ challengerId: s.userId }, { defenderId: s.userId }] },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        challenger: { select: { username: true } },
        defender: { select: { username: true } },
      },
    });
    return ok({ battles: battles.map((b) => ({ ...b, log: JSON.parse(b.log) })) });
  } catch (e) {
    return handleApiError(e);
  }
}
