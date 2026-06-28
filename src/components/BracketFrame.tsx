import type { ReactNode } from "react";
import {
  SLOTS_BY_STAGE,
  STAGE_SHORT,
  type ResolvedMatch,
  type SlotDef,
  type Stage,
} from "@/lib/bracket";
import { MobileBracket } from "./MobileBracket";

// ROW_HEIGHT must comfortably exceed a card's natural height (~88px), otherwise
// the cards overflow their slice and stop lining up with the SVG connectors.
const ROW_HEIGHT = 118;
const R32_PER_SIDE = 8;
const BRACKET_HEIGHT = R32_PER_SIDE * ROW_HEIGHT;
const CARD_WIDTH = "w-[176px]";

// Column order from the outer edge of each half toward the center final.
const SIDE_STAGES: Stage[] = ["R32", "R16", "QF", "SF"];

type Side = "left" | "right";

function splitSlots(stage: Stage): Record<Side, SlotDef[]> {
  const slots = SLOTS_BY_STAGE[stage];
  const mid = Math.ceil(slots.length / 2);
  return { left: slots.slice(0, mid), right: slots.slice(mid) };
}

function Connector({ count, side }: { count: number; side: Side }) {
  // Left half: elbows feed rightward toward the center. Right half is mirrored.
  const path =
    side === "left"
      ? "M0 25 H55 V75 H0 M55 50 H100"
      : "M100 25 H45 V75 H100 M45 50 H0";

  return (
    <div className="flex w-7 shrink-0 flex-col" aria-hidden="true">
      {/* Spacer matching the column header so elbows align with the cards. */}
      <div className="h-8 shrink-0" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="min-h-0 flex-1">
          <svg
            className="h-full w-full text-border"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

function StraightConnector() {
  return (
    <div className="flex w-6 shrink-0 flex-col" aria-hidden="true">
      <div className="h-8 shrink-0" />
      <div className="flex-1">
        <svg
          className="h-full w-full text-border"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path
            d="M0 50 H100"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

interface ColumnProps {
  stage: Stage;
  slots: SlotDef[];
  resolved: Record<string, ResolvedMatch>;
  renderMatch: (match: ResolvedMatch) => ReactNode;
}

function Column({ stage, slots, resolved, renderMatch }: ColumnProps) {
  return (
    <div className="flex flex-col">
      <div className="flex h-8 shrink-0 items-center justify-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          {STAGE_SHORT[stage]}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-around">
        {slots.map((def) => (
          <div
            key={def.slot}
            className={`flex flex-1 items-center px-1.5 ${CARD_WIDTH}`}
          >
            {renderMatch(resolved[def.slot])}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BracketFrameProps {
  resolved: Record<string, ResolvedMatch>;
  renderMatch: (match: ResolvedMatch) => ReactNode;
  /**
   * Phone layout. "stack" shows a stage switcher (interactive live/predict views,
   * which are client components). "scroll" keeps the full poster and lets the user
   * pan left/right — used by read-only views that may render on the server, so we
   * must not hand `renderMatch` to the client MobileBracket.
   */
  mobileLayout?: "stack" | "scroll";
}

export function BracketFrame({
  resolved,
  renderMatch,
  mobileLayout = "stack",
}: BracketFrameProps) {
  const halves: Record<Stage, Record<Side, SlotDef[]>> = {
    R32: splitSlots("R32"),
    R16: splitSlots("R16"),
    QF: splitSlots("QF"),
    SF: splitSlots("SF"),
    "3RD": { left: [], right: [] },
    FINAL: { left: [], right: [] },
  };

  // Connector elbow counts sit between consecutive stage columns.
  const connectorCount: Record<number, number> = { 0: 4, 1: 2, 2: 1 };

  const renderHalf = (side: Side) => {
    const columns = SIDE_STAGES.map((stage, index) => (
      <div key={`${side}-${stage}`} className="flex items-stretch">
        {side === "left" ? (
          <>
            <Column
              stage={stage}
              slots={halves[stage][side]}
              resolved={resolved}
              renderMatch={renderMatch}
            />
            {index < SIDE_STAGES.length - 1 && (
              <Connector count={connectorCount[index]} side="left" />
            )}
          </>
        ) : (
          <>
            {index < SIDE_STAGES.length - 1 && (
              <Connector count={connectorCount[index]} side="right" />
            )}
            <Column
              stage={stage}
              slots={halves[stage][side]}
              resolved={resolved}
              renderMatch={renderMatch}
            />
          </>
        )}
      </div>
    ));

    // Right half mirrors the column order (center → outer edge).
    return side === "left" ? columns : [...columns].reverse();
  };

  return (
    <>
      {/* Mobile: stage switcher + single column (the poster layout won't fit). */}
      {mobileLayout === "stack" && (
        <MobileBracket resolved={resolved} renderMatch={renderMatch} />
      )}

      {/* Two-sided converging poster — always on desktop, and on mobile too when
          mobileLayout is "scroll" (read-only views pan it horizontally). */}
      <div
        className={`bracket-scroll w-full overflow-x-auto pb-4 ${
          mobileLayout === "stack" ? "hidden md:block" : "block"
        }`}
      >
        <div
          className="mx-auto flex min-w-max items-stretch"
          style={{ height: BRACKET_HEIGHT }}
        >
          {/* Left half: outer edge → center */}
          {renderHalf("left")}

          {/* Center: straight feed → final + 3rd place */}
          <StraightConnector />
          <CenterColumn resolved={resolved} renderMatch={renderMatch} />
          <StraightConnector />

          {/* Right half: center → outer edge */}
          {renderHalf("right")}
        </div>
      </div>
    </>
  );
}

interface CenterColumnProps {
  resolved: Record<string, ResolvedMatch>;
  renderMatch: (match: ResolvedMatch) => ReactNode;
}

function CenterColumn({ resolved, renderMatch }: CenterColumnProps) {
  return (
    <div className="flex flex-col">
      <div className="flex h-8 shrink-0 items-center justify-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          {STAGE_SHORT.FINAL}
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        {/* Third-place match floats above the final, mirroring the poster layout. */}
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 ${CARD_WIDTH}`}>
          <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">
            Mecz o 3. miejsce
          </div>
          {renderMatch(resolved["third"])}
        </div>

        <div className={`px-1.5 ${CARD_WIDTH}`}>
          <div className="mb-1 text-center text-xl leading-none">🏆</div>
          {renderMatch(resolved["final"])}
        </div>
      </div>
    </div>
  );
}
