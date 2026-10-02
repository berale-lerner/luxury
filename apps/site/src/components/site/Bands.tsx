"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { IMG, SITE } from "@/lib/content";
import Reveal from "./Reveal";
import Arrow from "./Arrow";
import { Eyebrow } from "./SectionHead";

function ImageBand({
  img,
  eyebrow,
  title,
  text,
  cta,
  secondary,
  align = "start",
  tall = false,
}: {
  img: string;
  eyebrow?: string;
  title: string;
  text?: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
  align?: "start" | "center";
  tall?: boolean;
}) {
  return (
    <Reveal className="relative">
      <div
        className={cn(
          "group relative overflow-hidden",
          tall ? "min-h-[22rem] md:min-h-[32rem]" : "min-h-[19rem] md:min-h-[26rem]",
        )}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1400 ease-editorial group-hover:scale-[1.04]"
          style={{ backgroundImage: `url(${img})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/25" />
        <div className="grain absolute inset-0" />

        <div
          className={cn(
            "relative flex h-full flex-col justify-end p-6 md:p-14",
            tall ? "min-h-[22rem] md:min-h-[32rem]" : "min-h-[19rem] md:min-h-[26rem]",
            align === "center" && "items-center text-center",
          )}
        >
          {eyebrow ? <Eyebrow tone="light">{eyebrow}</Eyebrow> : null}
          <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.7rem,4vw,3rem)] leading-[1.06] tracking-tight text-sand text-balance">
            {title}
          </h2>
          {text ? (
            <p className="mt-3 max-w-lg font-ui text-[0.92rem] leading-relaxed text-sand/85 md:mt-4 md:text-[0.98rem]">
              {text}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-8">
            <Link
              href={cta.href}
              className="group/btn inline-flex w-fit items-center gap-2.5 bg-sand px-6 py-3.5 font-ui text-[0.88rem] font-semibold text-ink transition-colors duration-500 hover:bg-gold"
            >
              {cta.label}
              <span className="inline-block transition-transform duration-500 ease-editorial group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1">
                <Arrow />
              </span>
            </Link>
            {secondary ? (
              <a
                href={secondary.href}
                target="_blank"
                rel="noreferrer"
                className="group/alt inline-flex w-fit items-center gap-2.5 border border-sand/35 px-6 py-3.5 font-ui text-[0.88rem] font-semibold text-sand backdrop-blur-sm transition-colors duration-500 hover:border-gold hover:bg-gold hover:text-ink"
              >
                {secondary.label}
                <span className="inline-block transition-transform duration-500 ease-editorial group-hover/alt:translate-x-1 rtl:group-hover/alt:-translate-x-1">
                  <Arrow />
                </span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function AboutBand() {
  const { c } = useLocale();
  return (
    <section className="bg-parchment py-12 md:py-16">
      <div className="container">
        <ImageBand
          img={IMG.lake}
          eyebrow={c.about.kicker}
          title={c.about.title}
          text={c.about.text}
          cta={c.about.cta}
        />
      </div>
    </section>
  );
}

export function ShabbatBand() {
  const { c, locale } = useLocale();
  return (
    <section className="bg-parchment pb-12 md:pb-20">
      <div className="container">
        <ImageBand
          img={IMG.shabbatTable}
          eyebrow={c.shabbatBand.kicker}
          title={c.shabbatBand.title}
          text={c.shabbatBand.text}
          cta={c.shabbatBand.cta}
          secondary={{
            label: locale === "he" ? "הרשמה לסעודה" : "Register for a meal",
            href: SITE.registration,
          }}
        />
      </div>
    </section>
  );
}

export function Holidays() {
  const { c } = useLocale();
  return (
    <section className="bg-parchment pb-24 md:pb-32">
      <div className="container">
        <div className="grid gap-6 md:grid-cols-2">
          {c.holidays.items.map((h, i) => (
            <Reveal key={h.title} delay={i * 100}>
              <a
                href={SITE.registration}
                target="_blank"
                rel="noreferrer"
                className="group relative block min-h-[19rem] overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-1400 ease-editorial group-hover:scale-105"
                  style={{ backgroundImage: `url(${h.img})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-transparent" />
                <div className="grain absolute inset-0" />
                <div className="relative flex min-h-[19rem] flex-col justify-end p-8">
                  <span className="eyebrow text-gold">{h.year}</span>
                  <h3 className="mt-3 font-display text-[1.7rem] leading-tight text-sand">
                    {h.title}
                  </h3>
                  <p className="mt-2 font-ui text-[0.92rem] text-sand/60">
                    {h.text}
                  </p>
                  <span className="mt-5 inline-flex w-fit items-center gap-2 border-b border-gold/50 pb-1 font-ui text-[0.82rem] font-semibold text-gold transition-all duration-500 group-hover:gap-3.5">
                    {c.ui.register}
                    <Arrow className="h-3.5 w-3.5" />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DonateBand() {
  const { c } = useLocale();
  return (
    <section className="grain relative overflow-hidden bg-jade py-20 md:py-28">
      <div className="weave pointer-events-none absolute inset-0 opacity-50" />
      <div className="container relative">
        <Reveal className="flex flex-col items-center gap-8 text-center">
          <Eyebrow tone="light">{c.donate.kicker}</Eyebrow>
          <h2 className="max-w-3xl font-display text-[clamp(1.8rem,4.4vw,3.2rem)] leading-[1.08] tracking-tight text-sand text-balance">
            {c.donate.title}
          </h2>
          <p className="max-w-xl font-ui text-[1rem] leading-relaxed text-sand/70">
            {c.donate.text}
          </p>
          <Link
            href={c.donate.cta.href}
            className="group inline-flex items-center gap-2.5 bg-gold px-8 py-4 font-ui text-[0.92rem] font-semibold text-ink transition-colors duration-500 hover:bg-sand"
          >
            {c.donate.cta.label}
            <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              <Arrow />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
