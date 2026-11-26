import { FormEvent, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/apiClient";
import { TaxonomyPayload } from "@/services/catalogService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateFiles } from "@/components/products/imageFiles";

export interface TaxonomyItem {
  id: number;
  parent_id?: number | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  is_featured?: boolean;
  image?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kindLabel: string; // "categoria" | "coleção"
  imageLabel: string;
  withFeatured?: boolean;
  item: TaxonomyItem | null; // null = create
  /** Categories only: possible parents (already excluding the item and its descendants). */
  parentOptions?: { id: number; name: string; depth: number }[];
  /** Pre-selected parent when creating a subcategory. */
  defaultParentId?: number | null;
  onSubmit: (data: TaxonomyPayload) => Promise<unknown>;
}

/** Create/edit dialog shared by categories and collections. */
export const TaxonomyDialog = ({ open, onOpenChange, kindLabel, imageLabel, withFeatured, item, parentOptions, defaultParentId, onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [parentId, setParentId] = useState<string>("none");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setSlug(item?.slug ?? "");
    setDescription(item?.description ?? "");
    setActive(item?.is_active ?? true);
    setFeatured(item?.is_featured ?? false);
    const parent = item ? item.parent_id : defaultParentId;
    setParentId(parent ? String(parent) : "none");
    setFile(null);
    setPreview(item?.image ?? null);
    setErrors({});
  }, [open, item, defaultParentId]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrors({ name: "Informe um nome." });
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        ...(item ? { slug: slug.trim() } : {}),
        description: description.trim() || null,
        is_active: active,
        ...(withFeatured ? { is_featured: featured } : {}),
        ...(parentOptions ? { parent_id: parentId === "none" ? null : Number(parentId) } : {}),
        image: file,
      });
      onOpenChange(false);
    } catch (err) {
      const fieldErrors = (err as AxiosError<{ errors?: Record<string, string[]> }>).response?.data?.errors;
      if (fieldErrors) setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k === "cover" ? "image" : k, v[0]])));
      toast.error(getErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{item ? `Editar ${kindLabel}` : parentId !== "none" && parentOptions ? "Nova subcategoria" : `Nova ${kindLabel}`}</DialogTitle>
            <DialogDescription>{item ? `Alterações aparecem imediatamente no site.` : `Organize as peças do catálogo.`}</DialogDescription>
          </DialogHeader>

          <Field label="Nome" htmlFor="tx-name" error={errors.name}>
            <Input id="tx-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-invalid={!!errors.name} />
          </Field>

          {parentOptions && (
            <Field label="Categoria-mãe" error={errors.parent_id} hint="Deixe em “Nenhuma” para uma categoria principal.">
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="none">Nenhuma (categoria principal)</SelectItem>
                  {parentOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      <span style={{ paddingLeft: o.depth * 14 }}>{o.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {item && (
            <Field label="Endereço" htmlFor="tx-slug" error={errors.slug} hint="Usado nos links do site.">
              <Input id="tx-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </Field>
          )}

          <Field label="Descrição" htmlFor="tx-desc" optional error={errors.description}>
            <Textarea id="tx-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <Field label={imageLabel} optional error={errors.image}>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-input bg-muted/40 transition-colors hover:border-brand/60"
              >
                {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
              </button>
              <div className="text-[12px] text-muted-foreground">
                <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-foreground hover:underline">
                  {preview ? "Trocar imagem" : "Escolher imagem"}
                </button>
                <p className="mt-0.5">Horizontal, JPG/PNG/WebP até 5 MB.</p>
                {file && (
                  <button type="button" onClick={() => { setFile(null); setPreview(item?.image ?? null); }} className="mt-1 inline-flex items-center gap-1 hover:text-foreground">
                    <X className="h-3 w-3" /> Desfazer
                  </button>
                )}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const [f] = validateFiles(e.target.files ?? []);
                if (f) setFile(f);
                e.target.value = "";
              }}
            />
          </Field>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <label className="flex items-center justify-between gap-4 text-[13px]">
              <span>
                <span className="block font-medium">Ativa no site</span>
                <span className="text-[12px] text-muted-foreground">Inativas não aparecem nos filtros do catálogo.</span>
              </span>
              <Switch checked={active} onCheckedChange={setActive} />
            </label>
            {withFeatured && (
              <label className="flex items-center justify-between gap-4 text-[13px]">
                <span>
                  <span className="block font-medium">Destaque na página inicial</span>
                  <span className="text-[12px] text-muted-foreground">Coleções em destaque aparecem primeiro.</span>
                </span>
                <Switch checked={featured} onCheckedChange={setFeatured} />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {item ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
