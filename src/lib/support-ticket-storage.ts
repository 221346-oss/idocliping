import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function validateSupportImage(file: File): string | null {
  if (!ALLOWED.has(file.type)) return "Use PNG, JPEG, WebP, or GIF.";
  if (file.size > MAX_BYTES) return "Each image must be under 5 MB.";
  return null;
}

/** Upload to support-attachments/{userId}/{ticketId}/{uuid}.{ext}; returns storage path (not a URL). */
export async function uploadTicketAttachment(
  userId: string,
  ticketId: string,
  file: File,
): Promise<{ path: string; error: Error | null }> {
  const err = validateSupportImage(file);
  if (err) return { path: "", error: new Error(err) };
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) ? ext : "png";
  const path = `${userId}/${ticketId}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await supabase.storage.from(SUPPORT_ATTACHMENTS_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) return { path: "", error: new Error(error.message) };
  return { path, error: null };
}

/** Signed URL for private bucket; path is the value stored in ticket_attachments.file_url. */
export async function signedSupportAttachmentUrl(path: string, expiresSec = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(SUPPORT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
