"use client";

import { useLocale } from "@/lib/i18n";
import { extra } from "@/lib/pages";
import { PageHero, Note, Section } from "@/components/site/PageShell";
import { Lead, VenueList, BulletCard } from "@/components/site/Blocks";
import SectionHead from "@/components/site/SectionHead";
import { ShabbatBand } from "@/components/site/Bands";
import FindUs from "@/components/site/FindUs";

export default function FoodPage() {
  const { c, locale } = useLocale();
  const p = c.pages.food;
  const x = extra[locale].food;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <Lead>{x.intro}</Lead>
      </Section>

      <Section tone="sand" className="!pt-0">
        <SectionHead eyebrow={c.food.kicker} title={c.food.title} />
        <div className="mt-12">
          <VenueList items={x.venues} />
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <BulletCard title={x.kashrut.title} items={x.kashrut.items} />
          <BulletCard title={x.tips.title} items={x.tips.items} />
        </div>
        <div className="mt-10">
          <Note>{p.note}</Note>
        </div>
      </Section>

      <ShabbatBand />
      <FindUs />
    </>
  );
}
