import { cn } from "@/lib/utils";

/**
 * Clipper wordmark — stacked clapper bars + uppercase Sora lettering.
 */
export function ClipperMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect x="2" y="7.6" width="20" height="13.4" rx="3.2" fill="currentColor" />
      <path
        d="M3.4 7.2 21.1 3.2a1 1 0 0 1 1.2.77l.45 2.05a1 1 0 0 1-.76 1.2L4.3 11.2a1 1 0 0 1-1.2-.77l-.46-2.04a1 1 0 0 1 .76-1.2z"
        fill="currentColor"
      />
      <path d="M7.9 5.1 9.9 8.6M13.1 3.9l2 3.5M18.2 2.8l2 3.5" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ClipperWordmark({
  size = 22,
  className,
  showText = true,
}: {
  size?: number;
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <ClipperMark size={size} />
      {showText && (
        <span className="font-display font-extrabold uppercase tracking-[0.08em] text-[15px] leading-none">
          iClips
        </span>
      )}
    </span>
  );
}
