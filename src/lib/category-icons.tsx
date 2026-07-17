import type { ComponentType, SVGProps } from "react";
import {
  Shirt,
  Watch,
  Footprints,
  Gem,
  Sparkles,
  Crown,
  Glasses,
  ShoppingBag,
  Backpack,
  Package,
  Star,
} from "lucide-react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ShortsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M5 4h14l-.6 6H16l-1.4 9h-3l-.6-6-.6 6h-3L5.6 10H5.6L5 4z" />
    </svg>
  );
}

function BermudasIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M5 4h14l-.4 5H15l-1 11h-3l-.5-7-.5 7H7L6 9H5.4L5 4z" />
    </svg>
  );
}

function PantsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M5 3h14l-.5 5h-3.2L14 21h-3l-.4-10h-1.2L9 21H6L5.7 8H5.5L5 3z" />
    </svg>
  );
}

function CapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M3 15c2-6 6-8 9-8s7 2 9 8" />
      <path d="M3 15h18v2H3z" />
      <path d="M12 7V4" />
    </svg>
  );
}

function NecklaceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...stroke} {...props}>
      <path d="M4 5c2 6 6 10 8 10s6-4 8-10" />
      <path d="m12 15-1.5 3h3L12 15z" />
    </svg>
  );
}

const MAP: Record<string, IconComponent> = {
  shirt: Shirt,
  tshirt: Shirt,
  camisa: Shirt,
  camiseta: Shirt,
  shorts: ShortsIcon,
  bermudas: BermudasIcon,
  bermuda: BermudasIcon,
  pants: PantsIcon,
  calca: PantsIcon,
  calcas: PantsIcon,
  footprints: Footprints,
  shoes: Footprints,
  tenis: Footprints,
  sneakers: Footprints,
  cap: CapIcon,
  bone: CapIcon,
  hat: CapIcon,
  watch: Watch,
  relogio: Watch,
  gem: Gem,
  necklace: NecklaceIcon,
  chain: NecklaceIcon,
  sparkles: Sparkles,
  perfume: Sparkles,
  crown: Crown,
  glasses: Glasses,
  bag: ShoppingBag,
  backpack: Backpack,
  package: Package,
  star: Star,
};

export const ICON_OPTIONS: { key: string; label: string }[] = [
  { key: "shirt", label: "Camisa / Camiseta" },
  { key: "shorts", label: "Shorts" },
  { key: "bermudas", label: "Bermudas" },
  { key: "pants", label: "Calças" },
  { key: "footprints", label: "Tênis" },
  { key: "cap", label: "Boné" },
  { key: "watch", label: "Relógio" },
  { key: "necklace", label: "Corrente / Colar" },
  { key: "gem", label: "Joia / Acessório" },
  { key: "sparkles", label: "Perfume / Brilho" },
  { key: "crown", label: "Coroa" },
  { key: "glasses", label: "Óculos" },
  { key: "bag", label: "Bolsa" },
  { key: "backpack", label: "Mochila" },
  { key: "package", label: "Genérico" },
  { key: "star", label: "Estrela" },
];

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const key = (name ?? "").toLowerCase();
  const Comp = MAP[key] ?? Shirt;
  return <Comp className={className} />;
}
