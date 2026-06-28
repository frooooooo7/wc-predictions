"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SyncTimerProps {
  /** Refresh interval in seconds (matches the Vercel cron schedule). */
  intervalSeconds?: number;
  /** Only admins may trigger a real API sync and see the manual button. */
  canManualSync?: boolean;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SyncTimer({
  intervalSeconds = 120,
  canManualSync = false,
}: SyncTimerProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(intervalSeconds);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const runningRef = useRef(false);

  // Admins pull fresh data from the API; everyone else just re-reads the DB.
  const tick = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      if (canManualSync) {
        setSyncing(true);
        await fetch("/api/sync", { method: "POST" });
        setLastSync(new Date().toLocaleTimeString("pl-PL"));
      }
      router.refresh();
    } catch {
      // Network hiccup — next tick will retry.
    } finally {
      setSyncing(false);
      runningRef.current = false;
      setRemaining(intervalSeconds);
    }
  }, [canManualSync, intervalSeconds, router]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          void tick();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [intervalSeconds, tick]);

  const intervalLabel =
    intervalSeconds % 60 === 0
      ? `${intervalSeconds / 60} min`
      : `${intervalSeconds} s`;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-3 py-1.5 text-xs text-muted">
      <span
        className={`h-2 w-2 rounded-full ${
          syncing ? "animate-live-pulse bg-accent" : "bg-accent/60"
        }`}
      />
      {syncing ? (
        <span className="font-medium text-accent">Synchronizacja…</span>
      ) : (
        <span>
          Dane odświeżają się co {intervalLabel} · za{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatClock(remaining)}
          </span>
        </span>
      )}
      {canManualSync && lastSync && !syncing && (
        <span className="hidden sm:inline">· ostatnia {lastSync}</span>
      )}
      {canManualSync && (
        <button
          type="button"
          onClick={() => void tick()}
          disabled={syncing}
          aria-label="Synchronizuj teraz"
          title="Synchronizuj teraz (admin)"
          className="ml-1 rounded-full px-2 py-0.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
        >
          ↻
        </button>
      )}
    </div>
  );
}
