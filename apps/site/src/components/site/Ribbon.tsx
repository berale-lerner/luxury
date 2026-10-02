"use client";

import { useLocale } from "@/lib/i18n";

export default function Ribbon() {
  const { c } = useLocale();
  const words = [...c.ribbon, ...c.ribbon];

  return (
    <div className="relative overflow-hidden border-y border-ink/10 bg-sand py-4">
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-24 bg-gradient-to-r from-sand to-transparent rtl:bg-gradient-to-l" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-24 bg-gradient-to-l from-sand to-transparent rtl:bg-gradient-to-r" />
      <div className="flex w-max animate-marquee items-center gap-10">
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            className="flex shrink-0 items-center gap-10 font-ui text-[0.78rem] font-semibold uppercase tracking-[0.3em] text-ink/55"
          >
            {w}
            <span className="block h-1.5 w-1.5 rotate-45 bg-clay/70" />
          </span>
        ))}
      </div>
    </div>
  );
}
