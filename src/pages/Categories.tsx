import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, CornerDownRight, FolderPlus, Gem, GripVertical, MoreHorizontal, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { catalogService, TaxonomyPayload } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { Category } from "@/types/api";
import { buildTree, descendantIds, flattenTree, TreeNode } from "@/lib/categoryTree";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaxonomyDialog, TaxonomyItem } from "@/components/taxonomy/TaxonomyDialog";
import { cn } from "@/lib/utils";

type Node = TreeNode<Category>;

/** Where a dragged category will land, relative to the row under the pointer. */
type DropMode = "before" | "inside" | "after";
type DropTarget = { id: number; mode: DropMode } | { id: null; mode: "root" };

/**
 * Category tree: subcategories at any depth, collapsible, searchable.
 * Drag & drop a row: top/bottom edge = before/after it (same level), middle = inside it
 * (becomes a subcategory); the strip at the end turns it into a main category.
 */
const Categories = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["categories"], queryFn: catalogService.categories });
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<{ open: boolean; item: Node | null; parentId?: number | null }>({ open: false, item: null });
  const [toDelete, setToDelete] = useState<Node | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);

  const roots = useMemo(() => buildTree(data ?? []), [data]);
  const flat = useMemo(() => flattenTree(roots), [roots]);

  const q = query.trim().toLocaleLowerCase("pt-BR");
  const rows = useMemo(() => {
    if (q) return flat.filter((n) => n.path.join(" ").toLocaleLowerCase("pt-BR").includes(q));
    // Hide descendants of collapsed nodes.
    const hidden = new Set<number>();
    flat.forEach((n) => {
      if (n.parent_id && (hidden.has(n.parent_id) || collapsed.has(n.parent_id))) hidden.add(n.id);
    });
    return flat.filter((n) => !hidden.has(n.id));
  }, [flat, q, collapsed]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const parentOptions = useMemo(() => {
    const excluded = new Set(dialog.item ? descendantIds(dialog.item) : []);
    return flat.filter((n) => !excluded.has(n.id)).map((n) => ({ id: n.id, name: n.name, depth: n.depth }));
  }, [flat, dialog.item]);

  const save = async (payload: TaxonomyPayload) => {
    if (dialog.item) await catalogService.updateCategory(dialog.item.id, payload);
    else await catalogService.createCategory(payload);
    toast.success(dialog.item ? "Alterações salvas." : payload.parent_id ? "Subcategoria criada." : "Categoria criada.");
    // Make sure the new subcategory is visible (expand its parent) — without mutating state.
    const parentId = payload.parent_id;
    if (parentId) {
      setCollapsed((c) => {
        const next = new Set(c);
        next.delete(parentId);
        return next;
      });
    }
    invalidate();
  };

  const remove = useMutation({
    mutationFn: (id: number) => catalogService.deleteCategory(id),
    onSuccess: () => {
      toast.success("Categoria excluída.");
      setToDelete(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Drag & drop ─────────────────────────────────────────
  const byId = useMemo(() => new Map(flat.map((n) => [n.id, n])), [flat]);
  const dragged = dragId !== null ? byId.get(dragId) : undefined;
  /** The dragged category and its subtree cannot receive it. */
  const blocked = useMemo(() => new Set(dragged ? descendantIds(dragged) : []), [dragged]);
  const canDrag = !q && flat.length > 1;

  const endDrag = () => {
    setDragId(null);
    setDrop(null);
  };

  /** Resulting parent + order of that level, or null when nothing changes. */
  const planMove = (node: Node, target: DropTarget): { parentId: number | null; ids: number[] } | null => {
    let parentId: number | null;
    let siblings: Node[];
    let index: number;
    if (target.mode === "root") {
      parentId = null;
      siblings = roots.filter((n) => n.id !== node.id);
      index = siblings.length;
    } else {
      const t = byId.get(target.id);
      if (!t) return null;
      // Bottom edge of an expanded parent = first child (that is where the line is drawn).
      const intoTop = target.mode === "after" && t.children.length > 0 && !collapsed.has(t.id);
      if (target.mode === "inside" || intoTop) {
        parentId = t.id;
        siblings = t.children.filter((n) => n.id !== node.id);
        index = intoTop ? 0 : siblings.length;
      } else {
        parentId = t.parent_id;
        siblings = (parentId ? byId.get(parentId)?.children ?? [] : roots).filter((n) => n.id !== node.id);
        index = siblings.findIndex((n) => n.id === t.id) + (target.mode === "after" ? 1 : 0);
      }
    }
    const ids = siblings.map((n) => n.id);
    ids.splice(index, 0, node.id);

    const current = (node.parent_id ? byId.get(node.parent_id)?.children ?? [] : roots).map((n) => n.id);
    if (parentId === node.parent_id && ids.join() === current.join()) return null;
    return { parentId, ids };
  };

  const move = useMutation({
    mutationFn: ({ node, parentId, ids }: { node: Node; parentId: number | null; ids: number[] }) =>
      catalogService.moveCategory(node.id, { parent_id: parentId, ids }),
    onMutate: async ({ parentId, ids }) => {
      // Optimistic: the row jumps to its new place right away.
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previous = queryClient.getQueryData<Category[]>(["categories"]);
      const order = new Map(ids.map((id, i) => [id, i]));
      queryClient.setQueryData<Category[]>(["categories"], (list) =>
        list?.map((c) => (order.has(c.id) ? { ...c, parent_id: parentId, sort_order: order.get(c.id)! } : c)),
      );
      if (parentId) {
        setCollapsed((c) => {
          const next = new Set(c);
          next.delete(parentId);
          return next;
        });
      }
      return { previous };
    },
    onSuccess: (_data, { node, parentId }) => {
      const parent = parentId ? byId.get(parentId) : null;
      toast.success(
        parentId === node.parent_id
          ? "Ordem atualizada."
          : parent
            ? `“${node.name}” agora é subcategoria de “${parent.name}”.`
            : `“${node.name}” agora é uma categoria principal.`,
      );
    },
    onError: (e, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["categories"], context.previous);
      toast.error(getErrorMessage(e));
    },
    onSettled: invalidate,
  });

  const dropOn = (target: DropTarget) => {
    const node = dragged;
    endDrag();
    if (!node) return;
    const plan = planMove(node, target);
    if (plan) move.mutate({ node, ...plan });
  };

  const modeAt = (e: React.DragEvent<HTMLElement>): DropMode => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    return y < 0.28 ? "before" : y > 0.72 ? "after" : "inside";
  };

  const toggle = (id: number) =>
    setCollapsed((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed = roots.length > 0 && roots.filter((r) => r.children.length).every((r) => collapsed.has(r.id));

  return (
    <>
      <PageHeader
        description="Organize as peças em categorias e subcategorias. Uma peça pode estar em várias categorias."
        actions={
          <Button onClick={() => setDialog({ open: true, item: null, parentId: null })}>
            <Plus /> Nova categoria
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar categoria" className="pl-9" />
        </div>
        {flat.length > 0 && !q && (
          <Button
            variant="ghost"
            size="sm"
            className="sm:ml-auto"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(flat.filter((n) => n.children.length).map((n) => n.id)))}
          >
            {allCollapsed ? "Expandir tudo" : "Recolher tudo"}
          </Button>
        )}
      </div>

      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      <Card className="overflow-hidden">
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-4" style={{ paddingLeft: 16 + (i % 2) * 28 }}>
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && flat.length === 0 && (
          <EmptyState
            icon={Tags}
            title="Nenhuma categoria cadastrada"
            description="Crie categorias manualmente ou importe as peças do e-commerce: as categorias do CSV são criadas automaticamente."
            action={
              <div className="flex gap-2">
                <Button onClick={() => setDialog({ open: true, item: null, parentId: null })}>
                  <Plus /> Criar categoria
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/produtos/importar">Importar CSV</Link>
                </Button>
              </div>
            }
          />
        )}
        {!isLoading && flat.length > 0 && rows.length === 0 && <EmptyState icon={Search} title="Nenhuma categoria encontrada" />}

        <ul className="divide-y" onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as globalThis.Node | null) && setDrop(null)}>
          {rows.map((node) => {
            const hasChildren = node.children.length > 0;
            const isCollapsed = collapsed.has(node.id);
            const target = drop && drop.id === node.id ? drop.mode : null;
            const indent = q ? 12 : 12 + node.depth * 28;
            return (
              <li
                key={node.id}
                draggable={canDrag}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(node.id));
                  setDragId(node.id);
                }}
                onDragEnd={endDrag}
                onDragOver={(e) => {
                  if (dragId === null || blocked.has(node.id)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const mode = modeAt(e);
                  if (drop?.id !== node.id || drop.mode !== mode) setDrop({ id: node.id, mode });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId !== null && !blocked.has(node.id)) dropOn({ id: node.id, mode: modeAt(e) });
                }}
                className={cn(
                  "group relative flex items-center gap-2 py-2.5 pr-3 transition-colors hover:bg-muted/40 md:pr-4",
                  dragId !== null && blocked.has(node.id) && "opacity-40",
                  target === "inside" && "bg-brand-soft ring-2 ring-inset ring-brand hover:bg-brand-soft",
                )}
                style={{ paddingLeft: indent }}
              >
                {(target === "before" || target === "after") && (
                  <span
                    aria-hidden
                    className={cn("pointer-events-none absolute right-3 z-10 h-0.5 rounded-full bg-brand", target === "before" ? "-top-px" : "-bottom-px")}
                    style={{ left: target === "after" && hasChildren && !isCollapsed ? indent + 28 : indent }}
                  >
                    <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full border-2 border-brand bg-background" />
                  </span>
                )}
                {canDrag && (
                  <GripVertical
                    aria-hidden
                    className="-ml-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/30 transition-colors group-hover:text-muted-foreground active:cursor-grabbing"
                  />
                )}
                {hasChildren && !q ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={isCollapsed ? `Expandir ${node.name}` : `Recolher ${node.name}`}
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronRight className={cn("h-4 w-4 transition-transform", !isCollapsed && "rotate-90")} />
                  </button>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground/40">
                    {node.depth > 0 && !q && <CornerDownRight className="h-3.5 w-3.5" />}
                  </span>
                )}

                <button type="button" onClick={() => setDialog({ open: true, item: node })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {node.image_url ? <img src={node.image_url} alt="" draggable={false} className="h-full w-full object-cover" /> : <Tags className="h-3.5 w-3.5 text-muted-foreground/60" />}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-[13.5px]">
                      <span className={cn("truncate", node.depth === 0 && "font-medium")}>{node.name}</span>
                      {!node.is_active && <Badge variant="muted">Inativa</Badge>}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {q && node.path.length > 1 ? node.path.slice(0, -1).join(" › ") : hasChildren ? `${node.children.length} ${node.children.length === 1 ? "subcategoria" : "subcategorias"}` : `/${node.slug}`}
                    </p>
                  </div>
                </button>

                <Link to={`/produtos?categoria=${node.id}`} draggable={false} className="hidden shrink-0 items-center gap-1.5 text-[12.5px] tabular-nums text-muted-foreground hover:text-foreground sm:flex">
                  <Gem className="h-3.5 w-3.5" /> {node.products_count ?? 0}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Ações de ${node.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={() => setDialog({ open: true, item: node })}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog({ open: true, item: null, parentId: node.id })}>
                      <FolderPlus className="mr-2 h-4 w-4" /> Adicionar subcategoria
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/produtos?categoria=${node.id}`}>
                        <Gem className="mr-2 h-4 w-4" /> Ver peças
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setToDelete(node)} className="text-destructive focus:bg-destructive-light focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>

        {dragged && dragged.parent_id !== null && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (drop?.mode !== "root") setDrop({ id: null, mode: "root" });
            }}
            onDragLeave={() => setDrop(null)}
            onDrop={(e) => {
              e.preventDefault();
              dropOn({ id: null, mode: "root" });
            }}
            className={cn(
              "m-3 flex items-center justify-center rounded-lg border-2 border-dashed p-4 text-[13px] text-muted-foreground transition-colors",
              drop?.mode === "root" ? "border-brand bg-brand-soft text-foreground" : "border-input",
            )}
          >
            Solte aqui para tornar “{dragged.name}” uma categoria principal
          </div>
        )}
      </Card>

      {canDrag && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Arraste uma categoria para reorganizar: solte no meio de outra para torná-la subcategoria, ou entre duas para mudar a ordem.
        </p>
      )}

      <TaxonomyDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        kindLabel="categoria"
        imageLabel="Imagem"
        item={dialog.item ? ({ ...dialog.item, image: dialog.item.image_url } satisfies TaxonomyItem) : null}
        parentOptions={parentOptions}
        defaultParentId={dialog.parentId ?? null}
        onSubmit={save}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Excluir “${toDelete?.name}”?`}
        description={[
          toDelete?.products_count ? `${toDelete.products_count} ${toDelete.products_count === 1 ? "peça deixa" : "peças deixam"} de estar nesta categoria (as peças não são excluídas).` : "",
          toDelete?.children.length ? `As ${toDelete.children.length} subcategorias passam a ser categorias principais.` : "",
        ]
          .filter(Boolean)
          .join(" ") || "A categoria será removida do painel e do site."}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        loading={remove.isPending}
      />
    </>
  );
};

export default Categories;
