import type { MatchRow, Stage, Team } from "./bracket";
import { R32_BRACKET_ORDER } from "./seed";

const BASE = "https://api.football-data.org/v4";

interface FdTeam {
  id: number;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
}

const STAGE_MAP: Record<string, Stage> = {
  LAST_32: "R32",
  ROUND_OF_32: "R32",
  LAST_16: "R16",
  ROUND_OF_16: "R16",
  QUARTER_FINALS: "QF",
  QUARTER_FINAL: "QF",
  SEMI_FINALS: "SF",
  SEMI_FINAL: "SF",
  THIRD_PLACE: "3RD",
  FINAL: "FINAL",
};

const STAGE_SLOT_PREFIX: Record<Stage, string> = {
  R32: "r32",
  R16: "r16",
  QF: "qf",
  SF: "sf",
  "3RD": "third",
  FINAL: "final",
};

function mapStatus(s: string): MatchRow["status"] {
  if (s === "FINISHED" || s === "AWARDED") return "FINISHED";
  if (s === "IN_PLAY" || s === "PAUSED" || s === "LIVE") return "LIVE";
  return "SCHEDULED";
}

function teamId(t: FdTeam): string {
  return (
    t.tla ||
    (t.shortName || t.name || `T${t.id}`).slice(0, 3).toUpperCase()
  );
}

/** Best-effort mapping of the FIFA World Cup knockout stage into our bracket slots. */
export async function fetchKnockoutFromFootballData(
  token: string,
): Promise<{ teams: Team[]; matches: MatchRow[] }> {
  const res = await fetch(`${BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org responded with ${res.status}`);
  }

  const data: { matches: FdMatch[] } = await res.json();

  const knockout = data.matches
    .map((m) => ({ m, stage: STAGE_MAP[m.stage] }))
    .filter(
      (x): x is { m: FdMatch; stage: Stage } =>
        x.stage !== undefined && x.m.homeTeam?.id != null,
    );

  const teams = new Map<string, Team>();
  const matches: MatchRow[] = [];

  const registerTeam = (t: FdTeam) => {
    const id = teamId(t);
    if (!teams.has(id)) {
      teams.set(id, {
        id,
        name: t.shortName || t.name || id,
        flag: t.crest || "🏳️",
      });
    }
  };

  /** Build a bracket row from an API match; slot/ord are filled in by the caller. */
  const buildRow = (m: FdMatch, stage: Stage): MatchRow => {
    registerTeam(m.homeTeam);
    registerTeam(m.awayTeam);
    const home = teamId(m.homeTeam);
    const away = teamId(m.awayTeam);
    const status = mapStatus(m.status);
    const winner =
      status === "FINISHED"
        ? m.score.winner === "HOME_TEAM"
          ? home
          : m.score.winner === "AWAY_TEAM"
            ? away
            : null
        : null;

    return {
      slot: "",
      stage,
      ord: 0,
      home_team: home,
      away_team: away,
      home_score: m.score.fullTime.home,
      away_score: m.score.fullTime.away,
      status,
      winner_team: winner,
      kickoff: m.utcDate,
    };
  };

  const pairKey = (a: string | null, b: string | null) =>
    [a, b].sort().join("-");

  const byDate = (a: { m: FdMatch }, b: { m: FdMatch }) =>
    a.m.utcDate.localeCompare(b.m.utcDate);

  // ── Round of 32: place by the official bracket layout, not by kickoff date ──
  const r32Rows = knockout
    .filter((x) => x.stage === "R32")
    .sort(byDate)
    .map((x) => buildRow(x.m, "R32"));

  const r32ByPair = new Map(r32Rows.map((r) => [pairKey(r.home_team, r.away_team), r]));
  const placed = new Set<MatchRow>();

  R32_BRACKET_ORDER.forEach(([a, b], i) => {
    const row = r32ByPair.get(pairKey(a, b));
    if (row && !placed.has(row)) {
      row.slot = `r32-${i + 1}`;
      row.ord = i + 1;
      placed.add(row);
      matches.push(row);
    }
  });

  // Any fixture not recognised by team pair falls back into the first free slots.
  const takenOrds = new Set(matches.map((m) => m.ord));
  let nextOrd = 1;
  for (const row of r32Rows) {
    if (placed.has(row)) continue;
    while (takenOrds.has(nextOrd)) nextOrd += 1;
    row.slot = `r32-${nextOrd}`;
    row.ord = nextOrd;
    takenOrds.add(nextOrd);
    matches.push(row);
  }

  // ── Later rounds: keep simple date ordering within each stage ──
  const laterCounters: Record<string, number> = {};
  for (const { m, stage } of [...knockout].filter((x) => x.stage !== "R32").sort(byDate)) {
    const prefix = STAGE_SLOT_PREFIX[stage];
    laterCounters[prefix] = (laterCounters[prefix] ?? 0) + 1;
    const ord = laterCounters[prefix];
    const slot =
      stage === "FINAL" ? "final" : stage === "3RD" ? "third" : `${prefix}-${ord}`;
    const row = buildRow(m, stage);
    row.slot = slot;
    row.ord = ord;
    matches.push(row);
  }

  return { teams: [...teams.values()], matches };
}
