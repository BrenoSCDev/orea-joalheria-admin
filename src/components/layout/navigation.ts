import { BadgePercent, Gem, Globe, LayoutDashboard, Layers, Tags, type LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/** Sidebar sections (same structure as Optomyze Manager's NAV_SECTIONS). */
export const NAV_SECTIONS: { label?: string; items: NavItem[] }[] = [
  { items: [{ name: "Painel", href: "/", icon: LayoutDashboard }] },
  {
    label: "Catálogo",
    items: [
      { name: "Peças", href: "/produtos", icon: Gem },
      { name: "Categorias", href: "/categorias", icon: Tags },
      { name: "Coleções", href: "/colecoes", icon: Layers },
    ],
  },
  { label: "Vendas", items: [{ name: "Desconto geral", href: "/campanhas", icon: BadgePercent }] },
  { label: "Site", items: [{ name: "Site & Institucional", href: "/configuracoes", icon: Globe }] },
];

/** TopBar titles by route prefix (longest match wins). */
export const ROUTE_TITLES: Record<string, string> = {
  "/": "Painel",
  "/produtos/novo": "Nova peça",
  "/produtos/importar": "Importar peças",
  "/produtos": "Peças",
  "/categorias": "Categorias",
  "/colecoes": "Coleções",
  "/campanhas/nova": "Nova campanha",
  "/campanhas": "Desconto Configurado Geral",
  "/configuracoes": "Site & Institucional",
};
