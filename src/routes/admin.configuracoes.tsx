import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/configuracoes")({ component: SettingsPage });

const KEYS = ["store", "contact", "social", "payment", "footer"] as const;

type Settings = Record<string, any>;

function SettingsPage() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Settings>({
    store: { name: "FM IMPORTS", logo_url: "" },
    contact: { phone: "", whatsapp: "", email: "", address: "" },
    social: { instagram: "", facebook: "", tiktok: "" },
    payment: { mercadopago_public_key: "", pix_key: "" },
    footer: { text: "" },
  });

  const q = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const out: Settings = {};
      for (const row of data ?? []) out[row.key] = row.value;
      return out;
    },
  });

  useEffect(() => {
    if (q.data) setValues((v) => ({ ...v, ...q.data }));
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const rows = KEYS.map((k) => ({ key: k, value: values[k] ?? {} }));
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (group: string, field: string, val: string) =>
    setValues((v) => ({ ...v, [group]: { ...(v[group] ?? {}), [field]: val } }));

  if (q.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Ajuste identidade, contatos e integrações da loja."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gradient-gold text-black hover:opacity-90">
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
          </Button>
        }
      />

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList>
          <TabsTrigger value="store">Loja</TabsTrigger>
          <TabsTrigger value="contact">Contato</TabsTrigger>
          <TabsTrigger value="social">Redes</TabsTrigger>
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <Field label="Nome da loja"><Input value={values.store?.name ?? ""} onChange={(e) => set("store", "name", e.target.value)} /></Field>
          <Field label="URL do logo"><Input value={values.store?.logo_url ?? ""} onChange={(e) => set("store", "logo_url", e.target.value)} /></Field>
        </TabsContent>

        <TabsContent value="contact" className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone"><Input value={values.contact?.phone ?? ""} onChange={(e) => set("contact", "phone", e.target.value)} /></Field>
            <Field label="WhatsApp"><Input value={values.contact?.whatsapp ?? ""} onChange={(e) => set("contact", "whatsapp", e.target.value)} placeholder="+55 88 98190-7468" /></Field>
            <Field label="Email"><Input type="email" value={values.contact?.email ?? ""} onChange={(e) => set("contact", "email", e.target.value)} /></Field>
            <Field label="Endereço"><Input value={values.contact?.address ?? ""} onChange={(e) => set("contact", "address", e.target.value)} /></Field>
          </div>
        </TabsContent>

        <TabsContent value="social" className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Instagram"><Input value={values.social?.instagram ?? ""} onChange={(e) => set("social", "instagram", e.target.value)} placeholder="@fmimports" /></Field>
            <Field label="Facebook"><Input value={values.social?.facebook ?? ""} onChange={(e) => set("social", "facebook", e.target.value)} /></Field>
            <Field label="TikTok"><Input value={values.social?.tiktok ?? ""} onChange={(e) => set("social", "tiktok", e.target.value)} /></Field>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <Field label="Mercado Pago — Public Key"><Input value={values.payment?.mercadopago_public_key ?? ""} onChange={(e) => set("payment", "mercadopago_public_key", e.target.value)} /></Field>
          <Field label="Chave PIX"><Input value={values.payment?.pix_key ?? ""} onChange={(e) => set("payment", "pix_key", e.target.value)} /></Field>
          <p className="text-xs text-muted-foreground">O Access Token do Mercado Pago é secreto e deve ser configurado como variável de ambiente no servidor.</p>
        </TabsContent>

        <TabsContent value="footer" className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <Field label="Texto do rodapé"><Textarea rows={3} value={values.footer?.text ?? ""} onChange={(e) => set("footer", "text", e.target.value)} /></Field>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
