import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError } from "@/src/lib/api";
import { itemById, attackPower, ITEMS } from "@/src/lib/items";

export async function GET() {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const inventory = await prisma.inventoryItem.findMany({
      where: { userId: s.userId },
      orderBy: { acquiredAt: "desc" },
    });
    return ok({ inventory });
  } catch (e) {
    return handleApiError(e);
  }
}

const equipSchema = z.object({
  itemId: z.string().min(1),
  action: z.enum(["equip", "unequip"]),
});

export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const body = await req.json().catch(() => null);
    const parsed = equipSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422);

    const user = await prisma.user.findUnique({ where: { id: s.userId }, include: { inventory: true } });
    if (!user) return fail("Unauthorized", 401);

    const owned = user.inventory.find((i) => i.itemId === parsed.data.itemId);
    if (!owned) return fail("You do not own that item.", 404);
    const item = itemById(parsed.data.itemId);
    if (!item) return fail("Unknown item.", 404);

    if (parsed.data.action === "equip") {
      // Only one WEAPON and one THEME equipped at a time.
      const type = item.type === "WEAPON" ? "WEAPON" : item.type === "THEME" ? "THEME" : null;
      if (type) {
        const sameTypeIds = ITEMS.filter((i) => i.type === type).map((i) => i.id);
        const others = await prisma.inventoryItem.findMany({
          where: { userId: user.id, equipped: true, itemId: { in: sameTypeIds } },
        });
        for (const other of others) {
          if (other.id !== owned.id) {
            await prisma.inventoryItem.update({ where: { id: other.id }, data: { equipped: false } });
          }
        }
      }
      await prisma.inventoryItem.update({ where: { id: owned.id }, data: { equipped: true } });
    } else {
      await prisma.inventoryItem.update({ where: { id: owned.id }, data: { equipped: false } });
    }

    const inventory = await prisma.inventoryItem.findMany({ where: { userId: user.id } });
    const equippedWeaponId = inventory.find((i) => i.equipped)?.itemId;
    const equipped = equippedWeaponId ? itemById(equippedWeaponId) : undefined;
    const relics = inventory
      .filter((i) => itemById(i.itemId)?.type === "RELIC")
      .map((i) => itemById(i.itemId)!)
      .filter(Boolean);

    return ok({ inventory, attackPower: attackPower(equipped, relics) });
  } catch (e) {
    return handleApiError(e);
  }
}
