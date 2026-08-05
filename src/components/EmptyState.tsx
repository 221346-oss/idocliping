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
      <div className="relative mb-6">
        <span className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative h-20 w-20 rounded-[28px] border border-border/70 bg-surface-raised flex items-center justify-center">
          <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-[17px] font-semibold text-foreground tracking-tight">{title}</h3>
      {description && <p className="text-[13px] leading-relaxed text-muted-foreground mt-2 max-w-sm">{description}</p>}
      {(actionLabel && (actionTo || onAction)) && (
        <div className="mt-6">
          {actionTo ? (
            <Link to={actionTo}><Button className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary hover:opacity-90 px-6 font-semibold press-scale">{actionLabel}</Button></Link>
          ) : (
            <Button onClick={onAction} className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary hover:opacity-90 px-6 font-semibold press-scale">{actionLabel}</Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

