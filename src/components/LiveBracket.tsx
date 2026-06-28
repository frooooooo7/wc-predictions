"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  resolveLiveBracket,
  type MatchRow,
  type Team,
} from "@/lib/bracket";
import { BracketFrame } from "./BracketFrame";
import { MatchCard } from "./MatchCard";

interface LiveBracketProps {
  initialMatches: MatchRow[];
  teamMap: Record<string, Team>;
  realtime: boolean;
}

export function LiveBracket({
  initialMatches,
  teamMap,
  realtime,
}: LiveBracketProps) {
  const [matches, setMatches] = useState<MatchRow[]>(initialMatches);
  const [syncedSource, setSyncedSource] = useState(initialMatches);

  // Re-sync local state when the server provides a fresh snapshot (e.g. router.refresh).
  if (initialMatches !== syncedSource) {
    setSyncedSource(initialMatches);
    setMatches(initialMatches);
  }

  useEffect(() => {
    if (!realtime) return;
    const supabase = createClient();

    const channel = supabase
      .channel("matches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          const next = payload.new as MatchRow;
          if (!next?.slot) return;
          setMatches((prev) =>
            prev.map((m) => (m.slot === next.slot ? { ...m, ...next } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtime]);

  const resolved = useMemo(() => resolveLiveBracket(matches), [matches]);

  return (
    <BracketFrame
      resolved={resolved}
      renderMatch={(match) => <MatchCard match={match} teamMap={teamMap} />}
    />
  );
}
