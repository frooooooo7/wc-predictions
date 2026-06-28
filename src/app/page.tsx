import Link from "next/link";
import { getBracketData } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { LiveBracket } from "@/components/LiveBracket";
import { SyncTimer } from "@/components/SyncTimer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ matches, teamMap, fromSeed }, { data: auth }] = await Promise.all([
    getBracketData(),
    supabase.auth.getUser(),
  ]);
  const isAdmin = isAdminUser(auth.user);
  const liveCount = matches.filter((m) => m.status === "LIVE").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Faza pucharowa na żywo
          </h1>
          <p className="mt-1 text-sm text-muted">
            Drabinka Mistrzostw Świata 2026 — od 1/16 finału do finału.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-live/40 bg-live/10 px-3 py-1.5 text-sm font-semibold text-live">
              <span className="h-2 w-2 rounded-full bg-live animate-live-pulse" />
              {liveCount} {liveCount === 1 ? "mecz" : "mecze"} live
            </span>
          )}
          {!fromSeed && (
            <SyncTimer intervalSeconds={120} canManualSync={isAdmin} />
          )}
          <Link
            href="/predict"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
          >
            Wytypuj swoją drabinkę
          </Link>
        </div>
      </header>

      {fromSeed && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200/90">
          Tryb demo — wyświetlam przykładową drabinkę. Skonfiguruj bazę Supabase
          i token API, aby zobaczyć prawdziwe wyniki na żywo.
        </div>
      )}

      <section className="rounded-2xl border border-border/60 bg-surface/30 p-3 sm:p-4">
        <LiveBracket
          initialMatches={matches}
          teamMap={teamMap}
          realtime={!fromSeed}
        />
      </section>
    </div>
  );
}
