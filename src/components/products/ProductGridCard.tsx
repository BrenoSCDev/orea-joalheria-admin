import { Gem, Sparkles, Star, StarHalf } from "lucide-react";
import { Product, ProductToggle } from "@/types/api";
import { PriceTag } from "./PriceTag";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { ProductActionsMenu } from "./ProductActionsMenu";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  selected: boolean;
  /** When something is selected, clicking a card toggles it instead of opening it. */
  selectionMode: boolean;
  onSelect: (checked: boolean, shiftKey: boolean) => void;
  onOpen: () => void;
  onToggle: (data: ProductToggle) => void;
  onDelete: () => void;
}

/** Visual card for the grid view: the photo leads, like in the public catalog. */
export const ProductGridCard = ({ product: p, selected, selectionMode, onSelect, onOpen, onToggle, onDelete }: Props) => (
  <div
    role="button"
    tabIndex={0}
    onClick={(e) => (selectionMode ? onSelect(!selected, e.shiftKey) : onOpen())}
    onKeyDown={(e) => {
      if (e.key === "Enter") onOpen();
      if (e.key === " ") {
        e.preventDefault();
        onSelect(!selected, e.shiftKey);
      }
    }}
    className={cn(
      "group surface relative cursor-pointer overflow-hidden rounded-xl text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
      selected ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : "surface-hover",
    )}
  >
    <div className="relative aspect-[4/5] bg-muted">
      {p.cover_image ? (
        <img src={p.cover_image.url} alt="" loading="lazy" className={cn("h-full w-full object-cover transition-transform duration-500", !selected && "group-hover:scale-[1.03]")} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Gem className="h-7 w-7 text-muted-foreground/40" />
        </div>
      )}
      {selected && <div className="absolute inset-0 bg-brand/10" />}

      <div
        className={cn(
          "absolute left-2.5 top-2.5 rounded-md bg-background/95 p-1 shadow-sm transition-opacity",
          selected || selectionMode ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
        )}
      >
        <Checkbox checked={selected} onCheckedChange={(v, e) => onSelect(v, e.shiftKey)} aria-label={`Selecionar ${p.name}`} />
      </div>
      <div className="absolute right-2 top-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 [&:has([data-state=open])]:opacity-100">
        <ProductActionsMenu product={p} onToggle={onToggle} onDelete={onDelete} className="bg-background/95 shadow-sm hover:bg-background" />
      </div>
      {(p.is_spotlight || p.is_featured || p.is_subfeatured) && (
        <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
          {p.is_spotlight && (
            <span className="inline-flex items-center gap-1 rounded-md bg-background/95 px-1.5 py-0.5 text-[11px] font-medium text-brand-deep shadow-sm">
              <Sparkles className="h-3 w-3" /> Peça destaque
            </span>
          )}
          {p.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-background/95 px-1.5 py-0.5 text-[11px] font-medium text-brand-deep shadow-sm">
              <Star className="h-3 w-3 fill-current" /> Destaque
            </span>
          )}
          {p.is_subfeatured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-background/95 px-1.5 py-0.5 text-[11px] font-medium text-brand-deep shadow-sm">
              <StarHalf className="h-3 w-3 fill-current" /> Subdestaque
            </span>
          )}
        </div>
      )}
    </div>

    <div className="space-y-1.5 p-3.5">
      <p className="line-clamp-2 min-h-[2.5em] text-[13px] font-medium leading-snug">{p.name}</p>
      <p className="truncate text-[12px] text-muted-foreground">
        {p.sku || "Sem referência"}
        {p.categories?.[0] && ` · ${p.categories[0].name}`}
      </p>
      <div className="flex items-center justify-between gap-2 pt-1">
        <PriceTag product={p} className="truncate text-[13px]" />
        <ProductStatusBadge product={p} />
      </div>
    </div>
  </div>
);

export const ProductGridCardSkeleton = () => (
  <div className="surface overflow-hidden rounded-xl">
    <div className="aspect-[4/5] animate-pulse bg-muted" />
    <div className="space-y-2 p-3.5">
      <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
    </div>
  </div>
);
