import { useEffect, useMemo } from "react";
import { toast } from "sonner";

/** A tile shown in the grid: either an uploaded image (id) or a local file waiting for upload (key). */
export interface ImageTile {
  key: string;
  url: string;
  alt?: string | null;
  uploading?: boolean;
}

export const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
export const MAX_SIZE_MB = 8;

/** Client-side validation shared by both modes. */
export function validateFiles(list: FileList | File[]): File[] {
  const files = Array.from(list);
  const ok = files.filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_SIZE_MB * 1024 * 1024);
  const rejected = files.length - ok.length;
  if (rejected > 0) toast.error(`${rejected} arquivo(s) ignorado(s): use JPG, PNG ou WebP de até ${MAX_SIZE_MB} MB.`);
  return ok;
}

/** Object URLs for local files, revoked automatically. */
export function useLocalPreviews(files: File[]): ImageTile[] {
  const tiles = useMemo(() => files.map((f, i) => ({ key: `local-${i}-${f.name}-${f.size}`, url: URL.createObjectURL(f), alt: f.name })), [files]);
  useEffect(() => () => tiles.forEach((t) => URL.revokeObjectURL(t.url)), [tiles]);
  return tiles;
}
