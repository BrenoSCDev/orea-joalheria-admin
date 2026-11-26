import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { catalogService, ProductPayload } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { SITE_URL } from "@/config/api";
import { Product } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageManager } from "@/components/products/ImageManager";
import { ImageTile, useLocalPreviews } from "@/components/products/imageFiles";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { CategoryPicker } from "@/components/categories/CategoryPicker";
import { inputToPrice, priceToInput } from "@/lib/price";
import { cn, formatPrice } from "@/lib/utils";

interface FormState {
  name: string;
  slug: string;
  sku: string;
  category_ids: number[];
  collection_id: string;
  short_description: string;
  description: string;
  material: string;
  stone: string;
  weight_grams: string;
  size: string;
  price: string;
  promotional_price: string;
  stock_quantity: string;
  is_unique: boolean;
  is_active: boolean;
  is_featured: boolean;
  is_subfeatured: boolean;
  is_spotlight: boolean;
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  sku: "",
  category_ids: [],
  collection_id: "none",
  short_description: "",
  description: "",
  material: "",
  stone: "",
  weight_grams: "",
  size: "",
  price: "",
  promotional_price: "",
  stock_quantity: "1",
  is_unique: true,
  is_active: false,
  is_featured: false,
  is_subfeatured: false,
  is_spotlight: false,
};

const fromProduct = (p: Product): FormState => ({
  name: p.name,
  slug: p.slug,
  sku: p.sku ?? "",
  category_ids: (p.categories ?? []).map((c) => c.id),
  collection_id: p.collection?.id ? String(p.collection.id) : "none",
  short_description: p.short_description ?? "",
  description: p.description ?? "",
  material: p.material ?? "",
  stone: p.stone ?? "",
  weight_grams: p.weight_grams ? String(Number(p.weight_grams)).replace(".", ",") : "",
  size: p.size ?? "",
  price: priceToInput(p.price),
  promotional_price: priceToInput(p.promotional_price),
  stock_quantity: String(p.stock_quantity),
  is_unique: p.is_unique,
  is_active: p.is_active,
  is_featured: p.is_featured,
  is_subfeatured: p.is_subfeatured,
  is_spotlight: p.is_spotlight,
});

const nullable = (v: string) => (v.trim() === "" ? null : v.trim());

const ProductEditor = () => {
  const { id } = useParams();
  const productId = id ? Number(id) : undefined;
  const isNew = !productId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const productQuery = useQuery({ queryKey: ["product", productId], queryFn: () => catalogService.product(productId!), enabled: !isNew });
  const categories = useQuery({ queryKey: ["categories"], queryFn: catalogService.categories });
  const collections = useQuery({ queryKey: ["collections"], queryFn: catalogService.collections });
  const product = productQuery.data;

  useEffect(() => {
    if (product) {
      const state = fromProduct(product);
      setForm(state);
      setInitial(state);
    }
  }, [product]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial) || pendingFiles.length > 0, [form, initial, pendingFiles]);

  // Warn before closing the tab with unsaved changes.
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

  // "−40% · de R$ 10.000,00 por R$ 6.000,00" under the promotional price field.
  const promoHint = (() => {
    const price = inputToPrice(form.price);
    const promo = inputToPrice(form.promotional_price);
    if (price === null || Number.isNaN(price)) return "Defina o preço para poder aplicar um desconto.";
    if (promo === null || Number.isNaN(promo) || promo >= price) return "No site, o preço aparece riscado e este passa a ser o valor da peça.";
    return `${Math.round((1 - promo / price) * 100)}% de desconto · de ${formatPrice(price)} por ${formatPrice(promo)}`;
  })();

  const buildPayload = (): ProductPayload | null => {
    const price = inputToPrice(form.price);
    const promo = inputToPrice(form.promotional_price);
    const weight = form.weight_grams.trim() ? Number(form.weight_grams.replace(",", ".")) : null;
    const local: Record<string, string> = {};
    if (!form.name.trim()) local.name = "Informe o nome da peça.";
    if (price !== null && (Number.isNaN(price) || price < 0)) local.price = "Valor inválido. Ex.: 12.500,00";
    if (promo !== null) {
      if (Number.isNaN(promo) || promo < 0) local.promotional_price = "Valor inválido. Ex.: 9.900,00";
      else if (price === null) local.promotional_price = "Informe o preço da peça para definir um preço promocional.";
      else if (!Number.isNaN(price) && promo >= price) local.promotional_price = "O preço promocional deve ser menor que o preço.";
    }
    if (weight !== null && (Number.isNaN(weight) || weight < 0)) local.weight_grams = "Peso inválido.";
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error("Revise os campos destacados.");
      return null;
    }
    return {
      name: form.name.trim(),
      ...(isNew ? {} : { slug: nullable(form.slug) }),
      sku: nullable(form.sku),
      category_ids: form.category_ids,
      collection_id: form.collection_id === "none" ? null : Number(form.collection_id),
      short_description: nullable(form.short_description),
      description: nullable(form.description),
      material: nullable(form.material),
      stone: nullable(form.stone),
      weight_grams: weight,
      size: nullable(form.size),
      price,
      promotional_price: promo,
      stock_quantity: form.is_unique ? Math.min(1, Math.max(0, Number(form.stock_quantity) || 0)) : Math.max(0, Number(form.stock_quantity) || 0),
      is_unique: form.is_unique,
      is_active: form.is_active,
      is_featured: form.is_featured,
      is_subfeatured: form.is_subfeatured,
      is_spotlight: form.is_spotlight,
    };
  };

  const save = useMutation({
    mutationFn: async (payload: ProductPayload) => {
      const saved = isNew ? await catalogService.createProduct(payload) : await catalogService.updateProduct(productId!, payload);
      if (isNew && pendingFiles.length) await catalogService.uploadImages(saved.id, pendingFiles);
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (isNew) {
        setPendingFiles([]);
        setInitial(form);
        toast.success("Peça cadastrada.");
        navigate(`/produtos/${saved.id}`, { replace: true });
      } else {
        queryClient.setQueryData(["product", productId], saved);
        toast.success("Alterações salvas.");
      }
    },
    onError: (e) => {
      const fieldErrors = (e as AxiosError<{ errors?: Record<string, string[]> }>).response?.data?.errors;
      if (fieldErrors) setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0]])));
      toast.error(getErrorMessage(e, "Não foi possível salvar."));
    },
  });

  const remove = useMutation({
    mutationFn: () => catalogService.deleteProduct(productId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Peça excluída.");
      navigate("/produtos", { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const payload = buildPayload();
    if (payload) save.mutate(payload);
  };

  // Ctrl/Cmd + S
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

  /* ── Images ─────────────────────────────────────────── */
  const localTiles = useLocalPreviews(pendingFiles);
  const [uploading, setUploading] = useState<File[]>([]);
  const uploadingTiles = useLocalPreviews(uploading).map((t) => ({ ...t, uploading: true }));
  const serverTiles: ImageTile[] = (product?.images ?? []).map((img) => ({ key: `img-${img.id}`, url: img.url, alt: img.alt }));
  const tiles = isNew ? localTiles : [...serverTiles, ...uploadingTiles];
  const refreshProduct = () => queryClient.invalidateQueries({ queryKey: ["product", productId] });
  const imageId = (tile: ImageTile) => Number(tile.key.replace("img-", ""));

  const imageOps = useMutation({
    mutationFn: async (op: { type: "add"; files: File[] } | { type: "remove"; tile: ImageTile } | { type: "reorder"; tiles: ImageTile[] }) => {
      if (op.type === "add") {
        setUploading(op.files);
        try {
          await catalogService.uploadImages(productId!, op.files);
        } finally {
          setUploading([]);
        }
      }
      if (op.type === "remove") await catalogService.deleteImage(productId!, imageId(op.tile));
      if (op.type === "reorder") {
        // Optimistic order, then persist: sort_order = position, first = cover.
        queryClient.setQueryData<Product>(["product", productId], (p) =>
          p ? { ...p, images: op.tiles.map((t) => p.images!.find((img) => img.id === imageId(t))!).filter(Boolean) } : p,
        );
        await Promise.all(op.tiles.map((t, i) => catalogService.updateImage(productId!, imageId(t), { sort_order: i, ...(i === 0 ? { is_cover: true } : {}) })));
      }
      return op.type;
    },
    onSuccess: (type) => {
      toast.success(type === "add" ? "Imagens enviadas." : type === "remove" ? "Imagem removida." : "Ordem das imagens atualizada.");
      refreshProduct();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => {
      toast.error(getErrorMessage(e, "Não foi possível atualizar as imagens."));
      refreshProduct();
    },
  });

  /* ── Render ─────────────────────────────────────────── */
  if (!isNew && productQuery.isLoading) return <EditorSkeleton />;
  if (!isNew && productQuery.error) return <ErrorState error={productQuery.error} onRetry={() => productQuery.refetch()} />;

  const siteUrl = product ? `${SITE_URL}/joias/${product.slug}` : null;

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Header / sticky actions */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 border-b bg-background/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Button type="button" variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/produtos" aria-label="Voltar para peças">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{form.name || "Nova peça"}</p>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              {product ? <ProductStatusBadge product={{ is_active: form.is_active, stock_quantity: Number(form.stock_quantity), is_unique: form.is_unique }} /> : <span>Rascunho não salvo</span>}
              {dirty && <span className="hidden sm:inline">· Alterações não salvas</span>}
            </div>
          </div>
          {siteUrl && product?.is_active && (
            <Button type="button" variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Ver no site
              </a>
            </Button>
          )}
          <Button type="submit" disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {isNew ? "Cadastrar peça" : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Informações</CardTitle>
                <CardDescription>Como a peça será apresentada no site.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Nome da peça" htmlFor="name" error={errors.name}>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Anel Solitário Ouro 18k" autoFocus={isNew} aria-invalid={!!errors.name} />
              </Field>
              <Field
                label="Resumo"
                htmlFor="short_description"
                optional
                error={errors.short_description}
                hint={`${form.short_description.length}/500 · aparece logo abaixo do preço`}
              >
                <Textarea id="short_description" rows={2} maxLength={500} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="Uma frase que desperte interesse pela peça." />
              </Field>
              <Field label="Descrição" htmlFor="description" optional error={errors.description} hint="Detalhes, história da peça, certificado, cuidados. Quebras de linha são mantidas.">
                <Textarea id="description" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Imagens</CardTitle>
                <CardDescription>
                  {isNew ? "As fotos serão enviadas quando a peça for cadastrada." : "A qualidade das fotos define a percepção da peça no catálogo."}
                </CardDescription>
              </div>
              {tiles.length > 0 && <span className="whitespace-nowrap text-[12px] text-muted-foreground tabular-nums">{tiles.length} {tiles.length === 1 ? "imagem" : "imagens"}</span>}
            </CardHeader>
            <CardContent>
              <ImageManager
                tiles={tiles}
                busy={imageOps.isPending}
                onAdd={(files) => (isNew ? setPendingFiles((p) => [...p, ...files]) : imageOps.mutate({ type: "add", files }))}
                onRemove={(tile) =>
                  isNew ? setPendingFiles((p) => p.filter((_, i) => localTiles[i]?.key !== tile.key)) : imageOps.mutate({ type: "remove", tile })
                }
                onReorder={(next) =>
                  isNew
                    ? setPendingFiles(next.map((t) => pendingFiles[localTiles.findIndex((l) => l.key === t.key)]))
                    : imageOps.mutate({ type: "reorder", tiles: next.filter((t) => !t.uploading) })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Detalhes da peça</CardTitle>
                <CardDescription>Exibidos em “Detalhes da peça” no site. Deixe em branco o que não se aplica.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Material" htmlFor="material" optional error={errors.material}>
                <Input id="material" value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Ouro amarelo 18k" />
              </Field>
              <Field label="Pedras" htmlFor="stone" optional error={errors.stone}>
                <Input id="stone" value={form.stone} onChange={(e) => set("stone", e.target.value)} placeholder="Diamantes, esmeralda…" />
              </Field>
              <Field label="Peso (g)" htmlFor="weight" optional error={errors.weight_grams}>
                <Input id="weight" inputMode="decimal" value={form.weight_grams} onChange={(e) => set("weight_grams", e.target.value)} placeholder="3,20" />
              </Field>
              <Field label="Tamanho / medidas" htmlFor="size" optional error={errors.size}>
                <Input id="size" value={form.size} onChange={(e) => set("size", e.target.value)} placeholder="Aro 16, 45 cm…" />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publicação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                id="is_active"
                label="Publicada no site"
                description={form.is_active ? "Visível no catálogo público." : "Rascunho: visível apenas no painel."}
                checked={form.is_active}
                onChange={(v) => set("is_active", v)}
              />
              <div className="h-px bg-border" />
              <ToggleRow id="is_featured" label="Destaque" description="Primeira fileira de peças da página inicial, logo abaixo do banner." checked={form.is_featured} onChange={(v) => set("is_featured", v)} />
              <div className="h-px bg-border" />
              <ToggleRow id="is_subfeatured" label="Subdestaque" description="Segunda fileira de peças, abaixo dos banners de categorias." checked={form.is_subfeatured} onChange={(v) => set("is_subfeatured", v)} />
              <div className="h-px bg-border" />
              <ToggleRow
                id="is_spotlight"
                label="Peça destaque"
                description={
                  form.is_spotlight && !initial.is_spotlight
                    ? "Ao salvar, esta peça substitui a peça destaque atual."
                    : "Exibida aberta na página inicial, com fotos e detalhes. Só uma peça por vez."
                }
                checked={form.is_spotlight}
                onChange={(v) => set("is_spotlight", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Categorias" error={errors.category_ids || errors["category_ids.0"]} hint={<Link to="/categorias" className="underline-offset-2 hover:underline">Gerenciar categorias</Link>}>
                <CategoryPicker categories={categories.data ?? []} loading={categories.isLoading} value={form.category_ids} onChange={(ids) => set("category_ids", ids)} />
              </Field>
              <Field label="Coleção" error={errors.collection_id} hint={<Link to="/colecoes" className="underline-offset-2 hover:underline">Gerenciar coleções</Link>}>
                <Select value={form.collection_id} onValueChange={(v) => set("collection_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem coleção</SelectItem>
                    {collections.data?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comercial e estoque</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Preço" htmlFor="price" error={errors.price} hint="Deixe em branco para exibir “Sob consulta”.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">R$</span>
                  <Input
                    id="price"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    onBlur={() => {
                      const v = inputToPrice(form.price);
                      if (v !== null && !Number.isNaN(v)) set("price", priceToInput(v));
                    }}
                    placeholder="Sob consulta"
                    className="pl-9 tabular-nums"
                    aria-invalid={!!errors.price}
                  />
                </div>
              </Field>
              <Field label="Preço promocional" htmlFor="promotional_price" optional error={errors.promotional_price} hint={promoHint}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">R$</span>
                  <Input
                    id="promotional_price"
                    inputMode="decimal"
                    value={form.promotional_price}
                    onChange={(e) => set("promotional_price", e.target.value)}
                    onBlur={() => {
                      const v = inputToPrice(form.promotional_price);
                      if (v !== null && !Number.isNaN(v)) set("promotional_price", priceToInput(v));
                    }}
                    placeholder="Sem desconto"
                    disabled={!form.price.trim() && !form.promotional_price.trim()}
                    className="pl-9 tabular-nums"
                    aria-invalid={!!errors.promotional_price}
                  />
                </div>
              </Field>
              <Field label="Referência" htmlFor="sku" optional error={errors.sku}>
                <Input id="sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="SKU" />
              </Field>
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <ToggleRow
                  id="is_unique"
                  label="Peça única"
                  description={form.is_unique ? "Exemplar único: disponível ou vendida." : "Peça com mais de uma unidade em estoque."}
                  checked={form.is_unique}
                  onChange={(v) => {
                    setForm((f) => ({ ...f, is_unique: v, stock_quantity: v ? String(Math.min(1, Number(f.stock_quantity) || 0)) : f.stock_quantity }));
                  }}
                />
                {form.is_unique ? (
                  <ToggleRow
                    id="available"
                    label="Disponível"
                    description={Number(form.stock_quantity) > 0 ? "A peça está disponível para venda." : "Marcada como vendida."}
                    checked={Number(form.stock_quantity) > 0}
                    onChange={(v) => set("stock_quantity", v ? "1" : "0")}
                  />
                ) : (
                  <Field label="Quantidade em estoque" htmlFor="stock" error={errors.stock_quantity}>
                    <Input id="stock" type="number" min={0} inputMode="numeric" value={form.stock_quantity} onChange={(e) => set("stock_quantity", e.target.value)} className="tabular-nums" />
                  </Field>
                )}
              </div>
              {Number(form.stock_quantity) === 0 && form.is_active && (
                <p className="rounded-lg bg-warning-light px-3 py-2 text-[12px] text-warning">
                  {form.is_unique ? "Vendida" : "Sem estoque"}: o site mostrará “Disponibilidade sob consulta”.
                </p>
              )}
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Endereço no site</CardTitle>
                  <CardDescription>Mudar o endereço quebra links já compartilhados.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center rounded-lg border border-input bg-muted/40 text-[13px] focus-within:border-ring/60 focus-within:ring-[3px] focus-within:ring-ring/15">
                  <span className="shrink-0 pl-3 text-muted-foreground">/joias/</span>
                  <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="h-9 min-w-0 flex-1 bg-transparent pr-3 focus:outline-none" aria-label="Endereço da peça" />
                </div>
                {errors.slug && <p className="text-[12px] text-destructive">{errors.slug}</p>}
              </CardContent>
            </Card>
          )}

          {!isNew && (
            <Button type="button" variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive-light hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Excluir peça
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir “${product?.name}”?`}
        description="A peça e todas as suas imagens serão removidas do painel e do site. Esta ação não pode ser desfeita."
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
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
    <div className="space-y-6">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-44 rounded-xl" />
    </div>
  </div>
);

export default ProductEditor;
