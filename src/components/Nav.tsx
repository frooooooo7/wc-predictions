"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./LogoutButton";
import { Avatar } from "./Avatar";

const NAV_LINKS = [
  { href: "/", label: "Drabinka live" },
  { href: "/daily", label: "Mecze dnia" },
  { href: "/predict", label: "Typuj" },
  { href: "/leaderboard", label: "Ranking" },
  { href: "/users", label: "Użytkownicy" },
] as const;

interface ProfileBits {
  nick: string;
  avatarUrl: string | null;
}

export function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileBits | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const loadProfile = async (current: User | null) => {
      if (!current) {
        setProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("nick, avatar_url")
        .eq("id", current.id)
        .maybeSingle();
      setProfile({
        nick: data?.nick ?? current.user_metadata?.nick ?? current.email ?? "Gracz",
        avatarUrl: data?.avatar_url ?? null,
      });
    };

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      void loadProfile(data.user);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // Re-run on navigation so an updated avatar/nick is reflected.
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-lg">
            🏆
          </span>
          <span className="hidden text-sm font-bold tracking-tight sm:block">
            WC&nbsp;2026 <span className="text-accent">Predictions</span>
          </span>
        </Link>

        <ul className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                    active
                      ? "bg-surface text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex min-w-[120px] items-center justify-end gap-2">
          {!ready ? null : user ? (
            <>
              <Link
                href={`/profile/${user.id}`}
                className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-surface"
              >
                <Avatar
                  url={profile?.avatarUrl}
                  nick={profile?.nick ?? "Gracz"}
                  size={30}
                />
                <span className="hidden max-w-[120px] truncate text-sm text-foreground/90 sm:block">
                  {profile?.nick ?? user.email}
                </span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                Zaloguj
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
              >
                Rejestracja
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
