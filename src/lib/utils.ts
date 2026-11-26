import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.234,56", or "Sob consulta" when the price is empty. */
export function formatPrice(price: string | number | null | undefined): string {
  if (price === null || price === undefined || price === "") return "Sob consulta";
  return brl.format(Number(price));
}
