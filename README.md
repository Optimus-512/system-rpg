@ ⚔ THE SYSTEM — Life RPG

> *"You have acquired the qualifications to be a Player. Will you accept?"*

**THE SYSTEM** is a full-stack Life RPG inspired by *Solo Leveling*. Real-world tasks become Quests. Completing them forges temporary Weapons. Weapons are the only thing that damages Gates — bosses who are the living manifestations of a sedentary life (the Weakening Willow feeds on skipped workouts, the Leech of Loneliness on silent phones, the Mind Leech on unfocused hours). Clear Gates, climb E → S Rank, hold daily streaks, buy relics and themes, duel your allies, and let a rule-based **System Guide** tell you exactly what to do when you're stuck.

---

## ✨ Features

| System | Details |
| --- | --- |
| 🔐 **Auth & Security** | Email/password (bcrypt), JWT session in httpOnly cookie, per-user data isolation, server-computed rewards (client can't cheat XP) |
| 🗃 **Database** | Prisma + SQLite (dev) / PostgreSQL (prod). Users, Tasks, Inventory, GateRuns, Friendships, Battles |
| 📈 **Progression** | Non-linear XP curve `100·L^1.5`, 7 ranks (E→NATIONAL LEVEL), multi-level-up handling |
| ⚡ **Streaks** | Consecutive-day tracking with a reward multiplier (up to +50%), at-risk warnings |
| 🧬 **Attributes** | Intellect / Strength / Discipline / Bond — every quest trains exactly one |
| ⚔ **Forged Weapons** | Completing a quest grants a temporary weapon (36h) keyed to its attribute — the Spear of Strength only exists if you trained |
| 👹 **Gates** | 5 bosses with weapon requirements, attribute-scaled damage, durability decay, victory bounties, and mocking quotes when you fail |
| 🛒 **Economy** | Gold from quests and duels; shop sells weapons, relics (permanent XP/gold multipliers) and interface themes |
| 🏆 **Leaderboard** | Power-score rankings (level + attributes + duel record) with podium |
| 🤝 **Allies & PvP** | Search hunters, request/accept alliances, deterministic seeded duel simulation with play-by-play log and gold bounty |
| 🧙 **System Guide** | Rule-based chatbot that inspects your real character state and issues directives — no external AI key needed |
| 📱 **UI/UX** | Solo Leveling dark-neon design system, System Windows with corner brackets, optimistic updates, skeletons, level-up cinematics, particle bursts, floating combat text |
| ♿ **A11y & SEO** | Full keyboard navigation, focus rings, aria-live regions, semantic HTML, reduced-motion support, metadata + OG tags |

---

## 🧱 Tech Stack

- **Next.js 15** (App Router, React 19) — frontend + API routes
- **Prisma** ORM — SQLite in dev, PostgreSQL-ready for production
- **jose** JWT sessions in httpOnly cookies + **bcryptjs** password hashing
- **Tailwind CSS v4** + custom design system in `globals.css`
- **Framer Motion** — spring animations, level-up cinematics, battle logs
- **zod** — request validation on every mutating route

---

## 🚀 Quick Start (local)

Prereqs: **Node 18.18+** (Node 20/22 recommended) and a **PostgreSQL** URL.
The app ships Postgres-first — the easiest free database is [Neon](https://neon.com) (no install needed).

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
#    → paste your Neon connection string into DATABASE_URL

# 3. Create the tables in Postgres
npx prisma db push

# 4. Seed demo hunters (password: hunter123)
npm run db:seed

# 5. Launch
npm run dev
```

Open **http://localhost:3000** → *Begin Your Awakening* → register → complete a quest → watch the weapon get forged → enter a Gate.

One-liner alternative: `npm run setup` (install + generate + push + seed).

---

## 📜 Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Prisma generate + production build |
| `npm start` | Serve the production build |
| `npm run db:push` | Sync `prisma/schema.prisma` to the database |
| `npm run db:seed` | Insert demo hunters |
| `npm run db:studio` | Open Prisma Studio (DB browser) |
| `npm run setup` | install + generate + push + seed in one shot |

---

## 🔑 Environment Variables

See `.env.example`:

```bash
DATABASE_URL="file:./dev.db"        # local SQLite
# DATABASE_URL="postgresql://…"     # production (Neon/Supabase/Railway)
JWT_SECRET="a-long-random-string"   # openssl rand -base64 32
NEXT_PUBLIC_APP_NAME="THE SYSTEM"
```

**The schema is Postgres-first** (`provider = "postgresql"`). Same `DATABASE_URL` works for local dev and your Vercel deployment — see [DEPLOY.md](./DEPLOY.md) for the full walkthrough.

---

## 🧠 Game Design Notes

- **XP curve:** `xpForLevel(L) = 100 · L^1.5` — level 1→2 costs 100 XP, 9→10 costs 300, 19→20 costs ~872. Non-linear, punishing, addictive.
- **Rewards:** `base = 20 + 2·level`, × difficulty (EASY ×1, NORMAL ×1.5, HARD ×2.2, BOSS ×3.5), × streak multiplier (1 + 5%·streak, cap +50%), × relic multipliers.
- **Anti-cheat:** every reward is computed server-side from the quest row; the client only sends "I completed this" — never amounts.
- **Weapon gatekeeping:** `computeDamage()` returns zero damage without the required forged weapon in inventory — bosses literally cannot be punched to death by wishful thinking.
- **Durability:** gate attacks consume 50 durability of forged weapons; at 0 the weapon shatters and must be re-earned by doing the real-world thing again. That's the point.

---

## 📁 Project Structure

```
system-rpg/
├── prisma/
│   ├── schema.prisma        # User, Task, InventoryItem, GateRun, Friendship, Battle
│   └── seed.ts              # Demo hunters
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing (System notification hero)
│   │   ├── login/page.tsx        # Auth window
│   │   ├── system/page.tsx       # Status window (character sheet)
│   │   ├── quests/page.tsx       # Quest CRUD + completion fanfare
│   │   ├── gates/page.tsx        # Boss battles
│   │   ├── shop/page.tsx         # Economy
│   │   ├── inventory/page.tsx    # Equip / durability
│   │   ├── leaderboard/page.tsx  # Rankings
│   │   ├── friends/page.tsx      # Search, alliances, duels
│   │   └── api/                  # 12 route handlers
│   ├── components/          # HUD, providers, toasts, level-up overlay, System Guide
│   └── lib/                 # game engine, items, gates, auth, db, api helpers
└── .env.example
```

---

## 🌍 Deployment

### Vercel (frontend + API) + Neon (Postgres)

1. Create a free Postgres at [neon.tech](https://neon.tech) → copy the connection string.
2. Push this repo to GitHub.
3. On [vercel.com](https://vercel.com): *New Project* → import the repo.
4. Environment variables:
   - `DATABASE_URL` = your Neon connection string (`?sslmode=require`)
   - `JWT_SECRET` = `openssl rand -base64 32`
   - `NEXT_PUBLIC_APP_NAME` = `THE SYSTEM`
5. In `prisma/schema.prisma` set `provider = "postgresql"`.
6. Locally against the prod DB: `npx prisma db push && npm run db:seed` (or add it as a build step).
7. Deploy. Build command `npm run build` runs `prisma generate` automatically.

### Render / Railway (all-in-one)

- Build: `npm install && npx prisma db push && npm run build`
- Start: `npm start`
- Add a persistent disk mounted at a folder and point `DATABASE_URL="file:/data/prod.db"` (SQLite) — or attach their managed Postgres.

---

## 🎬 Demo Video Checklist (90–180s)

1. Landing page → *"Begin Your Awakening"* (10s)
2. Register a new hunter → auto-login into the Status window (20s)
3. Create a quest ("Gym — push day", Strength) → complete it → catch the XP float, toast, weapon-grant notification (30s)
4. **Level up cinematic** if it crosses a threshold (10s)
5. Gates page → strike the Weakening Willow with the fresh Spear of Strength → victory modal (25s)
6. **Refresh the page** → everything persists (database proof) (10s)
7. Leaderboard + a duel vs. ShadowMonarch (password `hunter123`) (20s)
8. Close on the System Guide giving you a directive (10s)

---

## 🧪 Manual Test Pass

- [x] Register with weak password → inline error
- [x] Duplicate username/email → 409 with message
- [x] Complete quest offline → optimistic UI rolls back, quest stays open
- [x] Attack gate without weapon → 0 damage + boss quote
- [x] Buy item without gold → "Not enough gold" (server 402)
- [x] Duel non-ally → 403
- [x] Keyboard: tab through nav, complete quests with Enter/Space, Esc closes modals
- [x] Mobile: bottom nav, no horizontal scroll, XP bar visible in HUD

---

*Arise.*
