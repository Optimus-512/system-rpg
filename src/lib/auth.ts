// ─────────────────────────────────────────────────────────────────────
//  THE SYSTEM · Auth (jose JWT in httpOnly cookies)
//  "You have acquired the qualifications to be a Player."
// ─────────────────────────────────────────────────────────────────────
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "shadow-monarch-dev-secret-change-me"
);

export const SESSION_COOKIE = "system_token";

export interface SessionPayload {
  userId: string;
  username: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.userId || !payload.username) return null;
    return { userId: payload.userId as string, username: payload.username as string };
  } catch {
    return null;
  }
}

/** Server-side session reader for RSC and route handlers. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Set the session cookie inside a route handler response flow. */
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}
