import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { catalogService } from "@/services/catalogService";
import { getErrorMessage } from "@/services/apiClient";
import { SITE_URL } from "@/config/api";
import { SiteSettings } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { cn } from "@/lib/utils";

type Key = keyof SiteSettings;
interface FieldDef {
  key: Key;
  label: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  placeholder?: string;
  inputMode?: "numeric" | "url" | "email" | "tel";
  wide?: boolean;
}

const SECTIONS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "Institucional",
    description: "Nome, slogan e texto da página “A Oréa”.",
    fields: [
      { key: "store_name", label: "Nome da joalheria" },
      { key: "tagline", label: "Slogan", placeholder: "Joias que contam histórias" },
      { key: "cnpj", label: "CNPJ", inputMode: "numeric", hint: "Exibido no rodapé do site.", placeholder: "00.000.000/0000-00" },
      { key: "about", label: "Sobre a Oréa", multiline: true, rows: 6, hint: "Separe parágrafos com uma linha em branco. O primeiro parágrafo também aparece na página inicial.", wide: true },
    ],
  },
  {
    title: "WhatsApp e contato",
    description: "O WhatsApp é o principal canal de conversão do site: todos os botões “Tenho interesse” usam este número.",
    fields: [
      { key: "whatsapp_number", label: "Número do WhatsApp", inputMode: "numeric", hint: "Somente números, com DDI e DDD. Ex.: 5511999999999", placeholder: "5511999999999" },
      { key: "whatsapp_message", label: "Mensagem inicial", hint: "{produto} é substituído pelo nome da peça.", placeholder: "Olá! Tenho interesse na peça {produto}." },
      { key: "phone", label: "Telefone", inputMode: "tel" },
      { key: "email", label: "E-mail", inputMode: "email" },
      { key: "address", label: "Endereço", multiline: true, rows: 2 },
      { key: "opening_hours", label: "Horário de atendimento", placeholder: "Seg. a sáb., 10h às 19h" },
    ],
  },
  {
    title: "Redes sociais",
    description: "Links exibidos no rodapé do site.",
    fields: [
      { key: "instagram_url", label: "Instagram", inputMode: "url", placeholder: "https://instagram.com/…" },
      { key: "facebook_url", label: "Facebook", inputMode: "url", placeholder: "https://facebook.com/…" },
    ],
  },
  {
    title: "Página inicial",
    description:
      "Títulos das seções de peças. O texto pequeno aparece acima do título; deixe um campo vazio para ocultar aquela linha. Marque as peças em Peças → Destaque, Subdestaque ou Peça destaque.",
    fields: [
      {
        key: "announcement_bar",
        label: "Faixa de avisos",
        multiline: true,
        rows: 3,
        wide: true,
        placeholder: "Frete grátis para todo o Brasil\nAnéis com 40% off\nParcele em até 10x sem juros",
        hint: "Textos que rolam sem parar na faixa fina acima do cabeçalho, em todas as páginas. Um aviso por linha; deixe vazio para ocultar a faixa.",
      },
      { key: "featured_eyebrow", label: "Destaques · texto pequeno", placeholder: "Seleção Oréa" },
      { key: "featured_title", label: "Destaques · título", placeholder: "Peças escolhidas uma a uma" },
      { key: "subfeatured_eyebrow", label: "Subdestaques · texto pequeno", placeholder: "Novidades" },
      { key: "subfeatured_title", label: "Subdestaques · título", placeholder: "Recém-chegadas à Oréa" },
      { key: "spotlight_eyebrow", label: "Peça destaque · texto pequeno", placeholder: "Peça destaque", hint: "O título é o nome da peça." },
      { key: "hero_subtitle", label: "Frase de apresentação", multiline: true, rows: 2, placeholder: "Peças exclusivas feitas para durar gerações.", wide: true },
    ],
  },
  {
    title: "Campanha Grupo VIP",
    description:
      "Ao clicar nos banners da Black Oréa (carrossel e banner do Grupo VIP), o cliente abre o WhatsApp da Oréa com esta mensagem pedindo para entrar no grupo. O link do grupo não fica público no site.",
    fields: [
      {
        key: "vip_whatsapp_message",
        label: "Mensagem para entrar no Grupo VIP",
        multiline: true,
        rows: 2,
        wide: true,
        placeholder: "Olá! Gostaria de entrar no Grupo VIP da Oréa para aproveitar a Black Oréa.",
        hint: "Enviada para o número de WhatsApp configurado acima. Vazio = mensagem padrão.",
      },
    ],
  },
];

const Settings = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["settings"], queryFn: catalogService.settings });
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const dirty = useMemo(() => !!data && SECTIONS.some((s) => s.fields.some((f) => (form[f.key] ?? "") !== (data[f.key] ?? ""))), [form, data]);

  const save = useMutation({
    mutationFn: catalogService.updateSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(["settings"], saved);
      setErrors({});
      toast.success("Configurações salvas. O site já foi atualizado.");
    },
    onError: (e) => {
      const fieldErrors = (e as AxiosError<{ errors?: Record<string, string[]> }>).response?.data?.errors;
      if (fieldErrors) setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0]])));
      toast.error(getErrorMessage(e, "Não foi possível salvar."));
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Never silently drop the WhatsApp number: it powers every "Tenho interesse" button.
    const rawWhats = (form.whatsapp_number ?? "").toString().trim();
    const whatsDigits = rawWhats.replace(/\D/g, "");
    if (rawWhats && (whatsDigits.length < 10 || whatsDigits.length > 15 || /[^\d\s()+-]/.test(rawWhats))) {
      setErrors((prev) => ({ ...prev, whatsapp_number: "Número inválido. Use DDI + DDD + número, ex.: 5511999999999." }));
      toast.error("Revise o número do WhatsApp.");
      document.getElementById("whatsapp_number")?.focus();
      return;
    }
    const payload = Object.fromEntries(
      SECTIONS.flatMap((s) => s.fields).map((f) => {
        const v = (form[f.key] ?? "").toString().trim();
        return [f.key, f.key === "whatsapp_number" ? v.replace(/\D/g, "") || null : v || null];
      }),
    );
    save.mutate(payload);
  };

  if (isLoading)
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const digits = (form.whatsapp_number ?? "").replace(/\D/g, "");
  const waPreview = digits ? `https://wa.me/${digits}?text=${encodeURIComponent((form.whatsapp_message || "Olá!").replace("{produto}", "Anel Solitário"))}` : null;

  return (
    <form id="settings-form" onSubmit={onSubmit} className="pb-24">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">Informações exibidas no site público. As alterações aparecem em tempo real.</p>
        <Button variant="outline" size="sm" asChild>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> Abrir site
          </a>
        </Button>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardContent className="grid gap-6 md:grid-cols-3 md:gap-10">
              <div>
                <h3 className="text-[15px] font-semibold">{section.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{section.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
                {section.fields.map((f) => {
                  const Comp = f.multiline ? Textarea : Input;
                  return (
                    <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint} error={errors[f.key]} className={cn((f.multiline || f.wide) && "sm:col-span-2")}>
                      <Comp
                        id={f.key}
                        rows={f.rows}
                        inputMode={f.inputMode}
                        placeholder={f.placeholder}
                        value={(form[f.key] as string) ?? ""}
                        aria-invalid={!!errors[f.key]}
                        onChange={(e) => {
                          setForm({ ...form, [f.key]: e.target.value });
                          if (errors[f.key]) setErrors(({ [f.key]: _, ...rest }) => rest);
                        }}
                      />
                    </Field>
                  );
                })}
                {section.title.startsWith("WhatsApp") && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-[12.5px] sm:col-span-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4 text-brand-deep" />
                      {waPreview ? "Teste como o cliente verá a conversa." : "Sem número, os botões de WhatsApp ficam ocultos no site."}
                    </span>
                    {waPreview && (
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={waPreview} target="_blank" rel="noopener noreferrer">
                          Testar link
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save bar — portaled: the page wrapper animates transform, which would trap position:fixed */}
      {createPortal(
      <div
        className={cn(
          "fixed bottom-0 right-0 z-30 border-t bg-background/90 backdrop-blur-md transition-transform duration-200",
          dirty ? "translate-y-0" : "translate-y-full",
        )}
        style={{ left: "var(--sidebar-offset, 0px)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 md:px-8">
          <span className="mr-auto text-[13px] text-muted-foreground">Você tem alterações não salvas.</span>
          <Button type="button" variant="ghost" onClick={() => data && setForm(data)} disabled={save.isPending}>
            Descartar
          </Button>
          <Button type="submit" form="settings-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Salvar alterações
          </Button>
        </div>
      </div>,
        document.body,
      )}
    </form>
  );
};

export default Settings;
