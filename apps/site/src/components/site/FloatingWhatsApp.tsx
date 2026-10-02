"use client";

import { SITE } from "@/lib/content";
import { useLocale } from "@/lib/i18n";

export default function FloatingWhatsApp() {
  const { locale } = useLocale();

  return (
    <a
      href={SITE.whatsapp}
      target="_blank"
      rel="noreferrer"
      aria-label={locale === "he" ? "פתיחת WhatsApp" : "Open WhatsApp"}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-jade text-sand shadow-[0_12px_32px_-10px_rgb(8_25_27/0.65)] transition-transform active:scale-95 lg:hidden"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d="M12 3.2a8.4 8.4 0 0 0-7.2 12.7l-1.1 4.2 4.3-1.1A8.4 8.4 0 1 0 12 3.2Zm0 1.8a6.6 6.6 0 1 1-3.4 12.2l-.3-.2-2 .5.5-1.9-.2-.3A6.6 6.6 0 0 1 12 5Zm-2.9 3.1c-.2 0-.4.1-.6.3-.2.2-.7.8-.7 1.8 0 1.1.8 2.1.9 2.3.1.1 1.5 2.4 3.8 3.3 1.8.7 2.2.5 2.6.5.4 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2l-1.5-.7c-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.8-1.1-.7-.6-1.1-1.3-1.2-1.5-.1-.2 0-.3.1-.4l.3-.4.2-.4c.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4Z"
          fill="currentColor"
        />
      </svg>
    </a>
  );
}
