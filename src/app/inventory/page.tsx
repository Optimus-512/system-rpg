"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "@/src/components/providers";
import { AuthShell } from "@/src/components/auth-shell";
import { itemById, RARITY_META } from "@/src/lib/items";

interface Row {
  id: string;
  itemId: string;
  equipped: boolean;
  durability: number;
  expiresAt: string | null;
}

function InventoryInner() {
  const { user, notify } = useGame();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory", { cache: "no-store" });
      if (res.ok) setRows((await res.json()).inventory);
    } catch {
      notify({ title: "Connection lost", body: "Your inventory window flickers.", kind: "danger" });
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(row: Row, action: "equip" | "unequip") {
    if (busy) return;
    setBusy(row.id);
    // Optimistic toggle
    setRows((prev) => (prev ?? []).map((r) => (r.id === row.id ? { ...r, equipped: action === "equip" } : r)));
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: row.itemId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.inventory);
      const item = itemById(row.itemId);
      notify({
        title: action === "equip" ? "Equipped" : "Unequipped",
        body: item ? `${item.icon} ${item.name}` : undefined,
        kind: "info",
      });
    } catch (e) {
      setRows((prev) => (prev ?? []).map((r) => (r.id === row.id ? { ...r, equipped: action !== "equip" } : r)));
      notify({ title: "The System refused", body: e instanceof Error ? e.message : "Try again.", kind: "danger" });
    } finally {
      setBusy(null);
    }
  }

  const liveRows = (rows ?? []).filter((r) => itemById(r.itemId));
  const weapons = liveRows.filter((r) => itemById(r.itemId)?.type === "WEAPON");
  const relics = liveRows.filter((r) => itemById(r.itemId)?.type === "RELIC");
  const themes = liveRows.filter((r) => itemById(r.itemId)?.type === "THEME");

  const sections: Array<{ title: string; rows: Row[] }> = [
    { title: "Weapons", rows: weapons },
    { title: "Relics", rows: relics },
    { title: "Themes", rows: themes },
  ];

  return (
    <div className="space-y-6">
      <div className="materialize">
        <h1 className="font-system text-xl font-black text-sky-100 text-glow">◈ Inventory</h1>
        <p className="mt-1 text-sm text-slate-400">
          Everything you own is proof of something you actually did.
        </p>
      </div>

      {rows === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-40 w-full" />
          ))}
        </div>
      ) : liveRows.length === 0 ? (
        <div className="system-window p-8 text-center">
          <p className="text-4xl" aria-hidden="true">🎒</p>
          <p className="mt-3 text-sm text-slate-400">
            Empty. Complete a quest to forge your first weapon — the System grants it the moment you act.
          </p>
        </div>
      ) : (
        sections.map((section) =>
          section.rows.length === 0 ? null : (
            <section key={section.title} aria-labelledby={`inv-${section.title}`}>
              <h2 id={`inv-${section.title}`} className="mb-3 font-system text-xs uppercase tracking-[0.25em] text-slate-400">
                {section.title} · {section.rows.length}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.rows.map((row, i) => {
                  const item = itemById(row.itemId)!;
                  const meta = RARITY_META[item.rarity];
                  return (
                    <motion.article
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`system-window scan p-5 ${row.equipped ? "!border-sky-400/60" : ""}`}
                      style={row.equipped ? { boxShadow: `0 0 22px ${meta.glow}` } : undefined}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-4xl" aria-hidden="true">{item.icon}</span>
                        {row.equipped && (
                          <span className="chip !text-sky-300 !border-sky-400/50">⚔ Equipped</span>
                        )}
                      </div>
                      <h3 className="mt-3 font-system text-sm font-bold uppercase tracking-[0.1em] text-sky-100">{item.name}</h3>
                      <p className="mt-1 text-[0.58rem] font-system uppercase tracking-[0.2em]" style={{ color: meta.color }}>
                        {meta.label} {item.type === "WEAPON" && item.atk ? `· ⚔ +${item.atk}` : ""}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.desc}</p>

                      {row.expiresAt && (
                        <p className="mt-2 text-[0.62rem] text-amber-300/80">
                          ⧗ Temporary — dissolves{" "}
                          {new Date(row.expiresAt).toLocaleString(undefined, {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          })}
                        </p>
                      )}
                      {item.tempHours && row.durability < 100 && (
                        <p className="mt-1 text-[0.62rem] text-rose-300/80">Durability {row.durability}%</p>
                      )}

                      {(item.type === "WEAPON" || item.type === "THEME") && (
                        <button
                          onClick={() => act(row, row.equipped ? "unequip" : "equip")}
                          disabled={busy === row.id}
                          className={`btn mt-4 w-full !py-2 ${row.equipped ? "btn-ghost" : ""}`}
                        >
                          {busy === row.id ? "…" : row.equipped ? "Unequip" : "Equip"}
                        </button>
                      )}
                    </motion.article>
                  );
                })}
              </div>
            </section>
          )
        )
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <AuthShell>
      <InventoryInner />
    </AuthShell>
  );
}
