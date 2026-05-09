/** Display mask like "A***f" from full name */

export function maskUsernameMiddle(fullName: string | null | undefined): string {
  const raw = (fullName ?? "").trim();
  if (!raw) return "U***r";
  const first = raw[0]?.toUpperCase() ?? "U";
  const last = raw.length > 1 ? raw[raw.length - 1]?.toLowerCase() ?? "r" : "r";
  if (raw.length <= 2) return `${first}*`;
  return `${first}***${last}`;
}
