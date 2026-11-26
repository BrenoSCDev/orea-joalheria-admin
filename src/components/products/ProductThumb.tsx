import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";

export const ProductThumb = ({ url, className }: { url?: string | null; className?: string }) => (
  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted", className)}>
    {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Gem className="h-4 w-4 text-muted-foreground/60" />}
  </div>
);
