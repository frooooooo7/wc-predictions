import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBracketData } from "@/lib/data";
import { loadStandings, loadDailyStandings } from "@/lib/standings";
import type { DailyResult } from "@/lib/daily";
import { Avatar } from "@/components/Avatar";
import { FormDots } from "@/components/FormDots";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

interface RankRow {
  id: string;
  nick: string;
  avatarUrl: string | null;
  total: number;
  correct: number;
  resolved: number;
  form?: DailyResult[];
  streak?: number;
}

function RankingTable({
  rows,
  meId,
  emptyText,
  showForm = false,
}: {
  rows: RankRow[];
  meId: string | null;
  emptyText: string;
  showForm?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/30 p-8 text-center text-sm text-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Gracz</th>
            {showForm && (
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Forma
              </th>
            )}
            <th className="px-4 py-3 text-right font-medium">Trafienia</th>
            <th className="px-4 py-3 text-right font-medium">Punkty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((row, index) => {
            const isMe = meId === row.id;
            return (
              <tr key={row.id} className={isMe ? "bg-accent/10" : undefined}>
                <td className="px-4 py-3 text-lg">
                  {MEDALS[index] ?? (
                    <span className="text-sm text-muted">{index + 1}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${row.id}`}
                    className="group flex items-center gap-3"
                  >
                    <Avatar url={row.avatarUrl} nick={row.nick} size={32} />
                    <span className="font-medium transition-colors group-hover:text-accent">
                      {row.nick}
                    </span>
                    {isMe && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                        Ty
                      </span>
                    )}
                    {showForm && (row.streak ?? 0) >= 2 && (
                      <span
                        title={`Seria ${row.streak} trafień`}
                        className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-300"
                      >
                        🔥 {row.streak}
                      </span>
                    )}
                  </Link>
                </td>
                {showForm && (
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <FormDots form={row.form ?? []} />
                  </td>
                )}
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {row.correct}/{row.resolved}
                </td>
                <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-accent">
                  {row.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { matches } = await getBracketData();

  const [{ data: auth }, standings, dailyStandings] = await Promise.all([
    supabase.auth.getUser(),
    loadStandings(supabase, matches),
    loadDailyStandings(supabase, matches),
  ]);

  const me = auth.user;
  const bracketRows = standings.filter((r) => r.hasPredictions);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ranking</h1>
        <p className="mt-1 text-sm text-muted">
          Dwa niezależne rankingi: za typy w drabince oraz za trafione mecze dnia
          (1 punkt za każde trafienie).
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Drabinka</h2>
        <RankingTable
          rows={bracketRows}
          meId={me?.id ?? null}
          emptyText="Nikt jeszcze nie zapisał typów w drabince."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mecze dnia</h2>
        <RankingTable
          rows={dailyStandings}
          meId={me?.id ?? null}
          emptyText="Nikt jeszcze nie obstawił meczu dnia."
          showForm
        />
      </section>
    </div>
  );
}
