import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/db";
import { ok, fail, handleApiError } from "@/src/lib/api";
import { signSession, setSessionCookie } from "@/src/lib/auth";

const schema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or hunter name"),
  password: z.string().min(1, "Enter your password"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { identifier, password } = parsed.data;
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
    });

    // Uniform error → no user enumeration.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return fail("The System does not recognize these credentials.", 401);
    }

    const token = await signSession({ userId: user.id, username: user.username });
    await setSessionCookie(token);

    const { passwordHash: _ph, ...safe } = user;
    return ok({ user: safe });
  } catch (e) {
    return handleApiError(e);
  }
}
