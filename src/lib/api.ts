import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession, type SessionPayload } from "./auth";
import { prisma } from "./db";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data as object, { status: init ?? 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Route guard: returns session or null. Usage: const s = await requireUser(); if (!s) … */
export async function requireUser(): Promise<SessionPayload | null> {
  return getSession();
}

/** Load the full User row for the current session (or null). */
export async function currentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.userId } });
}

export function handleApiError(e: unknown) {
  if (e instanceof ZodError) {
    const msg = e.issues[0]?.message || "Invalid input";
    return fail(msg, 422);
  }
  console.error("[API ERROR]", e);
  return fail("The System encountered an anomaly. Try again.", 500);
}

/** Standard character payload sent to the client after mutations. */
export async function characterPayload(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: { inventory: true },
  });
  if (!u) return null;
  const { passwordHash: _ph, ...safe } = u;
  return safe;
}
