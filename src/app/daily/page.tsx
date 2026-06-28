import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBracketData } from "@/lib/data";
import {
  dayKey,
  formatDayLabel,
  groupPickersBySlot,
  isBettable,
  type MatchPredictionRow,
  type ProfileLite,
} from "@/lib/daily";
import { MatchDayCard } from "@/components/MatchDayCard";

export const dynamic = "force-dynamic";

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

  // Playable matches up to and including today — no betting a day ahead, but
  // past days remain visible as read-only history.
  const playable = matches.filter((m) => {
    if (!m.home_team || !m.away_team) return false;
    const k = dayKey(m.kickoff);
    if (k === null) return false;
    return todayKey === null || k <= todayKey;
  });

  const days = [
    ...new Set(
      playable
        .map((m) => dayKey(m.kickoff))
        .filter((d): d is string => Boolean(d)),
    ),
  ].sort();

  const selectedDay =
    day && days.includes(day)
      ? day
      : days.includes(todayKey ?? "")
        ? todayKey
        : (days[days.length - 1] ?? null);

  const isToday = selectedDay === todayKey;

  const dayMatches = playable
    .filter((m) => dayKey(m.kickoff) === selectedDay)
    .sort((a, b) => (a.kickoff ?? "").localeCompare(b.kickoff ?? ""));

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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Mecze dnia
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Obstawiaj zwycięzcę dzisiejszych meczów. Typy można ustawić tylko do
          rozpoczęcia meczu. Punkty liczone są w zakładce{" "}
          <span className="font-medium text-foreground">Ranking</span>.
        </p>
      </header>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface/30 p-10 text-center text-muted">
          Brak meczów z ustalonymi drużynami.
        </div>
      ) : (
        <>
          <div className="bracket-scroll -mx-1 flex justify-center gap-2 overflow-x-auto px-1 pb-1">
            {days.map((d) => {
              const active = d === selectedDay;
              const today = d === todayKey;
              return (
                <Link
                  key={d}
                  href={`/daily?day=${d}`}
                  scroll={false}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    active
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border/60 bg-surface/40 text-muted hover:text-foreground"
                  }`}
                >
                  {today ? "Dziś" : formatDayLabel(d)}
                </Link>
              );
            })}
          </div>

          {!isToday && (
            <p className="rounded-lg border border-border/50 bg-surface/30 px-3 py-2 text-center text-xs text-muted">
              Archiwum — podgląd typów i wyników. Obstawiać można tylko mecze z
              dzisiejszego dnia.
            </p>
          )}

          {dayMatches.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-surface/30 p-10 text-center text-muted">
              Brak meczów w wybranym dniu.
            </div>
          ) : (
            <div className="space-y-3">
              {dayMatches.map((match) => (
                <MatchDayCard
                  key={match.slot}
                  match={match}
                  teamMap={teamMap}
                  myPick={myPicks.get(match.slot) ?? null}
                  canBet={isToday && Boolean(me) && isBettable(match)}
                  loggedIn={Boolean(me)}
                  userId={me?.id ?? null}
                  pickers={pickersBySlot.get(match.slot) ?? {}}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
