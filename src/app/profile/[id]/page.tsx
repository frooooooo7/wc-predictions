import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBracketData } from "@/lib/data";
import { scorePredictions } from "@/lib/scoring";
import {
  buildUserDailyHistory,
  computeForm,
  type MatchPredictionRow,
} from "@/lib/daily";
import { Avatar } from "@/components/Avatar";
import { ProfileSettings } from "@/components/ProfileSettings";
import { PredictionView } from "@/components/PredictionView";
import { DailyHistory } from "@/components/DailyHistory";
import { FormDots } from "@/components/FormDots";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: auth }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("id, nick, avatar_url, predictions_locked, created_at")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const me = auth.user;
  const isOwn = me?.id === profile.id;

  const { matches, teamMap } = await getBracketData();

  const [{ data: predictionRows }, { data: dailyRows }] = await Promise.all([
    supabase
      .from("predictions")
      .select("match_slot, predicted_winner")
      .eq("user_id", profile.id),
    supabase
      .from("match_predictions")
      .select("user_id, match_slot, predicted_winner")
      .eq("user_id", profile.id),
  ]);

  const picks: Record<string, string> = {};
  for (const row of predictionRows ?? []) {
    if (row.match_slot && row.predicted_winner) {
      picks[row.match_slot] = row.predicted_winner;
    }
  }

  const dailyHistory = buildUserDailyHistory(
    (dailyRows ?? []) as MatchPredictionRow[],
    matches,
  );
  const dailyCorrect = dailyHistory.filter((e) => e.result === "correct").length;
  const dailyResolved = dailyHistory.filter(
    (e) => e.result !== "pending",
  ).length;
  const { form: dailyForm, streak: dailyStreak } = computeForm(dailyHistory);

  const score = scorePredictions(matches, picks);
  const hasPredictions = Object.keys(picks).length > 0;
  const joined = profile.created_at
    ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(
        new Date(profile.created_at as string),
      )
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface/40 p-5">
        <div className="flex items-center gap-4">
          <Avatar
            url={profile.avatar_url as string | null}
            nick={profile.nick as string}
            size={64}
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile.nick as string}
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              {joined ? `Dołączył: ${joined}` : "Gracz"}
              {profile.predictions_locked && (
                <span className="ml-2 text-accent">· typy zatwierdzone 🔒</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-accent">
              {score.total}
            </div>
            <div className="text-xs uppercase tracking-wide text-muted">
              pkt drabinka
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums text-accent">
              {dailyCorrect}
            </div>
            <div className="text-xs uppercase tracking-wide text-muted">
              pkt mecze dnia
            </div>
          </div>
        </div>
      </div>

      {isOwn && (
        <ProfileSettings
          userId={profile.id as string}
          initialNick={profile.nick as string}
          initialAvatarUrl={(profile.avatar_url as string | null) ?? null}
        />
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {isOwn ? "Twoja drabinka" : `Drabinka gracza ${profile.nick}`}
          </h2>
          {isOwn && (
            <Link
              href="/predict"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/60 hover:text-foreground"
            >
              {profile.predictions_locked ? "Zobacz typy" : "Edytuj typy"}
            </Link>
          )}
        </div>

        {hasPredictions ? (
          <div className="rounded-2xl border border-border/60 bg-surface/30 p-3 sm:p-4">
            <PredictionView matches={matches} picks={picks} teamMap={teamMap} />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-surface/30 p-10 text-center text-muted">
            {isOwn
              ? "Nie masz jeszcze typów. Przejdź do zakładki Typuj, aby uzupełnić drabinkę."
              : "Ten gracz nie zapisał jeszcze żadnych typów."}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Historia meczów dnia</h2>
          {dailyHistory.length > 0 && (
            <div className="flex items-center gap-4">
              {dailyForm.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Forma
                  </span>
                  <FormDots form={dailyForm} />
                </div>
              )}
              {dailyStreak >= 2 && (
                <span
                  title={`Seria ${dailyStreak} trafień`}
                  className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300"
                >
                  🔥 {dailyStreak}
                </span>
              )}
              <span className="text-sm text-muted tabular-nums">
                {dailyCorrect}/{dailyResolved} trafień
              </span>
            </div>
          )}
        </div>

        <DailyHistory
          entries={dailyHistory}
          teamMap={teamMap}
          emptyText={
            isOwn
              ? "Nie obstawiłeś jeszcze żadnego meczu dnia."
              : "Ten gracz nie obstawił jeszcze żadnego meczu dnia."
          }
        />
      </section>
    </div>
  );
}
