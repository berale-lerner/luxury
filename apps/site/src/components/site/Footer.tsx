"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import { Mark } from "./Logo";

const socials = [
  {
    label: "Instagram",
    href: SITE.instagram,
    path: "M7.6 3h8.8A4.6 4.6 0 0 1 21 7.6v8.8a4.6 4.6 0 0 1-4.6 4.6H7.6A4.6 4.6 0 0 1 3 16.4V7.6A4.6 4.6 0 0 1 7.6 3Zm0 1.9A2.7 2.7 0 0 0 4.9 7.6v8.8a2.7 2.7 0 0 0 2.7 2.7h8.8a2.7 2.7 0 0 0 2.7-2.7V7.6a2.7 2.7 0 0 0-2.7-2.7H7.6Zm4.4 2.8a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6Zm0 1.9a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Zm4.7-2.85a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z",
  },
  {
    label: "Facebook",
    href: SITE.facebook,
    path: "M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.12-2.41-.12-2.39 0-4.02 1.46-4.02 4.13V9.9H7.5V13h2.77v8h3.23Z",
  },
  {
    label: "WhatsApp",
    href: SITE.whatsapp,
    path: "M12 2.8a9.1 9.1 0 0 0-7.8 13.8L3 21.2l4.7-1.2A9.1 9.1 0 1 0 12 2.8Zm0 1.9a7.2 7.2 0 1 1-3.7 13.4l-.3-.2-2.8.7.75-2.7-.2-.3A7.2 7.2 0 0 1 12 4.7Zm-3.2 3.4c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.2.87 2.35.99 2.51.12.16 1.69 2.68 4.16 3.65 2.06.8 2.48.64 2.93.6.45-.04 1.44-.59 1.65-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.41h-.46Z",
  },
];

export default function Footer() {
  const { c, locale } = useLocale();
  const year = 2026;

  return (
    <footer className="grain relative overflow-hidden bg-ink text-sand">
      <span className="textile-band absolute inset-x-0 top-0" />
      <div className="weave pointer-events-none absolute inset-0 opacity-[0.35]" />

      <div className="container relative pt-20 pb-10">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_2fr]">
          {/* brand */}
          <div>
            <div className="flex items-center gap-3">
              <Mark className="h-11 w-11 text-gold" />
              <div className="leading-none">
                <p className="font-display text-xl text-sand">{c.brand.name}</p>
                <p className="mt-1.5 font-ui text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-sand/45">
                  {c.brand.sub}
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-sm font-serif text-lg italic leading-snug text-sand/55">
              {c.footer.tagline}
            </p>

            <address className="mt-7 not-italic font-ui text-sm leading-relaxed text-sand/50">
              {c.findUs.name}
              <br />
              {c.findUs.address}
            </address>

            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="mt-5 inline-flex items-center gap-2 font-ui text-sm font-semibold text-gold transition-colors hover:text-sand"
            >
              {SITE.whatsappDisplay}
            </a>

            <div className="mt-7 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center border border-sand/15 text-sand/60 transition-all duration-300 hover:border-gold hover:bg-gold hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                    <path d={s.path} fill="currentColor" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* link columns */}
          <div className="grid gap-10 sm:grid-cols-3">
            {c.footer.columns.map((col) => (
              <div key={col.title}>
                <p className="eyebrow text-gold/80">{col.title}</p>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      {l.href.startsWith("http") ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="link-sweep font-ui text-[0.95rem] text-sand/65 transition-colors hover:text-sand"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          href={l.href}
                          className="link-sweep font-ui text-[0.95rem] text-sand/65 transition-colors hover:text-sand"
                        >
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="rule-gold mt-16 h-px" />

        <div className="mt-6 flex flex-col items-center justify-between gap-4 font-ui text-[0.78rem] text-sand/40 sm:flex-row">
          <p>
            © {year} · {c.footer.rights}
          </p>
          <div className="flex items-center gap-6">
            <span className="hover:text-sand/70">{c.footer.privacy}</span>
            <span className="hover:text-sand/70">{c.footer.cookies}</span>
            <span className="uppercase tracking-[0.2em] text-sand/30">
              {locale === "he" ? "עברית" : "English"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
