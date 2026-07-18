import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { whatsappLink } from "@/lib/format";
import { STORE_WHATSAPP } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export function WhatsAppFab() {
  const { data: settings } = useQuery(settingsQuery);
  const number =
    (settings?.contact?.whatsapp as string) ??
    (settings?.whatsapp_number as string) ??
    STORE_WHATSAPP;
  return (
    <a
      href={whatsappLink(number, "Olá! Vim pelo site da FM IMPORTS 👑")}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-gold text-black shadow-gold transition-transform hover:scale-105 md:bottom-6"
    >
      <WhatsAppIcon className="h-6 w-6" />
    </a>
  );
}
