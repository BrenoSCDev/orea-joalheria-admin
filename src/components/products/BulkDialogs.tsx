import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Category, Collection } from "@/types/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryPicker } from "@/components/categories/CategoryPicker";

interface Base {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  busy: boolean;
}

const pieces = (n: number) => `${n} ${n === 1 ? "peça" : "peças"}`;

const Footer = ({ busy, disabled, label, onCancel }: { busy: boolean; disabled?: boolean; label: string; onCancel: () => void }) => (
  <DialogFooter className="gap-2 sm:gap-0">
    <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
      Cancelar
    </Button>
    <Button type="submit" disabled={busy || disabled}>
      {busy && <Loader2 className="animate-spin" />} {label}
    </Button>
  </DialogFooter>
);

/** Add or remove categories on many pieces at once. */
export const BulkCategoriesDialog = ({ mode, categories, onConfirm, ...p }: Base & { mode: "add" | "remove"; categories: Category[]; onConfirm: (ids: number[]) => void }) => {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    if (p.open) setIds([]);
  }, [p.open]);
  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-md">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(ids);
          }}
        >
          <DialogHeader>
            <DialogTitle>{mode === "add" ? "Adicionar categorias" : "Remover categorias"}</DialogTitle>
            <DialogDescription>
              {mode === "add"
                ? `As categorias escolhidas serão somadas às atuais de ${pieces(p.count)}. A categoria principal de cada peça não muda.`
                : `As categorias escolhidas serão retiradas de ${pieces(p.count)}. As demais permanecem.`}
            </DialogDescription>
          </DialogHeader>
          <CategoryPicker categories={categories} value={ids} onChange={setIds} />
          <Footer busy={p.busy} disabled={!ids.length} label={mode === "add" ? "Adicionar" : "Remover"} onCancel={() => p.onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** Assign (or clear) the collection of many pieces. */
export const BulkCollectionDialog = ({ collections, onConfirm, ...p }: Base & { collections: Collection[]; onConfirm: (id: number | null) => void }) => {
  const [value, setValue] = useState("none");
  useEffect(() => {
    if (p.open) setValue("none");
  }, [p.open]);
  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-md">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(value === "none" ? null : Number(value));
          }}
        >
          <DialogHeader>
            <DialogTitle>Definir coleção</DialogTitle>
            <DialogDescription>Substitui a coleção de {pieces(p.count)}.</DialogDescription>
          </DialogHeader>
          <Field label="Coleção">
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem coleção (remover)</SelectItem>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Footer busy={p.busy} label="Aplicar" onCancel={() => p.onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** Set the same stock on many pieces (unique pieces keep 0 or 1). */
export const BulkStockDialog = ({ onConfirm, ...p }: Base & { onConfirm: (value: number) => void }) => {
  const [value, setValue] = useState("1");
  useEffect(() => {
    if (p.open) setValue("1");
  }, [p.open]);
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(n) && n >= 0;
  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-sm">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onConfirm(n);
          }}
        >
          <DialogHeader>
            <DialogTitle>Definir estoque</DialogTitle>
            <DialogDescription>Aplica a quantidade a {pieces(p.count)}.</DialogDescription>
          </DialogHeader>
          <Field label="Quantidade" htmlFor="bulk-stock" hint="Peças únicas ficam com 1 (disponível) ou 0 (vendida)." error={!valid && value !== "" ? "Informe um número inteiro." : undefined}>
            <Input id="bulk-stock" type="number" min={0} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} autoFocus className="tabular-nums" />
          </Field>
          <Footer busy={p.busy} disabled={!valid} label="Aplicar" onCancel={() => p.onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
};
