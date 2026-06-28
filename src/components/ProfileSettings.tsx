"use client";

import { useState } from "react";
import { ProfileEditor } from "./ProfileEditor";

interface ProfileSettingsProps {
  userId: string;
  initialNick: string;
  initialAvatarUrl: string | null;
}

export function ProfileSettings({
  userId,
  initialNick,
  initialAvatarUrl,
}: ProfileSettingsProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = () => setOpen((prev) => !prev);

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/60 bg-surface/40 px-4 py-3 text-left transition-colors hover:border-accent/50 hover:bg-surface"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden="true">⚙️</span>
          Ustawienia profilu
        </span>
        <span
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <ProfileEditor
          userId={userId}
          initialNick={initialNick}
          initialAvatarUrl={initialAvatarUrl}
        />
      )}
    </section>
  );
}
