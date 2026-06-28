/** Must match vercel.json crons[0].schedule (0 6 * * * = 06:00 UTC daily). */
export const CRON_SYNC_UTC_HOUR = 6;
export const CRON_SYNC_UTC_MINUTE = 0;

/** Human-readable daily sync time in Europe/Warsaw (accounts for DST). */
export function dailySyncTimeWarsaw(): string {
  const today = new Date();
  const utc = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      CRON_SYNC_UTC_HOUR,
      CRON_SYNC_UTC_MINUTE,
    ),
  );
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
  }).format(utc);
}

export function dailySyncDescription(): string {
  return `codziennie o ${dailySyncTimeWarsaw()} (Warszawa)`;
}
