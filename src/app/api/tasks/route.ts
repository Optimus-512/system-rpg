import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError } from "@/src/lib/api";
import { ATTRIBUTES, DIFFICULTY_KEYS, questReward, type DifficultyKey } from "@/src/lib/game";

export async function GET() {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const tasks = await prisma.task.findMany({
      where: { userId: s.userId },
      orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    });
    return ok({ tasks });
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Name your quest").max(120, "Keep it under 120 characters"),
  note: z.string().trim().max(500, "Note too long").optional().nullable(),
  attribute: z.enum(["INTELLECT", "STRENGTH", "DISCIPLINE", "BOND"]),
  difficulty: z.enum(["EASY", "NORMAL", "HARD", "BOSS"]),
});

export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const user = await prisma.user.findUnique({ where: { id: s.userId } });
    if (!user) return fail("Unauthorized", 401);

    const { title, note, attribute, difficulty } = parsed.data;
    const reward = questReward(difficulty as DifficultyKey, user.level);

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title,
        note: note || null,
        attribute,
        difficulty,
        xp: reward.xp,
        gold: reward.gold,
      },
    });

    return ok({ task }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
