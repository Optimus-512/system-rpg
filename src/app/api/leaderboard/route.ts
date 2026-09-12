import { prisma } from "@/src/lib/db";
import { ok, requireUser, handleApiError } from "@/src/lib/api";
import { powerScore } from "@/src/lib/game";

export async function GET() {
  try {
    const s = await requireUser();
    if (!s) return ok({ me: null, leaders: [] });

    const users = await prisma.user.findMany({
      orderBy: [{ level: "desc" }, { xp: "desc" }],
      take: 50,
      select: {
        id: true,
        username: true,
        level: true,
        xp: true,
        rank: true,
        title: true,
        intellect: true,
        strength: true,
        discipline: true,
        bond: true,
        currentStreak: true,
        longestStreak: true,
        wins: true,
        losses: true,
      },
    });

    const leaders = users
      .map((u, i) => ({ ...u, position: i + 1, power: powerScore(u) }))
      .sort((a, b) => b.power - a.power)
      .map((u, i) => ({ ...u, position: i + 1 }));

    const me = leaders.find((l) => l.id === s.userId) ?? null;
    return ok({ me, leaders });
  } catch (e) {
    return handleApiError(e);
  }
}
