import type { Team } from "@/lib/bracket";

interface TeamFlagProps {
  team?: Team | null;
  size?: "sm" | "md";
}

export function TeamFlag({ team, size = "md" }: TeamFlagProps) {
  const dimension = size === "sm" ? "h-4 w-6 text-base" : "h-5 w-7 text-lg";

  if (!team) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-sm bg-surface-2 ${dimension}`}
      >
        ?
      </span>
    );
  }

  const isUrl = team.flag.startsWith("http");

  if (isUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.flag}
        alt=""
        className={`inline-block shrink-0 rounded-sm object-cover ${dimension}`}
      />
    );
  }

  return (
    <span aria-hidden="true" className={`shrink-0 leading-none ${dimension}`}>
      {team.flag}
    </span>
  );
}
