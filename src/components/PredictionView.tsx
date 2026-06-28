import {
  resolvePredictedBracket,
  type MatchRow,
  type ResolvedMatch,
  type Team,
} from "@/lib/bracket";
import { BracketFrame } from "./BracketFrame";
import { TeamFlag } from "./TeamFlag";

interface PredictionViewProps {
  matches: MatchRow[];
  picks: Record<string, string>;
  teamMap: Record<string, Team>;
}

/** Outcome of a single pick compared with the real result. */
type Outcome = "correct" | "wrong" | "pending" | "none";

function outcomeFor(
  match: ResolvedMatch,
  real: MatchRow | undefined,
): Outcome {
  const pick = match.winner;
  if (!pick) return "none";
  if (real && real.status === "FINISHED" && real.winner_team) {
    return pick === real.winner_team ? "correct" : "wrong";
  }
  return "pending";
}

const CARD_BORDER: Record<Outcome, string> = {
  correct: "border-emerald-500/50",
  wrong: "border-rose-500/50",
  pending: "border-border",
  none: "border-border",
};

/** Read-only rendering of someone's predicted bracket, colour-coded by result. */
export function PredictionView({ matches, picks, teamMap }: PredictionViewProps) {
  const resolved = resolvePredictedBracket(matches, picks);
  const realBySlot = new Map(matches.map((m) => [m.slot, m]));

  return (
    <div className="space-y-3">
      <Legend />
      <BracketFrame
        resolved={resolved}
        mobileLayout="scroll"
        renderMatch={(match) => (
          <ReadonlyMatch
            match={match}
            teamMap={teamMap}
            outcome={outcomeFor(match, realBySlot.get(match.slot))}
          />
        )}
      />
    </div>
  );
}

function Legend() {
  const items = [
    { className: "bg-emerald-500", label: "Trafione" },
    { className: "bg-rose-500", label: "Nietrafione" },
    { className: "bg-zinc-500", label: "Jeszcze nierozstrzygnięte" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

const WINNER_ROW: Record<Outcome, string> = {
  correct: "bg-emerald-500/15 text-emerald-400",
  wrong: "bg-rose-500/15 text-rose-400 line-through decoration-rose-400/60",
  pending: "bg-zinc-500/15 text-zinc-300",
  none: "",
};

const BADGE: Record<Outcome, { symbol: string; className: string } | null> = {
  correct: { symbol: "✓", className: "bg-emerald-500/20 text-emerald-400" },
  wrong: { symbol: "✗", className: "bg-rose-500/20 text-rose-400" },
  pending: { symbol: "•", className: "bg-zinc-500/20 text-zinc-300" },
  none: null,
};

function ReadonlyTeamRow({
  teamId,
  match,
  teamMap,
  outcome,
}: {
  teamId: string | null;
  match: ResolvedMatch;
  teamMap: Record<string, Team>;
  outcome: Outcome;
}) {
  const team = teamId ? teamMap[teamId] : null;
  const isWinner = teamId !== null && match.winner === teamId;

  if (!team || !teamId) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-muted">
        <TeamFlag team={null} size="sm" />
        <span className="italic">Do ustalenia</span>
      </div>
    );
  }

  const badge = isWinner ? BADGE[outcome] : null;

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-2 ${
        isWinner ? WINNER_ROW[outcome] : ""
      }`}
    >
      <TeamFlag team={team} size="sm" />
      <span
        className={`flex-1 truncate text-sm ${isWinner ? "font-semibold" : "text-foreground/70"}`}
      >
        {team.name}
      </span>
      {badge && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${badge.className}`}
        >
          {badge.symbol}
        </span>
      )}
    </div>
  );
}

function ReadonlyMatch({
  match,
  teamMap,
  outcome,
}: {
  match: ResolvedMatch;
  teamMap: Record<string, Team>;
  outcome: Outcome;
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-xl border bg-surface/80 shadow-lg shadow-black/20 ${CARD_BORDER[outcome]}`}
    >
      <div className="divide-y divide-border/50">
        <ReadonlyTeamRow
          teamId={match.homeTeam}
          match={match}
          teamMap={teamMap}
          outcome={outcome}
        />
        <ReadonlyTeamRow
          teamId={match.awayTeam}
          match={match}
          teamMap={teamMap}
          outcome={outcome}
        />
      </div>
    </div>
  );
}
