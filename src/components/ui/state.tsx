import { AlertCircle, type LucideIcon } from "lucide-react";
import { getErrorMessage } from "@/services/apiClient";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
      <Icon className="h-5 w-5" />
    </div>
    <p className="font-semibold">{title}</p>
    {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
  <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-light px-4 py-3 text-[13px] text-destructive">
    <AlertCircle className="h-4 w-4 shrink-0" />
    <span className="flex-1">{getErrorMessage(error)}</span>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    )}
  </div>
);
