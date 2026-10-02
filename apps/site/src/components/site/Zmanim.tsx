"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { formatDate, formatTime, getZmanim, type ZmanimKey } from "@/lib/zmanim";
import { Eyebrow } from "./SectionHead";
import Reveal from "./Reveal";
import Arrow from "./Arrow";

const ORDER: ZmanimKey[] = [
  "alot",
  "misheyakir",
  "sunrise",
  "shmaMGA",
  "shmaGRA",
  "tfila",
  "chatzot",
  "minchaGedola",
  "plag",
  "sunset",
  "tzeit",
  "chatzotNight",
];

const HIGHLIGHT: ZmanimKey[] = ["sunrise", "chatzot", "sunset", "tzeit"];

export default function Zmanim({ full = false }: { full?: boolean }) {
  const { c, locale } = useLocale();
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const z = today ? getZmanim(today) : null;
  const keys = full ? ORDER : ORDER;

  return (
    <section className="grain relative overflow-hidden bg-deep py-24 md:py-32">
      <div className="weave pointer-events-none absolute inset-0 opacity-40" />

      <div className="container relative">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
          <Reveal>
            <Eyebrow tone="light">{c.zmanim.kicker}</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,4.4vw,3.2rem)] leading-[1.06] tracking-tight text-sand text-balance">
              {c.zmanim.title}
            </h2>
            <p className="mt-4 max-w-sm font-ui text-[0.98rem] leading-relaxed text-sand/55">
              {c.zmanim.subtitle}
            </p>

            <div className="mt-8 inline-flex flex-col gap-1 border-s-2 border-gold/60 ps-4">
              <span className="font-ui text-[0.66rem] font-bold uppercase tracking-[0.24em] text-gold/80">
                {locale === "he" ? "היום" : "Today"}
              </span>
              <span className="font-display text-lg text-sand">
                {today ? formatDate(today, locale) : "—"}
              </span>
            </div>

            <p className="mt-8 max-w-xs font-ui text-[0.78rem] leading-relaxed text-sand/35">
              {c.zmanim.note}
            </p>

            {!full ? (
              <Link
                href={c.zmanim.cta.href}
                className="group mt-8 inline-flex items-center gap-2.5 border border-sand/25 px-6 py-3.5 font-ui text-[0.86rem] font-semibold text-sand transition-colors duration-500 hover:border-gold hover:bg-gold hover:text-ink"
              >
                {c.zmanim.cta.label}
                <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                  <Arrow />
                </span>
              </Link>
            ) : null}
          </Reveal>

          <Reveal delay={120}>
            <div className="grid gap-x-10 sm:grid-cols-2">
              {keys.map((k, i) => {
                const isKey = HIGHLIGHT.includes(k);
                return (
                  <div
                    key={k}
                    className={cn(
                      "flex items-baseline justify-between gap-4 border-b border-sand/12 py-3.5",
                      isKey && "border-gold/25",
                    )}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <span
                      className={cn(
                        "font-ui text-[0.9rem]",
                        isKey ? "font-semibold text-sand" : "text-sand/55",
                      )}
                    >
                      {c.zmanim.labels[k]}
                    </span>
                    <span
                      dir="ltr"
                      className={cn(
                        "font-display text-[1.05rem] tabular-nums",
                        isKey ? "text-gold" : "text-sand/75",
                      )}
                    >
                      {z ? formatTime(z[k]) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
