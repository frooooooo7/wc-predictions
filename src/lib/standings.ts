import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchRow } from "./bracket";
import { scorePredictions } from "./scoring";
import {
  computeDailyStandings,
  type DailyStanding,
  type MatchPredictionRow,
  type ProfileLite,
} from "./daily";

export interface StandingRow {
  id: string;
  nick: string;
  avatarUrl: string | null;
  total: number;
  correct: number;
  resolved: number;
  hasPredictions: boolean;
}

/**
 * Fetches every profile with its prediction score (1 point per correct winner).
 * Sorted by points, used by the leaderboard, users list and profile pages.
 */
export async function loadStandings(
  supabase: SupabaseClient,
  matches: MatchRow[],
): Promise<StandingRow[]> {
  const [{ data: predictions }, { data: profiles }] = await Promise.all([
    supabase.from("predictions").select("user_id, match_slot, predicted_winner"),
    supabase.from("profiles").select("id, nick, avatar_url"),
  ]);

  const picksByUser = new Map<string, Record<string, string>>();
  for (const row of predictions ?? []) {
    if (!row.user_id || !row.match_slot || !row.predicted_winner) continue;
    const map = picksByUser.get(row.user_id) ?? {};
    map[row.match_slot] = row.predicted_winner;
    picksByUser.set(row.user_id, map);
  }

  const rows: StandingRow[] = (profiles ?? []).map((p) => {
    const picks = picksByUser.get(p.id as string) ?? {};
    const score = scorePredictions(matches, picks);
    return {
      id: p.id as string,
      nick: (p.nick as string) || "Gracz",
      avatarUrl: (p.avatar_url as string | null) ?? null,
      total: score.total,
      correct: score.correct,
      resolved: score.resolved,
      hasPredictions: Object.keys(picks).length > 0,
    };
  });

  return rows.sort(
    (a, b) =>
      b.total - a.total ||
      b.correct - a.correct ||
      a.nick.localeCompare(b.nick, "pl"),
  );
}

/**
 * Match-of-the-day standings (1 point per correctly guessed daily winner).
 * Only players who placed at least one pick are returned.
 */
export async function loadDailyStandings(
  supabase: SupabaseClient,
  matches: MatchRow[],
): Promise<DailyStanding[]> {
  const [{ data: predRows }, { data: profileRows }] = await Promise.all([
    supabase
      .from("match_predictions")
      .select("user_id, match_slot, predicted_winner"),
    supabase.from("profiles").select("id, nick, avatar_url"),
  ]);

  const predictions = (predRows ?? []) as MatchPredictionRow[];
  const profiles: ProfileLite[] = (profileRows ?? []).map((p) => ({
    id: p.id as string,
    nick: (p.nick as string) || "Gracz",
    avatarUrl: (p.avatar_url as string | null) ?? null,
  }));

  return computeDailyStandings(predictions, profiles, matches).filter(
    (s) => s.picks > 0,
  );
}
