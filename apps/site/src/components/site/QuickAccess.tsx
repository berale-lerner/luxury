"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import Arrow from "./Arrow";

export default function QuickAccess() {
  const { c } = useLocale();
  const items = [c.quick.items[1], c.quick.items[4], c.quick.items[0], c.quick.items[3]];

  return (
    <section className="relative bg-parchment py-16 md:py-20">
      <div className="container">
        <SectionHead
          eyebrow={c.quick.kicker}
          title={c.quick.travelTitle}
          sub={c.quick.travelLead}
        />

        <div className="mt-9 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.href} delay={i * 70}>
              <Link
                href={item.href}
                className="group relative flex h-full min-h-[10.5rem] flex-col justify-between overflow-hidden bg-parchment p-5 transition-colors duration-500 ease-editorial hover:bg-ink md:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-serif text-[1.8rem] leading-none text-clay/25 transition-colors duration-500 group-hover:text-gold/70">
                    {item.n}
                  </span>
                  <span className="text-jade transition-colors duration-500 group-hover:text-gold">
                    <Arrow className="h-4 w-4" />
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-[1.25rem] leading-tight text-ink transition-colors duration-500 group-hover:text-sand">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 font-ui text-[0.84rem] leading-relaxed text-stone transition-colors duration-500 group-hover:text-sand/60">
                    {item.text}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
