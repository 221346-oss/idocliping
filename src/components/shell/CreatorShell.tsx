import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";

/**
 * Creator app shell.
 * Mobile: content + floating bottom nav.
 * Desktop (md+): slim top nav + wide container.
 */
export function CreatorShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <TopNav />
      <main className={cn("pb-28 md:pb-16", className)}>{children}</main>
      <BottomNav />
    </div>
  );
}

/** Standard page gutter + max width. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-4 md:px-6", className)}>{children}</div>
  );
}

/** Big left-aligned Sora page title used on top-level screens. */
export function PageTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 pt-6 pb-4 md:pt-8 md:pb-5", className)}>
      <h1 className="font-display text-[30px] md:text-[34px] font-semibold leading-none tracking-tight">
        {children}
      </h1>
      {action}
    </div>
  );
}

/** Centered header with a circular back button — used on detail screens. */
export function DetailHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-40 -mx-4 mb-2 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:bg-transparent md:px-0 md:py-6 md:backdrop-blur-none">
      <button
        type="button"
        onClick={() => (onBack ? onBack() : navigate(-1))}
        aria-label="Go back"
        className="icon-pill h-10 w-10"
      >
        <ArrowLeft className="h-[18px] w-[18px]" />
      </button>
      <h1 className="flex-1 text-center font-display text-[18px] font-semibold md:text-left md:text-[26px]">
        {title}
      </h1>
      <div className="flex h-10 w-10 items-center justify-center md:w-auto">{action}</div>
    </div>
  );
}
