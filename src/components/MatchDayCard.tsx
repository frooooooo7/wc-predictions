"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MatchRow, Team } from "@/lib/bracket";
import { isBettable, type ProfileLite } from "@/lib/daily";
import { TeamFlag } from "./TeamFlag";
import { Avatar } from "./Avatar";

interface MatchDayCardProps {
  match: MatchRow;
  teamMap: Record<string, Team>;
  myPick: string | null;
  canBet: boolean;
  loggedIn: boolean;
  userId: string | null;
  pickers: Record<string, ProfileLite[]>;
}

function statusBadge(match: MatchRow) {
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
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
      Przed meczem
    </span>
  );
}

function kickoffTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(d);
}

export function MatchDayCard({
  match,
  teamMap,
  myPick,
  canBet,
  loggedIn,
  userId,
  pickers,
}: MatchDayCardProps) {
  const router = useRouter();
  const [pick, setPick] = useState<string | null>(myPick);
  const [syncedPick, setSyncedPick] = useState<string | null>(myPick);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-sync from the server when it sends a fresh snapshot.
  if (myPick !== syncedPick) {
    setSyncedPick(myPick);
    setPick(myPick);
  }

  const decided = match.status === "FINISHED" && Boolean(match.winner_team);

  const handlePick = async (teamId: string) => {
    if (!canBet || !userId || saving) return;
    // Re-check kickoff in case the card was left open until the match started.
    if (!isBettable(match)) {
      setError("Mecz już się rozpoczął — nie można zmieniać typu.");
      return;
    }
    setError(null);
    setSaving(teamId);
    const previous = pick;
    setPick(teamId);

    const supabase = createClient();
    const { error: upsertError } = await supabase
      .from("match_predictions")
      .upsert(
        { user_id: userId, match_slot: match.slot, predicted_winner: teamId },
        { onConflict: "user_id,match_slot" },
      );

    setSaving(null);
    if (upsertError) {
      setPick(previous);
      setError("Nie udało się zapisać typu.");
      return;
    }
    router.refresh();
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface/60 ${
        match.status === "LIVE" ? "border-live/40" : "border-border/60"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 text-xs text-muted">
        <span className="tabular-nums">{kickoffTime(match.kickoff)}</span>
        {statusBadge(match)}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 p-3">
        <TeamButton
          teamId={match.home_team}
          teamMap={teamMap}
          match={match}
          pick={pick}
          canBet={canBet}
          saving={saving}
          decided={decided}
          onPick={handlePick}
        />

        <div className="flex flex-col items-center justify-center px-1 text-center">
          {match.status === "SCHEDULED" ? (
            <span className="text-xs font-semibold text-muted">VS</span>
          ) : (
            <span className="text-lg font-bold tabular-nums">
              {match.home_score ?? 0}
              <span className="mx-1 text-muted">:</span>
              {match.away_score ?? 0}
            </span>
          )}
        </div>

        <TeamButton
          teamId={match.away_team}
          teamMap={teamMap}
          match={match}
          pick={pick}
          canBet={canBet}
          saving={saving}
          decided={decided}
          onPick={handlePick}
          align="right"
        />
      </div>

      {error && (
        <p className="px-4 pb-2 text-xs text-live">{error}</p>
      )}

      {!loggedIn && match.status === "SCHEDULED" && (
        <p className="px-4 pb-3 text-center text-xs text-muted">
          Zaloguj się, aby obstawić zwycięzcę.
        </p>
      )}

      <PickersRow
        match={match}
        pickers={pickers}
        teamMap={teamMap}
      />
    </div>
  );
}

interface TeamButtonProps {
  teamId: string | null;
  teamMap: Record<string, Team>;
  match: MatchRow;
  pick: string | null;
  canBet: boolean;
  saving: string | null;
  decided: boolean;
  onPick: (teamId: string) => void;
  align?: "left" | "right";
}

function TeamButton({
  teamId,
  teamMap,
  match,
  pick,
  canBet,
  saving,
  decided,
  onPick,
  align = "left",
}: TeamButtonProps) {
  const team = teamId ? teamMap[teamId] : null;
  if (!team || !teamId) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 px-3 py-3 text-sm text-muted">
        <TeamFlag team={null} size="sm" />
        <span className="italic">Do ustalenia</span>
      </div>
    );
  }

  const isMine = pick === teamId;
  const isWinner = match.winner_team === teamId;

  let tone =
    "border-border bg-surface hover:border-accent/50 hover:bg-surface-2";
  if (decided) {
    if (isWinner) {
      tone = "border-emerald-500/60 bg-emerald-500/15";
    } else if (isMine) {
      tone = "border-rose-500/60 bg-rose-500/15";
    } else {
      tone = "border-border bg-surface opacity-70";
    }
  } else if (isMine) {
    tone = "border-accent bg-accent/15";
  }

  const showMyBadge = isMine;
  const badge = decided
    ? isWinner
      ? { symbol: "✓", className: "bg-emerald-500/25 text-emerald-300" }
      : isMine
        ? { symbol: "✗", className: "bg-rose-500/25 text-rose-300" }
        : null
    : isMine
      ? { symbol: "Twój typ", className: "bg-accent/25 text-accent" }
      : null;

  const content = (
    <>
      <TeamFlag team={team} size="sm" />
      <span
        className={`flex-1 truncate text-sm font-medium ${
          decided && !isWinner && !isMine ? "text-foreground/70" : ""
        } ${decided && isMine && !isWinner ? "line-through decoration-rose-400/60" : ""}`}
      >
        {team.name}
      </span>
      {badge && (
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${badge.className}`}
        >
          {badge.symbol}
        </span>
      )}
    </>
  );

  const layout = align === "right" ? "flex-row-reverse text-right" : "flex-row";

  if (canBet) {
    return (
      <button
        type="button"
        onClick={() => onPick(teamId)}
        disabled={Boolean(saving)}
        aria-pressed={showMyBadge}
        className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition-all disabled:opacity-60 ${layout} ${tone}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-3 ${layout} ${tone}`}
    >
      {content}
    </div>
  );
}

function PickersRow({
  match,
  pickers,
  teamMap,
}: {
  match: MatchRow;
  pickers: Record<string, ProfileLite[]>;
  teamMap: Record<string, Team>;
}) {
  const total = Object.values(pickers).reduce((n, list) => n + list.length, 0);
  if (total === 0) return null;

  const sides = [match.home_team, match.away_team].filter(
    (t): t is string => Boolean(t),
  );
  const homeId = sides[0];
  const homePct = homeId
    ? Math.round(((pickers[homeId]?.length ?? 0) / total) * 100)
    : 0;

  return (
    <div className="border-t border-border/50 px-3 py-3">
      <div className="mb-3 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="bg-accent/70"
          style={{ width: `${homePct}%` }}
          aria-hidden="true"
        />
        <div className="flex-1 bg-sky-500/60" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sides.map((teamId) => {
          const list = pickers[teamId] ?? [];
          const team = teamMap[teamId];
          const pct = Math.round((list.length / total) * 100);
          const isWinner =
            match.status === "FINISHED" && match.winner_team === teamId;
          return (
            <div key={teamId} className="min-w-0">
              <div
                className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${
                  isWinner ? "text-emerald-400" : "text-muted"
                }`}
              >
                <TeamFlag team={team} size="sm" />
                <span className="truncate">{team?.name ?? "—"}</span>
                <span className="ml-auto shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] tabular-nums">
                  {pct}% · {list.length}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="text-xs italic text-muted/60">Brak typów</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <Avatar url={p.avatarUrl} nick={p.nick} size={28} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {p.nick}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
