"use client";

import { useState, type ReactNode } from "react";
import {
  SLOTS_BY_STAGE,
  STAGE_LABEL,
  STAGE_SHORT,
  type ResolvedMatch,
  type Stage,
} from "@/lib/bracket";

const MOBILE_STAGES: Stage[] = ["R32", "R16", "QF", "SF", "3RD", "FINAL"];

interface MobileBracketProps {
  resolved: Record<string, ResolvedMatch>;
  renderMatch: (match: ResolvedMatch) => ReactNode;
}

/**
 * Phone-friendly bracket: a horizontal stage switcher over a single full-width
 * column of cards. The full two-sided poster layout (BracketFrame) is reserved
 * for md+ screens where it actually fits.
 */
export function MobileBracket({ resolved, renderMatch }: MobileBracketProps) {
  const [stage, setStage] = useState<Stage>("R32");
  const slots = SLOTS_BY_STAGE[stage];

  return (
    <div className="md:hidden">
      <div className="bracket-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {MOBILE_STAGES.map((s) => {
          const active = s === stage;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              aria-pressed={active}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border/60 bg-surface/40 text-muted hover:text-foreground"
              }`}
            >
              {STAGE_SHORT[s]}
            </button>
          );
        })}
      </div>

      <p className="mb-3 mt-1 text-center text-xs font-semibold uppercase tracking-widest text-accent">
        {STAGE_LABEL[stage]}
      </p>

      <div className="space-y-2.5">
        {slots.map((def) => (
          <div key={def.slot} className="mx-auto w-full max-w-sm">
            {renderMatch(resolved[def.slot])}
          </div>
        ))}
      </div>
    </div>
  );
}
