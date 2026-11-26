import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, FolderTree, Loader2, RefreshCw, Upload, XCircle } from "lucide-react";
import { catalogService, ImportReport } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";

const SYNCED_FIELDS: [string, string][] = [
  ["Nome", "Nome da peça"],
  ["SKU", "Referência — usada para reconhecer peças já cadastradas"],
  ["Identificador URL", "Endereço no site (somente em peças novas)"],
  ["Categorias", "Categorias e subcategorias (“Anel > Anel com Brilhantes”), criadas automaticamente"],
  ["Preço", "Preço; 0 ou vazio vira “Sob consulta”"],
  ["Estoque", "Até 1 unidade = peça única (padrão); mais de 1 registra a quantidade"],
  ["Descrição", "Descrição (texto; vazio não apaga a atual)"],
  ["Exibir na loja / Visibilidade", "Publicada ou rascunho"],
];

const PREVIEW_ROWS = 50;

type Step = "select" | "preview" | "done";

const ProductImport = () => {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const run = useMutation({
    mutationFn: ({ f, dryRun }: { f: File; dryRun: boolean }) => catalogService.importProducts(f, dryRun),
    onSuccess: (data, { dryRun }) => {
      setReport(data);
      setStep(dryRun ? "preview" : "done");
      if (!dryRun) {
        toast.success(`Importação concluída: ${data.created} novas, ${data.updated} atualizadas.`);
        ["products", "categories", "dashboard"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      }
    },
    onError: (e) => toast.error(getErrorMessage(e, "Não foi possível ler o arquivo.")),
  });

  const pick = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) return toast.error("Selecione o arquivo .csv exportado do e-commerce.");
    if (f.size > 10 * 1024 * 1024) return toast.error("O arquivo passa de 10 MB.");
    setFile(f);
    setShowAll(false);
    run.mutate({ f, dryRun: true });
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    setStep("select");
  };

  const toImport = report ? report.created + report.updated : 0;
  const items = report ? (showAll ? report.items : report.items.slice(0, PREVIEW_ROWS)) : [];

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/produtos" aria-label="Voltar para peças">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-[13px] text-muted-foreground">Envie o CSV de produtos exportado do e-commerce. Nada é gravado antes da sua confirmação.</p>
      </div>

      {/* Step indicator */}
      <ol className="mb-6 flex flex-wrap items-center gap-2 text-[12.5px]">
        {[
          ["select", "1. Arquivo"],
          ["preview", "2. Revisão"],
          ["done", "3. Concluído"],
        ].map(([key, label], i, arr) => {
          const index = arr.findIndex(([k]) => k === step);
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-medium",
                  i === index ? "bg-primary text-primary-foreground" : i < index ? "bg-success-light text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < arr.length - 1 && <span className="h-px w-6 bg-border" />}
            </li>
          );
        })}
      </ol>

      {step === "select" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <button
                type="button"
                disabled={run.isPending}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pick(e.dataTransfer.files);
                }}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center transition-colors",
                  dragOver ? "border-brand bg-brand-soft" : "border-input hover:border-brand/60 hover:bg-muted/40",
                )}
              >
                {run.isPending ? (
                  <>
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-brand-deep" />
                    <span className="font-medium">Analisando {file?.name}…</span>
                    <span className="mt-1 text-[12px] text-muted-foreground">Simulando a importação, nada está sendo gravado.</span>
                  </>
                ) : (
                  <>
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
                      <FileSpreadsheet className="h-6 w-6" />
                    </span>
                    <span className="font-medium">{dragOver ? "Solte o arquivo aqui" : "Arraste o CSV ou clique para selecionar"}</span>
                    <span className="mt-1 text-[12px] text-muted-foreground">Arquivo .csv separado por “;” · até 10 MB</span>
                  </>
                )}
              </button>
              <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Campos sincronizados</CardTitle>
                <CardDescription>Apenas os essenciais; as demais colunas são ignoradas.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-[12.5px]">
                {SYNCED_FIELDS.map(([col, desc]) => (
                  <div key={col}>
                    <dt className="font-medium">{col}</dt>
                    <dd className="text-muted-foreground">{desc}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-[12px] text-muted-foreground">
                Peças que não estão no arquivo não são alteradas nem excluídas. Fotos, coleção e destaque definidos no painel são preservados.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {report && step !== "select" && (
        <div className="space-y-6">
          {step === "done" && (
            <Card className="border-success/30">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
                <div className="flex-1">
                  <p className="font-semibold">Importação concluída</p>
                  <p className="text-[13px] text-muted-foreground">
                    {report.created} {report.created === 1 ? "peça nova" : "peças novas"}, {report.updated} {report.updated === 1 ? "atualizada" : "atualizadas"}
                    {report.categories_created.length > 0 && ` e ${report.categories_created.length} categorias criadas`}. O CSV não traz fotos: adicione as imagens em cada peça.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={reset}>
                    <Upload /> Outro arquivo
                  </Button>
                  <Button asChild>
                    <Link to="/produtos">Ver peças</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Numbers */}
          <Card className="grid grid-cols-2 divide-border overflow-hidden lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r lg:[&>*:nth-child(odd)]:border-r-0">
            {[
              { label: step === "done" ? "Peças criadas" : "Peças novas", value: report.created, tone: "text-foreground" },
              { label: step === "done" ? "Peças atualizadas" : "Peças a atualizar", value: report.updated, tone: "text-foreground" },
              { label: "Linhas ignoradas", value: report.skipped, tone: report.skipped ? "text-destructive" : "text-foreground" },
              { label: "Categorias novas", value: report.categories_created.length, tone: "text-foreground" },
            ].map((s) => (
              <div key={s.label} className="p-5">
                <p className="text-[12.5px] text-muted-foreground">{s.label}</p>
                <p className={cn("mt-1 text-[28px] font-semibold leading-none tabular-nums", s.tone)}>{s.value}</p>
              </div>
            ))}
          </Card>

          {report.errors.length > 0 && (
            <IssueList tone="error" title={`${report.errors.length} ${report.errors.length === 1 ? "linha será ignorada" : "linhas serão ignoradas"}`} issues={report.errors} />
          )}
          {report.warnings.length > 0 && <IssueList tone="warning" title="Avisos" issues={report.warnings} />}

          {report.categories_created.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-brand-deep" /> {step === "done" ? "Categorias criadas" : "Categorias que serão criadas"}
                  </CardTitle>
                  <CardDescription>Você pode renomear ou reorganizar depois em Categorias.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-1.5">
                  {report.categories_created.map((path) => (
                    <li key={path} className="rounded-md border bg-muted/50 px-2 py-1 text-[12px]">
                      {path}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div>
                <CardTitle>{step === "done" ? "Peças importadas" : "Pré-visualização"}</CardTitle>
                <CardDescription>
                  {file?.name} · {report.total_rows} {report.total_rows === 1 ? "linha" : "linhas"}
                </CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto border-t">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-5 py-2.5 font-semibold">Linha</th>
                    <th className="px-4 py-2.5 font-semibold">Peça</th>
                    <th className="hidden px-4 py-2.5 font-semibold lg:table-cell">Categorias</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Preço</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Estoque</th>
                    <th className="px-4 py-2.5 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={`${it.line}-${it.sku}`} className="border-b last:border-0">
                      <td className="px-5 py-2.5 tabular-nums text-muted-foreground">{it.line}</td>
                      <td className="max-w-[280px] px-4 py-2.5">
                        <p className="truncate font-medium">{it.name}</p>
                        <p className="text-[12px] text-muted-foreground">{it.sku || "Sem SKU"}</p>
                      </td>
                      <td className="hidden max-w-[280px] px-4 py-2.5 text-[12px] text-muted-foreground lg:table-cell">
                        <p className="line-clamp-2">{it.categories.join(", ") || "—"}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{it.price ? formatPrice(it.price) : <span className="text-muted-foreground">Sob consulta</span>}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{it.is_unique ? (it.stock_quantity > 0 ? "Única" : "Vendida") : it.stock_quantity}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={it.action === "create" ? "success" : "outline"}>{it.action === "create" ? "Nova" : "Atualizar"}</Badge>
                          {!it.is_active && <Badge variant="muted">Rascunho</Badge>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.items.length > PREVIEW_ROWS && (
              <div className="border-t px-5 py-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Mostrar menos" : `Mostrar todas as ${report.items.length} peças`}
                </Button>
              </div>
            )}
          </Card>

          {step === "preview" && (
            <div className="sticky bottom-0 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
              <div className="mx-auto flex max-w-7xl flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <span className="text-[13px] text-muted-foreground sm:mr-auto">Revise os dados acima. Nada foi gravado ainda.</span>
                <Button variant="outline" onClick={reset} disabled={run.isPending}>
                  <RefreshCw /> Escolher outro arquivo
                </Button>
                <Button onClick={() => file && run.mutate({ f: file, dryRun: false })} disabled={!toImport || run.isPending}>
                  {run.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                  {run.isPending ? "Importando…" : `Importar ${toImport} ${toImport === 1 ? "peça" : "peças"}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

const IssueList = ({ tone, title, issues }: { tone: "error" | "warning"; title: string; issues: ImportReport["errors"] }) => {
  const Icon = tone === "error" ? XCircle : AlertTriangle;
  return (
    <Card className={tone === "error" ? "border-destructive/30" : "border-warning/30"}>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", tone === "error" ? "text-destructive" : "text-warning")}>
          <Icon className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="max-h-64 space-y-1.5 overflow-y-auto text-[12.5px]">
          {issues.map((i, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="w-16 shrink-0 tabular-nums text-muted-foreground">Linha {i.line}</span>
              <span>
                {i.name && <span className="font-medium">{i.name}: </span>}
                {i.message}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ProductImport;
