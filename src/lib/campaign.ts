import { Campaign, CampaignCondition, CampaignStatus, PricingOption } from "@/types/api";
import type { CampaignPayload } from "@/services/catalogService";

/** "À vista" | "Em até 6×" */
export function conditionLabel(c: Pick<CampaignCondition | PricingOption, "payment_type" | "max_installments">): string {
  return c.payment_type === "cash" ? "À vista" : `Em até ${c.max_installments}×`;
}

/** 40 → "40%", 12.5 → "12,5%" */
export function formatPercent(value: number | string): string {
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  active: { label: "Em vigor", variant: "success" },
  scheduled: { label: "Agendada", variant: "warning" },
  ended: { label: "Encerrada", variant: "muted" },
  inactive: { label: "Desativada", variant: "muted" },
};

/** ISO (API) → "YYYY-MM-DDTHH:mm" in the browser's timezone (datetime-local input). */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO with timezone, or null. */
export function localInputToIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** "28/11/2026 00:00" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Full payload from a saved campaign (the API replaces the whole configuration on update). */
export function campaignToPayload(c: Campaign, patch: Partial<CampaignPayload> = {}): CampaignPayload {
  return {
    name: c.name,
    is_active: c.is_active,
    applies_to_all: c.applies_to_all,
    override_product_promotions: c.override_product_promotions,
    priority: c.priority,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    conditions: c.conditions.map(({ payment_type, max_installments, discount_percent }) => ({ payment_type, max_installments, discount_percent })),
    include_category_ids: c.include_category_ids,
    exclude_category_ids: c.exclude_category_ids,
    include_product_ids: c.include_products.map((p) => p.id),
    exclude_product_ids: c.exclude_products.map((p) => p.id),
    ...patch,
  };
}
