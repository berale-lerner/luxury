"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { ROUTES, SITE } from "@/lib/content";
import { COMPLEX, STAY_LABELS, type StayCategory, unitsIn } from "@/lib/stays";
import { Section, Note } from "@/components/site/PageShell";
import { UnitCard } from "@/components/site/Stays";
import { Eyebrow } from "@/components/site/SectionHead";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";
import FindUs from "@/components/site/FindUs";

export default function CategoryPage() {
  const params = useParams<{ category: string }>();
  const { c, locale } = useLocale();

  const category = params.category as StayCategory;
  if (category !== "suites" && category !== "apartments") notFound();

  const k = COMPLEX[category];
  const l = STAY_LABELS[locale];
  const units = unitsIn(category);
  const other: StayCategory = category === "suites" ? "apartments" : "suites";

  return (
    <>
      <section className="relative overflow-hidden bg-ink pt-[74px]">
        <div className="absolute inset-0">
          <div
            className="animate-kenburns h-full w-full bg-cover bg-center opacity-55"
            style={{ backgroundImage: `url(${k.hero})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/78 to-ink/45" />
          <div className="grain absolute inset-0" />
        </div>

        <div className="container relative flex min-h-[22rem] flex-col justify-end pb-14 pt-16 md:min-h-[27rem]">
          <nav className="mb-6 flex flex-wrap items-center gap-2 font-ui text-[0.74rem] text-sand/40">
            <Link href="/" className="transition-colors hover:text-gold">
              {c.brand.name}
            </Link>
            <span className="text-sand/25">/</span>
            <Link
              href={ROUTES.hotels}
              className="transition-colors hover:text-gold"
            >
              {c.pages.hotels.title}
            </Link>
            <span className="text-sand/25">/</span>
            <span className="text-sand/65">{k.label[locale]}</span>
          </nav>

          <Eyebrow tone="light">
            {units.length} {l.units}
          </Eyebrow>
          <h1 className="mt-4 font-display text-[clamp(2.4rem,7vw,4.6rem)] leading-[0.98] tracking-tightest text-sand">
            {k.label[locale]}
          </h1>
          <p className="mt-4 font-serif text-[1.15rem] italic text-gold/85">
            {k.tagline[locale]}
          </p>
          <p className="mt-5 max-w-xl font-ui text-[1.02rem] leading-relaxed text-sand/60">
            {k.body[locale]}
          </p>
        </div>
      </section>

      <div className="border-b border-ink/10 bg-sand">
        <div className="container flex flex-wrap items-center gap-x-6 gap-y-2 py-5">
          <span className="font-ui text-[0.6rem] font-bold uppercase tracking-[0.24em] text-clay">
            {l.facilities}
          </span>
          {k.facilities[locale].map((f) => (
            <span key={f} className="font-ui text-[0.88rem] text-ink/65">
              {f}
            </span>
          ))}
        </div>
      </div>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u, i) => (
            <UnitCard key={u.slug} unit={u} delay={i * 50} />
          ))}
        </div>

        <div className="mt-14 max-w-xl">
          <Reveal>
            <Link
              href={`${ROUTES.hotels}/${other}`}
              className="group flex items-center justify-between gap-6 border border-ink/15 bg-parchment p-6 transition-colors duration-500 hover:border-clay/50 hover:bg-sand"
            >
              <span>
                <span className="font-ui text-[0.6rem] font-bold uppercase tracking-[0.24em] text-clay">
                  {COMPLEX[other].tagline[locale]}
                </span>
                <span className="mt-2 block font-display text-[1.5rem] leading-none text-ink">
                  {COMPLEX[other].label[locale]}
                </span>
              </span>
              <span className="text-jade/50 transition-all duration-500 ease-editorial group-hover:translate-x-1.5 group-hover:text-clay rtl:group-hover:-translate-x-1.5">
                <Arrow className="h-5 w-5" />
              </span>
            </Link>
          </Reveal>
        </div>

        <Reveal className="mt-10">
          <a
            href={SITE.luxuryWhatsapp}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-3 bg-jade px-7 py-4 font-ui text-[0.9rem] font-semibold text-sand transition-colors duration-500 hover:bg-deep"
          >
            {l.ask}
            <span dir="ltr" className="text-sand/70">
              {SITE.luxuryWhatsappDisplay}
            </span>
            <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              <Arrow />
            </span>
          </a>
        </Reveal>
      </Section>

      <FindUs />
    </>
  );
}
