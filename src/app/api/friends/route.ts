import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError } from "@/src/lib/api";
import { powerScore } from "@/src/lib/game";

const CARD_SELECT = {
  id: true,
  username: true,
  level: true,
  rank: true,
  title: true,
  wins: true,
  losses: true,
  intellect: true,
  strength: true,
  discipline: true,
  bond: true,
} as const;

export async function GET(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    // Accepted alliances (either direction).
    const friendsRaw = await prisma.friendship.findMany({
      where: {
        OR: [
          { fromId: s.userId, status: "ACCEPTED" },
          { toId: s.userId, status: "ACCEPTED" },
        ],
      },
      include: { from: { select: CARD_SELECT }, to: { select: CARD_SELECT } },
    });
    const friends = friendsRaw.map((f) => {
      const other = f.fromId === s.userId ? f.to : f.from;
      return { ...other, power: powerScore(other) };
    });

    // Requests.
    const incoming = await prisma.friendship.findMany({
      where: { toId: s.userId, status: "PENDING" },
      include: { from: { select: { id: true, username: true, level: true, rank: true } } },
    });
    const outgoing = await prisma.friendship.findMany({
      where: { fromId: s.userId, status: "PENDING" },
      include: { to: { select: { id: true, username: true, level: true, rank: true } } },
    });

    // Hunter search (min 2 chars). Excludes self and existing relations.
    let results: Array<{ id: string; username: string; level: number; rank: string; power: number }> = [];
    if (q.length >= 2) {
      // Broad fetch + JS-side case-insensitive filter: works on SQLite and Postgres alike.
      const found = await prisma.user.findMany({
        where: { username: { contains: q } },
        take: 100,
        select: CARD_SELECT,
      });
      const needle = q.toLowerCase();
      const related = new Set<string>([
        s.userId,
        ...friends.map((f) => f.id),
        ...incoming.map((i) => i.from.id),
        ...outgoing.map((o) => o.to.id),
      ]);
      results = found
        .filter((u) => !related.has(u.id) && u.username.toLowerCase().includes(needle))
        .slice(0, 10)
        .map((u) => ({ ...u, power: powerScore(u) }));
    }

    return ok({ friends, incoming, outgoing, results });
  } catch (e) {
    return handleApiError(e);
  }
}

const actionSchema = z.object({
  action: z.enum(["add", "accept", "remove"]),
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422);

    const { action, userId: targetId } = parsed.data;
    if (targetId === s.userId) {
      return fail("You cannot befriend yourself. The System finds this amusing.", 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, username: true },
    });
    if (!target) return fail("Hunter not found.", 404);

    if (action === "add") {
      // If they already requested me, accept instantly — alliance formed.
      const reverse = await prisma.friendship.findUnique({
        where: { fromId_toId: { fromId: targetId, toId: s.userId } },
      });
      if (reverse) {
        if (reverse.status === "ACCEPTED") return fail("You are already allies.", 409);
        await prisma.friendship.update({ where: { id: reverse.id }, data: { status: "ACCEPTED" } });
        return ok({ message: `${target.username} requested you first — alliance formed.` });
      }
      const existing = await prisma.friendship.findUnique({
        where: { fromId_toId: { fromId: s.userId, toId: targetId } },
      });
      if (existing) {
        return fail(existing.status === "ACCEPTED" ? "You are already allies." : "Request already sent.", 409);
      }
      await prisma.friendship.create({ data: { fromId: s.userId, toId: targetId } });
      return ok({ message: `Request sent to ${target.username}.` }, 201);
    }

    if (action === "accept") {
      const request = await prisma.friendship.findUnique({
        where: { fromId_toId: { fromId: targetId, toId: s.userId } },
      });
      if (!request || request.status !== "PENDING") return fail("No pending request from that hunter.", 404);
      await prisma.friendship.update({ where: { id: request.id }, data: { status: "ACCEPTED" } });
      return ok({ message: `Alliance formed with ${target.username}.` });
    }

    // remove — either direction.
    const rel = await prisma.friendship.findFirst({
      where: {
        OR: [
          { fromId: s.userId, toId: targetId },
          { fromId: targetId, toId: s.userId },
        ],
      },
    });
    if (!rel) return fail("No alliance to dissolve.", 404);
    await prisma.friendship.delete({ where: { id: rel.id } });
    return ok({ message: "Alliance dissolved." });
  } catch (e) {
    return handleApiError(e);
  }
}
