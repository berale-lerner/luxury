"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { Eyebrow } from "./SectionHead";
import Reveal from "./Reveal";
import Arrow from "./Arrow";

export default function Provides() {
  const { c } = useLocale();
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section className="grain relative overflow-hidden bg-ink py-16 md:py-24">
      <div className="weave pointer-events-none absolute inset-0 opacity-40" />

      <div className="container relative">
        <Reveal className="max-w-2xl">
          <Eyebrow tone="light">{c.provides.kicker}</Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,4.6vw,3.4rem)] leading-[1.05] tracking-tight text-sand text-balance">
            {c.provides.title}
          </h2>
        </Reveal>

        <div className="relative mt-9 md:mt-12">
          {/* floating preview */}
          <div className="pointer-events-none absolute inset-y-0 end-0 hidden w-[34%] lg:block">
            <div className="sticky top-32 aspect-[4/5] w-full overflow-hidden">
              {c.provides.items.map((item, i) => (
                <div
                  key={item.title}
                  className={cn(
                    "absolute inset-0 transition-all duration-700 ease-editorial",
                    hover === i
                      ? "scale-100 opacity-100"
                      : "scale-105 opacity-0",
                  )}
                >
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.img})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                </div>
              ))}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center border border-sand/10 transition-opacity duration-700",
                  hover === null ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="font-serif text-sm italic text-sand/25">
                  {c.brand.sub}
                </span>
              </div>
            </div>
          </div>

          {/* list */}
          <ul className="lg:w-[62%]">
            {c.provides.items.map((item, i) => (
              <li key={item.title}>
                <Reveal delay={i * 60}>
                  <Link
                    href={item.href}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    className="group flex items-start gap-4 border-t border-sand/12 py-5 transition-colors duration-500 last:border-b hover:border-gold/40 md:gap-6 md:py-7"
                  >
                    <span className="mt-2 font-ui text-[0.68rem] font-bold tabular-nums text-gold/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-display text-[1.45rem] leading-tight text-sand transition-colors duration-500 group-hover:text-gold md:text-[1.7rem]">
                          {item.title}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 border border-jade-soft/40 px-2 py-0.5 font-ui text-[0.6rem] font-bold uppercase tracking-[0.16em] text-jade-soft">
                          <span className="block h-1 w-1 rounded-full bg-jade-soft" />
                          {c.ui.active}
                        </span>
                      </div>
                      <p className="mt-2.5 max-w-md font-ui text-[0.94rem] leading-relaxed text-sand/50">
                        {item.text}
                      </p>

                    </div>

                    <span className="mt-2 shrink-0 text-sand/25 transition-all duration-500 ease-editorial group-hover:translate-x-1 group-hover:text-gold rtl:group-hover:-translate-x-1">
                      <Arrow className="h-5 w-5" />
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
