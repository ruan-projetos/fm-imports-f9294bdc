import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  shipped: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

const LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
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
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        style,
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
