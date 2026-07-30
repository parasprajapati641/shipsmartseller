// Production Storage Helper for Permanent Image URLs — ShipSmart Seller
// Uploads generated blobs/images to Supabase Storage bucket 'optimization-images'.
// Converts any Blob URL into a permanent CDN public URL or base64 data URL.
// NO temporary blob URLs or object URLs are ever saved to history!

import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "optimization-images";

/**
 * Converts a Blob or File or Data URL or Blob URL into a permanent public URL.
 * Uploads to Supabase Storage. If Storage upload fails, converts to a permanent Data URL.
 */
export async function uploadImageToSupabaseStorage(
  input: Blob | File | string,
  userEmail: string = "anonymous",
  prefix: string = "image",
): Promise<string> {
  if (typeof window === "undefined") {
    return typeof input === "string" ? input : "";
  }

  // 1. If input is already a permanent http/https URL (and NOT a blob: URL), return as is
  if (typeof input === "string" && input.startsWith("http") && !input.startsWith("blob:")) {
    return input;
  }

  // 2. Convert input string/blob URL to actual Blob object
  let blob: Blob;
  try {
    if (typeof input === "string") {
      if (input.startsWith("blob:") || input.startsWith("data:")) {
        const res = await fetch(input);
        blob = await res.blob();
      } else {
        return input;
      }
    } else {
      blob = input;
    }
  } catch (err) {
    console.warn("[STORAGE] Failed to fetch blob from input string:", err);
    if (typeof input === "string" && input.startsWith("data:")) return input;
    return "";
  }

  // 3. Attempt Supabase Storage Upload
  try {
    const cleanUser = userEmail.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
    const filename = `${cleanUser}/${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (!uploadErr && uploadData) {
      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
      if (publicUrlData && publicUrlData.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else {
      console.warn("[STORAGE] Bucket upload warning:", uploadErr?.message ?? "Upload error");
    }
  } catch (err) {
    console.warn("[STORAGE] Supabase storage exception:", err);
  }

  // 4. Fallback: Convert Blob to permanent Base64 Data URL (Never return blob: URL!)
  try {
    return await blobToBase64(blob);
  } catch {
    return "";
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
