// WhatsApp utilities for FM IMPORTS order flow.
// Templates for order creation and automatic status update messages.

export const STORE_WHATSAPP = "5588981907458";

export type OrderLike = {
  order_number: string;
  total: number | string;
  delivery_type?: string | null;
  payment_method?: string | null;
  customer_snapshot?: { name?: string | null; phone?: string | null } | null;
  delivery_address?: {
    city?: string | null;
    neighborhood?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    reference?: string | null;
  } | null;
};

export type OrderItemLike = {
  quantity: number;
  unit_price: number | string;
  product_snapshot?: {
    name?: string | null;
    color?: string | null;
    size?: string | null;
    image?: string | null;
  } | null;
};

function fmt(n: number | string) {
  const v = typeof n === "number" ? n : Number(n);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatAddress(o: OrderLike) {
  const a = o.delivery_address;
  if (!a) return "—";
  const parts = [
    [a.street, a.number].filter(Boolean).join(", "),
    a.complement,
    a.neighborhood,
    a.city,
  ].filter(Boolean);
  const base = parts.join(" · ");
  return a.reference ? `${base} (ref: ${a.reference})` : base;
}

function paymentLabel(pm?: string | null) {
  if (pm === "pix") return "PIX";
  if (pm === "on_delivery") return "Pagar na entrega (Dinheiro, PIX ou Cartão)";
  return pm ?? "—";
}

function deliveryLabel(dt?: string | null) {
  return dt === "pickup" ? "Retirar na loja" : "Entrega FM IMPORTS";
}

export function buildOrderMessage(o: OrderLike, items: OrderItemLike[]): string {
  const isPix = o.payment_method === "pix";
  const cust = o.customer_snapshot ?? {};
  const lines: string[] = [];
  lines.push("Olá!");
  lines.push("");
  lines.push("Acabei de realizar um pedido na FM IMPORTS.");
  lines.push("");
  lines.push(`Pedido: #${o.order_number}`);
  lines.push(`Nome: ${cust.name ?? ""}`);
  lines.push(`Telefone: ${cust.phone ?? ""}`);
  lines.push("");
  lines.push("Produtos:");
  for (const it of items) {
    const s = it.product_snapshot ?? {};
    const opts = [s.color, s.size].filter(Boolean).join(" / ");
    lines.push(
      `• ${s.name ?? "Item"}${opts ? ` (${opts})` : ""} — Qtd ${it.quantity} — ${fmt(it.unit_price)}`,
    );
  }
  lines.push("");
  lines.push(`Valor total: ${fmt(o.total)}`);
  lines.push(`Forma de entrega: ${deliveryLabel(o.delivery_type)}`);
  if (o.delivery_type !== "pickup") {
    lines.push(`Endereço: ${formatAddress(o)}`);
  }
  lines.push(`Forma de pagamento: ${paymentLabel(o.payment_method)}`);
  lines.push("");
  if (isPix) {
    lines.push(
      "Gostaria de confirmar a disponibilidade dos produtos para receber a chave PIX.",
    );
  } else {
    lines.push("Aguardo a separação do pedido. Obrigado!");
  }
  return lines.join("\n");
}

const STATUS_MESSAGES: Record<string, (num: string) => string> = {
  separating: (n) =>
    `Olá! Seu pedido #${n} já está sendo separado. Em breve enviaremos novas atualizações.\n\nFM IMPORTS 👑`,
  out_for_delivery: (n) =>
    `Seu pedido #${n} saiu para entrega. Nossa equipe chegará em breve.\n\nFM IMPORTS 👑`,
  ready_for_pickup: (n) =>
    `Seu pedido #${n} já está separado. Você já pode retirar na FM IMPORTS.\n\nFM IMPORTS 👑`,
  delivered: (n) =>
    `Seu pedido #${n} foi entregue. Muito obrigado pela preferência. Esperamos você novamente!\n\nFM IMPORTS 👑`,
  payment_confirmed: (n) =>
    `Pagamento do pedido #${n} confirmado! Vamos iniciar a separação. Obrigado!\n\nFM IMPORTS 👑`,
  cancelled: (n) =>
    `Seu pedido #${n} foi cancelado. Se tiver dúvidas, é só nos chamar.\n\nFM IMPORTS 👑`,
};

export function buildStatusMessage(orderNumber: string, status: string): string {
  const fn = STATUS_MESSAGES[status];
  return fn ? fn(orderNumber) : `Olá! Atualização sobre o seu pedido #${orderNumber}.\n\nFM IMPORTS 👑`;
}

export function whatsappUrl(number: string, message: string): string {
  const clean = number.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(number: string, message: string) {
  if (typeof window === "undefined") return;
  window.open(whatsappUrl(number, message), "_blank", "noopener,noreferrer");
}
