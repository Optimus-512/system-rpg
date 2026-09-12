// ─────────────────────────────────────────────────────────────────────
//  THE SYSTEM · Seed
//  Creates demo hunters (password: hunter123) so the leaderboard,
//  friend search, and duels feel alive on first launch.
// ─────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO = [
  { username: "ShadowMonarch", email: "monarch@system.gg", level: 12, xp: 40, gold: 620, intellect: 14, strength: 18, discipline: 15, bond: 9, streak: 7, wins: 4, losses: 1, rank: "C", title: "Quest Seeker", weapon: "spear_of_strength" },
  { username: "ChaHaeIn", email: "cha@system.gg", level: 9, xp: 10, gold: 340, intellect: 16, strength: 8, discipline: 11, bond: 12, streak: 12, wins: 2, losses: 2, rank: "C", title: "Quest Seeker", weapon: "lumen_codex" },
  { username: "IronWill", email: "iron@system.gg", level: 6, xp: 55, gold: 210, intellect: 5, strength: 10, discipline: 14, bond: 4, streak: 3, wins: 1, losses: 3, rank: "D", title: "Aspirant", weapon: "iron_will_blade" },
  { username: "NightOwl", email: "owl@system.gg", level: 3, xp: 20, gold: 95, intellect: 7, strength: 2, discipline: 3, bond: 6, streak: 0, wins: 0, losses: 1, rank: "E", title: "Awakened Nobody", weapon: null },
];

async function main() {
  console.log("⟡ Seeding the System…");

  for (const d of DEMO) {
    const passwordHash = await bcrypt.hash("hunter123", 10);
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        username: d.username,
        email: d.email,
        passwordHash,
        level: d.level,
        xp: d.xp,
        gold: d.gold,
        rank: d.rank,
        title: d.title,
        intellect: d.intellect,
        strength: d.strength,
        discipline: d.discipline,
        bond: d.bond,
        currentStreak: d.streak,
        longestStreak: Math.max(d.streak, 5),
        wins: d.wins,
        losses: d.losses,
      },
    });

    if (d.weapon) {
      await prisma.inventoryItem.upsert({
        where: { userId_itemId: { userId: user.id, itemId: d.weapon } },
        update: {},
        create: { userId: user.id, itemId: d.weapon, durability: 100 },
      });
    }

    // A couple of sample quests for the demo monarch
    if (d.username === "ShadowMonarch") {
      const count = await prisma.task.count({ where: { userId: user.id } });
      if (count === 0) {
        await prisma.task.createMany({
          data: [
            { userId: user.id, title: "Morning run — 5km", attribute: "STRENGTH", difficulty: "NORMAL", xp: 44, gold: 26 },
            { userId: user.id, title: "Read 20 pages of Dune", attribute: "INTELLECT", difficulty: "EASY", xp: 29, gold: 18 },
          ],
        });
      }
    }
  }

  console.log("✓ System seeded. Demo hunters use password: hunter123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
