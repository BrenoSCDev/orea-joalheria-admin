/** "28900.00" (API) → "28.900,00" (input). */
export function priceToInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "28.900,00" | "28900" | "28900.5" → 28900 | 28900.5 ; "" → null ; invalid → NaN. */
export function inputToPrice(value: string): number | null {
  const v = value.trim().replace(/^R\$\s*/, "");
  if (!v) return null;
  const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  return Number(normalized);
}
