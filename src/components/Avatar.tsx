interface AvatarProps {
  url?: string | null;
  nick: string;
  size?: number;
  className?: string;
}

export function Avatar({ url, nick, size = 32, className = "" }: AvatarProps) {
  const initial = (nick.trim()[0] ?? "?").toUpperCase();
  const dimension = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nick}
        style={dimension}
        className={`shrink-0 rounded-full border border-border/70 object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={dimension}
      className={`grid shrink-0 place-items-center rounded-full border border-border/70 bg-accent/15 font-semibold text-accent ${className}`}
    >
      {initial}
    </span>
  );
}
