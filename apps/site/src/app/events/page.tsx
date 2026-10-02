"use client";

import { useLocale } from "@/lib/i18n";
import { extra } from "@/lib/pages";
import { PageHero, Section } from "@/components/site/PageShell";
import { Lead, WeeklyList } from "@/components/site/Blocks";
import Events from "@/components/site/Events";
import { Holidays, ShabbatBand, DonateBand } from "@/components/site/Bands";
import { RegisterBand } from "@/components/site/RegisterCta";

export default function EventsPage() {
  const { c, locale } = useLocale();
  const p = c.pages.events;
  const x = extra[locale].events;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <Lead>{x.intro}</Lead>
        <div className="mt-14">
          <WeeklyList
            title={x.weekly.title}
            items={x.weekly.items}
            note={x.note}
          />
        </div>
      </Section>

      <Events />
      <ShabbatBand />
      <RegisterBand />
      <Holidays />
      <DonateBand />
    </>
  );
}
