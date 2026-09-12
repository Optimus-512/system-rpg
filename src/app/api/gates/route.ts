import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError, characterPayload } from "@/src/lib/api";
import { GATES, gateById, computeDamage } from "@/src/lib/gates";
import { itemById, attackPower } from "@/src/lib/items";

export async function GET() {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);

    const user = await prisma.user.findUnique({ where: { id: s.userId }, include: { inventory: true } });
    if (!user) return fail("Unauthorized", 401);

    const now = Date.now();
    const live = user.inventory.filter((i) => !(i.expiresAt && i.expiresAt.getTime() < now));
    const equippedRow = live.find((i) => i.equipped && itemById(i.itemId)?.type === "WEAPON");
    const equippedItem = equippedRow ? itemById(equippedRow.itemId) : undefined;
    const relics = live
      .filter((i) => itemById(i.itemId)?.type === "RELIC")
      .map((i) => itemById(i.itemId)!)
      .filter(Boolean);
    const ap = attackPower(equippedItem, relics);
    const ownedIds = new Set(live.map((i) => i.itemId));

    const runs = await prisma.gateRun.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const gates = GATES.map((g) => {
      const attrLevel =
        g.attribute === "INTELLECT" ? user.intellect : g.attribute === "STRENGTH" ? user.strength : g.attribute === "BOND" ? user.bond : user.discipline;
      const hasWeapon = ownedIds.has(g.requiredItemId) || (equippedItem?.id === g.requiredItemId);
      const sim = computeDamage(g, { hasWeapon, attributeLevel: attrLevel, attackPower: ap });
      const defeats = runs.filter((r) => r.gateId === g.id && r.victory).length;
      const attempts = runs.filter((r) => r.gateId === g.id).length;
      return {
        ...g,
        hasWeapon,
        weaponName: itemById(g.requiredItemId)?.name ?? "???",
        attrLevel,
        yourDamage: sim.damage,
        oneShot: sim.damage >= g.hp,
        hitsNeeded: Math.max(1, Math.ceil(g.hp / Math.max(1, sim.damage))),
        defeats,
        attempts,
      };
    });

    return ok({ gates });
  } catch (e) {
    return handleApiError(e);
  }
}

const attackSchema = z.object({ gateId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const body = await req.json().catch(() => null);
    const parsed = attackSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422);

    const gate = gateById(parsed.data.gateId);
    if (!gate) return fail("That gate does not exist.", 404);

    const user = await prisma.user.findUnique({ where: { id: s.userId }, include: { inventory: true } });
    if (!user) return fail("Unauthorized", 401);

    const now = Date.now();
    const live = user.inventory.filter((i) => !(i.expiresAt && i.expiresAt.getTime() < now));
    const ownedIds = new Set(live.map((i) => i.itemId));
    const equippedRow = live.find((i) => i.equipped && itemById(i.itemId)?.type === "WEAPON");
    const equippedItem = equippedRow ? itemById(equippedRow.itemId) : undefined;
    const relics = live
      .filter((i) => itemById(i.itemId)?.type === "RELIC")
      .map((i) => itemById(i.itemId)!)
      .filter(Boolean);

    const attrLevel =
      gate.attribute === "INTELLECT" ? user.intellect : gate.attribute === "STRENGTH" ? user.strength : gate.attribute === "BOND" ? user.bond : user.discipline;

    const hasWeapon = ownedIds.has(gate.requiredItemId) || equippedItem?.id === gate.requiredItemId;
    const sim = computeDamage(gate, { hasWeapon, attributeLevel: attrLevel, attackPower: attackPower(equippedItem, relics) });

    // Anti-cheese: one attack consumes the forged weapon's charge (durability -50).
    // Weapon breaks only when durability hits 0 → encourages re-earning via quests.
    let durabilityNote: string | null = null;
    if (hasWeapon) {
      const row = live.find((i) => i.itemId === gate.requiredItemId);
      if (row && itemById(gate.requiredItemId)?.tempHours) {
        const newDur = Math.max(0, row.durability - 50);
        if (newDur === 0) {
          await prisma.inventoryItem.delete({ where: { id: row.id } });
          durabilityNote = `${itemById(gate.requiredItemId)!.name} has shattered. Forge it again by completing a quest.`;
        } else {
          await prisma.inventoryItem.update({ where: { id: row.id }, data: { durability: newDur } });
          durabilityNote = `${itemById(gate.requiredItemId)!.name} durability: ${newDur}%`;
        }
      }
    }

    const dealt = sim.damage;
    const victory = sim.defeated;

    await prisma.gateRun.create({
      data: { userId: user.id, gateId: gate.id, victory, dealt },
    });

    let character = null;
    let rewards = null;
    if (victory) {
      const goldMult = relics.some((r) => r.id === "monarch_crest") ? 1.1 : 1;
      rewards = { xp: gate.rewardXp, gold: Math.round(gate.rewardGold * goldMult) };
      // Reuse the XP engine for level math.
      const { applyXp, rankForLevel } = await import("@/src/lib/game");
      const progress = applyXp(user.level, user.xp, rewards.xp);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          level: progress.level,
          xp: progress.xp,
          rank: rankForLevel(progress.level).rank,
          title: rankForLevel(progress.level).title,
          gold: { increment: rewards.gold },
        },
      });
      character = await characterPayload(user.id);
    }

    return ok({
      victory,
      dealt,
      reason: sim.reason ?? null,
      rewards,
      durabilityNote,
      character,
      bossQuote: victory ? null : gate.quote,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
