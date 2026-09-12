"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    search.get("mode") === "register" ? "register" : "login"
  );
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login" ? { identifier, password } : { username, email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "The System does not recognize these credentials."
            ? "The System does not recognize these credentials. Check spelling — or awaken a new account below."
            : data.error ?? "The System refused. Try again."
        );
        return;
      }
      router.push("/system");
      router.refresh();
    } catch {
      setError("The connection to the System was severed. Check your network, Player.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* The System speaks */}
        <div className="mb-8 text-center">
          <p className="font-system text-[0.6rem] uppercase tracking-[0.45em] text-sky-400/80">
            ◈ Notification ◈
          </p>
          <h1 className="mt-4 font-system text-xl font-bold leading-relaxed text-sky-100 sm:text-2xl">
            {mode === "login" ? (
              <>
                &quot;Welcome back, Player.
                <br />
                <span className="text-sky-400/90 text-glow">The gates kept moving without you.</span>&quot;
              </>
            ) : (
              <>
                &quot;Every adventure begins with a form nobody wants to fill.
                <br />
                <span className="text-sky-400/90 text-glow">Yours begins now.</span>&quot;
              </>
            )}
          </h1>
          <p className="mt-3 text-xs text-slate-500">
            {mode === "login"
              ? "Present your credentials to re-enter the System."
              : "Choose your hunter name wisely. It will follow you to the leaderboard."}
          </p>
        </div>

        <div className="system-window materialize">
          <div className="window-head">
            <span className="window-title">{mode === "login" ? "◈ Authentication" : "◈ Awakening Protocol"}</span>
            <span className="text-[0.6rem] tracking-widest text-slate-500">
              {mode === "login" ? "01/01" : "01/01"}
            </span>
          </div>

          {mode === "login" && (
            <div className="mx-6 mt-4 flex flex-wrap items-center gap-2 border border-sky-400/20 bg-sky-400/5 px-3 py-2">
              <span className="font-system text-[0.58rem] uppercase tracking-[0.2em] text-sky-300/80">Demo hunters:</span>
              {[
                { id: "ShadowMonarch", label: "ShadowMonarch · Lv.12" },
                { id: "ChaHaeIn", label: "ChaHaeIn · Lv.9" },
                { id: "IronWill", label: "IronWill · Lv.6" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setIdentifier(d.id);
                    setPassword("hunter123");
                    setError(null);
                  }}
                  className="chip cursor-pointer transition-colors hover:border-sky-400/50 hover:text-sky-200"
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4 p-6">
            {mode === "register" && (
              <>
                <div>
                  <label htmlFor="username" className="mb-1.5 block font-system text-[0.62rem] uppercase tracking-[0.2em] text-sky-300/80">
                    Hunter Name
                  </label>
                  <input
                    id="username"
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ShadowMonarch07"
                    required
                    minLength={3}
                    maxLength={20}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block font-system text-[0.62rem] uppercase tracking-[0.2em] text-sky-300/80">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@reality.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </>
            )}

            {mode === "login" && (
              <div>
                <label htmlFor="identifier" className="mb-1.5 block font-system text-[0.62rem] uppercase tracking-[0.2em] text-sky-300/80">
                  Hunter Name or Email
                </label>
                <input
                  id="identifier"
                  className="input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ShadowMonarch07"
                  required
                  autoComplete="username"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="mb-1.5 block font-system text-[0.62rem] uppercase tracking-[0.2em] text-sky-300/80">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={mode === "register" ? 8 : 1}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
              {mode === "register" && (
                <p className="mt-1 text-[0.68rem] text-slate-500">Minimum 8 characters. Guard it like an S-Rank secret.</p>
              )}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="border border-rose-400/30 bg-rose-400/5 px-3 py-2 text-xs text-rose-300"
                role="alert"
              >
                ⚠ {error}
              </motion.p>
            )}

            <button type="submit" disabled={busy} className="btn w-full !py-3.5">
              {busy ? "Connecting…" : mode === "login" ? "Enter the System" : "Awaken"}
            </button>
          </form>

          <div className="divider-glow" />
          <div className="p-4 text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="font-system text-[0.65rem] uppercase tracking-[0.2em] text-sky-400/70 transition-colors hover:text-sky-300"
            >
              {mode === "login" ? "Not yet awakened? Begin awakening →" : "← Already a Player? Authenticate"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[0.68rem] text-slate-600">
          <Link href="/" className="transition-colors hover:text-slate-400">
            ← Return to the surface
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="font-system text-xs uppercase tracking-[0.3em] text-sky-400/60">Opening the gate…</p>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
