"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import SectionHead from "./SectionHead";
import Reveal from "./Reveal";
import Arrow from "./Arrow";

export default function Events() {
  const { c } = useLocale();

  return (
    <section className="bg-sand py-16 md:py-24">
      <div className="container">
        <SectionHead
          eyebrow={c.events.kicker}
          title={c.events.title}
          link={{ label: c.events.viewAll, href: ROUTES.events }}
        />

        <div className="mt-9 border-y border-ink/12">
          {c.events.items.map((e, i) => (
            <Reveal key={`${e.title}-${e.time}`} delay={i * 70}>
              <Link
                href={e.href}
                className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 border-b border-ink/10 py-5 last:border-0 sm:grid-cols-[8rem_1fr_auto] sm:gap-6"
              >
                <div>
                  <p className="font-ui text-[0.58rem] font-bold uppercase tracking-[0.16em] text-clay">
                    {e.tag}
                  </p>
                  <p className="mt-1 font-ui text-[0.76rem] leading-tight text-stone">
                    {e.date}
                  </p>
                </div>

                <h3 className="font-display text-[1.08rem] leading-snug text-ink transition-colors group-hover:text-jade sm:text-[1.25rem]">
                  {e.title}
                </h3>

                <div className="flex items-center gap-3">
                  <p
                    dir="ltr"
                    className="font-display text-[1.02rem] text-clay tabular-nums sm:text-[1.2rem]"
                  >
                    {e.time}
                  </p>
                  <Arrow className="hidden h-4 w-4 text-jade sm:block" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
