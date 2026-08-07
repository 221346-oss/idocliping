import { useState } from "react";
import { ART, type ArtKey } from "@/assets/art";
import { cn } from "@/lib/utils";

/**
 * Theme + viewport aware artwork.
 *
 * Both the light and dark variant are rendered and cross-faded with CSS only,
 * so switching theme never flashes or re-downloads. The mobile/desktop swap is
 * done inside a <picture> so resizing does not remount the element.
 *
 * Loading: tiny inlined blur placeholder paints instantly, the real WebP fades
 * in on decode. Width/height are always set, so there is no layout shift.
 */
type Props = {
  /** Artwork family — resolves to `${set}-{dark|light}-{web|mobile}` keys. */
  set: "how" | "bg" | "top";
  alt?: string;
  className?: string;
  imgClassName?: string;
  /** Above-the-fold artwork loads eagerly with high priority. */
  priority?: boolean;
  sizes?: string;
};

function Layer({
  webKey,
  mobileKey,
  alt,
  priority,
  sizes,
  className,
  imgClassName,
}: {
  webKey: ArtKey;
  mobileKey?: ArtKey;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
  imgClassName?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const web = ART[webKey];
  const mobile = mobileKey ? ART[mobileKey] : web;

  /** Cached/complete images never fire onLoad after hydration — check on mount. */
  const imgRef = (node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  };


  return (
    <picture className={cn("block", className)}>
      <source media="(min-width: 768px)" srcSet={web.srcset} sizes={sizes} type="image/webp" />
      <source srcSet={mobile.srcset} sizes={sizes} type="image/webp" />
      <img
        src={web.src}
        alt={alt}
        width={web.width}
        height={web.height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={{
          backgroundImage: `url("${mobile.blur}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className={cn(
          "h-full w-full transition-opacity duration-700 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </picture>
  );
}

export function ThemeArtwork({
  set,
  alt = "",
  className,
  imgClassName,
  priority,
  sizes = "100vw",
}: Props) {
  return (
    <div className={cn("relative", className)}>
      {/* light */}
      <Layer
        webKey={`${set}-light-web` as ArtKey}
        mobileKey={set === "top" ? undefined : (`${set}-light-mobile` as ArtKey)}
        alt={alt}
        priority={priority}
        sizes={sizes}
        className="motion-safe:transition-opacity duration-500 dark:opacity-0"
        imgClassName={imgClassName}
      />
      {/* dark — stacked on top, revealed by the theme class */}
      <Layer
        webKey={`${set}-dark-web` as ArtKey}
        mobileKey={set === "top" ? undefined : (`${set}-dark-mobile` as ArtKey)}
        alt=""
        priority={priority}
        sizes={sizes}
        className="absolute inset-0 opacity-0 motion-safe:transition-opacity duration-500 dark:opacity-100"
        imgClassName={imgClassName}
      />
    </div>
  );
}

/** Full-bleed background version — absolutely positioned, cover-cropped. */
export function ArtworkBackground({
  set = "bg",
  className,
  priority,
}: {
  set?: "bg" | "how";
  className?: string;
  priority?: boolean;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <ThemeArtwork
        set={set}
        priority={priority}
        className="h-full w-full [&_picture]:h-full [&_picture]:w-full"
        imgClassName="object-cover"
      />
    </div>
  );
}
