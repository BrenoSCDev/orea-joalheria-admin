import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/api";

/** Rascunho (not on the site) · Publicada · Vendida (unique piece, 0) · Sem estoque. */
export const ProductStatusBadge = ({ product }: { product: Pick<Product, "is_active" | "stock_quantity"> & { is_unique?: boolean } }) => {
  if (!product.is_active) return <Badge variant="muted">Rascunho</Badge>;
  if (product.stock_quantity <= 0) return <Badge variant="warning">{product.is_unique ? "Vendida" : "Sem estoque"}</Badge>;
  return <Badge variant="success">Publicada</Badge>;
};
