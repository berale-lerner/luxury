"use client";

import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import { extra } from "@/lib/pages";
import {
  PageHero,
  Prose,
  Facts,
  Section,
  CtaRow,
} from "@/components/site/PageShell";
import { Quote, CardGrid, Timetable } from "@/components/site/Blocks";
import Reveal from "@/components/site/Reveal";
import Provides from "@/components/site/Provides";
import FindUs from "@/components/site/FindUs";
import { DonateBand } from "@/components/site/Bands";
import { RegisterBand } from "@/components/site/RegisterCta";

export default function ChabadHousePage() {
  const { c, locale } = useLocale();
  const p = c.pages.chabadHouse;
  const x = extra[locale].chabadHouse;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <div className="grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-20">
          <Prose paragraphs={p.body} />
          <div className="space-y-8">
            <Facts items={p.facts} />
            <CtaRow
              links={[
                { label: c.ui.shabbatCta, href: ROUTES.shabbat },
                { label: c.ui.askQuestion, href: ROUTES.faq },
              ]}
            />
          </div>
        </div>
      </Section>

      <section className="bg-sand py-16 md:py-20">
        <div className="container">
          <Quote text={x.quote.text} source={x.quote.source} />
        </div>
      </section>

      <Section>
        <CardGrid
          eyebrow={c.provides.kicker}
          title={x.inside.title}
          lead={x.inside.lead}
          items={x.inside.items}
        />
      </Section>

      <Section tone="sand">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-[clamp(1.7rem,4vw,2.8rem)] leading-[1.08] tracking-tight text-ink">
            {x.weekly.title}
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Timetable
            title={x.weekly.daily.title}
            rows={x.weekly.daily.rows}
            note={x.weekly.daily.note}
          />
          <Timetable
            title={x.weekly.shabbatEve.title}
            rows={x.weekly.shabbatEve.rows}
            accent="clay"
          />
          <Timetable
            title={x.weekly.shabbatDay.title}
            rows={x.weekly.shabbatDay.rows}
            accent="clay"
          />
        </div>

        <Reveal className="mt-12 max-w-3xl">
          <h3 className="font-display text-[clamp(1.4rem,3vw,2rem)] leading-tight text-ink">
            {x.team.title}
          </h3>
          <p className="mt-4 font-ui text-[1.02rem] leading-[1.85] text-ink/75">
            {x.team.text}
          </p>
        </Reveal>
      </Section>

      <RegisterBand />
      <Provides />
      <FindUs />
      <DonateBand />
    </>
  );
}
