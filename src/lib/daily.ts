import type { MatchRow } from "./bracket";

export interface MatchPredictionRow {
  user_id: string;
  match_slot: string;
  predicted_winner: string;
}

export interface ProfileLite {
  id: string;
  nick: string;
  avatarUrl: string | null;
}

export interface DailyStanding extends ProfileLite {
  total: number;
  correct: number;
  resolved: number;
  picks: number;
  form: DailyResult[];
  streak: number;
}

/** Group match kickoffs into local (Warsaw) calendar days: "YYYY-MM-DD". */
export function dayKey(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(d);
}

export function formatDayLabel(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
}

/** Add calendar days to a Warsaw day key (YYYY-MM-DD). */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/**
 * Matches on the active "Dziś" slate: today's calendar day plus early kickoffs
 * tomorrow (before noon Warsaw) — US evening games that land at 1:00 / 6:00 in
 * Poland the next morning, so users can still pick them the night before.
 */
export function isOnBettingSlate(
  kickoff: string | null,
  todayKey: string | null,
): boolean {
  if (!todayKey || !kickoff) return false;
  const k = dayKey(kickoff);
  if (!k) return false;
  if (k === todayKey) return true;
  const tomorrowKey = addDaysToKey(todayKey, 1);
  if (k !== tomorrowKey) return false;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      hour: "numeric",
      hour12: false,
    }).format(new Date(kickoff)),
  );
  return hour < 12;
}

export function isArchiveDay(
  selectedDay: string,
  todayKey: string | null,
): boolean {
  return Boolean(todayKey && selectedDay < todayKey);
}

/** A match can be bet on only before kickoff and while it is still SCHEDULED. */
export function isBettable(match: MatchRow, now: Date = new Date()): boolean {
  if (match.status !== "SCHEDULED") return false;
  if (!match.kickoff) return true;
  const t = new Date(match.kickoff).getTime();
  return Number.isNaN(t) || t > now.getTime();
}

export type DailyResult = "correct" | "wrong" | "pending";

export interface DailyHistoryEntry {
  slot: string;
  kickoff: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchRow["status"];
  winnerTeam: string | null;
  pickedTeam: string;
  result: DailyResult;
}

/**
 * Builds a user's match-of-the-day history (newest first) by joining their
 * stored picks with the current match results. No extra storage needed —
 * match_predictions already keeps every pick permanently.
 */
export function buildUserDailyHistory(
  picks: MatchPredictionRow[],
  matches: MatchRow[],
): DailyHistoryEntry[] {
  const bySlot = new Map(matches.map((m) => [m.slot, m]));
  const entries: DailyHistoryEntry[] = [];

  for (const pick of picks) {
    const m = bySlot.get(pick.match_slot);
    if (!m || !m.home_team || !m.away_team) continue;

    const finished = m.status === "FINISHED" && Boolean(m.winner_team);
    const result: DailyResult = finished
      ? m.winner_team === pick.predicted_winner
        ? "correct"
        : "wrong"
      : "pending";

    entries.push({
      slot: m.slot,
      kickoff: m.kickoff,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: m.status,
      winnerTeam: m.winner_team,
      pickedTeam: pick.predicted_winner,
      result,
    });
  }

  return entries.sort((a, b) =>
    (b.kickoff ?? "").localeCompare(a.kickoff ?? ""),
  );
}

/**
 * Recent form (last 5 resolved picks, newest first) and current winning streak
 * (consecutive correct picks counting back from the most recent resolved one).
 */
export function computeForm(
  history: DailyHistoryEntry[],
  limit = 5,
): { form: DailyResult[]; streak: number } {
  const resolved = history.filter((e) => e.result !== "pending");
  const form = resolved.slice(0, limit).map((e) => e.result);

  let streak = 0;
  for (const entry of resolved) {
    if (entry.result !== "correct") break;
    streak += 1;
  }

  return { form, streak };
}

/** Standings for match-of-the-day picks: 1 point per correctly guessed winner. */
export function computeDailyStandings(
  predictions: MatchPredictionRow[],
  profiles: ProfileLite[],
  matches: MatchRow[],
): DailyStanding[] {
  const byUser = new Map<string, MatchPredictionRow[]>();
  for (const p of predictions) {
    const arr = byUser.get(p.user_id) ?? [];
    arr.push(p);
    byUser.set(p.user_id, arr);
  }

  const rows: DailyStanding[] = profiles.map((prof) => {
    const picks = byUser.get(prof.id) ?? [];
    const history = buildUserDailyHistory(picks, matches);
    const resolved = history.filter((e) => e.result !== "pending").length;
    const correct = history.filter((e) => e.result === "correct").length;
    const { form, streak } = computeForm(history);
    return {
      ...prof,
      total: correct,
      correct,
      resolved,
      picks: picks.length,
      form,
      streak,
    };
  });

  return rows.sort(
    (a, b) =>
      b.total - a.total ||
      b.correct - a.correct ||
      b.streak - a.streak ||
      a.nick.localeCompare(b.nick, "pl"),
  );
}

/** slot → (teamId → list of users who picked that team). */
export function groupPickersBySlot(
  predictions: MatchPredictionRow[],
  profilesById: Map<string, ProfileLite>,
): Map<string, Record<string, ProfileLite[]>> {
  const bySlot = new Map<string, Record<string, ProfileLite[]>>();
  for (const p of predictions) {
    const prof = profilesById.get(p.user_id);
    if (!prof) continue;
    const byTeam = bySlot.get(p.match_slot) ?? {};
    (byTeam[p.predicted_winner] ??= []).push(prof);
    bySlot.set(p.match_slot, byTeam);
  }
  return bySlot;
}
