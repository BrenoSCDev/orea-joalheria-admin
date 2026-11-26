import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({ title, isMobile, onMenuClick }: { title: string; isMobile: boolean; onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-full items-center gap-2 px-4 md:px-6">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h2 className="truncate text-base font-semibold tracking-tight md:text-[17px]">{title}</h2>
      </div>
    </header>
  );
}
