import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Truck, Store, QrCode, Wallet, ShieldCheck, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart, cartTotal } from "@/store/cart";
import { formatBRL } from "@/lib/format";
import { buildOrderMessage, openWhatsApp, STORE_WHATSAPP } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { getMpPublicKey, createMpCardPayment } from "@/lib/mercadopago.functions";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  component: CheckoutPage,
});

type DeliveryType = "delivery" | "pickup";
type PaymentMethod = "pix" | "on_delivery" | "mp_card";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { MercadoPago?: any } }

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const total = cartTotal(items);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Quixeré");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mp_card");
  const [notes, setNotes] = useState("");

  const createCardPayment = useServerFn(createMpCardPayment);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/checkout" } });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.phone) setPhone(profile.phone);
      if (data.user.email) setEmail(data.user.email);
      setCheckingAuth(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!checkingAuth && items.length === 0) {
      navigate({ to: "/carrinho" });
    }
  }, [checkingAuth, items.length, navigate]);

  const address = { city, neighborhood, street, number, complement, reference };
  const rpcItems = items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }));
  const customerPayload = { name, phone };

  function validateBasics(): string | null {
    if (!name || !phone) return "Preencha nome e WhatsApp";
    if (paymentMethod === "mp_card" && !email) return "Informe seu email para pagamento com cartão";
    if (deliveryType === "delivery" && (!street || !number || !neighborhood))
      return "Preencha o endereço de entrega";
    return null;
  }

  async function handleLegacySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const err = validateBasics();
    if (err) return toast.error(err);
    setSubmitting(true);
    try {
      const legacyItems = items.map((i) => ({
        variant_id: i.variantId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        snapshot: { name: i.name, image: i.image, color: i.color, size: i.size, slug: i.slug },
      }));
      const { data, error } = await supabase.rpc("create_order", {
        p_items: legacyItems,
        p_customer: customerPayload,
        p_delivery_type: deliveryType,
        p_delivery_address: deliveryType === "delivery" ? address : { city, pickup: true },
        p_payment_method: paymentMethod === "pix" ? "pix" : "on_delivery",
        p_notes: notes || "",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) throw new Error("Não foi possível criar o pedido");
      const orderId = row.id as string;
      const orderNumber = row.order_number as string;
      toast.success("Pedido criado com sucesso.");
      const msg = buildOrderMessage(
        {
          order_number: orderNumber,
          total,
          delivery_type: deliveryType,
          payment_method: paymentMethod === "pix" ? "pix" : "on_delivery",
          customer_snapshot: { name, phone },
          delivery_address: address,
        },
        items.map((i) => ({
          quantity: i.quantity,
          unit_price: i.unitPrice,
          product_snapshot: { name: i.name, color: i.color, size: i.size },
        })),
      );
      openWhatsApp(STORE_WHATSAPP, msg);
      clear();
      navigate({ to: "/pedido/$id", params: { id: orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar pedido");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-32 md:px-6 md:py-14">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">Finalizar pedido</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha seus dados para concluirmos seu pedido.
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Atualmente realizamos entregas apenas em <strong>Quixeré</strong> e cidades da região.
        </p>
      </div>

      <form onSubmit={handleLegacySubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Seus dados
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" required value={name} onChange={setName} />
              <Field label="WhatsApp" required value={phone} onChange={setPhone} placeholder="(88) 9 9999-9999" />
              <Field
                label={paymentMethod === "mp_card" ? "Email (obrigatório p/ cartão)" : "Email"}
                required={paymentMethod === "mp_card"}
                value={email}
                onChange={setEmail}
                type="email"
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Forma de entrega
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <OptionCard
                icon={<Truck className="h-5 w-5" />}
                title="Entrega pela FM IMPORTS"
                description="Nossa equipe realizará a entrega no endereço informado."
                selected={deliveryType === "delivery"}
                onClick={() => setDeliveryType("delivery")}
              />
              <OptionCard
                icon={<Store className="h-5 w-5" />}
                title="Retirar na loja"
                description="Retire seu pedido em nossa loja após a confirmação."
                selected={deliveryType === "pickup"}
                onClick={() => setDeliveryType("pickup")}
              />
            </div>

            {deliveryType === "delivery" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Cidade" required value={city} onChange={setCity} />
                <Field label="Bairro" required value={neighborhood} onChange={setNeighborhood} />
                <Field label="Rua" required value={street} onChange={setStreet} className="sm:col-span-2" />
                <Field label="Número" required value={number} onChange={setNumber} />
                <Field label="Complemento (opcional)" value={complement} onChange={setComplement} />
                <Field label="Ponto de referência" value={reference} onChange={setReference} className="sm:col-span-2" />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Forma de pagamento
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <OptionCard
                icon={<CreditCard className="h-5 w-5" />}
                title="Cartão (Mercado Pago)"
                description="Pagamento seguro com aprovação imediata. Parcele em até 12x."
                selected={paymentMethod === "mp_card"}
                onClick={() => setPaymentMethod("mp_card")}
              />
              <OptionCard
                icon={<QrCode className="h-5 w-5" />}
                title="PIX (via WhatsApp)"
                description="Confirmamos a disponibilidade e enviamos a chave PIX pelo WhatsApp."
                selected={paymentMethod === "pix"}
                onClick={() => setPaymentMethod("pix")}
              />
              <OptionCard
                icon={<Wallet className="h-5 w-5" />}
                title="Pagar na entrega"
                description="Dinheiro, PIX ou cartão no momento da entrega."
                selected={paymentMethod === "on_delivery"}
                onClick={() => setPaymentMethod("on_delivery")}
              />
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-gold"
                placeholder="Ex: Deixar com o porteiro"
              />
            </div>

            {paymentMethod === "mp_card" && total > 0 && (
              <MercadoPagoBrick
                amount={total}
                onSubmit={async (mpForm) => {
                  const err = validateBasics();
                  if (err) { toast.error(err); throw new Error(err); }
                  setSubmitting(true);
                  try {
                    const res = await createCardPayment({
                      data: {
                        items: rpcItems,
                        customer: { name, phone, email },
                        delivery_type: deliveryType,
                        delivery_address: deliveryType === "delivery" ? address : { city, pickup: true },
                        notes: notes || undefined,
                        mp: mpForm,
                      },
                    });
                    if (res.status === "approved") {
                      toast.success("Pagamento aprovado!");
                    } else if (res.status === "rejected" || res.status === "cancelled") {
                      toast.error("Pagamento recusado: " + (res.statusDetail ?? res.status));
                    } else {
                      toast.info("Pagamento em análise. Você será notificado.");
                    }
                    clear();
                    navigate({ to: "/pedido/$id", params: { id: res.orderId } });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Falha no pagamento");
                    throw e;
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            )}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Resumo do pedido
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((it) => (
              <li key={it.variantId} className="flex justify-between gap-2">
                <span className="line-clamp-1 text-muted-foreground">
                  {it.name} × {it.quantity}
                </span>
                <span className="shrink-0 font-medium">{formatBRL(it.unitPrice * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="my-5 border-t border-border" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="font-display text-2xl font-bold">{formatBRL(total)}</span>
          </div>

          {paymentMethod === "mp_card" ? (
            <p className="mt-6 rounded-xl border border-border bg-background/60 px-4 py-3 text-center text-xs text-muted-foreground">
              Preencha os dados do cartão acima e finalize o pagamento pelo Mercado Pago.
            </p>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full gradient-gold py-3.5 text-sm font-semibold text-black disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Enviando pedido…" : "Finalizar pedido"}
            </button>
          )}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {paymentMethod === "mp_card"
              ? "Ambiente seguro Mercado Pago · SSL 256 bits"
              : "Você será redirecionado para o WhatsApp da loja em seguida."}
          </p>
          <Link to="/carrinho" className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground">
            ← Voltar para a sacola
          </Link>
        </aside>
      </form>
    </div>
  );
}

type MpFormData = {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number;
  installments: number;
  payer: { email: string; identification: { type: string; number: string } };
};

function MercadoPagoBrick({
  amount,
  onSubmit,
}: {
  amount: number;
  onSubmit: (data: MpFormData) => Promise<void>;
}) {
  const containerId = "mp-card-brick-container";
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brickRef = useRef<any>(null);
  const getKey = useServerFn(getMpPublicKey);

  useEffect(() => {
    getKey().then((r) => setPublicKey(r.publicKey)).catch(() => toast.error("MP não configurado"));
  }, [getKey]);

  useEffect(() => {
    let cancelled = false;
    if (!publicKey) return;

    async function waitForSdk() {
      for (let i = 0; i < 40; i++) {
        if (typeof window !== "undefined" && window.MercadoPago) return true;
        await new Promise((r) => setTimeout(r, 150));
      }
      return false;
    }

    (async () => {
      const ok = await waitForSdk();
      if (!ok || cancelled) {
        toast.error("Não foi possível carregar o Mercado Pago");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mp = new (window as any).MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      if (brickRef.current) {
        try { brickRef.current.unmount(); } catch { /* noop */ }
        brickRef.current = null;
      }
      brickRef.current = await bricks.create("cardPayment", containerId, {
        initialization: { amount },
        customization: {
          visual: { style: { theme: "dark" } },
          paymentMethods: { maxInstallments: 12 },
        },
        callbacks: {
          onReady: () => setReady(true),
          onSubmit: (form: { formData: MpFormData }) =>
            new Promise<void>((resolve, reject) => {
              onSubmit(form.formData).then(resolve).catch(reject);
            }),
          onError: (err: unknown) => {
            console.error("[MP Brick]", err);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      if (brickRef.current) {
        try { brickRef.current.unmount(); } catch { /* noop */ }
        brickRef.current = null;
      }
    };
  }, [publicKey, amount, onSubmit]);

  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-background p-4">
      {!ready && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-gold" /> Carregando pagamento seguro…
        </div>
      )}
      <div id={containerId} />
    </div>
  );
}

function Field({
  label, value, onChange, required, placeholder, className, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:border-gold"
      />
    </div>
  );
}

function OptionCard({
  icon, title, description, selected, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-gold bg-gold/5 shadow-gold"
          : "border-border bg-background hover:border-muted-foreground/40",
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", selected ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  );
}
