import type { User } from "@supabase/supabase-js";

/** Server-only: reads ADMIN_EMAILS (comma-separated) from the environment. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function isAdminUser(user: User | null): boolean {
  return isAdminEmail(user?.email);
}
