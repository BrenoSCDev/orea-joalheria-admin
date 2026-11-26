import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Gem, ImageOff, Layers, Plus, Tags } from "lucide-react";
import { catalogService } from "@/services/catalogService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { ProductThumb } from "@/components/products/ProductThumb";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { formatPrice } from "@/lib/utils";

const todayRaw = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: catalogService.dashboard });

  const stats = data && [
    { label: "Publicadas no site", value: data.products_active, to: "/produtos?status=published" },
    { label: "Rascunhos", value: data.products - data.products_active, to: "/produtos?status=draft" },
    { label: "Sem estoque", value: data.products_out_of_stock, to: "/produtos?status=out_of_stock" },
    { label: "Sem imagens", value: data.without_images, to: "/produtos" },
  ];

  const attention = data && [...data.out_of_stock];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-muted-foreground">{today}</p>
          <h1 className="mt-0.5 text-2xl">Olá, {user?.name?.split(" ")[0]}</h1>
        </div>
        <Button asChild>
          <Link to="/produtos/novo">
            <Plus /> Nova peça
          </Link>
        </Button>
      </div>

      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {/* Key numbers: one surface, four cells (no card soup) */}
      <Card className="mb-6 grid grid-cols-2 divide-border overflow-hidden lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r lg:[&>*:nth-child(odd)]:border-r-0">
        {isLoading || !stats
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-12" />
              </div>
            ))
          : stats.map((s) => (
              <Link key={s.label} to={s.to} className="group p-5 transition-colors hover:bg-muted/50">
                <p className="text-[12.5px] text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums">{s.value}</p>
              </Link>
            ))}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Atualizadas recentemente</CardTitle>
              <CardDescription>As últimas peças criadas ou editadas.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/produtos">
                Ver todas <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            )}
            {data && data.recent_products.length === 0 && (
              <EmptyState
                icon={Gem}
                title="Nenhuma peça cadastrada"
                description="Cadastre a primeira joia para começar a montar o catálogo."
                action={
                  <Button asChild>
                    <Link to="/produtos/novo">
                      <Plus /> Cadastrar peça
                    </Link>
                  </Button>
                }
              />
            )}
            <ul className="-mx-2">
              {data?.recent_products.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/produtos/${p.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
                  >
                    <ProductThumb url={p.cover_image?.url} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-[12px] text-muted-foreground tabular-nums">{formatPrice(p.price)}</span>
                    </span>
                    <ProductStatusBadge product={p} />
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Attention + shortcuts */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Precisa de atenção</CardTitle>
                <CardDescription>Peças publicadas sem estoque.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {isLoading && <Skeleton className="h-20" />}
              {attention && attention.length === 0 && (
                <p className="rounded-lg bg-success-light px-3 py-2.5 text-[13px] text-success">Tudo em ordem por aqui.</p>
              )}
              <ul className="-mx-2">
                {attention?.map((p) => (
                  <li key={p.id}>
                    <Link to={`/produtos/${p.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
                      <ProductThumb url={p.cover_image?.url} className="h-9 w-9" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </Link>
                  </li>
                ))}
              </ul>
              {data && data.without_images > 0 && (
                <p className="mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <ImageOff className="h-4 w-4" /> {data.without_images} {data.without_images === 1 ? "peça sem imagem" : "peças sem imagens"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-3">
              {[
                { to: "/categorias", icon: Tags, label: "Categorias", value: data?.categories },
                { to: "/colecoes", icon: Layers, label: "Coleções", value: data?.collections },
              ].map((row) => (
                <Link key={row.to} to={row.to} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60">
                  <row.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-[13px] font-medium">{row.label}</span>
                  <span className="text-[13px] tabular-nums text-muted-foreground">{row.value ?? "–"}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
