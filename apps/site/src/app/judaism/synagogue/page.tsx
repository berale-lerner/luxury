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
import FindUs from "@/components/site/FindUs";
import { DonateBand } from "@/components/site/Bands";

export default function SynagoguePage() {
  const { c, locale } = useLocale();
  const p = c.pages.synagogue;
  const x = extra[locale].synagogue;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <div className="grid gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-20">
          <Prose paragraphs={x.body} />
          <div className="space-y-8">
            <Facts items={x.features} />
            <CtaRow
              links={[
                { label: c.pages.prayers.title, href: ROUTES.prayers },
                { label: c.zmanim.cta.label, href: ROUTES.zmanim },
              ]}
            />
          </div>
        </div>
      </Section>

      <FindUs />
      <DonateBand />
    </>
  );
}
