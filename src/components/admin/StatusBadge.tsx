import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  awaiting_store_confirmation: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  awaiting_pix_payment: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  payment_confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  processing: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  separating: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  shipped: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  out_for_delivery: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  ready_for_pickup: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  refunded: "bg-red-500/10 text-red-400 border-red-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<string, string> = {
  pending: "Novo pedido",
  awaiting_store_confirmation: "Aguardando confirmação",
  awaiting_pix_payment: "Aguardando PIX",
  payment_confirmed: "Pagamento confirmado",
  paid: "Pago",
  processing: "Processando",
  separating: "Separando",
  shipped: "Enviado",
  out_for_delivery: "Saiu para entrega",
  ready_for_pickup: "Disponível p/ retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  active: "Ativo",
  inactive: "Inativo",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        style,
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
