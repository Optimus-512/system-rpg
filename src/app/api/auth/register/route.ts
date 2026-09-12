import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/db";
import { ok, fail, handleApiError } from "@/src/lib/api";
import { signSession, setSessionCookie } from "@/src/lib/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { email, username, password } = parsed.data;

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] },
      select: { email: true, username: true },
    });
    if (exists) {
      return fail(
        exists.username === username
          ? "That hunter name is already registered."
          : "That email is already registered.",
        409
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), username, passwordHash },
    });

    const token = await signSession({ userId: user.id, username: user.username });
    await setSessionCookie(token);

    const { passwordHash: _ph, ...safe } = user;
    return ok({ user: safe, message: "You have acquired the qualifications to be a Player." }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
