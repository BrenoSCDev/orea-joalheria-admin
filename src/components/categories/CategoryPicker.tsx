import { useMemo, useState } from "react";
import { Check, Search, Star, X } from "lucide-react";
import { Category } from "@/types/api";
import { buildTree, flattenTree } from "@/lib/categoryTree";
import { cn } from "@/lib/utils";

interface Props {
  categories: Category[];
  /** Ordered ids: the first one is the primary category. */
  value: number[];
  onChange: (ids: number[]) => void;
  loading?: boolean;
  /** false = plain multi-select (no primary category), e.g. campaign rules. */
  ordered?: boolean;
  /** Ids that cannot be picked here (e.g. already used in the opposite list). */
  disabledIds?: number[];
  /** Chip style for the selected categories. */
  tone?: "default" | "exclude";
}

/**
 * Multi-select over the category tree. Selected categories show as chips; the
 * first chip is the primary category (used for the breadcrumb and card label).
 */
export const CategoryPicker = ({ categories, value, onChange, loading, ordered = true, disabledIds = [], tone = "default" }: Props) => {
  const [query, setQuery] = useState("");
  const flat = useMemo(() => flattenTree(buildTree(categories)), [categories]);
  const byId = useMemo(() => new Map(flat.map((c) => [c.id, c])), [flat]);

  const q = query.trim().toLocaleLowerCase("pt-BR");
  const visible = q ? flat.filter((c) => c.path.join(" ").toLocaleLowerCase("pt-BR").includes(q)) : flat;

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const makePrimary = (id: number) => onChange([id, ...value.filter((v) => v !== id)]);

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((id, i) => {
            const c = byId.get(id);
            if (!c) return null;
            return (
              <li
                key={id}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-md border py-0.5 pl-2 pr-1 text-[12px]",
                  tone === "exclude" ? "border-destructive/25 bg-destructive-light text-destructive" : ordered && i === 0 ? "border-brand/40 bg-brand-soft text-brand-deep" : "bg-muted/60",
                )}
                title={c.path.join(" › ")}
              >
                {!ordered ? null : i === 0 ? (
                  <Star className="h-3 w-3 shrink-0 fill-current" aria-label="Principal" />
                ) : (
                  <button type="button" onClick={() => makePrimary(id)} className="shrink-0 text-muted-foreground hover:text-brand-deep" title="Tornar principal" aria-label={`Tornar ${c.name} a categoria principal`}>
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <span className="truncate">{c.name}</span>
                <button type="button" onClick={() => toggle(id)} className="shrink-0 rounded p-0.5 hover:bg-background/70" aria-label={`Remover ${c.name}`}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="overflow-hidden rounded-lg border border-input">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categoria"
            aria-label="Buscar categoria"
            className="h-8 w-full bg-transparent pl-8 pr-3 text-[13px] focus:outline-none"
          />
        </div>
        <ul className="max-h-56 overflow-y-auto py-1" role="listbox" aria-multiselectable>
          {loading && <li className="px-3 py-2 text-[12px] text-muted-foreground">Carregando…</li>}
          {!loading && visible.length === 0 && (
            <li className="px-3 py-2 text-[12px] text-muted-foreground">{flat.length ? "Nenhuma categoria encontrada." : "Nenhuma categoria cadastrada."}</li>
          )}
          {visible.map((c) => {
            const checked = value.includes(c.id);
            const disabled = !checked && disabledIds.includes(c.id);
            return (
              <li key={c.id} role="option" aria-selected={checked} aria-disabled={disabled}>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  disabled={disabled}
                  className="flex w-full items-center gap-2 py-1.5 pr-3 text-left text-[13px] transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ paddingLeft: q ? 12 : 12 + c.depth * 16 }}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked ? (tone === "exclude" ? "border-destructive bg-destructive text-white" : "border-brand-deep bg-brand-deep text-white") : "border-input bg-background",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className={cn("truncate", c.depth === 0 && !q && "font-medium")}>{q ? c.path.join(" › ") : c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {ordered && value.length > 1 && <p className="text-[12px] text-muted-foreground">A categoria com estrela é a principal (usada no site). Filtrar pela categoria-mãe inclui as subcategorias.</p>}
    </div>
  );
};
