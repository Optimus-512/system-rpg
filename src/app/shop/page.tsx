"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/src/components/providers";
import { AuthShell } from "@/src/components/auth-shell";
import { RARITY_META, type CatalogItem } from "@/src/lib/items";

type Filter = "ALL" | "WEAPON" | "RELIC" | "THEME";

function ShopInner() {
  const { user, notify, applyCharacter } = useGame();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/shop", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setOwned(new Set(data.inventory.map((i: { itemId: string }) => i.itemId)));
      }
    } catch {
      notify({ title: "Connection lost", body: "The merchant window is unreachable.", kind: "danger" });
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function buy(item: CatalogItem) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify({ title: "Purchase refused", body: data.error, kind: "danger" });
        return;
      }
      if (data.character) applyCharacter(data.character);
      setOwned((prev) => new Set([...prev, item.id]));
      notify({ title: "Acquired", body: `${item.icon} ${item.name} joins your inventory.`, kind: "gold" });
    } catch {
      notify({ title: "Transaction failed", body: "The merchant sees only static. Try again.", kind: "danger" });
    } finally {
      setBusyId(null);
    }
  }

  const visible = (items ?? []).filter((i) => filter === "ALL" || i.type === filter);
  const filters: Filter[] = ["ALL", "WEAPON", "RELIC", "THEME"];

  return (
    <div className="space-y-5">
      <div className="materialize flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-system text-xl font-black text-sky-100 text-glow">◈ The Shop</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gold buys gear. But the strongest weapons are <span className="text-sky-300">never sold</span> — only forged by real quests.
          </p>
        </div>
        <span className="chip !text-sm" aria-live="polite">
          <span className="text-amber-300">◉</span>
          <span className="text-amber-200">{user?.gold ?? 0} Gold</span>
        </span>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Item type filter">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            role="tab"
            aria-selected={filter === f}
            className={`chip cursor-pointer transition-colors ${filter === f ? "!border-sky-400/60 !text-sky-200" : "hover:text-slate-300"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-52 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => {
            const meta = RARITY_META[item.rarity];
            const isOwned = owned.has(item.id);
            const notSold = item.price <= 0;
            const affordable = (user?.gold ?? 0) >= item.price;
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="system-window scan flex flex-col p-5"
                style={{ borderColor: `${meta.color}33` }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-4xl" aria-hidden="true">{item.icon}</span>
                  <span
                    className="font-system text-[0.58rem] uppercase tracking-[0.2em]"
                    style={{ color: meta.color, textShadow: `0 0 10px ${meta.glow}` }}
                  >
                    {meta.label}
                  </span>
                </div>
                <h2 className="mt-3 font-system text-sm font-bold uppercase tracking-[0.1em] text-sky-100">{item.name}</h2>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                {item.atk && <p className="mt-2 text-[0.65rem] text-rose-300">⚔ ATK +{item.atk}</p>}

                <div className="mt-4 flex items-center justify-between border-t border-sky-400/10 pt-3">
                  <span className={`font-system text-sm ${notSold ? "text-slate-500" : "text-amber-300"}`}>
                    {notSold ? "Quest-forged only" : `${item.price} G`}
                  </span>
                  {isOwned ? (
                    <span className="chip !text-emerald-300">✓ Owned</span>
                  ) : notSold ? (
                    <span className="text-[0.6rem] uppercase tracking-widest text-slate-600">Earn it</span>
                  ) : (
                    <button
                      onClick={() => buy(item)}
                      disabled={busyId === item.id || !affordable}
                      className={`btn !py-2 ${affordable ? "btn-gold" : ""}`}
                      aria-label={`Buy ${item.name} for ${item.price} gold`}
                      title={!affordable ? "Not enough gold — complete quests" : undefined}
                    >
                      {busyId === item.id ? "…" : affordable ? "Buy" : "Locked"}
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <AuthShell>
      <ShopInner />
    </AuthShell>
  );
}
