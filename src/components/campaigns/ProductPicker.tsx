import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gem, Loader2, Plus, Search, X } from "lucide-react";
import { catalogService } from "@/services/catalogService";
import { CampaignProductRef } from "@/types/api";
import { useDebounce } from "@/hooks/useDebounce";
import { cn, formatPrice } from "@/lib/utils";

interface Props {
  value: CampaignProductRef[];
  onChange: (items: CampaignProductRef[]) => void;
  /** Ids already used in the opposite list. */
  disabledIds?: number[];
  tone?: "default" | "exclude";
  placeholder?: string;
}

/** Search pieces by name/SKU and keep a short explicit list (campaign include/exclude). */
export const ProductPicker = ({ value, onChange, disabledIds = [], tone = "default", placeholder = "Buscar peça por nome ou referência" }: Props) => {
  const [query, setQuery] = useState("");
  const term = useDebounce(query.trim(), 250);
  const selected = new Set(value.map((p) => p.id));

  const results = useQuery({
    queryKey: ["products", "picker", term],
    queryFn: () => catalogService.products({ q: term, per_page: 8 }),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });

  const add = (p: CampaignProductRef) => {
    onChange([...value, p]);
    setQuery("");
  };

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {value.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
              <Thumb url={p.cover_url} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", tone === "exclude" && "text-destructive")}>{p.name}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{[p.sku, formatPrice(p.price)].filter(Boolean).join(" · ")}</span>
              </span>
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== p.id))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remover ${p.name}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-lg border border-input">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-8 w-full bg-transparent pl-8 pr-8 text-[13px] focus:outline-none" />
          {results.isFetching && <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {term.length >= 2 && results.data && (
          <ul className="max-h-60 overflow-y-auto border-t py-1">
            {results.data.data.length === 0 && <li className="px-3 py-2 text-[12px] text-muted-foreground">Nenhuma peça encontrada.</li>}
            {results.data.data.map((p) => {
              const ref: CampaignProductRef = { id: p.id, name: p.name, sku: p.sku, price: p.price, cover_url: p.cover_image?.url ?? null };
              const disabled = selected.has(p.id) || disabledIds.includes(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => add(ref)}
                    className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Thumb url={ref.cover_url} />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{formatPrice(p.price)}</span>
                    {!disabled && <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const Thumb = ({ url }: { url: string | null }) => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
    {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Gem className="h-3.5 w-3.5 text-muted-foreground/60" />}
  </span>
);
