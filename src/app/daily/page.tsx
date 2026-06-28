import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBracketData } from "@/lib/data";
import type { MatchRow } from "@/lib/bracket";
import {
  dayKey,
  formatDayLabel,
  groupPickersBySlot,
  isArchiveDay,
  isBettable,
  isOnBettingSlate,
  type MatchPredictionRow,
  type ProfileLite,
} from "@/lib/daily";
import { MatchDayCard } from "@/components/MatchDayCard";

export const dynamic = "force-dynamic";

function groupByKickoffDay(matches: MatchRow[]) {
  const groups: { key: string; matches: MatchRow[] }[] = [];
  for (const match of matches) {
    const k = dayKey(match.kickoff);
    if (!k) continue;
    const last = groups[groups.length - 1];
    if (last?.key === k) {
      last.matches.push(match);
    } else {
      groups.push({ key: k, matches: [match] });
    }
  }
  return groups;
}

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day } = await searchParams;
  const supabase = await createClient();

  const [{ data: auth }, { matches, teamMap }] = await Promise.all([
    supabase.auth.getUser(),
    getBracketData(),
  ]);
  const me = auth.user;

  const todayKey = dayKey(new Date().toISOString());

  const withTeams = matches.filter(
    (m) => m.home_team && m.away_team && dayKey(m.kickoff),
  );

  const archiveDays = [
    ...new Set(
      withTeams
        .map((m) => dayKey(m.kickoff))
        .filter((k): k is string => Boolean(k && todayKey && k < todayKey)),
    ),
  ].sort();

  const isArchiveView = Boolean(
    day && todayKey && isArchiveDay(day, todayKey) && archiveDays.includes(day),
  );

  const displayMatches = (
    isArchiveView
      ? withTeams.filter((m) => dayKey(m.kickoff) === day)
      : withTeams.filter((m) => isOnBettingSlate(m.kickoff, todayKey))
  ).sort((a, b) => (a.kickoff ?? "").localeCompare(b.kickoff ?? ""));

  const matchGroups = groupByKickoffDay(displayMatches);

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
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  const pickersBySlot = groupPickersBySlot(predictions, profilesById);
  const myPicks = new Map(
    predictions
      .filter((p) => p.user_id === me?.id)
      .map((p) => [p.match_slot, p.predicted_winner]),
  );

  const hasSlate = withTeams.some((m) => isOnBettingSlate(m.kickoff, todayKey));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Mecze dnia
        </h1>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted">
          Jedna lista na dziś — w tym wczesne rozpoczęcia jutrzejszego ranka
          (np. 1:00 lub 6:00 po wieczornych meczach w USA). Typ można ustawić
          tylko do kickoffu. Punkty w{" "}
          <span className="font-medium text-foreground">Ranking</span>.
        </p>
      </header>

      {!hasSlate && archiveDays.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface/30 p-10 text-center text-muted">
          Brak meczów z ustalonymi drużynami.
        </div>
      ) : (
        <>
          <div className="bracket-scroll -mx-1 flex justify-center gap-2 overflow-x-auto px-1 pb-1">
            <Link
              href="/daily"
              scroll={false}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                !isArchiveView
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border/60 bg-surface/40 text-muted hover:text-foreground"
              }`}
            >
              Dziś
            </Link>
            {archiveDays.map((d) => (
              <Link
                key={d}
                href={`/daily?day=${d}`}
                scroll={false}
                className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  isArchiveView && day === d
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border/60 bg-surface/40 text-muted hover:text-foreground"
                }`}
              >
                {formatDayLabel(d)}
              </Link>
            ))}
          </div>

          {isArchiveView && (
            <p className="rounded-lg border border-border/50 bg-surface/30 px-3 py-2 text-center text-xs text-muted">
              Archiwum — podgląd typów i wyników. Obstawiać można tylko na
              zakładce Dziś.
            </p>
          )}

          {displayMatches.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-surface/30 p-10 text-center text-muted">
              {isArchiveView
                ? "Brak meczów w wybranym dniu."
                : "Dziś nie ma meczów do obstawiania."}
            </div>
          ) : (
            <div className="space-y-5">
              {matchGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  {!isArchiveView && matchGroups.length > 1 && (
                    <h2 className="text-center text-xs font-semibold uppercase tracking-widest text-muted">
                      {group.key === todayKey
                        ? "Dziś"
                        : `${formatDayLabel(group.key)} · wczesna pora`}
                    </h2>
                  )}
                  {group.matches.map((match) => (
                    <MatchDayCard
                      key={match.slot}
                      match={match}
                      teamMap={teamMap}
                      myPick={myPicks.get(match.slot) ?? null}
                      canBet={
                        !isArchiveView && Boolean(me) && isBettable(match)
                      }
                      loggedIn={Boolean(me)}
                      userId={me?.id ?? null}
                      pickers={pickersBySlot.get(match.slot) ?? {}}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
