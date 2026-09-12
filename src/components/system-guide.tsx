"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send } from "lucide-react";
import { useGame } from "./providers";

interface Msg { role: "user" | "system"; text: string }

const QUICK_ASKS = [
  "What should I do?",
  "My streak",
  "The Gates",
  "Gold & Shop",
  "My rank",
];

export function SystemGuide() {
  const { user } = useGame();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "system",
      text: "You have acquired the qualifications to be a Player. I am the System's voice. Ask me what to do — or confess that you're stuck. I will not judge. I will direct.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : "The connection to the System flickers. Try again, Player.";
      setMsgs((m) => [...m, { role: "system", text: reply }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "system", text: "The gate between us wavers — your connection is down. The System waits. It always waits." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <>
      {/* Floating summon orb */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-4 z-[80] flex h-13 w-13 items-center justify-center rounded-full border border-sky-400/50 bg-[#0a1224]/90 text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.35)] lg:bottom-6 lg:right-6"
        style={{ width: 52, height: 52 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Close System Guide" : "Open System Guide"}
        aria-expanded={open}
      >
        <span className="pulse-glow absolute inset-0 rounded-full" aria-hidden="true" />
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="system-window fixed bottom-40 right-4 z-[80] flex h-[440px] w-[min(92vw,370px)] flex-col lg:bottom-24 lg:right-6"
            role="dialog"
            aria-label="System Guide"
          >
            <div className="window-head">
              <span className="window-title">◈ System Guide</span>
              <span className="text-[0.6rem] uppercase tracking-widest text-slate-500">Online</span>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                    m.role === "system"
                      ? "border border-sky-400/20 bg-sky-400/5 text-sky-100"
                      : "ml-auto border border-slate-600/30 bg-slate-700/20 text-slate-200"
                  }`}
                >
                  {m.role === "system" && (
                    <span className="mb-1 block font-system text-[0.58rem] uppercase tracking-[0.25em] text-sky-400">
                      [ System ]
                    </span>
                  )}
                  {m.text}
                </motion.div>
              ))}
              {busy && (
                <div className="flex items-center gap-1.5 px-2 text-sky-400" aria-label="System is responding">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-sky-400"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-sky-400/10 p-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar" role="list">
                {QUICK_ASKS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="chip shrink-0 cursor-pointer transition-colors hover:border-sky-400/50 hover:text-sky-200"
                    role="listitem"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
                className="flex gap-2"
              >
                <input
                  className="input !py-2 text-sm"
                  placeholder="Speak to the System…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={300}
                  aria-label="Message the System"
                />
                <button type="submit" className="btn !px-3" disabled={busy || !input.trim()} aria-label="Send">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
