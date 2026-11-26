import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { catalogService, TaxonomyPayload } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { Collection } from "@/types/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaxonomyDialog, TaxonomyItem } from "@/components/taxonomy/TaxonomyDialog";

type Kind = "collections";

const CONFIG = {
  collections: {
    label: "coleção",
    plural: "coleções",
    description: "Agrupamentos editoriais apresentados no site, com capa e descrição próprias.",
    imageLabel: "Capa",
    icon: Layers,
    list: catalogService.collections,
    create: catalogService.createCollection,
    update: catalogService.updateCollection,
    remove: catalogService.deleteCollection,
    toItem: (c: Collection): TaxonomyItem => ({ ...c, image: c.has_own_cover ? c.cover_url : null }),
    filterParam: null,
  },
} as const;

const TaxonomyPage = ({ kind }: { kind: Kind }) => {
  const c = CONFIG[kind];
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<(TaxonomyItem & { products_count?: number }) | null>(null);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: [kind], queryFn: c.list });
  const items = (data ?? []).map((raw) => ({ ...c.toItem(raw), products_count: raw.products_count, preview: raw.cover_url }));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [kind] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = async (payload: TaxonomyPayload) => {
    if (editing) await c.update(editing.id, payload);
    else await c.create(payload);
    toast.success(editing ? "Alterações salvas." : `${c.label[0].toUpperCase()}${c.label.slice(1)} criada.`);
    invalidate();
  };

  const remove = useMutation({
    mutationFn: (id: number) => c.remove(id),
    onSuccess: () => {
      toast.success("Excluída.");
      setToDelete(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        description={c.description}
        actions={
          <Button onClick={openCreate}>
            <Plus /> Nova {c.label}
          </Button>
        }
      />

      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      <Card className="overflow-hidden">
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-12 w-16 rounded-lg" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={c.icon}
            title={`Nenhuma ${c.label} cadastrada`}
            description={c.description}
            action={
              <Button onClick={openCreate}>
                <Plus /> Criar {c.label}
              </Button>
            }
          />
        )}

        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5">
              <button
                type="button"
                onClick={() => {
                  setEditing(item);
                  setDialogOpen(true);
                }}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {item.preview ? <img src={item.preview} alt="" className="h-full w-full object-cover" /> : <c.icon className="h-4 w-4 text-muted-foreground/60" />}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium">
                    {item.name}
                    {item.is_featured && <Badge variant="success">Destaque</Badge>}
                    {!item.is_active && <Badge variant="muted">Inativa</Badge>}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">{item.description || `/${item.slug}`}</p>
                </div>
              </button>
              <Link
                to={`/produtos?colecao=${item.id}`}
                className="hidden shrink-0 text-[12.5px] tabular-nums text-muted-foreground hover:text-foreground sm:block"
              >
                {item.products_count ?? 0} {item.products_count === 1 ? "peça" : "peças"}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Ações de ${item.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditing(item);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setToDelete(item)} className="text-destructive focus:bg-destructive-light focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      </Card>

      <TaxonomyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kindLabel={c.label}
        imageLabel={c.imageLabel}
        withFeatured
        item={editing}
        onSubmit={save}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Excluir “${toDelete?.name}”?`}
        description={
          toDelete?.products_count
            ? `${toDelete.products_count} ${toDelete.products_count === 1 ? "peça ficará" : "peças ficarão"} sem ${c.label}. As peças não são excluídas.`
            : `A ${c.label} será removida do painel e do site.`
        }
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        loading={remove.isPending}
      />
    </>
  );
};

export default TaxonomyPage;
