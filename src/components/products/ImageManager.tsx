import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED, MAX_SIZE_MB, validateFiles, type ImageTile } from "./imageFiles";

export type { ImageTile };


interface Props {
  tiles: ImageTile[];
  onAdd: (files: File[]) => void;
  onRemove: (tile: ImageTile) => void;
  /** New order (first = cover). */
  onReorder: (tiles: ImageTile[]) => void;
  busy?: boolean;
}

/**
 * Product photo manager: drop zone + sortable grid. The first image is the cover
 * shown in the catalog; drag to reorder, or use "Usar como capa".
 */
export const ImageManager = ({ tiles, onAdd, onRemove, onReorder, busy }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const files = validateFiles(list);
    if (files.length) onAdd(files);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...tiles];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  };

  return (
    <div className="space-y-4">
      {tiles.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <li
              key={tile.key}
              draggable={!tile.uploading && !busy}
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                "group relative aspect-[4/5] overflow-hidden rounded-lg border bg-muted transition-all",
                i === 0 && "ring-2 ring-brand ring-offset-2 ring-offset-card",
                dragIndex === i && "opacity-40",
                overIndex === i && dragIndex !== i && "scale-[0.97] border-brand",
                !tile.uploading && "cursor-grab active:cursor-grabbing",
              )}
            >
              <img src={tile.url} alt={tile.alt || ""} className="h-full w-full object-cover" draggable={false} />

              {tile.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-deep" />
                </div>
              )}

              {i === 0 && !tile.uploading && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/95 px-1.5 py-0.5 text-[11px] font-semibold text-brand-deep shadow-sm">
                  <Star className="h-3 w-3 fill-current" /> Capa
                </span>
              )}

              {!tile.uploading && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <GripVertical className="hidden h-4 w-4 text-white/80 md:block" aria-hidden />
                  <div className="ml-auto flex gap-1">
                    {i !== 0 && (
                      <button
                        type="button"
                        onClick={() => move(i, 0)}
                        disabled={busy}
                        className="rounded-md bg-background/95 px-2 py-1 text-[11px] font-medium shadow-sm hover:bg-background"
                      >
                        Usar como capa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(tile)}
                      disabled={busy}
                      aria-label="Remover imagem"
                      className="rounded-md bg-background/95 p-1 text-destructive shadow-sm hover:bg-background"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition-colors",
          tiles.length ? "py-6" : "py-12",
          dragOver ? "border-brand bg-brand-soft" : "border-input hover:border-brand/60 hover:bg-muted/40",
        )}
      >
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
          <ImagePlus className="h-5 w-5" />
        </span>
        <span className="text-[13px] font-medium">
          {dragOver ? "Solte as imagens aqui" : "Arraste fotos ou clique para selecionar"}
        </span>
        <span className="mt-1 text-[12px] text-muted-foreground">JPG, PNG ou WebP até {MAX_SIZE_MB} MB · ideal: vertical 4:5, fundo neutro, mín. 1200 px</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {tiles.length > 1 && <p className="text-[12px] text-muted-foreground">Arraste para reordenar. A primeira imagem é a capa exibida no catálogo.</p>}
    </div>
  );
};
