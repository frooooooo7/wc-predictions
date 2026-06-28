import { STRUCTURE, type MatchRow } from "./bracket";

export interface ScoreBreakdown {
  total: number;
  correct: number;
  resolved: number;
}

/**
 * Score a user's picks against the real results: 1 point for every correctly
 * predicted winner in a finished match. `total` equals the number of hits.
 */
export function scorePredictions(
  matches: MatchRow[],
  picks: Record<string, string>,
): ScoreBreakdown {
  const bySlot = new Map(matches.map((m) => [m.slot, m]));
  const breakdown: ScoreBreakdown = { total: 0, correct: 0, resolved: 0 };

  for (const def of STRUCTURE) {
    const row = bySlot.get(def.slot);
    if (!row || row.status !== "FINISHED" || !row.winner_team) continue;

    breakdown.resolved += 1;

    if (picks[def.slot] && picks[def.slot] === row.winner_team) {
      breakdown.total += 1;
      breakdown.correct += 1;
    }
  }

  return breakdown;
}
