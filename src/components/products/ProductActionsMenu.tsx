import { useNavigate } from "react-router-dom";
import { ExternalLink, Eye, EyeOff, MoreHorizontal, Pencil, Sparkles, Star, StarHalf, Trash2 } from "lucide-react";
import { SITE_URL } from "@/config/api";
import { Product, ProductToggle } from "@/types/api";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  onToggle: (data: ProductToggle) => void;
  onDelete: () => void;
  className?: string;
}

/** Per-product menu shared by the table, the grid and the mobile list. */
export const ProductActionsMenu = ({ product: p, onToggle, onDelete, className }: Props) => {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)} onClick={(e) => e.stopPropagation()} aria-label={`Ações de ${p.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => navigate(`/produtos/${p.id}`)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onToggle({ is_active: !p.is_active })}>
          {p.is_active ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {p.is_active ? "Despublicar" : "Publicar no site"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onToggle({ is_featured: !p.is_featured })}>
          <Star className="mr-2 h-4 w-4" /> {p.is_featured ? "Remover destaque" : "Marcar como destaque"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onToggle({ is_subfeatured: !p.is_subfeatured })}>
          <StarHalf className="mr-2 h-4 w-4" /> {p.is_subfeatured ? "Remover subdestaque" : "Marcar como subdestaque"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onToggle({ is_spotlight: !p.is_spotlight })}>
          <Sparkles className="mr-2 h-4 w-4" /> {p.is_spotlight ? "Remover peça destaque" : "Tornar peça destaque"}
        </DropdownMenuItem>
        {p.is_active && (
          <DropdownMenuItem asChild>
            <a href={`${SITE_URL}/joias/${p.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Ver no site
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:bg-destructive-light focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
