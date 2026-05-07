import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction, className, children }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in", className)}>
      <div className="relative mb-5">
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
        <span className="absolute inset-0 rounded-full bg-primary/10" />
        <div className="relative h-16 w-16 rounded-full border border-border bg-card flex items-center justify-center animate-float">
          <Icon className="h-7 w-7 text-foreground/80" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h3>
      {description && <p className="text-[13px] text-muted-foreground mt-1.5 max-w-sm">{description}</p>}
      {(actionLabel && (actionTo || onAction)) && (
        <div className="mt-5">
          {actionTo ? (
            <Link to={actionTo}><Button size="sm" className="transition-transform hover:scale-105">{actionLabel}</Button></Link>
          ) : (
            <Button size="sm" onClick={onAction} className="transition-transform hover:scale-105">{actionLabel}</Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
