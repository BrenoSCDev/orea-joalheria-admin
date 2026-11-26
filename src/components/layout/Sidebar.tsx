import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { ChevronsUpDown, ExternalLink, LogOut, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from "lucide-react";
import logo from "@/assets/brand/logo-orea.png";
import symbol from "@/assets/brand/symbol-orea.png";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_URL } from "@/config/api";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./navigation";

interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/** Tooltip only in icon-only mode (labels are hidden then). */
function WithTooltip({ show, label, children }: { show: boolean; label: string; children: ReactNode }) {
  if (!show) return <>{children}</>;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div>{children}</div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarItem({ to, end, icon: Icon, label, collapsed, onNavigate }: { to: string; end?: boolean; icon: LucideIcon; label: string; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <WithTooltip show={collapsed} label={label}>
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "group relative flex h-9 items-center gap-2.5 rounded-lg text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed ? "justify-center px-0" : "px-2.5",
            isActive
              ? "bg-background font-semibold text-foreground shadow-sm ring-1 ring-sidebar-border"
              : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-brand-deep" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/80")} />
            {!collapsed && <span className="truncate">{label}</span>}
          </>
        )}
      </NavLink>
    </WithTooltip>
  );
}

function SectionLabel({ children, collapsed }: { children: ReactNode; collapsed: boolean }) {
  if (collapsed) return <div className="mx-auto my-2 h-px w-6 bg-sidebar-border" aria-hidden />;
  return <p className="px-2.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">{children}</p>;
}

export function Sidebar({ isMobile = false, isOpen = false, onClose, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const isCollapsed = !isMobile && collapsed;
  const handleNav = () => isMobile && onClose?.();

  const content = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-14 shrink-0 items-center gap-2", isCollapsed ? "justify-center px-2" : "px-4")}>
        {isCollapsed ? (
          <WithTooltip show label="Expandir menu">
            <button type="button" onClick={onToggleCollapsed} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-sidebar-accent" aria-label="Expandir menu">
              <img src={symbol} alt="Oréa" className="h-6 w-6" />
            </button>
          </WithTooltip>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <img src={logo} alt="Oréa" className="h-6 w-auto" />
              <span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">Painel</span>
            </div>
            <button
              type="button"
              onClick={isMobile ? onClose : onToggleCollapsed}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label={isMobile ? "Fechar" : "Recolher menu"}
              title={isMobile ? "Fechar" : "Recolher menu"}
            >
              {isMobile ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("scrollbar-none min-h-0 flex-1 overflow-y-auto pb-3", isCollapsed ? "px-2" : "px-3")}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label || "home"}>
            {section.label && <SectionLabel collapsed={isCollapsed}>{section.label}</SectionLabel>}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarItem key={item.href} to={item.href} end={item.href === "/"} icon={item.icon} label={item.name} collapsed={isCollapsed} onNavigate={handleNav} />
              ))}
            </div>
          </div>
        ))}

        <div className={cn("mt-1 space-y-0.5")}>
          <WithTooltip show={isCollapsed} label="Ver site público">
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex h-9 items-center gap-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                isCollapsed ? "justify-center" : "px-2.5",
              )}
            >
              <ExternalLink className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/55" />
              {!isCollapsed && "Ver site público"}
            </a>
          </WithTooltip>
        </div>
      </nav>

      {/* User */}
      <div className={cn("shrink-0 border-t border-sidebar-border", isCollapsed ? "space-y-1 p-2" : "p-3")}>
        {isCollapsed && (
          <WithTooltip show label="Expandir menu">
            <button type="button" onClick={onToggleCollapsed} className="flex h-9 w-full items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/70" aria-label="Expandir menu">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </WithTooltip>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isCollapsed ? "justify-center p-1" : "p-1.5",
              )}
              aria-label="Menu da conta"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(user?.name)}</span>
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-semibold">{user?.name}</span>
                    <span className="block truncate text-[11px] text-sidebar-foreground/55">Administrador</span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isCollapsed ? "right" : "top"} align={isCollapsed ? "end" : "start"} className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 [&>button]:hidden">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className={cn("fixed inset-y-0 left-0 z-40 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out", isCollapsed ? "w-[68px]" : "w-64")}>
      {content}
    </aside>
  );
}
