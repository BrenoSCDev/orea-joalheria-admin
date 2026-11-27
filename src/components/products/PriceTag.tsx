import { Product } from "@/types/api";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Price for lists: "Sob consulta", the price, or the discounted price with the regular one
 * struck through. Uses the API `pricing` (running campaign, else promotional price) when present.
 */
export const PriceTag = ({ product: p, className }: { product: Pick<Product, "price" | "promotional_price" | "pricing">; className?: string }) => {
  if (!p.price) return <span className={cn("text-muted-foreground", className)}>Sob consulta</span>;

  const current = p.pricing ? p.pricing.price : p.promotional_price;
  const off = p.pricing ? Math.round(p.pricing.discount_percent) : current ? Math.round((1 - Number(current) / Number(p.price)) * 100) : 0;
  if (!current || !off || Number(current) >= Number(p.price)) return <span className={cn("tabular-nums", className)}>{formatPrice(p.price)}</span>;

  const campaign = p.pricing?.source === "campaign" ? p.pricing.campaign?.name : null;
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 tabular-nums", className)} title={campaign ? `Campanha ${campaign} · menor preço (${off}% OFF)` : undefined}>
      <span className="text-[11.5px] text-muted-foreground line-through">{formatPrice(p.price)}</span>
      <span className="font-medium text-brand-deep">{formatPrice(current)}</span>
      {off > 0 && <span className="text-[11px] font-medium text-brand-deep">{campaign ? `${campaign} −${off}%` : `−${off}%`}</span>}
    </span>
  );
};
