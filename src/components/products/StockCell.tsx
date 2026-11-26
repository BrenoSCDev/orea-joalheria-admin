import { Product } from "@/types/api";
import { StockInput } from "./StockInput";
import { cn } from "@/lib/utils";

/**
 * Stock in lists. Unique pieces toggle between "Disponível" (1) and "Vendida" (0);
 * other pieces get the inline quantity editor.
 */
export const StockCell = ({ product, onSave }: { product: Pick<Product, "is_unique" | "stock_quantity">; onSave: (qty: number) => void }) => {
  if (!product.is_unique) return <StockInput value={product.stock_quantity} onSave={onSave} />;
  const available = product.stock_quantity > 0;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSave(available ? 0 : 1);
      }}
      title={available ? "Peça única disponível — clique para marcar como vendida" : "Peça única vendida — clique para marcar como disponível"}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 text-[12px] transition-colors hover:border-input",
        available ? "text-foreground" : "text-warning",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", available ? "bg-brand" : "bg-warning")} />
      {available ? "Única" : "Vendida"}
    </button>
  );
};
