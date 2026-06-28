import type { MatchRow, Team } from "./bracket";

export const SEED_TEAMS: Team[] = [
  { id: "ARG", name: "Argentyna", flag: "🇦🇷" },
  { id: "AUS", name: "Australia", flag: "🇦🇺" },
  { id: "FRA", name: "Francja", flag: "🇫🇷" },
  { id: "POL", name: "Polska", flag: "🇵🇱" },
  { id: "BRA", name: "Brazylia", flag: "🇧🇷" },
  { id: "KOR", name: "Korea Płd.", flag: "🇰🇷" },
  { id: "ENG", name: "Anglia", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "SEN", name: "Senegal", flag: "🇸🇳" },
  { id: "ESP", name: "Hiszpania", flag: "🇪🇸" },
  { id: "MAR", name: "Maroko", flag: "🇲🇦" },
  { id: "POR", name: "Portugalia", flag: "🇵🇹" },
  { id: "SUI", name: "Szwajcaria", flag: "🇨🇭" },
  { id: "NED", name: "Holandia", flag: "🇳🇱" },
  { id: "USA", name: "USA", flag: "🇺🇸" },
  { id: "GER", name: "Niemcy", flag: "🇩🇪" },
  { id: "MEX", name: "Meksyk", flag: "🇲🇽" },
  { id: "BEL", name: "Belgia", flag: "🇧🇪" },
  { id: "CAN", name: "Kanada", flag: "🇨🇦" },
  { id: "CRO", name: "Chorwacja", flag: "🇭🇷" },
  { id: "JPN", name: "Japonia", flag: "🇯🇵" },
  { id: "URU", name: "Urugwaj", flag: "🇺🇾" },
  { id: "GHA", name: "Ghana", flag: "🇬🇭" },
  { id: "DEN", name: "Dania", flag: "🇩🇰" },
  { id: "CMR", name: "Kamerun", flag: "🇨🇲" },
  { id: "COL", name: "Kolumbia", flag: "🇨🇴" },
  { id: "SRB", name: "Serbia", flag: "🇷🇸" },
  { id: "ITA", name: "Włochy", flag: "🇮🇹" },
  { id: "NOR", name: "Norwegia", flag: "🇳🇴" },
  { id: "NGA", name: "Nigeria", flag: "🇳🇬" },
  { id: "IRN", name: "Iran", flag: "🇮🇷" },
  { id: "ECU", name: "Ekwador", flag: "🇪🇨" },
  { id: "KSA", name: "Arabia Saud.", flag: "🇸🇦" },
];

/**
 * Official FIFA / TVP "Drabinka Mistrzostw Świata 2026" layout — the 16 Round of
 * 32 matchups in bracket-slot order (left half top→bottom = r32-1..8, right half
 * top→bottom = r32-9..16). Used to place API fixtures into the correct bracket
 * positions so neighbouring teams can actually meet, regardless of kickoff dates.
 */
export const R32_BRACKET_ORDER: [string, string][] = [
  ["GER", "PAR"], // r32-1
  ["FRA", "SWE"], // r32-2
  ["RSA", "CAN"], // r32-3
  ["NED", "MAR"], // r32-4
  ["POR", "CRO"], // r32-5
  ["ESP", "AUT"], // r32-6
  ["USA", "BIH"], // r32-7
  ["BEL", "SEN"], // r32-8
  ["BRA", "JPN"], // r32-9
  ["CIV", "NOR"], // r32-10
  ["MEX", "ECU"], // r32-11
  ["ENG", "COD"], // r32-12
  ["ARG", "CPV"], // r32-13
  ["AUS", "EGY"], // r32-14
  ["SUI", "ALG"], // r32-15
  ["COL", "GHA"], // r32-16
];

type R32Seed = [string, string, number, number, string]; // home, away, hs, as, winner

const R32_SEED: R32Seed[] = [
  ["ARG", "AUS", 2, 0, "ARG"],
  ["FRA", "POL", 3, 1, "FRA"],
  ["BRA", "KOR", 4, 1, "BRA"],
  ["ENG", "SEN", 2, 1, "ENG"],
  ["ESP", "MAR", 0, 1, "MAR"],
  ["POR", "SUI", 2, 1, "POR"],
  ["NED", "USA", 3, 1, "NED"],
  ["GER", "MEX", 2, 0, "GER"],
  ["BEL", "CAN", 1, 0, "BEL"],
  ["CRO", "JPN", 1, 0, "CRO"],
  ["URU", "GHA", 2, 0, "URU"],
  ["DEN", "CMR", 2, 1, "DEN"],
  ["COL", "SRB", 1, 0, "COL"],
  ["ITA", "NOR", 2, 1, "ITA"],
  ["NGA", "IRN", 1, 0, "NGA"],
  ["ECU", "KSA", 3, 0, "ECU"],
];

// Downstream demo results. Home/away teams are auto-derived from feeder winners.
type DownSeed = {
  slot: string;
  stage: MatchRow["stage"];
  ord: number;
  hs: number | null;
  as: number | null;
  status: MatchRow["status"];
  winner: string | null;
  kickoff: string;
};

const DOWN_SEED: DownSeed[] = [
  { slot: "r16-1", stage: "R16", ord: 1, hs: 2, as: 1, status: "FINISHED", winner: "ARG", kickoff: "2026-07-03T18:00:00Z" },
  { slot: "r16-2", stage: "R16", ord: 2, hs: 1, as: 0, status: "FINISHED", winner: "BRA", kickoff: "2026-07-03T22:00:00Z" },
  { slot: "r16-3", stage: "R16", ord: 3, hs: 1, as: 2, status: "FINISHED", winner: "POR", kickoff: "2026-07-04T18:00:00Z" },
  { slot: "r16-4", stage: "R16", ord: 4, hs: 0, as: 1, status: "FINISHED", winner: "NED", kickoff: "2026-07-04T22:00:00Z" },
  { slot: "r16-5", stage: "R16", ord: 5, hs: 2, as: 3, status: "FINISHED", winner: "CRO", kickoff: "2026-07-05T18:00:00Z" },
  { slot: "r16-6", stage: "R16", ord: 6, hs: 2, as: 0, status: "FINISHED", winner: "URU", kickoff: "2026-07-05T22:00:00Z" },
  { slot: "r16-7", stage: "R16", ord: 7, hs: 1, as: 0, status: "FINISHED", winner: "ITA", kickoff: "2026-07-06T18:00:00Z" },
  { slot: "r16-8", stage: "R16", ord: 8, hs: 2, as: 1, status: "FINISHED", winner: "ECU", kickoff: "2026-07-06T22:00:00Z" },

  { slot: "qf-1", stage: "QF", ord: 1, hs: 2, as: 1, status: "FINISHED", winner: "ARG", kickoff: "2026-07-09T18:00:00Z" },
  { slot: "qf-2", stage: "QF", ord: 2, hs: 1, as: 2, status: "FINISHED", winner: "NED", kickoff: "2026-07-09T22:00:00Z" },
  { slot: "qf-3", stage: "QF", ord: 3, hs: 1, as: 1, status: "LIVE", winner: null, kickoff: "2026-07-10T18:00:00Z" },
  { slot: "qf-4", stage: "QF", ord: 4, hs: null, as: null, status: "SCHEDULED", winner: null, kickoff: "2026-07-10T22:00:00Z" },

  { slot: "sf-1", stage: "SF", ord: 1, hs: null, as: null, status: "SCHEDULED", winner: null, kickoff: "2026-07-14T22:00:00Z" },
  { slot: "sf-2", stage: "SF", ord: 2, hs: null, as: null, status: "SCHEDULED", winner: null, kickoff: "2026-07-15T22:00:00Z" },
  { slot: "third", stage: "3RD", ord: 1, hs: null, as: null, status: "SCHEDULED", winner: null, kickoff: "2026-07-18T20:00:00Z" },
  { slot: "final", stage: "FINAL", ord: 1, hs: null, as: null, status: "SCHEDULED", winner: null, kickoff: "2026-07-19T19:00:00Z" },
];

export const SEED_MATCHES: MatchRow[] = [
  ...R32_SEED.map(([home, away, hs, as, winner], i) => ({
    slot: `r32-${i + 1}`,
    stage: "R32" as const,
    ord: i + 1,
    home_team: home,
    away_team: away,
    home_score: hs,
    away_score: as,
    status: "FINISHED" as const,
    winner_team: winner,
    kickoff: `2026-06-2${8 + Math.floor(i / 8)}T${i % 2 === 0 ? "18" : "21"}:00:00Z`,
  })),
  ...DOWN_SEED.map((d) => ({
    slot: d.slot,
    stage: d.stage,
    ord: d.ord,
    home_team: null,
    away_team: null,
    home_score: d.hs,
    away_score: d.as,
    status: d.status,
    winner_team: d.winner,
    kickoff: d.kickoff,
  })),
];
