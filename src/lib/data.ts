import { createClient } from "@/lib/supabase/server";
import { SEED_MATCHES, SEED_TEAMS } from "@/lib/seed";
import type { MatchRow, Team } from "@/lib/bracket";

export interface BracketData {
  teams: Team[];
  teamMap: Record<string, Team>;
  matches: MatchRow[];
  fromSeed: boolean;
}

/**
 * Reads teams + matches from Supabase. Falls back to local seed data when the
 * database is empty or unreachable, so the app always renders something useful.
 */
export async function getBracketData(): Promise<BracketData> {
  let teams: Team[] = [];
  let matches: MatchRow[] = [];
  let fromSeed = false;

  try {
    const supabase = await createClient();
    const [teamsRes, matchesRes] = await Promise.all([
      supabase.from("teams").select("*"),
      supabase.from("matches").select("*").order("ord", { ascending: true }),
    ]);

    teams = (teamsRes.data as Team[] | null) ?? [];
    matches = (matchesRes.data as MatchRow[] | null) ?? [];
  } catch {
    // ignored — handled by the seed fallback below
  }

  if (teams.length === 0 || matches.length === 0) {
    teams = SEED_TEAMS;
    matches = SEED_MATCHES;
    fromSeed = true;
  }

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  return { teams, teamMap, matches, fromSeed };
}
