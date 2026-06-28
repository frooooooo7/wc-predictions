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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCloseMenu = () => setMenuOpen(false);

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
  }, []);

  // Refresh avatar/nick after profile edits without re-fetching on every tab click.
  useEffect(() => {
    if (!user || !pathname.startsWith("/profile")) return;
    const supabase = createClient();
    void supabase
      .from("profiles")
      .select("nick, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setProfile({
          nick: data.nick ?? user.user_metadata?.nick ?? user.email ?? "Gracz",
          avatarUrl: data.avatar_url ?? null,
        });
      });
  }, [pathname, user]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground md:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>

          <Link
            href="/"
            prefetch
            scroll={false}
            onClick={handleCloseMenu}
            className="flex min-w-0 shrink items-center gap-2"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-lg">
              🏆
            </span>
            <span className="hidden truncate text-sm font-bold tracking-tight sm:block">
              WC&nbsp;2026 <span className="text-accent">Predictions</span>
            </span>
          </Link>
        </div>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch
                scroll={false}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors lg:px-3 ${
                  isActive(link.href)
                    ? "bg-surface text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {!ready ? null : user ? (
            <>
              <Link
                href={`/profile/${user.id}`}
                prefetch
                scroll={false}
                className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-surface"
              >
                <Avatar
                  url={profile?.avatarUrl}
                  nick={profile?.nick ?? "Gracz"}
                  size={30}
                />
                <span className="hidden max-w-30 truncate text-sm text-foreground/90 sm:block">
                  {profile?.nick ?? user.email}
                </span>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                prefetch
                scroll={false}
                className="rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground sm:px-3"
              >
                Zaloguj
              </Link>
              <Link
                href="/register"
                prefetch
                scroll={false}
                className="rounded-lg bg-accent px-2.5 py-1.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong sm:px-3"
              >
                Rejestracja
              </Link>
            </>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-border/70 px-3 py-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch
                  scroll={false}
                  onClick={handleCloseMenu}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-surface text-foreground"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
