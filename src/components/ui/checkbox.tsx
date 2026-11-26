import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean, event: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Accessible checkbox with an indeterminate state (used for row and "select page" selection). */
export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(({ checked, onCheckedChange, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="checkbox"
    aria-checked={checked === "indeterminate" ? "mixed" : checked}
    onClick={(e) => {
      e.stopPropagation();
      onCheckedChange(checked !== true, e);
    }}
    className={cn(
      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      checked ? "border-brand-deep bg-brand-deep text-white" : "border-input bg-background hover:border-brand/70",
      className,
    )}
    {...props}
  >
    {checked === "indeterminate" ? <Minus className="h-3 w-3" strokeWidth={3} /> : checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
  </button>
));
Checkbox.displayName = "Checkbox";
