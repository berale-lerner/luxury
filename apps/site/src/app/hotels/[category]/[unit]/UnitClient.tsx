"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import {
  COMPLEX,
  STAY_LABELS,
  type StayCategory,
  findUnit,
  unitsIn,
} from "@/lib/stays";
import { Section, Note } from "@/components/site/PageShell";
import { BookRow, Gallery, UnitCard } from "@/components/site/Stays";
import { Eyebrow } from "@/components/site/SectionHead";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";
import FindUs from "@/components/site/FindUs";

export default function UnitPage() {
  const params = useParams<{ category: string; unit: string }>();
  const { c, locale } = useLocale();

  const category = params.category as StayCategory;
  if (category !== "suites" && category !== "apartments") notFound();

  const unit = findUnit(category, params.unit);
  if (!unit) notFound();

  const k = COMPLEX[category];
  const l = STAY_LABELS[locale];
  const siblings = unitsIn(category)
    .filter((u) => u.slug !== unit.slug)
    .slice(0, 3);

  const keyFacts = [
    { k: l.guests, v: String(unit.guests) },
    { k: l.bedrooms, v: String(unit.bedrooms) },
    { k: l.size, v: `${unit.size} ${l.sizeUnit}` },
    { k: l.beds, v: unit.beds[locale] },
  ];

  return (
    <>
      <section className="bg-parchment pt-[74px]">
        <div className="container pb-10 pt-12 md:pt-16">
          <nav className="flex flex-wrap items-center gap-2 font-ui text-[0.74rem] text-stone">
            <Link
              href={ROUTES.hotels}
              className="transition-colors hover:text-clay"
            >
              {c.pages.hotels.title}
            </Link>
            <span className="text-ink/25">/</span>
            <Link
              href={`${ROUTES.hotels}/${category}`}
              className="transition-colors hover:text-clay"
            >
              {k.label[locale]}
            </Link>
            <span className="text-ink/25">/</span>
            <span className="text-ink/70">{unit.name[locale]}</span>
          </nav>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow>{unit.idealFor[locale]}</Eyebrow>
              <h1 className="mt-4 font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.98] tracking-tightest text-ink">
                {unit.name[locale]}
              </h1>
              {locale === "he" ? (
                <p
                  dir="ltr"
                  className="mt-2 font-ui text-[0.8rem] uppercase tracking-[0.26em] text-stone"
                >
                  {unit.latin}
                </p>
              ) : null}
              <p className="mt-4 max-w-lg font-serif text-[1.12rem] italic leading-snug text-clay">
                {unit.highlight[locale]}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4 md:shrink-0">
              {keyFacts.map((f) => (
                <div key={f.k}>
                  <dt className="font-ui text-[0.6rem] font-bold uppercase tracking-[0.2em] text-stone">
                    {f.k}
                  </dt>
                  <dd className="mt-1.5 font-display text-[1.15rem] leading-snug text-ink">
                    {f.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-parchment pb-16">
        <div className="container">
          <Gallery unit={unit} />
        </div>
      </section>

      <Section tone="sand" className="!pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <Eyebrow>{l.specs}</Eyebrow>
            <dl className="mt-7 grid gap-x-12 sm:grid-cols-2">
              {unit.specs[locale].map((row) => (
                <div
                  key={row.k}
                  className="flex items-baseline justify-between gap-5 border-b border-ink/12 py-3.5"
                >
                  <dt className="font-ui text-[0.88rem] text-stone">{row.k}</dt>
                  <dd className="text-end font-ui text-[0.92rem] font-medium text-ink/80">
                    {row.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-6">
            <Reveal className="border border-ink/12 bg-parchment p-7">
              <Eyebrow>{l.facilities}</Eyebrow>
              <ul className="mt-5 space-y-3">
                {k.facilities[locale].map((f) => (
                  <li key={f} className="flex gap-3">
                    <span className="mt-[0.55rem] block h-1 w-1 shrink-0 rotate-45 bg-jade" />
                    <span className="font-ui text-[0.93rem] text-ink/72">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-s-2 border-gold ps-3 font-ui text-[0.86rem] leading-relaxed text-ink/60">
                {k.body[locale]}
              </p>
            </Reveal>

            <Note>{c.pages.hotels.note}</Note>
          </div>
        </div>

        <div className="mt-12">
          <BookRow unit={unit} />
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h2 className="font-display text-[clamp(1.5rem,3.4vw,2.3rem)] leading-tight text-ink">
            {l.others}
          </h2>
          <Link
            href={`${ROUTES.hotels}/${category}`}
            className="group inline-flex items-center gap-2.5 font-ui text-[0.86rem] font-semibold text-jade transition-colors hover:text-clay"
          >
            {k.cta[locale]}
            <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              <Arrow className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {siblings.map((u, i) => (
            <UnitCard key={u.slug} unit={u} delay={i * 60} />
          ))}
        </div>
      </Section>

      <FindUs />
    </>
  );
}
