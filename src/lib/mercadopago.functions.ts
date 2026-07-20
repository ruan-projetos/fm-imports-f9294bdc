import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Public key (safe to expose) ----------
export const getMpPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const publicKey = process.env.MP_PUBLIC_KEY;
  if (!publicKey) throw new Error("MP_PUBLIC_KEY não configurada");
  return { publicKey };
});

// ---------- Card payment via Mercado Pago Payments API ----------
const itemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().positive().max(50),
});

const customerSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(30),
  email: z.string().email().max(160),
});

const addressSchema = z
  .object({
    city: z.string().max(80).optional(),
    neighborhood: z.string().max(80).optional(),
    street: z.string().max(160).optional(),
    number: z.string().max(20).optional(),
    complement: z.string().max(120).optional(),
    reference: z.string().max(200).optional(),
    pickup: z.boolean().optional(),
  })
  .passthrough();

const mpFormSchema = z.object({
  token: z.string().min(10),
  payment_method_id: z.string().min(2),
  issuer_id: z.union([z.string(), z.number()]).optional(),
  installments: z.number().int().min(1).max(24),
  payer: z.object({
    email: z.string().email(),
    identification: z.object({
      type: z.string().default("CPF"),
      number: z.string().min(11).max(14),
    }),
  }),
});

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  customer: customerSchema,
  delivery_type: z.enum(["delivery", "pickup"]),
  delivery_address: addressSchema,
  notes: z.string().max(500).optional(),
  mp: mpFormSchema,
});

export const createMpCardPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error("MP_ACCESS_TOKEN não configurado");

    // 1) Cria pedido no banco (SECURITY DEFINER recalcula os preços)
    const cpfDigits = data.mp.payer.identification.number.replace(/\D/g, "");
    const { data: orderRows, error: orderErr } = await context.supabase.rpc(
      "create_order_secure",
      {
        p_items: data.items,
        p_customer: {
          name: data.customer.name,
          phone: data.customer.phone,
          email: data.customer.email,
        },
        p_delivery_type: data.delivery_type,
        p_delivery_address: data.delivery_address,
        p_payment_method: "mercado_pago_card",
        p_customer_document: cpfDigits,
        p_notes: data.notes ?? null,
      },
    );
    if (orderErr) throw new Error(orderErr.message);
    const row = Array.isArray(orderRows) ? orderRows[0] : orderRows;
    if (!row?.id) throw new Error("Falha ao criar pedido");
    const orderId = row.id as string;
    const orderNumber = row.order_number as string;
    const total = Number(row.total);

    // 2) Chama Mercado Pago Payments API
    let mpResponse: MpPaymentResponse;
    try {
      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": `fm-${orderId}`,
        },
        body: JSON.stringify({
          transaction_amount: total,
          token: data.mp.token,
          description: `Pedido ${orderNumber} - FM IMPORTS`,
          installments: data.mp.installments,
          payment_method_id: data.mp.payment_method_id,
          issuer_id: data.mp.issuer_id,
          statement_descriptor: "FMIMPORTS",
          external_reference: orderId,
          notification_url: `https://fm-imports.lovable.app/api/public/mp-webhook`,
          payer: {
            email: data.mp.payer.email,
            first_name: data.customer.name.split(" ")[0],
            last_name: data.customer.name.split(" ").slice(1).join(" ") || data.customer.name,
            identification: {
              type: data.mp.payer.identification.type || "CPF",
              number: cpfDigits,
            },
          },
        }),
      });
      mpResponse = (await res.json()) as MpPaymentResponse;
      if (!res.ok) {
        throw new Error(mpResponse?.message || `Mercado Pago retornou ${res.status}`);
      }
    } catch (err) {
      // Cancela o pedido para liberar estoque
      await context.supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "rejected",
          mp_status_detail: err instanceof Error ? err.message.slice(0, 200) : "mp_error",
        })
        .eq("id", orderId);
      throw err instanceof Error ? err : new Error("Falha no Mercado Pago");
    }

    // 3) Atualiza pedido com dados MP
    const mpStatus = mpResponse.status ?? "pending";
    const approved = mpStatus === "approved";
    const rejected = mpStatus === "rejected" || mpStatus === "cancelled";
    await context.supabase
      .from("orders")
      .update({
        mp_payment_id: String(mpResponse.id ?? ""),
        mp_status: mpStatus,
        mp_status_detail: mpResponse.status_detail ?? null,
        installments: mpResponse.installments ?? data.mp.installments,
        card_brand: mpResponse.payment_method_id ?? data.mp.payment_method_id,
        card_last_four: mpResponse.card?.last_four_digits ?? null,
        payment_status: approved ? "approved" : rejected ? "rejected" : "pending",
        status: approved ? "payment_confirmed" : rejected ? "cancelled" : "pending",
        paid_at: approved ? new Date().toISOString() : null,
      })
      .eq("id", orderId);

    return {
      orderId,
      orderNumber,
      status: mpStatus,
      statusDetail: mpResponse.status_detail ?? null,
      paymentId: mpResponse.id ?? null,
    };
  });

type MpPaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  installments?: number;
  payment_method_id?: string;
  card?: { last_four_digits?: string };
  message?: string;
};
