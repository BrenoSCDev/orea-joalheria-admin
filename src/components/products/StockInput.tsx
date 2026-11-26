import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Inline stock editor: saves on blur or Enter, Esc reverts. */
export const StockInput = ({ value, onSave, className }: { value: number; onSave: (qty: number) => void; className?: string }) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const qty = Math.max(0, Math.floor(Number(draft)));
    if (Number.isNaN(qty)) return setDraft(String(value));
    if (qty !== value) onSave(qty);
    setDraft(String(qty));
  };

  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      value={draft}
      aria-label="Estoque"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(String(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(
        "h-8 w-[72px] rounded-md [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none border border-transparent bg-transparent px-2 text-[13px] tabular-nums transition-colors hover:border-input focus:border-ring/60 focus:bg-background focus:outline-none focus:ring-[3px] focus:ring-ring/15",
        value === 0 && "text-warning",
        className,
      )}
    />
  );
};
