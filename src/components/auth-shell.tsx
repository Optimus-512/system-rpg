"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGame } from "./providers";
import { Hud } from "./hud";
import { Notifications, LevelUpOverlay } from "./notifications";
import { SystemGuide } from "./system-guide";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="system-window w-full max-w-md p-6">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton mt-4 h-10 w-full" />
          <div className="skeleton mt-2 h-10 w-full" />
          <p className="mt-6 text-center font-system text-[0.65rem] uppercase tracking-[0.3em] text-sky-400/70">
            Connecting to the System…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="system-window max-w-md p-8 text-center materialize">
          <h1 className="font-system text-lg uppercase tracking-[0.25em] text-rose-300 text-glow-danger">
            Access Denied
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            The System does not recognize you. Return to the gate and present your credentials, Player.
          </p>
          <Link href="/login" className="btn mt-6">
            Return to Gate
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:pl-[76px]">
      <Hud />
      <Notifications />
      <LevelUpOverlay />
      <SystemGuide />
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-24 sm:px-6 lg:pb-16">{children}</main>
    </div>
  );
}
