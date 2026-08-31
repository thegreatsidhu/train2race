type TeamAvatarProps = {
  name: string;
  logoUrl?: string | null;
  logoStatus?: string | null;
  isPrivate?: boolean;
  size?: number;
  className?: string;
};

export function TeamAvatar({ name, logoUrl, logoStatus, isPrivate, size = 36, className = "" }: TeamAvatarProps) {
  const canShowLogo = !!logoUrl && (isPrivate || logoStatus === "approved");
  const style = { width: size, height: size };

  if (canShowLogo) {
    return (
      <img
        src={logoUrl!}
        alt={`${name} logo`}
        style={style}
        className={`rounded-full object-cover border border-border shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-signal/10 border border-signal/20 flex items-center justify-center shrink-0 ${className}`}
    >
      <span className="text-signal font-bold" style={{ fontSize: Math.max(10, Math.round(size * 0.4)) }}>
        {name?.charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}
