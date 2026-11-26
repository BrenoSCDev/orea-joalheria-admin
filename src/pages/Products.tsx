import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gem, LayoutGrid, Plus, Rows3, Search, Sparkles, Star, StarHalf, Upload } from "lucide-react";
import { BulkAction, BulkPayload, BulkTarget, catalogService, ProductStatusFilter } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { Product, ProductToggle } from "@/types/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductThumb } from "@/components/products/ProductThumb";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { StockCell } from "@/components/products/StockCell";
import { ProductActionsMenu } from "@/components/products/ProductActionsMenu";
import { ProductGridCard, ProductGridCardSkeleton } from "@/components/products/ProductGridCard";
import { BulkActionBar, BulkIntent } from "@/components/products/BulkActionBar";
import { BulkCategoriesDialog, BulkCollectionDialog, BulkStockDialog } from "@/components/products/BulkDialogs";
import { cn, formatPrice } from "@/lib/utils";
import { buildTree, flattenTree } from "@/lib/categoryTree";

const STATUS_TABS: { value: ProductStatusFilter | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "published", label: "Publicadas" },
  { value: "draft", label: "Rascunhos" },
  { value: "out_of_stock", label: "Sem estoque" },
  { value: "featured", label: "Destaques" },
  { value: "subfeatured", label: "Subdestaques" },
  { value: "spotlight", label: "Peça destaque" },
];

type View = "table" | "grid";
const VIEW_KEY = "joalheria_products_view";
const PER_PAGE = 20;

const pieces = (n: number) => `${n} ${n === 1 ? "peça" : "peças"}`;

/** Success message per bulk action. */
const BULK_DONE: Record<BulkAction, (n: number) => string> = {
  publish: (n) => `${pieces(n)} ${n === 1 ? "publicada" : "publicadas"} no site.`,
  unpublish: (n) => `${pieces(n)} ${n === 1 ? "voltou" : "voltaram"} para rascunho.`,
  feature: (n) => `${pieces(n)} em destaque.`,
  unfeature: (n) => `Destaque removido de ${pieces(n)}.`,
  subfeature: (n) => `${pieces(n)} ${n === 1 ? "adicionada" : "adicionadas"} aos subdestaques.`,
  unsubfeature: (n) => `Subdestaque removido de ${pieces(n)}.`,
  set_stock: (n) => `Estoque atualizado em ${pieces(n)}.`,
  mark_unique: (n) => `${pieces(n)} ${n === 1 ? "marcada" : "marcadas"} como peça única.`,
  unmark_unique: (n) => `${pieces(n)} com estoque por quantidade.`,
  add_categories: (n) => `Categorias adicionadas a ${pieces(n)}.`,
  remove_categories: (n) => `Categorias removidas de ${pieces(n)}.`,
  set_collection: (n) => `Coleção atualizada em ${pieces(n)}.`,
  delete: (n) => `${pieces(n)} ${n === 1 ? "excluída" : "excluídas"}.`,
};

const Products = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as ProductStatusFilter | null) ?? undefined;
  const categoryId = params.get("categoria") ? Number(params.get("categoria")) : undefined;
  const collectionId = params.get("colecao") ? Number(params.get("colecao")) : undefined;
  const page = Number(params.get("pagina") || 1);
  const [search, setSearch] = useState(params.get("busca") ?? "");
  const q = useDebounce(search.trim(), 300);
  const [view, setView] = useState<View>(() => (localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "table"));
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const changeView = (v: View) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    setParams(next, { replace: true });
  };

  /* ── Data ───────────────────────────────────────────── */
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogService.categories });
  const collections = useQuery({ queryKey: ["collections"], queryFn: catalogService.collections });
  const categoryOptions = useMemo(() => flattenTree(buildTree(categories.data ?? [])), [categories.data]);
  const filters = useMemo(() => ({ q: q || undefined, status, category_id: categoryId, collection_id: collectionId }), [q, status, categoryId, collectionId]);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["products", { ...filters, page }],
    queryFn: () => catalogService.products({ ...filters, page, per_page: PER_PAGE }),
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const filtered = !!(q || status || categoryId || collectionId);

  const invalidate = useCallback(() => {
    ["products", "dashboard", "categories", "collections"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }, [queryClient]);

  /* ── Single-product mutations ───────────────────────── */
  const stock = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) => catalogService.updateStock(id, qty),
    onSuccess: (p) => {
      toast.success(p.is_unique ? `“${p.name}” marcada como ${p.stock_quantity > 0 ? "disponível" : "vendida"}.` : `Estoque de “${p.name}” atualizado para ${p.stock_quantity}.`);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductToggle }) => catalogService.updateProduct(id, data),
    onSuccess: (p, { data }) => {
      if (data.is_active !== undefined) toast.success(data.is_active ? `“${p.name}” publicada no site.` : `“${p.name}” voltou para rascunho.`);
      if (data.is_featured !== undefined) toast.success(data.is_featured ? "Peça marcada como destaque." : "Destaque removido.");
      if (data.is_subfeatured !== undefined) toast.success(data.is_subfeatured ? "Peça adicionada aos subdestaques." : "Subdestaque removido.");
      if (data.is_spotlight !== undefined)
        toast.success(data.is_spotlight ? `“${p.name}” agora é a peça destaque da página inicial.` : "Peça destaque removida da página inicial.");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => catalogService.deleteProduct(id),
    onSuccess: (_, id) => {
      toast.success("Peça excluída.");
      setToDelete(null);
      setSelected((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  /* ── Selection ──────────────────────────────────────── */
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const lastIndex = useRef<number | null>(null);
  const count = allMatching ? total : selected.size;

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setAllMatching(false);
    lastIndex.current = null;
  }, []);

  // A different filter means a different set of products: start over.
  const filtersKey = JSON.stringify(filters);
  useEffect(clearSelection, [filtersKey, clearSelection]);

  const pageIds = rows.map((p) => p.id);
  const pageSelectedCount = allMatching ? pageIds.length : pageIds.filter((id) => selected.has(id)).length;
  const pageState: boolean | "indeterminate" = pageIds.length > 0 && pageSelectedCount === pageIds.length ? true : pageSelectedCount > 0 ? "indeterminate" : false;
  const isSelected = (id: number) => allMatching || selected.has(id);

  const toggleOne = (index: number, checked: boolean, shiftKey = false) => {
    // Leaving "all matching" mode: keep the current page minus the change.
    const base = allMatching ? new Set(pageIds) : new Set(selected);
    if (allMatching) setAllMatching(false);
    const range = shiftKey && lastIndex.current !== null ? pageIds.slice(Math.min(lastIndex.current, index), Math.max(lastIndex.current, index) + 1) : [pageIds[index]];
    range.forEach((id) => (checked ? base.add(id) : base.delete(id)));
    setSelected(base);
    lastIndex.current = index;
  };

  const togglePage = (checked: boolean) => {
    const next = new Set(allMatching ? [] : selected);
    pageIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
    setAllMatching(false);
    setSelected(next);
  };

  /* ── Bulk actions ───────────────────────────────────── */
  const [dialog, setDialog] = useState<null | "categories_add" | "categories_remove" | "collection" | "stock" | "delete">(null);

  const bulk = useMutation({
    mutationFn: (payload: BulkPayload) => {
      const target: BulkTarget = allMatching ? { all: true, filters } : { ids: [...selected] };
      return catalogService.bulkProducts(target, payload);
    },
    onSuccess: (res) => {
      toast.success(BULK_DONE[res.action](res.affected));
      setDialog(null);
      clearSelection();
      // After deleting a whole last page, step back.
      if (res.action === "delete" && page > 1 && res.affected >= rows.length) setParam("pagina", String(page - 1));
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onIntent = (intent: BulkIntent) => {
    if (intent === "categories_add" || intent === "categories_remove" || intent === "collection" || intent === "stock" || intent === "delete") return setDialog(intent);
    bulk.mutate({ action: intent });
  };

  // Esc clears the selection (when no dialog is open).
  useEffect(() => {
    if (!count) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore Esc meant for an open menu/dialog (closing ones keep data-state="closed" during the exit animation).
      const overlayOpen = document.querySelector('[role=dialog][data-state=open],[role=alertdialog][data-state=open],[role=menu][data-state=open]');
      if (e.key === "Escape" && !dialog && !overlayOpen) clearSelection();
    };
    // Capture phase: runs before Radix closes the menu/dialog on the same keydown.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [count, dialog, clearSelection]);

  const rowProps = (p: Product) => ({
    onToggle: (d: ProductToggle) => update.mutate({ id: p.id, data: d }),
    onDelete: () => setToDelete(p),
  });

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={cn(count > 0 && "pb-20")}>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setParam("busca", e.target.value || undefined);
            }}
            placeholder="Buscar por nome ou referência"
            className="pl-9"
          />
        </div>
        <Select value={categoryId ? String(categoryId) : "all"} onValueChange={(v) => setParam("categoria", v === "all" ? undefined : v)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                <span style={{ paddingLeft: c.depth * 14 }}>{c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link to="/produtos/importar">
              <Upload /> Importar CSV
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link to="/produtos/novo">
              <Plus /> Nova peça
            </Link>
          </Button>
        </div>
      </div>

      {/* Status tabs + view toggle */}
      <div className="mb-4 flex items-center gap-3">
        <div className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1 sm:flex-none">
          {STATUS_TABS.map((t) => {
            const active = (status ?? "all") === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setParam("status", t.value === "all" ? undefined : t.value)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border bg-muted/50 p-1" role="group" aria-label="Visualização">
          {([
            ["table", Rows3, "Tabela"],
            ["grid", LayoutGrid, "Grade"],
          ] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              aria-pressed={view === v}
              title={label}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                view === v ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {/* "Select all matching" banner (Gmail pattern) */}
      {pageState === true && total > pageIds.length && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-lg border border-brand/25 bg-brand-soft px-4 py-2 text-center text-[13px]">
          {allMatching ? (
            <>
              <span>
                Todas as <strong className="tabular-nums">{total}</strong> peças {filtered ? "do filtro atual" : "do catálogo"} estão selecionadas.
              </span>
              <button type="button" onClick={clearSelection} className="font-medium text-brand-deep underline-offset-2 hover:underline">
                Limpar seleção
              </button>
            </>
          ) : (
            <>
              <span>As {pageIds.length} peças desta página estão selecionadas.</span>
              <button type="button" onClick={() => setAllMatching(true)} className="font-medium text-brand-deep underline-offset-2 hover:underline">
                Selecionar todas as {total} peças {filtered ? "do filtro" : "do catálogo"}
              </button>
            </>
          )}
        </div>
      )}

      {view === "table" ? (
        <Card className={cn("overflow-hidden transition-opacity", isFetching && !isLoading && "opacity-70")}>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="w-11 py-3 pl-5 pr-0">
                    <Checkbox checked={pageState} onCheckedChange={togglePage} aria-label="Selecionar peças desta página" disabled={!pageIds.length} />
                  </th>
                  <th className="px-3 py-3 font-semibold">Peça</th>
                  <th className="hidden px-4 py-3 font-semibold xl:table-cell">Categoria</th>
                  <th className="hidden px-4 py-3 font-semibold 2xl:table-cell">Coleção</th>
                  <th className="px-4 py-3 text-right font-semibold">Preço</th>
                  <th className="px-4 py-3 font-semibold">Estoque</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }, (_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pl-5">
                        <Skeleton className="h-4 w-4" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-11 w-11 rounded-lg" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </td>
                      {Array.from({ length: 5 }, (_, j) => (
                        <td key={j} className={cn("px-4 py-3", j === 0 && "hidden xl:table-cell", j === 1 && "hidden 2xl:table-cell")}>
                          <Skeleton className="h-4 w-16" />
                        </td>
                      ))}
                      <td />
                    </tr>
                  ))}
                {rows.map((p, index) => {
                  const sel = isSelected(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={(e) => (count > 0 && (e.metaKey || e.ctrlKey || e.shiftKey) ? toggleOne(index, !sel, e.shiftKey) : navigate(`/produtos/${p.id}`))}
                      className={cn("cursor-pointer border-b transition-colors last:border-0", sel ? "bg-brand-soft/60 hover:bg-brand-soft" : "hover:bg-muted/40")}
                    >
                      <td className="py-2.5 pl-5 pr-0">
                        <Checkbox checked={sel} onCheckedChange={(v, e) => toggleOne(index, v, e.shiftKey)} aria-label={`Selecionar ${p.name}`} />
                      </td>
                      <td className="w-full max-w-0 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <ProductThumb url={p.cover_image?.url} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium" title={p.name}>
                              <span className="truncate">{p.name}</span>
                              {p.is_spotlight && <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Peça destaque" />}
                              {p.is_featured && <Star className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" aria-label="Destaque" />}
                              {p.is_subfeatured && <StarHalf className="h-3.5 w-3.5 shrink-0 fill-brand text-brand" aria-label="Subdestaque" />}
                            </p>
                            <p className="truncate text-[12px] text-muted-foreground">
                              {p.sku || "Sem referência"}
                              {p.categories?.[0] && <span className="xl:hidden"> · {p.categories[0].name}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-2.5 text-muted-foreground xl:table-cell">
                        {p.categories?.length ? (
                          <span className="flex max-w-[200px] items-center gap-1" title={p.categories.map((c) => c.name).join(", ")}>
                            <span className="truncate">{p.categories[0].name}</span>
                            {p.categories.length > 1 && <span className="shrink-0 text-[12px] text-muted-foreground/70">+{p.categories.length - 1}</span>}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hidden max-w-[160px] truncate px-4 py-2.5 text-muted-foreground 2xl:table-cell">{p.collection?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{p.price ? formatPrice(p.price) : <span className="text-muted-foreground">Sob consulta</span>}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <StockCell product={p} onSave={(qty) => stock.mutate({ id: p.id, qty })} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <ProductStatusBadge product={p} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <ProductActionsMenu product={p} {...rowProps(p)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y md:hidden">
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <Skeleton className="h-4 flex-1" />
                </li>
              ))}
            {rows.map((p, index) => {
              const sel = isSelected(p.id);
              return (
                <li
                  key={p.id}
                  onClick={() => (count > 0 ? toggleOne(index, !sel) : navigate(`/produtos/${p.id}`))}
                  className={cn("flex items-center gap-3 p-4", sel ? "bg-brand-soft/60" : "active:bg-muted/50")}
                >
                  <Checkbox checked={sel} onCheckedChange={(v) => toggleOne(index, v)} aria-label={`Selecionar ${p.name}`} />
                  <ProductThumb url={p.cover_image?.url} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                      <ProductStatusBadge product={p} />
                      <span className="whitespace-nowrap tabular-nums">{formatPrice(p.price)}</span>
                      <span className="whitespace-nowrap">{p.is_unique ? "Peça única" : `${p.stock_quantity} un.`}</span>
                    </div>
                  </div>
                  <ProductActionsMenu product={p} {...rowProps(p)} />
                </li>
              );
            })}
          </ul>

          {!isLoading && rows.length === 0 && <ProductsEmpty filtered={filtered} onClear={() => (setSearch(""), setParams({}, { replace: true }))} />}
          {data && data.total > 0 && <Pagination data={data} page={page} onPage={(n) => setParam("pagina", String(n))} />}
        </Card>
      ) : (
        <div className={cn("transition-opacity", isFetching && !isLoading && "opacity-70")}>
          <div className="mb-3 flex items-center gap-3 px-1 text-[12.5px] text-muted-foreground">
            <Checkbox checked={pageState} onCheckedChange={togglePage} aria-label="Selecionar peças desta página" disabled={!pageIds.length} />
            <span>{count > 0 ? `${count} ${count === 1 ? "selecionada" : "selecionadas"}` : "Selecionar página"}</span>
            {count > 0 && <span className="hidden sm:inline">· clique nos cards para ajustar a seleção, Shift para intervalo</span>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
            {isLoading && Array.from({ length: 10 }, (_, i) => <ProductGridCardSkeleton key={i} />)}
            {rows.map((p, index) => (
              <ProductGridCard
                key={p.id}
                product={p}
                selected={isSelected(p.id)}
                selectionMode={count > 0}
                onSelect={(v, shift) => toggleOne(index, v, shift)}
                onOpen={() => navigate(`/produtos/${p.id}`)}
                {...rowProps(p)}
              />
            ))}
          </div>
          {!isLoading && rows.length === 0 && (
            <Card>
              <ProductsEmpty filtered={filtered} onClear={() => (setSearch(""), setParams({}, { replace: true }))} />
            </Card>
          )}
          {data && data.total > 0 && (
            <Card className="mt-4 overflow-hidden">
              <Pagination data={data} page={page} onPage={(n) => setParam("pagina", String(n))} bordered={false} />
            </Card>
          )}
        </div>
      )}

      <BulkActionBar count={count} busy={bulk.isPending} onAction={onIntent} onClear={clearSelection} />

      <BulkCategoriesDialog
        mode="add"
        open={dialog === "categories_add"}
        onOpenChange={(o) => !o && setDialog(null)}
        count={count}
        busy={bulk.isPending}
        categories={categories.data ?? []}
        onConfirm={(ids) => bulk.mutate({ action: "add_categories", category_ids: ids })}
      />
      <BulkCategoriesDialog
        mode="remove"
        open={dialog === "categories_remove"}
        onOpenChange={(o) => !o && setDialog(null)}
        count={count}
        busy={bulk.isPending}
        categories={categories.data ?? []}
        onConfirm={(ids) => bulk.mutate({ action: "remove_categories", category_ids: ids })}
      />
      <BulkCollectionDialog
        open={dialog === "collection"}
        onOpenChange={(o) => !o && setDialog(null)}
        count={count}
        busy={bulk.isPending}
        collections={collections.data ?? []}
        onConfirm={(id) => bulk.mutate({ action: "set_collection", collection_id: id })}
      />
      <BulkStockDialog open={dialog === "stock"} onOpenChange={(o) => !o && setDialog(null)} count={count} busy={bulk.isPending} onConfirm={(value) => bulk.mutate({ action: "set_stock", value })} />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Excluir ${pieces(count)}?`}
        description="As peças selecionadas e todas as suas imagens serão removidas do painel e do site. Esta ação não pode ser desfeita."
        confirmLabel={`Excluir ${pieces(count)}`}
        onConfirm={() => bulk.mutate({ action: "delete" })}
        loading={bulk.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Excluir “${toDelete?.name}”?`}
        description="A peça e todas as suas imagens serão removidas do painel e do site. Esta ação não pode ser desfeita."
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        loading={remove.isPending}
      />
    </div>
  );
};

const ProductsEmpty = ({ filtered, onClear }: { filtered: boolean; onClear: () => void }) => (
  <EmptyState
    icon={filtered ? Search : Gem}
    title={filtered ? "Nenhuma peça encontrada" : "Nenhuma peça cadastrada"}
    description={filtered ? "Ajuste a busca ou os filtros." : "Cadastre a primeira joia ou importe o catálogo do e-commerce."}
    action={
      filtered ? (
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/produtos/novo">
              <Plus /> Nova peça
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/produtos/importar">
              <Upload /> Importar CSV
            </Link>
          </Button>
        </div>
      )
    }
  />
);

const Pagination = ({ data, page, onPage, bordered = true }: { data: { current_page: number; per_page: number; total: number; last_page: number }; page: number; onPage: (n: number) => void; bordered?: boolean }) => (
  <div className={cn("flex items-center justify-between px-5 py-3 text-[12.5px] text-muted-foreground", bordered && "border-t")}>
    <span>
      {(data.current_page - 1) * data.per_page + 1}–{Math.min(data.current_page * data.per_page, data.total)} de {data.total}
    </span>
    {data.last_page > 1 && (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={page >= data.last_page} onClick={() => onPage(page + 1)}>
          Próxima
        </Button>
      </div>
    )}
  </div>
);

export default Products;
