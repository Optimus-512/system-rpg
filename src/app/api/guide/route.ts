// ─────────────────────────────────────────────────────────────────────
//  THE SYSTEM · Guide
//  A rule-based "System" voice that inspects your REAL character state
//  and tells you exactly what to do next. No external AI keys required.
//  The System never nags. It observes. It motivates. It tests you.
// ─────────────────────────────────────────────────────────────────────
import { prisma } from "@/src/lib/db";
import { ok, fail, requireUser, handleApiError } from "@/src/lib/api";
import { nextRank, todayKey, xpForLevel, streakMultiplier } from "@/src/lib/game";
import { GATES } from "@/src/lib/gates";
import { itemById } from "@/src/lib/items";

export async function POST(req: Request) {
  try {
    const s = await requireUser();
    if (!s) return fail("Unauthorized", 401);
    const body = await req.json().catch(() => null);
    const message: string = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
    if (!message.trim()) return fail("Say something to the System.", 422);

    const user = await prisma.user.findUnique({ where: { id: s.userId }, include: { inventory: true } });
    if (!user) return fail("Unauthorized", 401);

    const now = Date.now();
    const live = user.inventory.filter((i) => !(i.expiresAt && i.expiresAt.getTime() < now));
    const ownedIds = new Set(live.map((i) => i.itemId));
    const doneToday = user.lastQuestDate === todayKey();
    const staleStreak = user.currentStreak > 0 && user.lastStreakDate !== todayKey();

    const next = nextRank(user.level);
    const need = xpForLevel(user.level);
    const xpPct = Math.round((user.xp / need) * 100);
    const msg = message.toLowerCase();

    // ── Rule engine: respond to intent, then add urgent context ────────
    let reply = "";

    if (/help|what.*do|stuck|lost|where.*start|guide/.test(msg)) {
      const missing = GATES.filter((g) => !ownedIds.has(g.requiredItemId));
      if (missing.length > 0) {
        const g = missing[0];
        const w = itemById(g.requiredItemId);
        reply = `Your directive: forge the ${w?.name}. It is granted the moment you complete a ${g.attribute.toLowerCase()} quest — gym, study, discipline, a real conversation. With it, enter the Gate of ${g.name} and deal ${g.hp} damage of consequence.`;
      } else {
        reply = "All forged weapons are in your grasp. Enter the Gates. The Monarch of Stagnation still stands — bring the Shadow Excalibur from the Shop, if you dare.";
      }
    } else if (/streak|chain/.test(msg)) {
      reply = doneToday
        ? `Today is secured. Streak: ${user.currentStreak} days. Rewards multiplier: ×${streakMultiplier(user.currentStreak).toFixed(2)}. Rest, hunter — tomorrow the gates reopen.`
        : staleStreak && user.currentStreak >= 3
          ? `⚠️ Your ${user.currentStreak}-day streak hangs by a thread. Complete ONE quest today to preserve it. Multiplier at risk: ×${streakMultiplier(user.currentStreak).toFixed(2)}.`
          : "Streaks are forged one day at a time. Complete any quest today to begin, or continue, your chain. Five consecutive days double nothing — they multiply everything (capped at +50%).";
    } else if (/gate|boss|monster|villain|willow|leech|laziness|stagnation/.test(msg)) {
      const locked = GATES.filter((g) => !ownedIds.has(g.requiredItemId));
      reply = locked.length
        ? `Known Gates: ${GATES.map((g) => `${g.icon} ${g.name}`).join(" · ")}. You currently lack the required weapon for ${locked.length} of them. The Gates do not move. You do.`
        : `Known Gates: ${GATES.map((g) => `${g.icon} ${g.name}`).join(" · ")}. You hold every forged key. The Monarch of Stagnation awaits a worthy duel.`;
    } else if (/item|weapon|shop|buy|gold/.test(msg)) {
      reply = `Gold reserves: ${user.gold}. The Shop sells weapons, relics, and interface themes. But remember: the strongest weapons — Spear of Strength, Lumen Codex, Iron Will Blade, Chain of Bonds — are never sold. They are earned by doing.`;
    } else if (/rank|level|rank up|ascend/.test(msg)) {
      reply = next
        ? `You stand at Level ${user.level}, ${xpPct}% toward Level ${user.level + 1}. Rank ${next.rank} opens at Level ${next.minLevel} — ${next.minLevel - user.level} level${next.minLevel - user.level === 1 ? "" : "s"} away. The climb is the point.`
        : `You are Level ${user.level}. There is nothing above you but the System itself.`;
    } else {
      reply = "The System hears you. Speak of quests, streaks, gates, gold, or rank — or simply complete your next quest. Action is the only language the System respects.";
    }

    // ── Urgent context appended once ───────────────────────────────────
    if (!doneToday) {
      const urgent = staleStreak && user.currentStreak >= 3
        ? ` ⚠️ One more thing: your ${user.currentStreak}-day streak is unrenewed. One quest. Now.`
        : "";
      if (urgent) reply += urgent;
    }

    return ok({ reply });
  } catch (e) {
    return handleApiError(e);
  }
}
