import type { Team } from "@/lib/bracket";
import type { DailyHistoryEntry } from "@/lib/daily";
import { TeamFlag } from "./TeamFlag";

interface DailyHistoryProps {
  entries: DailyHistoryEntry[];
  teamMap: Record<string, Team>;
  emptyText: string;
}

const RESULT_STYLE: Record<
  DailyHistoryEntry["result"],
  { row: string; badge: string; label: string }
> = {
  correct: {
    row: "border-emerald-500/40 bg-emerald-500/10",
    badge: "bg-emerald-500/25 text-emerald-300",
    label: "Trafione",
  },
  wrong: {
    row: "border-rose-500/40 bg-rose-500/10",
    badge: "bg-rose-500/25 text-rose-300",
    label: "Pudło",
  },
  pending: {
    row: "border-border/60 bg-surface/40",
    badge: "bg-surface-2 text-muted",
    label: "W toku",
  },
};

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(d);
}

function TeamSide({
  teamId,
  teamMap,
  picked,
  isWinner,
  finished,
  align = "left",
}: {
  teamId: string | null;
  teamMap: Record<string, Team>;
  picked: boolean;
  isWinner: boolean;
  finished: boolean;
  align?: "left" | "right";
}) {
  const team = teamId ? teamMap[teamId] : null;
  const layout = align === "right" ? "flex-row-reverse text-right" : "flex-row";
  return (
    <div className={`flex min-w-0 items-center gap-2 ${layout}`}>
      <TeamFlag team={team} size="sm" />
      <span
        className={`truncate text-sm ${
          finished && isWinner ? "font-semibold" : "font-medium"
        } ${picked ? "text-foreground" : "text-foreground/80"}`}
      >
        {team?.name ?? "—"}
      </span>
      {picked && (
        <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">
          Typ
        </span>
      )}
    </div>
  );
}

export function DailyHistory({
  entries,
  teamMap,
  emptyText,
}: DailyHistoryProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/30 p-8 text-center text-sm text-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const style = RESULT_STYLE[e.result];
        const finished = e.status === "FINISHED";
        return (
          <li
            key={e.slot}
            className={`rounded-xl border px-3 py-2.5 ${style.row}`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-muted">
              <span className="tabular-nums">{formatWhen(e.kickoff)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${style.badge}`}
              >
                {style.label}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <TeamSide
                teamId={e.homeTeam}
                teamMap={teamMap}
                picked={e.pickedTeam === e.homeTeam}
                isWinner={e.winnerTeam === e.homeTeam}
                finished={finished}
              />
              <span className="shrink-0 text-sm font-bold tabular-nums text-muted">
                {finished ? (
                  <>
                    {e.homeScore ?? 0}
                    <span className="mx-0.5">:</span>
                    {e.awayScore ?? 0}
                  </>
                ) : (
                  <span className="text-xs font-semibold">vs</span>
                )}
              </span>
              <TeamSide
                teamId={e.awayTeam}
                teamMap={teamMap}
                picked={e.pickedTeam === e.awayTeam}
                isWinner={e.winnerTeam === e.awayTeam}
                finished={finished}
                align="right"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
