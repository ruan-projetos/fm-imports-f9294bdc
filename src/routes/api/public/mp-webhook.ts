import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;
        if (!accessToken) return new Response("missing token", { status: 500 });

        const rawBody = await request.text();
        const url = new URL(request.url);

        // --- Assinatura (Mercado Pago v2) ---
        // Header: x-signature: "ts=...,v1=..."
        // Header: x-request-id
        // Template: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
        if (webhookSecret) {
          const sig = request.headers.get("x-signature") ?? "";
          const requestId = request.headers.get("x-request-id") ?? "";
          const parts = Object.fromEntries(
            sig.split(",").map((p) => {
              const [k, v] = p.split("=");
              return [k?.trim(), v?.trim()];
            }),
          );
          const ts = parts.ts;
          const v1 = parts.v1;
          const dataId = url.searchParams.get("data.id") ?? "";
          if (!ts || !v1 || !dataId) {
            return new Response("invalid signature", { status: 401 });
          }
          const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
          const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
          const a = Buffer.from(v1);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("invalid signature", { status: 401 });
          }
        }

        let payload: { type?: string; action?: string; data?: { id?: string | number } } = {};
        try {
          payload = JSON.parse(rawBody);
        } catch {
          // Notificações via query também ocorrem
        }

        const paymentId =
          payload?.data?.id ??
          url.searchParams.get("data.id") ??
          url.searchParams.get("id");
        const topic = payload?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");

        if (!paymentId || (topic && topic !== "payment")) {
          return new Response("ignored", { status: 200 });
        }

        // Consulta o pagamento no MP
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          console.error("[mp-webhook] fetch payment failed", res.status);
          return new Response("mp fetch failed", { status: 202 });
        }
        const p = (await res.json()) as {
          id: number;
          status: string;
          status_detail?: string;
          external_reference?: string;
          installments?: number;
          payment_method_id?: string;
          card?: { last_four_digits?: string };
        };
        const orderId = p.external_reference;
        if (!orderId) return new Response("no external_reference", { status: 200 });

        const approved = p.status === "approved";
        const rejected = p.status === "rejected" || p.status === "cancelled";
        const refunded = p.status === "refunded" || p.status === "charged_back";

        const patch: Record<string, unknown> = {
          mp_payment_id: String(p.id),
          mp_status: p.status,
          mp_status_detail: p.status_detail ?? null,
          installments: p.installments ?? null,
          card_brand: p.payment_method_id ?? null,
          card_last_four: p.card?.last_four_digits ?? null,
          payment_status: approved
            ? "approved"
            : refunded
              ? "refunded"
              : rejected
                ? "rejected"
                : "pending",
        };
        if (approved) {
          patch.status = "payment_confirmed";
          patch.paid_at = new Date().toISOString();
        } else if (rejected) {
          patch.status = "cancelled";
        } else if (refunded) {
          patch.status = "refunded";
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
        if (error) {
          console.error("[mp-webhook] update order failed", error.message);
          return new Response("db error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
