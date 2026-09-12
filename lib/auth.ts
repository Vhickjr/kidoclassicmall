import { cookies } from "next/headers";

/**
 * Placeholder admin gate so the admin routes are not open to the internet while
 * you build. It checks a single shared secret held in an httpOnly cookie.
 *
 * Replace this before the store takes real orders. The real version reads the
 * session, loads the User, and checks role === "ADMIN". Everything that calls
 * requireAdmin() keeps working when you swap the body out, which is the point
 * of putting it behind a function now rather than inlining the check.
 */
export async function requireAdmin(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    // Fail closed. An unset secret in production must not mean "let everyone in".
    if (process.env.NODE_ENV === "production") return false;
    return true; // local dev convenience
  }

  const jar = await cookies();
  return jar.get("kido_admin")?.value === secret;
}
