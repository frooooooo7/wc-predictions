import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { fetchKnockoutFromFootballData } from "@/lib/football-data";
import { SEED_MATCHES, SEED_TEAMS } from "@/lib/seed";
import { STRUCTURE, type MatchRow, type Team } from "@/lib/bracket";

export const dynamic = "force-dynamic";

/** Empty bracket skeleton: every slot exists so predictions stay valid (FK). */
function buildSkeleton(): MatchRow[] {
  return STRUCTURE.map((def) => ({
    slot: def.slot,
    stage: def.stage,
    ord: def.ord,
    home_team: null,
    away_team: null,
    home_score: null,
    away_score: null,
    status: "SCHEDULED" as const,
    winner_team: null,
    kickoff: null,
  }));
}

/**
 * Overlay real API matches onto the full skeleton. Slots the API does not yet
 * provide (e.g. rounds whose draw has not happened) stay empty instead of
 * keeping stale demo results.
 */
function mergeIntoSkeleton(apiMatches: MatchRow[]): MatchRow[] {
  const bySlot = new Map(apiMatches.map((m) => [m.slot, m]));
  return buildSkeleton().map((s) => bySlot.get(s.slot) ?? s);
}

async function runSync() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  let teams: Team[] = SEED_TEAMS;
  let matches: MatchRow[] = SEED_MATCHES;
  let source: "football-data" | "seed" = "seed";
  let note: string | undefined;

  if (token) {
    try {
      const data = await fetchKnockoutFromFootballData(token);
      if (data.matches.length > 0) {
        teams = data.teams;
        matches = mergeIntoSkeleton(data.matches);
        source = "football-data";
      } else {
        note = "API zwróciło pustą fazę pucharową — użyto danych seed.";
      }
    } catch (err) {
      note = `Błąd API (${(err as Error).message}) — użyto danych seed.`;
    }
  } else {
    note = "Brak FOOTBALL_DATA_TOKEN — użyto danych seed.";
  }

  const supabase = createAdminClient();

  const { error: teamsError } = await supabase
    .from("teams")
    .upsert(teams, { onConflict: "id" });
  if (teamsError) throw new Error(`teams upsert: ${teamsError.message}`);

  const { error: matchesError } = await supabase
    .from("matches")
    .upsert(matches, { onConflict: "slot" });
  if (matchesError) throw new Error(`matches upsert: ${matchesError.message}`);

  return {
    ok: true,
    source,
    note,
    teams: teams.length,
    matches: matches.length,
    syncedAt: new Date().toISOString(),
  };
}

/** Allowed for the Vercel cron (CRON_SECRET bearer) or a signed-in admin. */
async function isAuthorized(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) {
    return true;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminUser(user);
}

async function handle(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { ok: false, error: "Brak uprawnień." },
      { status: 401 },
    );
  }
  try {
    return NextResponse.json(await runSync());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
