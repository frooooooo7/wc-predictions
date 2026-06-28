"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

interface ProfileEditorProps {
  userId: string;
  initialNick: string;
  initialAvatarUrl: string | null;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function ProfileEditor({
  userId,
  initialNick,
  initialAvatarUrl,
}: ProfileEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nick, setNick] = useState(initialNick);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [savingNick, setSavingNick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setInfo(null);

    if (!file.type.startsWith("image/")) {
      setError("Wybierz plik graficzny.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Maksymalny rozmiar avatara to 2 MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setUploading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setAvatarUrl(publicUrl);
    setInfo("Avatar zaktualizowany.");
    router.refresh();
  };

  const handleNickSave = async () => {
    const trimmed = nick.trim();
    if (!trimmed) {
      setError("Nick nie może być pusty.");
      return;
    }
    setSavingNick(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ nick: trimmed })
      .eq("id", userId);
    setSavingNick(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setInfo("Nick zapisany.");
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3">
          <Avatar url={avatarUrl} nick={nick || "?"} size={88} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent/60 hover:text-foreground disabled:opacity-50"
          >
            {uploading ? "Wgrywanie…" : "Zmień avatar"}
          </button>
        </div>

        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="nick" className="text-xs font-medium text-muted">
              Nick
            </label>
            <div className="flex gap-2">
              <input
                id="nick"
                type="text"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                maxLength={32}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
              />
              <button
                type="button"
                onClick={handleNickSave}
                disabled={savingNick || nick.trim() === initialNick}
                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                Zapisz
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-live/10 px-3 py-2 text-sm text-live">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              {info}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
