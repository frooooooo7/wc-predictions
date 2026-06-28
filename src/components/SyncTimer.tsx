"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { dailySyncDescription } from "@/lib/sync-schedule";

interface SyncTimerProps {
  /** Admin may trigger an immediate API sync. */
  canManualSync?: boolean;
}

export function SyncTimer({ canManualSync = false }: SyncTimerProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleManualSync = useCallback(async () => {
    if (!canManualSync || syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      setLastSync(new Date().toLocaleTimeString("pl-PL"));
      router.refresh();
    } catch {
      // Network hiccup — admin can retry.
    } finally {
      setSyncing(false);
    }
  }, [canManualSync, syncing, router]);

  const schedule = dailySyncDescription();

  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-3 py-1.5 text-xs text-muted">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          syncing ? "animate-live-pulse bg-accent" : "bg-accent/60"
        }`}
      />
      {syncing ? (
        <span className="font-medium text-accent">Synchronizacja z API…</span>
      ) : (
        <span>
          Wyniki z API: <span className="text-foreground">{schedule}</span>
          {canManualSync ? (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                onClick={() => void handleManualSync()}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                sync teraz
              </button>
            </>
          ) : (
            <> · lub ręcznie przez administratora</>
          )}
        </span>
      )}
      {canManualSync && lastSync && !syncing && (
        <span className="hidden text-muted sm:inline">· ostatnia {lastSync}</span>
      )}
    </div>
  );
}
