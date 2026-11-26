import { createPortal } from "react-dom";
import { ChevronDown, Eye, EyeOff, FolderMinus, FolderPlus, Gem, Layers, Loader2, Package, Percent, Star, StarHalf, StarOff, Trash2, X } from "lucide-react";
import { BulkAction } from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type BulkIntent = BulkAction | "categories_add" | "categories_remove" | "collection" | "stock" | "discount";

interface Props {
  count: number;
  busy: boolean;
  onAction: (intent: BulkIntent) => void;
  onClear: () => void;
}

/**
 * Floating bulk bar. Rendered in a portal: the page wrapper animates `transform`,
 * which would otherwise trap `position: fixed` (same fix as the Settings save bar).
 * Aligned with the content area through --sidebar-offset (set by MainLayout).
 */
export const BulkActionBar = ({ count, busy, onAction, onClear }: Props) => {
  const visible = count > 0;

  const more = (
    <>
      <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Organização</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAction("categories_add")}>
        <FolderPlus className="mr-2 h-4 w-4" /> Adicionar categorias…
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("categories_remove")}>
        <FolderMinus className="mr-2 h-4 w-4" /> Remover categorias…
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("collection")}>
        <Layers className="mr-2 h-4 w-4" /> Definir coleção…
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estoque</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAction("mark_unique")}>
        <Gem className="mr-2 h-4 w-4" /> Marcar como peça única
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("unmark_unique")}>
        <Package className="mr-2 h-4 w-4" /> Desmarcar peça única
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("stock")}>
        <Package className="mr-2 h-4 w-4" /> Definir estoque…
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preço</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAction("discount")}>
        <Percent className="mr-2 h-4 w-4" /> Aplicar desconto…
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("clear_discount")}>
        <Percent className="mr-2 h-4 w-4 opacity-50" /> Remover preço promocional
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Página inicial</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onAction("unfeature")}>
        <StarOff className="mr-2 h-4 w-4" /> Remover destaque
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("subfeature")}>
        <StarHalf className="mr-2 h-4 w-4" /> Adicionar aos subdestaques
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAction("unsubfeature")}>
        <StarOff className="mr-2 h-4 w-4" /> Remover subdestaque
      </DropdownMenuItem>
    </>
  );

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed bottom-4 right-0 z-40 flex justify-center px-4 transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
      style={{ left: "var(--sidebar-offset, 0px)" }}
      aria-hidden={!visible}
    >
      <div role="toolbar" aria-label="Ações em massa" className={cn("flex items-center gap-1 rounded-xl border bg-primary p-1.5 text-primary-foreground shadow-2xl", visible && "pointer-events-auto")}>
        <span className="flex items-center gap-2 pl-2.5 pr-2 text-[13px] font-medium tabular-nums">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {count} {count === 1 ? "selecionada" : "selecionadas"}
        </span>
        <span className="mx-1 h-5 w-px bg-white/15" />

        {/* Desktop: main actions inline */}
        <div className="hidden items-center gap-1 md:flex">
          <BarButton icon={Eye} label="Publicar" onClick={() => onAction("publish")} disabled={busy} />
          <BarButton icon={EyeOff} label="Despublicar" onClick={() => onAction("unpublish")} disabled={busy} />
          <BarButton icon={Star} label="Destacar" onClick={() => onAction("feature")} disabled={busy} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={busy} className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                Mais <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={10} className="w-56">
              {more}
            </DropdownMenuContent>
          </DropdownMenu>
          <BarButton icon={Trash2} label="Excluir" onClick={() => onAction("delete")} disabled={busy} danger />
        </div>

        {/* Mobile: everything in one menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={busy} className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                Ações <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={10} className="w-56">
              <DropdownMenuItem onSelect={() => onAction("publish")}>
                <Eye className="mr-2 h-4 w-4" /> Publicar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("unpublish")}>
                <EyeOff className="mr-2 h-4 w-4" /> Despublicar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction("feature")}>
                <Star className="mr-2 h-4 w-4" /> Destacar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {more}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAction("delete")} className="text-destructive focus:bg-destructive-light focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
          aria-label="Limpar seleção (Esc)"
          title="Limpar seleção (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
};

const BarButton = ({ icon: Icon, label, onClick, disabled, danger }: { icon: typeof Eye; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) => (
  <Button
    size="sm"
    variant="ghost"
    onClick={onClick}
    disabled={disabled}
    className={cn("text-primary-foreground hover:bg-white/10 hover:text-primary-foreground", danger && "text-red-300 hover:bg-red-500/15 hover:text-red-200")}
  >
    <Icon className="h-4 w-4" /> {label}
  </Button>
);
