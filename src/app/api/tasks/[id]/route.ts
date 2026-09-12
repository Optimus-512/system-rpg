import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError, characterPayload } from "@/src/lib/api";
import { applyXp, nextStreak, todayKey, attributeGain, streakMultiplier, questReward, type DifficultyKey, rankForLevel } from "@/src/lib/game";
import { relicMultipliers, itemById } from "@/src/lib/items";

/** Quest-forged weapon per attribute — the heart of the game loop. */
const FORGED_BY_ATTRIBUTE: Record<string, string> = {
  STRENGTH: "spear_of_strength",
  INTELLECT: "lumen_codex",
  DISCIPLINE: "iron_will_blade",
  BOND: "bond_chain",
};

const patchSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(500).nullable().optional(),
  attribute: z.enum(["INTELLECT", "STRENGTH", "DISCIPLINE", "BOND"]).optional(),
  difficulty: z.enum(["EASY", "NORMAL", "HARD", "BOSS"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const task = await prisma.task.findFirst({ where: { id, userId: s.userId } });
    if (!task) return fail("Quest not found.", 404);
    const user = await prisma.user.findUnique({ where: { id: s.userId } });
    if (!user) return fail("Unauthorized", 401);

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.note !== undefined) data.note = parsed.data.note;
    if (parsed.data.attribute !== undefined) data.attribute = parsed.data.attribute;
    if (parsed.data.difficulty !== undefined) {
      data.difficulty = parsed.data.difficulty;
      if (parsed.data.difficulty !== task.difficulty) {
        // Recompute rewards server-side when difficulty changes (before completion).
        const reward = questReward(parsed.data.difficulty, user.level);
        data.xp = reward.xp;
        data.gold = reward.gold;
      }
    }

    const wantsComplete = parsed.data.completed;

    // ── COMPLETE QUEST ────────────────────────────────────────────────
    if (wantsComplete === true && !task.completed) {
      const inventory = await prisma.inventoryItem.findMany({ where: { userId: user.id } });
      const ownedIds = inventory.map((i) => i.itemId);
      const { xpMult, goldMult } = relicMultipliers(ownedIds);
      const mult = streakMultiplier(user.currentStreak);
      const gainedXp = Math.round(task.xp * xpMult * mult);
      const gainedGold = Math.round(task.gold * goldMult * mult);

      const progress = applyXp(user.level, user.xp, gainedXp);
      const streak = nextStreak(user.lastStreakDate, user.currentStreak, user.longestStreak, user.lastQuestDate === todayKey());

      // Grant the attribute-forged temporary weapon.
      const forgedId = FORGED_BY_ATTRIBUTE[task.attribute];
      const forged = forgedId ? itemById(forgedId) : undefined;
      let grantedWeapon: string | null = null;
      if (forged) {
        const existing = inventory.find((i) => i.itemId === forged.id);
        if (existing) {
          await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: { durability: 100, expiresAt: new Date(Date.now() + (forged.tempHours ?? 36) * 3600_000) },
          });
        } else {
          await prisma.inventoryItem.create({
            data: {
              userId: user.id,
              itemId: forged.id,
              durability: 100,
              expiresAt: new Date(Date.now() + (forged.tempHours ?? 36) * 3600_000),
            },
          });
        }
        grantedWeapon = forged.name;
      }

      const attrKey = (task.attribute as keyof typeof import("@/src/lib/game").ATTRIBUTES) ?? "DISCIPLINE";
      const attrField =
        attrKey === "INTELLECT" ? "intellect" : attrKey === "STRENGTH" ? "strength" : attrKey === "BOND" ? "bond" : "discipline";

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          level: progress.level,
          xp: progress.xp,
          rank: rankForLevel(progress.level).rank,
          title: rankForLevel(progress.level).title,
          gold: { increment: gainedGold },
          [attrField]: { increment: attributeGain(task.difficulty as DifficultyKey) },
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStreakDate: streak.changed ? todayKey() : user.lastStreakDate,
          questsDoneToday: user.lastQuestDate === todayKey() ? user.questsDoneToday + 1 : 1,
          lastQuestDate: todayKey(),
        },
      });

      const updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: { completed: true, completedAt: new Date(), ...data },
      });

      return ok({
        task: updatedTask,
        character: await characterPayload(user.id),
        rewards: { xp: gainedXp, gold: gainedGold, streak: streak.currentStreak },
        levelUp: progress.leveledUp ? { levels: progress.levelsGained, newLevel: progress.newLevel } : null,
        rankUp: progress.rankUp ? { newRank: progress.newRank } : null,
        grantedWeapon,
      });
    }

    // ── UNCOMPLETE (undo) ─────────────────────────────────────────────
    if (wantsComplete === false && task.completed) {
      const attrKey = (task.attribute as keyof typeof import("@/src/lib/game").ATTRIBUTES) ?? "DISCIPLINE";
      const attrField =
        attrKey === "INTELLECT" ? "intellect" : attrKey === "STRENGTH" ? "strength" : attrKey === "BOND" ? "bond" : "discipline";
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          gold: { decrement: task.gold },
          xp: Math.max(0, user.xp - Math.min(user.xp, task.xp)),
          [attrField]: { decrement: Math.min(user[attrField], attributeGain(task.difficulty as DifficultyKey)) },
          questsDoneToday: Math.max(0, user.questsDoneToday - 1),
        },
      });
      const updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: { completed: false, completedAt: null, ...data },
      });
      return ok({ task: updatedTask, character: await characterPayload(user.id) });
    }

    // ── PLAIN EDIT ────────────────────────────────────────────────────
    if (Object.keys(data).length === 0) return fail("Nothing to update.", 400);
    const updatedTask = await prisma.task.update({ where: { id: task.id }, data });
    return ok({ task: updatedTask });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const { id } = await params;
    const existing = await prisma.task.findFirst({ where: { id, userId: s.userId } });
    if (!existing) return fail("Quest not found.", 404);
    await prisma.task.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
