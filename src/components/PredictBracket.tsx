"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  resolvePredictedBracket,
  STRUCTURE,
  STRUCTURE_BY_SLOT,
  type MatchRow,
  type ResolvedMatch,
  type Team,
} from "@/lib/bracket";
import { BracketFrame } from "./BracketFrame";
import { TeamFlag } from "./TeamFlag";
import { ConfirmDialog } from "./ConfirmDialog";
import { PredictionView } from "./PredictionView";

interface PredictBracketProps {
  matches: MatchRow[];
  teamMap: Record<string, Team>;
  userId: string;
  initialPicks: Record<string, string>;
  initialLocked: boolean;
}

interface DragData {
  slot: string;
  teamId: string;
}

function pruneToValid(
  matches: MatchRow[],
  picks: Record<string, string>,
): Record<string, string> {
  const resolved = resolvePredictedBracket(matches, picks);
  const next: Record<string, string> = {};
  for (const def of STRUCTURE) {
    const winner = resolved[def.slot].winner;
    if (winner) next[def.slot] = winner;
  }
  return next;
}

export function PredictBracket({
  matches,
  teamMap,
  userId,
  initialPicks,
  initialLocked,
}: PredictBracketProps) {
  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(initialLocked);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const resolved = useMemo(
    () => resolvePredictedBracket(matches, picks),
    [matches, picks],
  );

  const totalPicks = Object.keys(resolved).filter(
    (slot) => resolved[slot].winner,
  ).length;

  const setPick = (slot: string, teamId: string) => {
    if (locked) return;
    setPicks((prev) => {
      const candidate = { ...prev, [slot]: teamId };
      return pruneToValid(matches, candidate);
    });
    setDirty(true);
    setSavedAt(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (locked) return;
    setActiveDrag((event.active.data.current as DragData) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    if (locked) return;
    const data = event.active.data.current as DragData | undefined;
    const overId = event.over?.id;
    if (!data || typeof overId !== "string") return;
    const targetSlot = overId.replace("drop:", "");
    const expected = STRUCTURE_BY_SLOT[data.slot]?.feedsWinner?.slot;
    if (expected && expected === targetSlot) {
      setPick(data.slot, data.teamId);
    }
  };

  const handleReset = () => {
    if (locked) return;
    setPicks({});
    setDirty(true);
    setSavedAt(null);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const rows = Object.entries(picks).map(([slot, winner]) => ({
      user_id: userId,
      match_slot: slot,
      predicted_winner: winner,
    }));

    const { error: deleteError } = await supabase
      .from("predictions")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      setSaving(false);
      setError(deleteError.message);
      setConfirmOpen(false);
      return;
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("predictions")
        .insert(rows);
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        setConfirmOpen(false);
        return;
      }
    }

    const { error: lockError } = await supabase
      .from("profiles")
      .update({ predictions_locked: true })
      .eq("id", userId);

    setSaving(false);
    setConfirmOpen(false);

    if (lockError) {
      setError(lockError.message);
      return;
    }

    setDirty(false);
    setLocked(true);
    setSavedAt(new Date().toLocaleTimeString("pl-PL"));
  };

  const activeTeam = activeDrag ? teamMap[activeDrag.teamId] : null;

  if (locked) {
    return (
      <>
        <div className="sticky top-[57px] z-30 -mx-3 mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur-md sm:-mx-4 sm:px-4">
          <div className="text-sm text-muted">
            Wytypowano{" "}
            <span className="font-semibold text-foreground">{totalPicks}</span> z{" "}
            {STRUCTURE.length} meczów
            <span className="ml-2 inline-flex items-center gap-1 font-medium text-accent">
              🔒 zatwierdzone
            </span>
          </div>
        </div>
        <PredictionView matches={matches} picks={picks} teamMap={teamMap} />
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="sticky top-[57px] z-30 -mx-3 mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur-md sm:-mx-4 sm:px-4">
        <div className="text-sm text-muted">
          Wytypowano{" "}
          <span className="font-semibold text-foreground">{totalPicks}</span> z{" "}
          {STRUCTURE.length} meczów
          {savedAt && !dirty && (
            <span className="ml-2 text-accent">· zapisano {savedAt}</span>
          )}
          {dirty && (
            <span className="ml-2 text-amber-300">· niezapisane zmiany</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-live">{error}</span>}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-live/50 hover:text-foreground"
          >
            Wyczyść
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={totalPicks === 0}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-background transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            Zatwierdź typy
          </button>
        </div>
      </div>

      <BracketFrame
        resolved={resolved}
        renderMatch={(match) => (
          <PredictMatch
            match={match}
            teamMap={teamMap}
            activeSourceSlot={activeDrag?.slot ?? null}
            onPick={setPick}
          />
        )}
      />

      <DragOverlay dropAnimation={null}>
        {activeTeam && (
          <div className="flex items-center gap-2 rounded-lg border border-accent bg-surface-2 px-3 py-2 text-sm font-semibold shadow-xl shadow-black/40">
            <TeamFlag team={activeTeam} size="sm" />
            <span>{activeTeam.name}</span>
          </div>
        )}
      </DragOverlay>

      <ConfirmDialog
        open={confirmOpen}
        title="Zatwierdzić typy?"
        description={
          <>
            Zapiszesz swoją drabinkę z{" "}
            <span className="font-semibold text-foreground">{totalPicks}</span>{" "}
            typami. Po zatwierdzeniu drabinka zostanie{" "}
            <span className="font-semibold text-live">zablokowana</span> i nie
            będzie można jej już zmienić.
          </>
        }
        confirmLabel="Tak, zatwierdzam"
        cancelLabel="Jeszcze nie"
        loading={saving}
        onConfirm={handleConfirmSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </DndContext>
  );
}

interface PredictMatchProps {
  match: ResolvedMatch;
  teamMap: Record<string, Team>;
  activeSourceSlot: string | null;
  onPick: (slot: string, teamId: string) => void;
}

function PredictMatch({
  match,
  teamMap,
  activeSourceSlot,
  onPick,
}: PredictMatchProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${match.slot}` });

  const expectedTarget = activeSourceSlot
    ? STRUCTURE_BY_SLOT[activeSourceSlot]?.feedsWinner?.slot
    : null;
  const isValidTarget = expectedTarget === match.slot;
  const canAdvance = Boolean(STRUCTURE_BY_SLOT[match.slot]?.feedsWinner);

  return (
    <div
      ref={setNodeRef}
      className={`w-full overflow-hidden rounded-xl border bg-surface/80 shadow-lg shadow-black/20 transition-all ${
        isValidTarget
          ? isOver
            ? "border-accent ring-2 ring-accent/50"
            : "border-accent/50"
          : "border-border"
      }`}
    >
      <div className="divide-y divide-border/50">
        <PredictTeamRow
          match={match}
          side="home"
          teamMap={teamMap}
          canAdvance={canAdvance}
          onPick={onPick}
        />
        <PredictTeamRow
          match={match}
          side="away"
          teamMap={teamMap}
          canAdvance={canAdvance}
          onPick={onPick}
        />
      </div>
    </div>
  );
}

interface PredictTeamRowProps {
  match: ResolvedMatch;
  side: "home" | "away";
  teamMap: Record<string, Team>;
  canAdvance: boolean;
  onPick: (slot: string, teamId: string) => void;
}

function PredictTeamRow({
  match,
  side,
  teamMap,
  canAdvance,
  onPick,
}: PredictTeamRowProps) {
  const teamId = side === "home" ? match.homeTeam : match.awayTeam;
  const team = teamId ? teamMap[teamId] : null;
  const isWinner = teamId !== null && match.winner === teamId;

  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: `drag:${match.slot}:${side}`,
    data: { slot: match.slot, teamId },
    disabled: !teamId || !canAdvance,
  });

  if (!team || !teamId) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-muted">
        <TeamFlag team={null} size="sm" />
        <span className="italic">Do ustalenia</span>
      </div>
    );
  }

  const handlePick = () => onPick(match.slot, teamId);

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      aria-pressed={isWinner}
      aria-label={`Awansuj: ${team.name}`}
      onClick={handlePick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handlePick();
        }
      }}
      {...listeners}
      className={`flex cursor-pointer touch-none select-none items-center gap-2 px-2.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
        isDragging ? "opacity-40" : ""
      } ${
        isWinner
          ? "bg-accent/15"
          : "hover:bg-surface-2"
      }`}
    >
      <TeamFlag team={team} size="sm" />
      <span
        className={`flex-1 truncate text-sm ${isWinner ? "font-semibold text-accent" : "text-foreground/85"}`}
      >
        {team.name}
      </span>
      {isWinner && (
        <motion.span
          layoutId={`win-${match.slot}`}
          className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent"
        >
          ✓
        </motion.span>
      )}
    </div>
  );
}
