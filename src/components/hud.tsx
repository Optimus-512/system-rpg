"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Swords, ScrollText, Store, Backpack, Trophy, Users, LayoutDashboard, LogOut,
} from "lucide-react";
import { useGame } from "./providers";

const NAV = [
  { href: "/system", label: "Status", icon: LayoutDashboard },
  { href: "/quests", label: "Quests", icon: ScrollText },
  { href: "/gates", label: "Gates", icon: Swords },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/inventory", label: "Inventory", icon: Backpack },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/friends", label: "Allies", icon: Users },
];

export function Hud() {
  const { user, stats, logout } = useGame();
  const pathname = usePathname();
  const router = useRouter();

  if (!user || !stats) return null;

  const rankColor =
    user.rank === "S" ? "#fb7185" : user.rank === "NATIONAL" ? "#c084fc" : user.rank === "A" ? "#fbbf24" : "#38bdf8";

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* ── Top status bar ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-sky-400/10 bg-[#04060d]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:gap-5 sm:px-5">
          {/* Player identity */}
          <Link href="/system" className="group flex min-w-0 items-center gap-3" aria-label="Open status window">
            <span
              className="rank-badge h-10 w-10 shrink-0 text-sm"
              style={{ color: rankColor, boxShadow: `0 0 14px ${rankColor}44, inset 0 0 10px ${rankColor}22` }}
              aria-hidden="true"
            >
              {user.rank === "NATIONAL" ? "★" : user.rank}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-sky-100 group-hover:text-white">
                {user.username}
              </span>
              <span className="block text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
                Lv.{user.level} · {user.title}
              </span>
            </span>
          </Link>

          {/* XP bar */}
          <div className="hidden min-w-0 flex-1 sm:block" aria-hidden="true">
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${stats.xpPercent}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[0.65rem] uppercase tracking-widest text-slate-500">
              <span>LV. {user.level}</span>
              <span>{user.xp} / {stats.xpNeeded} XP</span>
            </div>
          </div>

          {/* Gold & streak */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="chip" title="Gold" aria-label={`${user.gold} gold`}>
              <span className="text-amber-300">◉</span>
              <span className="text-amber-200">{user.gold}</span>
            </span>
            <span className="chip" title="Daily streak" aria-label={`${user.currentStreak} day streak`}>
              <span className="text-orange-300">▲</span>
              <span>{user.currentStreak}d</span>
            </span>
            <button
              onClick={handleLogout}
              className="btn-ghost btn !px-2.5 !py-2"
              aria-label="Log out"
              title="Leave the System"
            >
              <LogOut size={15} />
            </button>
          </div>

          {/* Mobile XP bar */}
          <div className="w-full sm:hidden" aria-hidden="true">
            <div className="xp-track" style={{ height: 6 }}>
              <div className="xp-fill" style={{ width: `${stats.xpPercent}%` }} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Bottom nav (mobile) / side rail (desktop) ── */}
      <nav
        aria-label="System navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-sky-400/10 bg-[#04060d]/90 backdrop-blur-md lg:inset-y-0 lg:left-0 lg:right-auto lg:w-[76px] lg:border-r lg:border-t-0"
      >
        <ul className="flex items-stretch justify-around lg:h-full lg:flex-col lg:justify-start lg:gap-1 lg:pt-20">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex-1 lg:flex-none">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative mx-auto flex flex-col items-center gap-0.5 px-2 py-2.5 text-[0.6rem] uppercase tracking-[0.15em] transition-colors lg:w-[64px] lg:rounded lg:py-3 ${
                    active ? "text-sky-300" : "text-slate-500 hover:text-sky-200"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-2 inset-y-1 -z-10 rounded bg-sky-400/10"
                      style={{ boxShadow: "inset 0 0 18px rgba(56,189,248,0.15)" }}
                    />
                  )}
                  <Icon size={19} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                  <span className="hidden sm:block">{label}</span>
                  <span className="lg:hidden">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
