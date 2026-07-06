import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/**
 * Uploads a file to a private bucket and returns a long-lived signed URL
 * that can be stored in the database and used directly in <img src>.
 */
export async function uploadImage(
  bucket: "products" | "banners" | "categories" | "brands" | "avatars",
  file: File,
  prefix = "",
): Promise<{ url: string; path: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${prefix ? prefix + "/" : ""}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: "31536000",
    contentType: file.type,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr ?? new Error("Falha ao gerar URL");
  return { url: data.signedUrl, path };
}

export async function deleteStorageObject(
  bucket: string,
  path: string,
): Promise<void> {
  await supabase.storage.from(bucket).remove([path]);
}
