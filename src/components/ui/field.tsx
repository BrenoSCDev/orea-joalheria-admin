import { Label } from "./label";
import { cn } from "@/lib/utils";

/** Label + control + hint/error, consistent spacing for every form. */
export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("space-y-1.5", className)}>
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[13px] font-medium">
      {label}
      {optional && <span className="text-[11px] font-normal text-muted-foreground">opcional</span>}
    </Label>
    {children}
    {error ? <p className="text-[12px] text-destructive">{error}</p> : hint ? <p className="text-[12px] text-muted-foreground">{hint}</p> : null}
  </div>
);
