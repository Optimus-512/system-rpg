# 🌍 Deploying THE SYSTEM — Exact Step-by-Step

Time required: **~10 minutes**. Cost: **₹0 / $0** (both free tiers).
Stack: **Vercel** (app) + **Neon** (Postgres).

> ⚠️ `prisma/schema.prisma` is already set to `provider = "postgresql"`.
> Local dev keeps working: set `DATABASE_URL="file:./dev.db"`… **no** — with Postgres provider,
> SQLite no longer works locally. For local dev either install Postgres, or run the same Neon
> database from your machine (recommended — it's free and instant).

---

## 1️⃣ Get a public git repo (required by Vercel)

```bash
cd system-rpg
git init
git add -A
git commit -m "THE SYSTEM — full-stack Life RPG"
```

Create an empty repo on **github.com** (e.g. `the-system`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/the-system.git
git branch -M main
git push -u origin main
```

> `.gitignore` already excludes `.env`, `node_modules`, and the SQLite file — nothing secret ships.

---

## 2️⃣ Create the Postgres database (Neon — free)

1. Go to **https://neon.com** → Sign up (GitHub login works).
2. Click **Create project** → name it `the-system` → region: **Singapore / Mumbai** (closest to you) → Create.
3. Open the **Connection string** panel → choose **Prisma** tab → copy the string. It looks like:

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Keep this tab open.

---

## 3️⃣ Push the schema to Neon (once, from your machine)

```bash
cd system-rpg

# temporarily point Prisma at Neon (PowerShell: use $env:DATABASE_URL="...")
export DATABASE_URL="paste-your-neon-connection-string-here"
npx prisma db push          # creates all 6 tables
npm run db:seed             # optional: demo hunters (ShadowMonarch / hunter123)
```

---

## 4️⃣ Deploy on Vercel

1. Go to **https://vercel.com** → Sign up with **GitHub**.
2. **Add New… → Project** → **Import** your `the-system` repo.
3. Before pressing Deploy, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | your Neon connection string (same as step 3) |
| `JWT_SECRET` | output of `openssl rand -base64 32` (or any long random string) |
| `NEXT_PUBLIC_APP_NAME` | `THE SYSTEM` |

4. Press **Deploy**. Wait ~2 minutes.
5. You get your permanent URL: `https://the-system-xxxx.vercel.app` 🎉

`vercel.json` already pins the build command (`prisma generate && next build`) so no extra config is needed. Vercel redeploys automatically on every `git push`.

---

## 5️⃣ Verify the deployment (2 minutes)

Open your Vercel URL and check:

- [ ] Landing page renders with the neon hero
- [ ] Register → you land on the Status window
- [ ] Create + complete a quest → XP/gold/streak increase
- [ ] **Refresh the page → data persists (that's Neon holding it)**
- [ ] Gates → complete a Strength quest first, then strike the Weakening Willow
- [ ] Leaderboard shows the seeded demo hunters (if you ran the seed)
- [ ] Log in from your **phone** — same account, same progress

---

## 🔁 Future pushes

```bash
git add -A && git commit -m "…" && git push
```

Vercel redeploys automatically. If you ever change `prisma/schema.prisma`, also run
`npx prisma db push` (with `DATABASE_URL` pointed at Neon) — schema changes do **not** auto-apply.

---

## 🆘 Common failures

| Symptom | Fix |
|---|---|
| Build fails: `PrismaClientInitializationError` | `DATABASE_URL` missing/typo'd in Vercel env vars |
| `/api/*` returns 500 | Check Vercel → Deployment → **Functions** logs; usually DB string or JWT_SECRET |
| `P1001: can't reach database` | Neon project paused (free tier sleeps) — open neon.com and wake it |
| Seed says unique constraint | Demo hunters already seeded — fine, ignore |
| Want your own domain | Vercel → Project → Domains → Add |

---

## ☁️ Alternative: Render (one service, no GitHub needed)

Render → **New Web Service** → connect repo (or "Deploy from Git"):

- **Build:** `npm install && npx prisma db push && npm run build`
- **Start:** `npm start`
- **Env vars:** same three as above, plus use Render's free Postgres instead of Neon.

Same result: a permanent HTTPS URL.
