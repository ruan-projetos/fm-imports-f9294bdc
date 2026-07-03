import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { settingsQuery } from "@/lib/queries";
import { whatsappLink } from "@/lib/format";

export function WhatsAppFab() {
  const { data: settings } = useQuery(settingsQuery);
  const number = (settings?.whatsapp_number as string) ?? "5588981907468";
  return (
    <a
      href={whatsappLink(number, "Olá! Vim pelo site da FM IMPORTS 👑")}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-gold text-black shadow-gold transition-transform hover:scale-105 md:bottom-6"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={2.4} />
    </a>
  );
}
