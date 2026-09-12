import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError } from "@/src/lib/api";
import { xpForLevel, rankForLevel, nextRank, powerScore } from "@/src/lib/game";
import { itemById, attackPower, relicMultipliers } from "@/src/lib/items";
import { todayKey } from "@/src/lib/game";

export async function GET() {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);

    const user = await prisma.user.findUnique({
      where: { id: s.userId },
      include: { inventory: true },
    });
    if (!user) return fail("Unauthorized", 401);

    // Expire quest-forged temporary weapons lazily on read.
    const now = Date.now();
    const expired = user.inventory.filter((i) => i.expiresAt && i.expiresAt.getTime() < now);
    if (expired.length > 0) {
      await prisma.inventoryItem.deleteMany({
        where: { id: { in: expired.map((i) => i.id) } },
      });
    }

    const liveInventory = user.inventory.filter((i) => !(i.expiresAt && i.expiresAt.getTime() < now));
    const equippedRow = liveInventory.find((i) => i.equipped);
    const equippedItem = equippedRow ? itemById(equippedRow.itemId) : undefined;
    const relics = liveInventory
      .filter((i) => itemById(i.itemId)?.type === "RELIC")
      .map((i) => itemById(i.itemId)!)
      .filter(Boolean);

    const { passwordHash: _ph, ...safe } = user;

    const totalXpForCurrent = xpForLevel(user.level);
    const next = nextRank(user.level);
    const nextRankData = next
      ? { rank: next.rank, minLevel: next.minLevel, levelsAway: next.minLevel - user.level }
      : null;

    const doneToday = user.lastQuestDate === todayKey();

    return ok({
      user: {
        ...safe,
        inventory: liveInventory.map((i) => ({
          ...i,
          item: itemById(i.itemId) ?? null,
        })),
      },
      stats: {
        xpNeeded: totalXpForCurrent,
        xpPercent: Math.min(100, Math.round((user.xp / totalXpForCurrent) * 100)),
        attack: attackPower(equippedItem, relics),
        power: powerScore(user),
        rankMeta: rankForLevel(user.level),
        nextRank: nextRankData,
        multipliers: relicMultipliers(liveInventory.map((i) => i.itemId)),
        questDoneToday: doneToday,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
