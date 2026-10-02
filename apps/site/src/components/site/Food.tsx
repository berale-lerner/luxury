"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";

export default function Food() {
  const { c } = useLocale();

  return (
    <section className="bg-parchment py-24 md:py-32">
      <div className="container">
        <SectionHead
          eyebrow={c.food.kicker}
          title={c.food.title}
          link={{ label: c.food.viewAll, href: ROUTES.food }}
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {c.food.items.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <Link
                href={f.href}
                className="group relative block h-[26rem] overflow-hidden"
              >
                <div
                  className={cn(
                    "absolute inset-0 bg-cover bg-center transition-all duration-1300 ease-editorial group-hover:scale-105",
                    !f.active && "grayscale",
                  )}
                  style={{ backgroundImage: `url(${f.img})` }}
                />
                <div className="absolute inset-0 bg-ink-veil" />
                <div className="grain absolute inset-0" />

                <div className="relative flex h-full flex-col justify-end p-6">
                  <div className="flex flex-wrap gap-2">
                    {f.tags.map((t, ti) => (
                      <span
                        key={t}
                        className={cn(
                          "px-2.5 py-1 font-ui text-[0.62rem] font-bold uppercase tracking-[0.14em]",
                          ti === 0
                            ? "bg-jade text-sand"
                            : "border border-sand/35 text-sand/80",
                        )}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <h3 className="mt-4 font-display text-[1.5rem] leading-tight text-sand">
                    {f.title}
                  </h3>

                  <p className="mt-2 flex items-start gap-2 font-ui text-[0.84rem] leading-snug text-sand/55">
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                      />
                      <circle cx="12" cy="10" r="2.4" fill="currentColor" />
                    </svg>
                    {f.address}
                  </p>

                  {!f.active ? (
                    <p className="mt-4 border border-sand/20 bg-ink/50 px-3 py-2 font-ui text-[0.75rem] text-sand/60 backdrop-blur-sm">
                      {c.ui.inactive}
                    </p>
                  ) : null}
                </div>

                <span className="absolute inset-x-0 bottom-0 h-0 bg-clay transition-[height] duration-500 ease-editorial group-hover:h-1.5" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
