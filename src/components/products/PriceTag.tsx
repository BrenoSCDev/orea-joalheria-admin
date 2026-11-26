import { Product } from "@/types/api";
import { cn, formatPrice } from "@/lib/utils";

/** Price for lists: "Sob consulta", the price, or the promotional price with the regular one struck through. */
export const PriceTag = ({ product: p, className }: { product: Pick<Product, "price" | "promotional_price">; className?: string }) => {
  if (!p.price) return <span className={cn("text-muted-foreground", className)}>Sob consulta</span>;
  if (!p.promotional_price) return <span className={cn("tabular-nums", className)}>{formatPrice(p.price)}</span>;

  const off = Math.round((1 - Number(p.promotional_price) / Number(p.price)) * 100);
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 tabular-nums", className)}>
      <span className="text-[11.5px] text-muted-foreground line-through">{formatPrice(p.price)}</span>
      <span className="font-medium text-brand-deep">{formatPrice(p.promotional_price)}</span>
      {off > 0 && <span className="text-[11px] font-medium text-brand-deep">−{off}%</span>}
    </span>
  );
};
