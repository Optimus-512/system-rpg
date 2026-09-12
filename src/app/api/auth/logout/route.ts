import { ok } from "@/src/lib/api";
import { clearSessionCookie } from "@/src/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return ok({ message: "The gate closes behind you." });
}
