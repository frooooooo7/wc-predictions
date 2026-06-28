import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBracketData } from "@/lib/data";
import { loadStandings } from "@/lib/standings";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();
  const { matches } = await getBracketData();

  const [{ data: auth }, standings] = await Promise.all([
    supabase.auth.getUser(),
    loadStandings(supabase, matches),
  ]);

  const me = auth.user;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Użytkownicy
        </h1>
        <p className="mt-1 text-sm text-muted">
          Zarejestrowani gracze ({standings.length}). Kliknij, aby zobaczyć ich
          profil i drabinkę.
        </p>
      </header>

      {standings.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface/30 p-10 text-center text-muted">
          Brak zarejestrowanych użytkowników.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {standings.map((u) => (
            <li key={u.id}>
              <Link
                href={`/profile/${u.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/40 p-4 transition-colors hover:border-accent/50 hover:bg-surface"
              >
                <Avatar url={u.avatarUrl} nick={u.nick} size={44} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-semibold transition-colors group-hover:text-accent">
                    {u.nick}
                  </span>
                  {me?.id === u.id && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                      Ty
                    </span>
                  )}
                </div>
                <span className="text-muted transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
