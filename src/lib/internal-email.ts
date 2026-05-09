export const INTERNAL_CREATOR_EMAIL_DOMAIN = "testcreator.iclip.internal";

export function isInternalNoSendEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${INTERNAL_CREATOR_EMAIL_DOMAIN}`);
}
