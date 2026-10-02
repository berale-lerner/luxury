"use client";

import { useLocale } from "@/lib/i18n";
import { extra } from "@/lib/pages";
import { STAY_LABELS, COMPLEX } from "@/lib/stays";
import { PageHero, Note, Section } from "@/components/site/PageShell";
import { Lead, BulletCard } from "@/components/site/Blocks";
import SectionHead from "@/components/site/SectionHead";
import { StayBanners } from "@/components/site/Stays";
import Reveal from "@/components/site/Reveal";
import FindUs from "@/components/site/FindUs";
import { DonateBand } from "@/components/site/Bands";

export default function HotelsPage() {
  const { c, locale } = useLocale();
  const p = c.pages.hotels;
  const x = extra[locale].hotels;
  const l = STAY_LABELS[locale];

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <Lead>{x.intro}</Lead>
      </Section>

      <Section tone="sand" className="!pt-0">
        <SectionHead title={l.chooseTitle} sub={l.chooseLead} />
        <div className="mt-12">
          <StayBanners />
        </div>

        <Reveal className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink/12 pt-7">
          <span className="font-ui text-[0.62rem] font-bold uppercase tracking-[0.24em] text-clay">
            {l.facilities}
          </span>
          {COMPLEX.suites.facilities[locale].map((f) => (
            <span key={f} className="font-ui text-[0.9rem] text-ink/65">
              {f}
            </span>
          ))}
        </Reveal>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <BulletCard title={x.tips.title} items={x.tips.items} />
          <div className="flex items-center">
            <Note>{p.note}</Note>
          </div>
        </div>
      </Section>

      <FindUs />
      <DonateBand />
    </>
  );
}
