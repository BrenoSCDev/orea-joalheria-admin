import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft, Gem, Info, Loader2, Plus, Trash2, X } from "lucide-react";
import { CampaignPayload, catalogService } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { Campaign, CampaignProductRef, PaymentType } from "@/types/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryPicker } from "@/components/categories/CategoryPicker";
import { ProductPicker } from "@/components/campaigns/ProductPicker";
import { CAMPAIGN_STATUS, conditionLabel, formatPercent, isoToLocalInput, localInputToIso } from "@/lib/campaign";
import { cn, formatPrice } from "@/lib/utils";

interface ConditionRow {
  key: string;
  payment_type: PaymentType;
  max_installments: string;
  discount_percent: string;
}

interface FormState {
  name: string;
  is_active: boolean;
  applies_to_all: boolean;
  override_product_promotions: boolean;
  priority: string;
  starts_at: string;
  ends_at: string;
  conditions: ConditionRow[];
  include_category_ids: number[];
  exclude_category_ids: number[];
  include_products: CampaignProductRef[];
  exclude_products: CampaignProductRef[];
}

let rowSeq = 0;
const row = (payment_type: PaymentType = "cash", max_installments = "", discount_percent = ""): ConditionRow => ({
  key: `c${++rowSeq}`,
  payment_type,
  max_installments,
  discount_percent,
});

const EMPTY: FormState = {
  name: "",
  is_active: false,
  applies_to_all: true,
  override_product_promotions: true,
  priority: "0",
  starts_at: "",
  ends_at: "",
  conditions: [row("cash")],
  include_category_ids: [],
  exclude_category_ids: [],
  include_products: [],
  exclude_products: [],
};

const fromCampaign = (c: Campaign): FormState => ({
  name: c.name,
  is_active: c.is_active,
  applies_to_all: c.applies_to_all,
  override_product_promotions: c.override_product_promotions,
  priority: String(c.priority),
  starts_at: isoToLocalInput(c.starts_at),
  ends_at: isoToLocalInput(c.ends_at),
  conditions: c.conditions.map((k) => row(k.payment_type, k.payment_type === "cash" ? "" : String(k.max_installments), String(Number(k.discount_percent)).replace(".", ","))),
  include_category_ids: c.include_category_ids,
  exclude_category_ids: c.exclude_category_ids,
  include_products: c.include_products,
  exclude_products: c.exclude_products,
});

/** Comparable snapshot (row keys are local only). */
const snapshot = (f: FormState) => JSON.stringify({ ...f, conditions: f.conditions.map(({ key: _, ...r }) => r) });

const parsePercent = (v: string) => (v.trim() ? Number(v.trim().replace("%", "").replace(",", ".")) : NaN);

function toPayload(f: FormState, lenient = false): CampaignPayload {
  const conditions = f.conditions
    .map((r) => ({
      payment_type: r.payment_type,
      max_installments: r.payment_type === "cash" ? 1 : Number(r.max_installments),
      discount_percent: parsePercent(r.discount_percent),
    }))
    .filter((c) => !lenient || (c.discount_percent > 0 && c.discount_percent <= 95 && (c.payment_type === "cash" || (c.max_installments >= 2 && c.max_installments <= 24))));

  return {
    name: f.name.trim(),
    is_active: f.is_active,
    applies_to_all: f.applies_to_all,
    override_product_promotions: f.override_product_promotions,
    priority: Math.max(0, Math.floor(Number(f.priority) || 0)),
    starts_at: localInputToIso(f.starts_at),
    ends_at: localInputToIso(f.ends_at),
    conditions,
    include_category_ids: f.applies_to_all ? [] : f.include_category_ids,
    exclude_category_ids: f.exclude_category_ids,
    include_product_ids: f.include_products.map((p) => p.id),
    exclude_product_ids: f.exclude_products.map((p) => p.id),
  };
}

const CampaignEditor = () => {
  const { id } = useParams();
  const campaignId = id ? Number(id) : undefined;
  const isNew = !campaignId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const campaignQuery = useQuery({ queryKey: ["campaign", campaignId], queryFn: () => catalogService.campaign(campaignId!), enabled: !isNew });
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogService.categories });
  const campaign = campaignQuery.data;

  useEffect(() => {
    if (campaign) {
      const state = fromCampaign(campaign);
      setForm(state);
      setInitial(state);
    }
  }, [campaign]);

  const dirty = useMemo(() => snapshot(form) !== snapshot(initial), [form, initial]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  const setRow = (key: string, patch: Partial<ConditionRow>) => {
    setForm((f) => ({ ...f, conditions: f.conditions.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("conditions"))));
  };

  const addRow = () => {
    // Suggest the next step: à vista first, then 6×, 10×, 12×…
    const used = new Set(form.conditions.map((r) => (r.payment_type === "cash" ? "cash" : r.max_installments)));
    const next = used.has("cash") ? row("installments", ["6", "10", "12", "3", "5", "18", "24"].find((n) => !used.has(n)) ?? "") : row("cash");
    setForm((f) => ({ ...f, conditions: [...f.conditions, next] }));
  };

  /* ── Preview (calculated by the API, same as the site) ── */
  const previewPayload = useDebounce(JSON.stringify({ ...toPayload(form, true), id: campaignId }), 400);
  const preview = useQuery({
    queryKey: ["campaign-preview", previewPayload],
    queryFn: () => catalogService.previewCampaign(JSON.parse(previewPayload)),
    enabled: JSON.parse(previewPayload).conditions.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });

  /* ── Save ── */
  const validate = (): CampaignPayload | null => {
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = "Dê um nome à campanha.";
    if (form.conditions.length === 0) local.conditions = "Adicione ao menos uma condição de pagamento.";
    const seen = new Set<string>();
    form.conditions.forEach((r, i) => {
      const pct = parsePercent(r.discount_percent);
      const n = Number(r.max_installments);
      const key = r.payment_type === "cash" ? "cash" : `x${n}`;
      if (!(pct > 0 && pct <= 95)) local[`conditions.${i}`] = "Informe um desconto entre 0,01% e 95%.";
      else if (r.payment_type === "installments" && !(Number.isInteger(n) && n >= 2 && n <= 24)) local[`conditions.${i}`] = "Parcelado: informe de 2 a 24 parcelas.";
      else if (seen.has(key)) local[`conditions.${i}`] = r.payment_type === "cash" ? "Já existe uma condição à vista." : `Já existe uma condição em até ${n}×.`;
      seen.add(key);
    });
    if (!form.applies_to_all && form.include_category_ids.length === 0 && form.include_products.length === 0)
      local.include_category_ids = "Selecione as categorias participantes ou aplique à loja inteira.";
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) local.ends_at = "O fim deve ser depois do início.";
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error("Revise os campos destacados.");
      return null;
    }
    return toPayload(form);
  };

  const save = useMutation({
    mutationFn: (payload: CampaignPayload) => (isNew ? catalogService.createCampaign(payload) : catalogService.updateCampaign(campaignId!, payload)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.setQueryData(["campaign", saved.id], saved);
      const state = fromCampaign(saved);
      setForm(state);
      setInitial(state);
      toast.success(saved.is_active ? "Campanha salva. O site já mostra os novos preços." : "Campanha salva (desativada: o site não foi alterado).");
      if (isNew) navigate(`/campanhas/${saved.id}`, { replace: true });
    },
    onError: (e) => {
      const fieldErrors = (e as AxiosError<{ errors?: Record<string, string[]> }>).response?.data?.errors;
      if (fieldErrors) {
        // "conditions.1.discount_percent" → shown on the row "conditions.1"
        const mapped: Record<string, string> = {};
        Object.entries(fieldErrors).forEach(([k, v]) => {
          const m = k.match(/^conditions\.(\d+)/);
          mapped[m ? `conditions.${m[1]}` : k.replace(/\.\d+$/, "")] ??= v[0];
        });
        setErrors(mapped);
      }
      toast.error(getErrorMessage(e, "Não foi possível salvar."));
    },
  });

  const remove = useMutation({
    mutationFn: () => catalogService.deleteCampaign(campaignId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Campanha excluída.");
      navigate("/campanhas", { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const payload = validate();
    if (payload) save.mutate(payload);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !save.isPending) onSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!isNew && campaignQuery.isLoading) return <EditorSkeleton />;
  if (!isNew && campaignQuery.error) return <ErrorState error={campaignQuery.error} onRetry={() => campaignQuery.refetch()} />;

  const status = campaign ? CAMPAIGN_STATUS[campaign.status] : null;
  const p = preview.data;

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Header / sticky actions */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-background/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Button type="button" variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/campanhas" aria-label="Voltar para campanhas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{form.name || "Nova campanha"}</p>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              {status ? <Badge variant={status.variant}>{status.label}</Badge> : <span>Rascunho não salvo</span>}
              {dirty && <span className="hidden sm:inline">· Alterações não salvas</span>}
            </div>
          </div>
          <Button type="submit" disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {isNew ? "Criar campanha" : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Campanha</CardTitle>
                <CardDescription>Nome exibido no site junto aos preços promocionais.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="name" error={errors.name} className="sm:col-span-2">
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Black Friday" maxLength={120} autoFocus={isNew} aria-invalid={!!errors.name} />
              </Field>
              <Field label="Início" htmlFor="starts_at" optional error={errors.starts_at} hint="Vazio = vale assim que ativada.">
                <Input id="starts_at" type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              </Field>
              <Field label="Fim" htmlFor="ends_at" optional error={errors.ends_at} hint="Vazio = até ser desativada.">
                <Input id="ends_at" type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} aria-invalid={!!errors.ends_at} />
              </Field>
              <Field
                label="Prioridade"
                htmlFor="priority"
                error={errors.priority}
                hint="Se uma peça estiver em mais de uma campanha ativa, vale a de maior prioridade (empate: a mais recente). Os descontos nunca se somam."
                className="sm:col-span-2"
              >
                <Input id="priority" type="number" min={0} max={1000} inputMode="numeric" value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-28 tabular-nums" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Abrangência</CardTitle>
                <CardDescription>Quais peças participam. Cada categoria inclui as suas subcategorias.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow
                id="applies_to_all"
                label="Aplicar à loja inteira"
                description={form.applies_to_all ? "Todas as peças com preço participam, exceto as categorias excluídas abaixo." : "Somente as categorias selecionadas participam."}
                checked={form.applies_to_all}
                onChange={(v) => set("applies_to_all", v)}
              />

              {!form.applies_to_all && (
                <Field label="Categorias participantes" error={errors.include_category_ids}>
                  <CategoryPicker
                    ordered={false}
                    categories={categories.data ?? []}
                    loading={categories.isLoading}
                    value={form.include_category_ids}
                    disabledIds={form.exclude_category_ids}
                    onChange={(ids) => set("include_category_ids", ids)}
                  />
                </Field>
              )}

              <Field label="Categorias excluídas" optional error={errors.exclude_category_ids} hint="A exclusão prevalece: uma peça em categoria excluída fica fora, mesmo que esteja em outra participante.">
                <CategoryPicker
                  ordered={false}
                  tone="exclude"
                  categories={categories.data ?? []}
                  loading={categories.isLoading}
                  value={form.exclude_category_ids}
                  disabledIds={form.applies_to_all ? [] : form.include_category_ids}
                  onChange={(ids) => set("exclude_category_ids", ids)}
                />
              </Field>

              <div className="h-px bg-border" />

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Incluir peças específicas" optional error={errors.include_product_ids} hint="Participam mesmo fora das categorias.">
                  <ProductPicker value={form.include_products} disabledIds={form.exclude_products.map((x) => x.id)} onChange={(v) => set("include_products", v)} />
                </Field>
                <Field label="Excluir peças específicas" optional error={errors.exclude_product_ids} hint="Nunca participam desta campanha.">
                  <ProductPicker tone="exclude" value={form.exclude_products} disabledIds={form.include_products.map((x) => x.id)} onChange={(v) => set("exclude_products", v)} />
                </Field>
              </div>

              <div className="h-px bg-border" />

              <ToggleRow
                id="override_product_promotions"
                label="Substituir o preço promocional das peças"
                description={
                  form.override_product_promotions
                    ? "Peças com preço promocional próprio também participam: o desconto da campanha é calculado sobre o preço original e substitui o promocional."
                    : "Peças com preço promocional próprio ficam fora e mantêm o seu preço promocional."
                }
                checked={form.override_product_promotions}
                onChange={(v) => set("override_product_promotions", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Condições de pagamento</CardTitle>
                <CardDescription>Cada condição tem o seu desconto, sempre sobre o preço original. O site mostra todas, lado a lado.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.conditions.length > 0 && (
                <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_2rem] gap-3 px-0.5 text-[12px] font-medium text-muted-foreground sm:grid">
                  <span>Forma de pagamento</span>
                  <span>Parcelas</span>
                  <span>Desconto</span>
                  <span />
                </div>
              )}
              {form.conditions.map((r, i) => {
                const error = errors[`conditions.${i}`];
                return (
                  <div key={r.key}>
                    <div className="grid grid-cols-[minmax(0,1fr)_2rem] gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_2rem] sm:items-center">
                      <Select value={r.payment_type} onValueChange={(v) => setRow(r.key, { payment_type: v as PaymentType, max_installments: v === "installments" ? r.max_installments || "6" : "" })}>
                        <SelectTrigger aria-label="Forma de pagamento">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">À vista</SelectItem>
                          <SelectItem value="installments">Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-8 text-muted-foreground sm:order-last" onClick={() => set("conditions", form.conditions.filter((x) => x.key !== r.key))} aria-label="Remover condição">
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="relative">
                        {r.payment_type === "cash" ? (
                          <span className="flex h-9 items-center px-3 text-[13px] text-muted-foreground">1×</span>
                        ) : (
                          <>
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">até</span>
                            <Input
                              type="number"
                              min={2}
                              max={24}
                              inputMode="numeric"
                              value={r.max_installments}
                              onChange={(e) => setRow(r.key, { max_installments: e.target.value })}
                              className="pl-10 pr-6 tabular-nums"
                              aria-label="Número máximo de parcelas"
                              aria-invalid={!!error}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">×</span>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          inputMode="decimal"
                          value={r.discount_percent}
                          onChange={(e) => setRow(r.key, { discount_percent: e.target.value })}
                          placeholder="0"
                          className="pr-7 tabular-nums"
                          aria-label="Percentual de desconto"
                          aria-invalid={!!error}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">%</span>
                      </div>
                    </div>
                    {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
                  </div>
                );
              })}
              {errors.conditions && <p className="text-[12px] text-destructive">{errors.conditions}</p>}
              <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={form.conditions.length >= 12}>
                <Plus /> Adicionar condição
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publicação</CardTitle>
            </CardHeader>
            <CardContent>
              <ToggleRow
                id="is_active"
                label="Campanha ativa"
                description={
                  form.is_active
                    ? form.starts_at && new Date(form.starts_at) > new Date()
                      ? "Agendada: os preços mudam no site no início do período."
                      : "Ao salvar, os preços promocionais aparecem no site."
                    : "Desativada: o site mostra os preços normais."
                }
                checked={form.is_active}
                onChange={(v) => set("is_active", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Prévia</CardTitle>
                <CardDescription>Calculada pela API com as regras acima, igual ao site.</CardDescription>
              </div>
              {preview.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardHeader>
            <CardContent className="space-y-4">
              {!p ? (
                <p className="text-[13px] text-muted-foreground">Preencha ao menos uma condição de pagamento para ver os preços.</p>
              ) : (
                <>
                  <p className="text-[13px]">
                    <span className="text-[22px] font-semibold tabular-nums">{p.eligible_count}</span>{" "}
                    <span className="text-muted-foreground">{p.eligible_count === 1 ? "peça publicada participa" : "peças publicadas participam"}</span>
                  </p>
                  {p.overridden_count > 0 && (
                    <p className="flex gap-2 rounded-lg bg-warning-light px-3 py-2 text-[12px] text-warning">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {p.overridden_count} {p.overridden_count === 1 ? "delas segue" : "delas seguem"} outra campanha ativa com prioridade maior.
                    </p>
                  )}
                  {p.samples.length > 0 && (
                    <ul className="divide-y rounded-lg border">
                      {p.samples.map((s) => (
                        <li key={s.id} className="space-y-2 p-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                              {s.cover_image ? <img src={s.cover_image.url} alt="" className="h-full w-full object-cover" /> : <Gem className="h-3.5 w-3.5 text-muted-foreground/60" />}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium">{s.name}</p>
                              <p className="text-[12px] tabular-nums text-muted-foreground line-through">{formatPrice(s.pricing.original_price)}</p>
                            </div>
                          </div>
                          <dl className="space-y-1 text-[12.5px] tabular-nums">
                            {s.pricing.options.map((o) => (
                              <div key={`${o.payment_type}-${o.max_installments}`} className="flex items-baseline justify-between gap-2">
                                <dt className="text-muted-foreground">{conditionLabel(o)}</dt>
                                <dd className="text-right">
                                  <span className="font-medium">{formatPrice(o.price)}</span>
                                  {o.max_installments > 1 && <span className="text-muted-foreground"> · {o.max_installments}× {formatPrice(o.installment_price)}</span>}
                                  <span className="ml-1.5 text-[11px] font-medium text-brand-deep">{formatPercent(o.discount_percent)} OFF</span>
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!form.is_active && <p className="text-[12px] text-muted-foreground">A campanha está desativada: estes preços ainda não aparecem no site.</p>}
                </>
              )}
            </CardContent>
          </Card>

          {!isNew && (
            <Button type="button" variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive-light hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Excluir campanha
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir “${campaign?.name}”?`}
        description="A configuração da campanha será removida. As peças não são alteradas e voltam ao preço normal no site."
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
      />
    </form>
  );
};

const ToggleRow = ({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4">
    <label htmlFor={id} className="cursor-pointer">
      <span className="block text-[13px] font-medium">{label}</span>
      <span className={cn("mt-0.5 block text-[12px] text-muted-foreground")}>{description}</span>
    </label>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
);

const EditorSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-3">
    <div className="space-y-6 lg:col-span-2">
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>
);

export default CampaignEditor;
