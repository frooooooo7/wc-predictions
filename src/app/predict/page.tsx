import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBracketData } from "@/lib/data";
import { PredictBracket } from "@/components/PredictBracket";

export const dynamic = "force-dynamic";

export default async function PredictPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { matches, teamMap } = await getBracketData();

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h1 className="text-2xl font-bold">Zaloguj się, aby typować</h1>
        <p className="mt-2 text-sm text-muted">
          Aby przeciągać drużyny w drabince i zapisać swoje typy na koncie,
          potrzebujesz konta.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent/60"
          >
            Zaloguj
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
          >
            Załóż konto
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: predictionRows }, { data: profile }] = await Promise.all([
    supabase
      .from("predictions")
      .select("match_slot, predicted_winner")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("predictions_locked")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const initialPicks: Record<string, string> = {};
  for (const row of predictionRows ?? []) {
    if (row.match_slot && row.predicted_winner) {
      initialPicks[row.match_slot] = row.predicted_winner;
    }
  }

  const initialLocked = Boolean(profile?.predictions_locked);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Twoja drabinka
        </h1>
        <p className="mt-1 text-sm text-muted">
          Kliknij lub przeciągnij drużynę, aby awansowała do kolejnej rundy.
          Zwycięzcy automatycznie wypełniają następne mecze.
        </p>
      </header>

      <section className="rounded-2xl border border-border/60 bg-surface/30 p-3 sm:p-4">
        <PredictBracket
          matches={matches}
          teamMap={teamMap}
          userId={user.id}
          initialPicks={initialPicks}
          initialLocked={initialLocked}
        />
      </section>
    </div>
  );
}
