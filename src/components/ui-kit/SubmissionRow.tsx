import { Link } from "react-router-dom";
import { Check, ChevronRight, Clock, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_GLYPHS, PlatformKey } from "@/components/brand/icons/NavGlyphs";
import { normalizeStatus, StatusKind } from "@/components/ui-kit/StatusChip";
import { relativeAge } from "@/lib/relative-time";

/** Small circular state marker: green tick, red cross, amber clock. */
export function StatusIcon({ status, size = 15 }: { status: StatusKind | string; size?: number }) {
  const kind = normalizeStatus(String(status));
  const box = { width: size + 3, height: size + 3 };

  if (kind === "processing" || kind === "pending") {
    return (
      <span
        aria-label="Processing"
        style={box}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-state-processing/60 text-state-processing"
      >
        <Clock style={{ width: size - 5, height: size - 5 }} strokeWidth={2.6} />
      </span>
    );
  }
  if (kind === "rejected" || kind === "ineligible") {
    return (
      <span
        aria-label="Ineligible"
        style={box}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-state-rejected/60 text-state-rejected"
      >
        <X style={{ width: size - 5, height: size - 5 }} strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      aria-label={kind === "paid" ? "Paid out" : "Eligible"}
      style={box}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-state-eligible/60 text-state-eligible"
    >
      <Check style={{ width: size - 5, height: size - 5 }} strokeWidth={3} />
    </span>
  );
}

export function PlatformGlyph({ platform, size = 14 }: { platform: string; size?: number }) {
  const key = String(platform).toLowerCase() as PlatformKey;
  const Glyph = PLATFORM_GLYPHS[key];
  if (!Glyph) return null;
  return <Glyph size={size} className="shrink-0 text-foreground/80" />;
}

/** Wrapper that renders rows inside one container, hairline separated. */
export function RowGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("surface-card overflow-hidden", className)}>{children}</div>;
}

/**
 * Activity → Submissions row.
 * title line, then platform · state · views ; right side age + chevron.
 */
export function SubmissionRow({
  to,
  title,
  platform,
  status,
  views,
  createdAt,
  amount,
  thumbnailUrl,
  compact = false,
}: {
  to: string;
  title: string;
  platform: string;
  status: string;
  views: number;
  createdAt: string | null;
  amount?: number | null;
  thumbnailUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className="press-row focus-ring flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-center gap-2">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" loading="lazy" className="h-4 w-4 shrink-0 rounded-[4px] object-cover" />
            ) : null}
            <span className="truncate text-[13px] font-medium text-foreground">{title}</span>
          </div>
        )}
        <div className={cn("flex items-center gap-2.5 text-[12.5px] text-muted-foreground", !compact && "mt-1.5")}>
          <PlatformGlyph platform={platform} />
          <StatusIcon status={status} />
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye className="h-3.5 w-3.5" />
            {views.toLocaleString()}
          </span>
          {typeof amount === "number" && (
            <>
              <span className="text-muted-foreground/60">•</span>
              <span className="tabular-nums text-foreground">${amount.toFixed(2)}</span>
            </>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[12px] text-muted-foreground">{relativeAge(createdAt)}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
