import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError, characterPayload } from "@/src/lib/api";
import { ITEMS } from "@/src/lib/items";

export async function GET() {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const inventory = await prisma.inventoryItem.findMany({ where: { userId: s.userId } });
    return ok({ items: ITEMS, inventory });
  } catch (e) {
    return handleApiError(e);
  }
}

const buySchema = z.object({ itemId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const body = await req.json().catch(() => null);
    const parsed = buySchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422);

    const item = ITEMS.find((i) => i.id === parsed.data.itemId);
    if (!item) return fail("The System cannot find that item.", 404);
    if (item.price <= 0) return fail("This item is not sold. It must be earned through real-world quests.", 400);

    const user = await prisma.user.findUnique({ where: { id: s.userId }, include: { inventory: true } });
    if (!user) return fail("Unauthorized", 401);
    if (user.inventory.some((i) => i.itemId === item.id)) return fail("You already own this item.", 409);
    if (user.gold < item.price) return fail(`Not enough gold. You need ${item.price - user.gold} more.`, 402);

    const [, updatedUser] = await prisma.$transaction([
      prisma.inventoryItem.create({ data: { userId: user.id, itemId: item.id, durability: 100 } }),
      prisma.user.update({ where: { id: user.id }, data: { gold: { decrement: item.price } } }),
    ]);

    return ok({ character: await characterPayload(updatedUser.id), purchased: item.id });
  } catch (e) {
    return handleApiError(e);
  }
}
