import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Banner } from "@/lib/queries";
import { motion, AnimatePresence } from "framer-motion";

export function HeroCarousel({ banners }: { banners: Banner[] | undefined }) {
  const list = banners ?? [];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 6000);
    return () => clearInterval(t);
  }, [list.length]);

  if (list.length === 0) {
    return <div className="h-[70vh] w-full shimmer" />;
  }

  const b = list[idx];

  return (
    <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={b.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src={b.image_url}
            alt={b.title ?? "FM Imports"}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full items-end pb-24 md:items-center md:pb-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6">
          <motion.span
            key={`t-${b.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-[11px] font-medium uppercase tracking-[0.35em] text-gold"
          >
            👑 FM Imports · Coleção
          </motion.span>
          <motion.h1
            key={`h-${b.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl"
          >
            {b.title}
          </motion.h1>
          {b.subtitle && (
            <motion.p
              key={`s-${b.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="max-w-md text-base text-muted-foreground md:text-lg"
            >
              {b.subtitle}
            </motion.p>
          )}
          <motion.div
            key={`c-${b.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Link
              to={b.link_url ?? "/produtos"}
              className="inline-flex items-center gap-2 rounded-full gradient-gold px-6 py-3 text-sm font-semibold text-black shadow-gold transition-transform hover:scale-105"
            >
              {b.cta_label ?? "Explorar"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>

      {list.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1 rounded-full transition-all ${
                i === idx ? "w-8 bg-gold" : "w-4 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
