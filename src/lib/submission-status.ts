import type { Database } from "@/integrations/supabase/types";

export type SubmissionStatus = Database["public"]["Enums"]["submission_status"];

export function submissionStatusLabel(status: SubmissionStatus | string): string {
  switch (status) {
    case "pending":
      return "Processing";
    case "approved":
      return "Eligible";
    case "rejected":
      return "Ineligible";
    default:
      return String(status);
  }
}

export function submissionStatusBadgeClass(status: SubmissionStatus | string): string {
  switch (status) {
    case "pending":
      return "bg-warning/15 text-warning border border-warning/25";
    case "approved":
      return "bg-primary/15 text-primary border border-primary/30";
    case "rejected":
      return "bg-destructive/15 text-destructive border border-destructive/25";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}
