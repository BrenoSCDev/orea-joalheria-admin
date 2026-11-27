import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCatalogRealtime } from "@/hooks/useCatalogRealtime";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ROUTE_TITLES } from "./navigation";

const COLLAPSED_KEY = "joalheria_sidebar_collapsed";

export function MainLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  // Real-time cache refresh keeps running; there is no visual indicator.
  useCatalogRealtime();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      return !value;
    });

  // Exposed globally so portaled fixed bars (e.g. Settings save bar) can align with the content area.
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-offset", isMobile ? "0px" : collapsed ? "68px" : "256px");
  }, [isMobile, collapsed]);

  const path = location.pathname;
  const match = Object.keys(ROUTE_TITLES)
    .filter((p) => p === "/" ? path === "/" : path.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  const title = /^\/produtos\/\d+/.test(path) ? "Editar peça" : /^\/campanhas\/\d+/.test(path) ? "Editar campanha" : ROUTE_TITLES[match] ?? "Painel";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <div className={isMobile ? "" : cn("transition-[padding] duration-200 ease-out", collapsed ? "pl-[68px]" : "pl-64")}>
        <TopBar title={title} isMobile={isMobile} onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-4 py-5 md:px-8 md:py-7">
          <div key={path} className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
