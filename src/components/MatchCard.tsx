import type { ResolvedMatch, Team } from "@/lib/bracket";
import { TeamFlag } from "./TeamFlag";

export function formatKickoff(iso: string | null): string {
  if (!iso) return "Termin nieznany";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Termin nieznany";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function StatusBadge({ match }: { match: ResolvedMatch }) {
  if (match.status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-live">
        <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-pulse" />
        Live
      </span>
    );
  }
  if (match.status === "FINISHED") {
    return (
      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Koniec
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
      {formatKickoff(match.kickoff)}
    </span>
  );
}

interface TeamRowProps {
  team?: Team | null;
  score: number | null;
  isWinner: boolean;
  dimmed: boolean;
}

function TeamRow({ team, score, isWinner, dimmed }: TeamRowProps) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 ${dimmed ? "opacity-45" : ""}`}
    >
      <TeamFlag team={team} size="sm" />
      <span
        className={`flex-1 truncate text-sm ${isWinner ? "font-semibold text-foreground" : "text-foreground/85"}`}
      >
        {team?.name ?? "—"}
      </span>
      {score !== null && (
        <span
          className={`min-w-5 text-right text-sm tabular-nums ${isWinner ? "font-bold text-accent" : "text-muted"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

interface MatchCardProps {
  match: ResolvedMatch;
  teamMap: Record<string, Team>;
}

export function MatchCard({ match, teamMap }: MatchCardProps) {
  const home = match.homeTeam ? teamMap[match.homeTeam] : null;
  const away = match.awayTeam ? teamMap[match.awayTeam] : null;
  const homeWon = match.winner !== null && match.winner === match.homeTeam;
  const awayWon = match.winner !== null && match.winner === match.awayTeam;
  const decided = match.winner !== null;

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border bg-surface/80 shadow-lg shadow-black/20 backdrop-blur-sm transition-colors ${
        match.status === "LIVE"
          ? "border-live/50 ring-1 ring-live/20"
          : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1">
        <StatusBadge match={match} />
      </div>
      <div className="divide-y divide-border/50">
        <TeamRow
          team={home}
          score={match.homeScore}
          isWinner={homeWon}
          dimmed={decided && !homeWon}
        />
        <TeamRow
          team={away}
          score={match.awayScore}
          isWinner={awayWon}
          dimmed={decided && !awayWon}
        />
      </div>
    </div>
  );
}
