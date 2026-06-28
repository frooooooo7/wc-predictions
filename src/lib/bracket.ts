export type Stage = "R32" | "R16" | "QF" | "SF" | "3RD" | "FINAL";
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED";
export type Side = "home" | "away";

export interface Team {
  id: string;
  name: string;
  flag: string;
}

export interface MatchRow {
  slot: string;
  stage: Stage;
  ord: number;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  winner_team: string | null;
  kickoff: string | null;
}

export interface SlotDef {
  slot: string;
  stage: Stage;
  ord: number;
  feedsWinner?: { slot: string; side: Side };
  feedsLoser?: { slot: string; side: Side };
}

export const STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "3RD", "FINAL"];

export const STAGE_LABEL: Record<Stage, string> = {
  R32: "1/16 finału",
  R16: "1/8 finału",
  QF: "Ćwierćfinały",
  SF: "Półfinały",
  "3RD": "Mecz o 3. miejsce",
  FINAL: "Finał",
};

export const STAGE_SHORT: Record<Stage, string> = {
  R32: "1/16",
  R16: "1/8",
  QF: "1/4",
  SF: "1/2",
  "3RD": "3. miejsce",
  FINAL: "Finał",
};

export const STAGE_POINTS: Record<Stage, number> = {
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 5,
  "3RD": 2,
  FINAL: 8,
};

function buildStructure(): SlotDef[] {
  const defs: SlotDef[] = [];

  // Round of 32 -> Round of 16
  for (let k = 1; k <= 16; k++) {
    defs.push({
      slot: `r32-${k}`,
      stage: "R32",
      ord: k,
      feedsWinner: {
        slot: `r16-${Math.ceil(k / 2)}`,
        side: k % 2 === 1 ? "home" : "away",
      },
    });
  }
  // Round of 16 -> Quarterfinals
  for (let k = 1; k <= 8; k++) {
    defs.push({
      slot: `r16-${k}`,
      stage: "R16",
      ord: k,
      feedsWinner: {
        slot: `qf-${Math.ceil(k / 2)}`,
        side: k % 2 === 1 ? "home" : "away",
      },
    });
  }
  // Quarterfinals -> Semifinals
  for (let k = 1; k <= 4; k++) {
    defs.push({
      slot: `qf-${k}`,
      stage: "QF",
      ord: k,
      feedsWinner: {
        slot: `sf-${Math.ceil(k / 2)}`,
        side: k % 2 === 1 ? "home" : "away",
      },
    });
  }
  // Semifinals -> Final (winner) and Third place (loser)
  for (let k = 1; k <= 2; k++) {
    defs.push({
      slot: `sf-${k}`,
      stage: "SF",
      ord: k,
      feedsWinner: { slot: "final", side: k % 2 === 1 ? "home" : "away" },
      feedsLoser: { slot: "third", side: k % 2 === 1 ? "home" : "away" },
    });
  }
  defs.push({ slot: "third", stage: "3RD", ord: 1 });
  defs.push({ slot: "final", stage: "FINAL", ord: 1 });

  return defs;
}

export const STRUCTURE: SlotDef[] = buildStructure();

export const STRUCTURE_BY_SLOT: Record<string, SlotDef> = Object.fromEntries(
  STRUCTURE.map((d) => [d.slot, d]),
);

export const SLOTS_BY_STAGE: Record<Stage, SlotDef[]> = STAGE_ORDER.reduce(
  (acc, stage) => {
    acc[stage] = STRUCTURE.filter((d) => d.stage === stage).sort(
      (a, b) => a.ord - b.ord,
    );
    return acc;
  },
  {} as Record<Stage, SlotDef[]>,
);

/** The visual column order for the live bracket (3rd place sits beside the final). */
export const COLUMN_STAGES: Stage[] = ["R32", "R16", "QF", "SF", "FINAL"];

export interface ResolvedMatch {
  slot: string;
  stage: Stage;
  ord: number;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  winner: string | null;
  kickoff: string | null;
}

function emptyResolved(def: SlotDef): ResolvedMatch {
  return {
    slot: def.slot,
    stage: def.stage,
    ord: def.ord,
    homeTeam: null,
    awayTeam: null,
    homeScore: null,
    awayScore: null,
    status: "SCHEDULED",
    winner: null,
    kickoff: null,
  };
}

function loserOf(m: ResolvedMatch): string | null {
  if (!m.winner || !m.homeTeam || !m.awayTeam) return null;
  return m.winner === m.homeTeam ? m.awayTeam : m.homeTeam;
}

/**
 * Resolve the live bracket from DB rows. Downstream matchups are filled from the
 * actual winners of feeder matches whenever the DB has not provided them yet.
 */
export function resolveLiveBracket(
  matches: MatchRow[],
): Record<string, ResolvedMatch> {
  const bySlot = new Map(matches.map((m) => [m.slot, m]));
  const resolved: Record<string, ResolvedMatch> = {};

  for (const def of STRUCTURE) {
    const row = bySlot.get(def.slot);
    resolved[def.slot] = row
      ? {
          slot: def.slot,
          stage: def.stage,
          ord: def.ord,
          homeTeam: row.home_team,
          awayTeam: row.away_team,
          homeScore: row.home_score,
          awayScore: row.away_score,
          status: row.status,
          winner: row.winner_team,
          kickoff: row.kickoff,
        }
      : emptyResolved(def);
  }

  // Propagate winners/losers forward through the structure.
  for (const def of STRUCTURE) {
    const current = resolved[def.slot];
    if (def.feedsWinner && current.winner) {
      const target = resolved[def.feedsWinner.slot];
      if (def.feedsWinner.side === "home" && !target.homeTeam)
        target.homeTeam = current.winner;
      if (def.feedsWinner.side === "away" && !target.awayTeam)
        target.awayTeam = current.winner;
    }
    if (def.feedsLoser) {
      const loser = loserOf(current);
      if (loser) {
        const target = resolved[def.feedsLoser.slot];
        if (def.feedsLoser.side === "home" && !target.homeTeam)
          target.homeTeam = loser;
        if (def.feedsLoser.side === "away" && !target.awayTeam)
          target.awayTeam = loser;
      }
    }
  }

  return resolved;
}

/**
 * Resolve a user's predicted bracket. R32 matchups come from the real fixtures;
 * every downstream matchup is filled from the user's own picks.
 */
export function resolvePredictedBracket(
  matches: MatchRow[],
  picks: Record<string, string>,
): Record<string, ResolvedMatch> {
  const bySlot = new Map(matches.map((m) => [m.slot, m]));
  const resolved: Record<string, ResolvedMatch> = {};

  for (const def of STRUCTURE) {
    const base = emptyResolved(def);
    if (def.stage === "R32") {
      const row = bySlot.get(def.slot);
      base.homeTeam = row?.home_team ?? null;
      base.awayTeam = row?.away_team ?? null;
      base.kickoff = row?.kickoff ?? null;
    }
    base.winner = picks[def.slot] ?? null;
    resolved[def.slot] = base;
  }

  for (const def of STRUCTURE) {
    const current = resolved[def.slot];
    // A pick is only valid if the picked team actually plays in this match.
    if (
      current.winner &&
      current.winner !== current.homeTeam &&
      current.winner !== current.awayTeam
    ) {
      current.winner = null;
    }
    if (def.feedsWinner && current.winner) {
      const target = resolved[def.feedsWinner.slot];
      target[def.feedsWinner.side === "home" ? "homeTeam" : "awayTeam"] =
        current.winner;
    }
    if (def.feedsLoser && current.winner) {
      const loser =
        current.winner === current.homeTeam
          ? current.awayTeam
          : current.homeTeam;
      if (loser) {
        const target = resolved[def.feedsLoser.slot];
        target[def.feedsLoser.side === "home" ? "homeTeam" : "awayTeam"] = loser;
      }
    }
  }

  return resolved;
}
