import { Link } from "@tanstack/react-router";
import { Shirt, Footprints, Crown, Sparkles, Watch, Gem } from "lucide-react";
import type { Category } from "@/lib/queries";

const iconMap: Record<string, any> = {
  shirt: Shirt,
  footprints: Footprints,
  crown: Crown,
  sparkles: Sparkles,
  watch: Watch,
  gem: Gem,
};

export function CategoryStrip({ categories }: { categories: Category[] | undefined }) {
  if (!categories) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
        {categories.map((c) => {
          const Icon = iconMap[c.icon ?? "shirt"] ?? Shirt;
          return (
            <Link
              key={c.id}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="group flex shrink-0 flex-col items-center gap-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card transition-all group-hover:border-gold group-hover:shadow-gold md:h-20 md:w-20">
                <Icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-gold md:h-7 md:w-7" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                {c.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
