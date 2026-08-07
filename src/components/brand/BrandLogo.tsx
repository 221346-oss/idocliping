import logoAsset from "@/assets/iclips-mark.png.asset.json";
import { cn } from "@/lib/utils";

/** Single source of truth for the iClips mark — transparent, no container box. */
export function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt=""
      width={size}
      height={size}
      decoding="async"
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Mark + wordmark lockup. */
export function BrandLockup({
  size = 24,
  className,
  showText = true,
}: {
  size?: number;
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <BrandLogo size={size} />
      {showText && (
        <span className="font-display text-[17px] leading-none tracking-[0.06em] lowercase">iclips</span>
      )}
    </span>
  );
}
