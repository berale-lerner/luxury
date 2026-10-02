"use client";

import { useLocale } from "@/lib/i18n";
import { ROUTES, SITE } from "@/lib/content";
import { extra } from "@/lib/pages";
import { PageHero, Section, CtaRow } from "@/components/site/PageShell";
import {
  Lead,
  ActivityList,
  TimeCards,
  MiniCards,
  Itinerary,
  CardGrid,
} from "@/components/site/Blocks";
import SectionHead, { Eyebrow } from "@/components/site/SectionHead";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";
import FindUs from "@/components/site/FindUs";
import { DonateBand } from "@/components/site/Bands";

function TripNote({ children }: { children: React.ReactNode }) {
  return (
    <Reveal className="grain relative overflow-hidden bg-clay">
      <div className="weave pointer-events-none absolute inset-0 opacity-25" />
      <div className="relative flex items-start gap-5 p-7 md:p-9">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-6 w-6 shrink-0 text-sand"
          aria-hidden="true"
        >
          <title>note</title>
          <path
            d="M12 3.5 21 19.5H3L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinejoin="round"
          />
          <path
            d="M12 9.5v4.4M12 16.6v.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <p className="font-display text-[1.05rem] leading-relaxed text-sand md:text-[1.2rem]">
          {children}
        </p>
      </div>
    </Reveal>
  );
}

export default function ThingsToDoPage() {
  const { c, locale } = useLocale();
  const p = c.pages.thingsToDo;
  const x = extra[locale].thingsToDo;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <Lead>{x.intro}</Lead>
        <div className="mx-auto mt-10 max-w-3xl">
          <TripNote>{x.note}</TripNote>
        </div>
      </Section>

      {/* ── 01 · what the Chabad House offers ───────────── */}
      <section className="grain relative overflow-hidden bg-ink py-20 md:py-28">
        <div className="weave pointer-events-none absolute inset-0 opacity-40" />
        <div className="container relative">
          <Reveal className="max-w-2xl">
            <Eyebrow tone="light">01</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(1.7rem,4vw,2.9rem)] leading-[1.06] tracking-tight text-sand text-balance">
              {x.chabad.title}
            </h2>
            <p className="mt-4 font-ui text-[1rem] leading-relaxed text-sand/55">
              {x.chabad.lead}
            </p>
          </Reveal>
          <TimeCards items={x.chabad.items} />
        </div>
      </section>

      {/* ── 02 · through Luxury Atitlán ─────────────────── */}
      <Section tone="sand">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>02</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(1.7rem,4vw,2.9rem)] leading-[1.06] tracking-tight text-ink text-balance">
              {x.luxury.title}
            </h2>
            <p className="mt-4 font-ui text-[1rem] leading-relaxed text-stone">
              {x.luxury.lead}
            </p>
          </div>

          <a
            href={SITE.luxuryWhatsapp}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex shrink-0 flex-col gap-1 border border-jade/40 bg-parchment px-6 py-4 transition-colors duration-500 hover:border-jade hover:bg-jade"
          >
            <span className="font-ui text-[0.62rem] font-bold uppercase tracking-[0.2em] text-clay transition-colors duration-500 group-hover:text-gold">
              {x.luxury.cta}
            </span>
            <span
              dir="ltr"
              className="flex items-center gap-2.5 font-display text-[1.15rem] text-ink transition-colors duration-500 group-hover:text-sand"
            >
              {SITE.luxuryWhatsappDisplay}
              <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1">
                <Arrow className="h-4 w-4 rtl:rotate-0" />
              </span>
            </span>
          </a>
        </Reveal>

        <ActivityList items={x.luxury.items} />
      </Section>

      {/* ── 03 · on your own ────────────────────────────── */}
      <Section>
        <Reveal className="max-w-2xl">
          <Eyebrow>03</Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(1.7rem,4vw,2.9rem)] leading-[1.06] tracking-tight text-ink text-balance">
            {x.solo.title}
          </h2>
          <p className="mt-4 font-ui text-[1rem] leading-relaxed text-stone">
            {x.solo.lead}
          </p>
        </Reveal>
        <ActivityList items={x.solo.items} />
      </Section>

      {/* ── villages ────────────────────────────────────── */}
      <Section tone="sand">
        <SectionHead title={x.villages.title} sub={x.villages.lead} />
        <MiniCards items={x.villages.items} />
      </Section>

      {/* ── beaches + hikes ─────────────────────────────── */}
      <Section>
        <SectionHead title={x.beaches.title} sub={x.beaches.lead} />
        <MiniCards items={x.beaches.items} />

        <div className="mt-20">
          <SectionHead title={x.hikes.title} sub={x.hikes.lead} />
          <ActivityList items={x.hikes.items} />
        </div>
      </Section>

      {/* ── workshops & services ────────────────────────── */}
      <Section tone="sand">
        <CardGrid
          title={x.workshops.title}
          lead={x.workshops.lead}
          items={x.workshops.items}
        />
      </Section>

      {/* ── suggested week ──────────────────────────────── */}
      <Section>
        <SectionHead title={x.week.title} sub={x.week.lead} />
        <Itinerary days={x.week.days} />

        <div className="mt-14">
          <TripNote>{x.note}</TripNote>
        </div>

        <div className="mt-10">
          <CtaRow
            links={[
              { label: c.ui.shabbatCta, href: ROUTES.shabbat },
              { label: c.pages.touristInfo.title, href: ROUTES.touristInfo },
              { label: c.ui.askQuestion, href: ROUTES.faq },
            ]}
          />
        </div>
      </Section>

      <FindUs />
      <DonateBand />
    </>
  );
}
