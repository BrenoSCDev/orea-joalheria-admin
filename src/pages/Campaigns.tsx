import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgePercent, MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { catalogService } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { Campaign } from "@/types/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CAMPAIGN_STATUS, campaignToPayload, conditionLabel, formatDateTime, formatPercent } from "@/lib/campaign";

const Campaigns = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<Campaign | null>(null);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["campaigns"], queryFn: catalogService.campaigns });
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogService.categories });
  const names = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c.name])), [categories.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const toggle = useMutation({
    mutationFn: (c: Campaign) => catalogService.updateCampaign(c.id, campaignToPayload(c, { is_active: !c.is_active })),
    onSuccess: (saved) => {
      toast.success(saved.is_active ? "Campanha ativada. O site já mostra os novos preços." : "Campanha desativada. O site voltou aos preços normais.");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => catalogService.deleteCampaign(id),
    onSuccess: () => {
      toast.success("Campanha excluída.");
      setToDelete(null);
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const scope = (c: Campaign) => {
    const list = (ids: number[]) => ids.map((id) => names.get(id)).filter(Boolean).join(", ");
    const base = c.applies_to_all ? "Loja inteira" : list(c.include_category_ids) || (c.include_products.length ? "" : "—");
    const parts = [base];
    if (c.include_products.length) parts.push(`${c.applies_to_all || c.include_category_ids.length ? "+ " : ""}${c.include_products.length} ${c.include_products.length === 1 ? "peça" : "peças"}`);
    if (c.exclude_category_ids.length) parts.push(`exceto ${list(c.exclude_category_ids)}`);
    if (c.exclude_products.length) parts.push(`${c.exclude_category_ids.length ? "e" : "exceto"} ${c.exclude_products.length} ${c.exclude_products.length === 1 ? "peça" : "peças"}`);
    return parts.filter(Boolean).join(" ");
  };

  const period = (c: Campaign) => {
    if (c.starts_at && c.ends_at) return `${formatDateTime(c.starts_at)} – ${formatDateTime(c.ends_at)}`;
    if (c.starts_at) return `A partir de ${formatDateTime(c.starts_at)}`;
    if (c.ends_at) return `Até ${formatDateTime(c.ends_at)}`;
    return null;
  };

  const items = data ?? [];
  const running = items.filter((c) => c.status === "active");

  return (
    <>
      <PageHeader
        description="Campanhas aplicadas ao catálogo sem editar as peças: Black Friday, Natal, Dia das Mães. Cada forma de pagamento pode ter o seu desconto."
        actions={
          <Button asChild>
            <Link to="/campanhas/nova">
              <Plus /> Nova campanha
            </Link>
          </Button>
        }
      />

      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {running.length > 1 && (
        <p className="mb-4 rounded-lg border bg-muted/30 px-3 py-2.5 text-[12.5px] text-muted-foreground">
          {running.length} campanhas em vigor. Quando uma peça participa de mais de uma, vale a de <strong className="font-medium text-foreground">maior prioridade</strong> (empate: a mais recente). Os descontos nunca se somam.
        </p>
      )}

      <Card className="overflow-hidden">
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2 p-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && items.length === 0 && (
          <EmptyState
            icon={BadgePercent}
            title="Nenhuma campanha cadastrada"
            description="Crie uma campanha para aplicar descontos por categoria e forma de pagamento em todo o catálogo."
            action={
              <Button asChild>
                <Link to="/campanhas/nova">
                  <Plus /> Criar campanha
                </Link>
              </Button>
            }
          />
        )}

        <ul className="divide-y">
          {items.map((c) => {
            const status = CAMPAIGN_STATUS[c.status];
            const when = period(c);
            return (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40 md:px-5">
                <button type="button" onClick={() => navigate(`/campanhas/${c.id}`)} className="min-w-0 flex-1 text-left">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="truncate">{c.name}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {c.priority > 0 && <span className="text-[11.5px] font-normal text-muted-foreground">Prioridade {c.priority}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{scope(c)}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] tabular-nums">
                    {c.conditions.map((k) => (
                      <span key={`${k.payment_type}-${k.max_installments}`}>
                        <span className="text-muted-foreground">{conditionLabel(k)}</span> <span className="font-medium text-brand-deep">{formatPercent(k.discount_percent)} OFF</span>
                      </span>
                    ))}
                    {when && <span className="text-muted-foreground">· {when}</span>}
                  </p>
                </button>
                <span className="hidden shrink-0 text-right text-[12.5px] tabular-nums text-muted-foreground sm:block">
                  {c.eligible_count ?? 0} {c.eligible_count === 1 ? "peça" : "peças"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Ações de ${c.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => navigate(`/campanhas/${c.id}`)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => toggle.mutate(c)} disabled={toggle.isPending}>
                      <Power className="mr-2 h-4 w-4" /> {c.is_active ? "Desativar" : "Ativar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setToDelete(c)} className="text-destructive focus:bg-destructive-light focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Excluir “${toDelete?.name}”?`}
        description="A configuração da campanha será removida. As peças não são alteradas e voltam ao preço normal no site."
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        loading={remove.isPending}
      />
    </>
  );
};

export default Campaigns;
