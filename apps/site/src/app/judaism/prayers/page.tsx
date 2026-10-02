"use client";

import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import {
  PageHero,
  Schedule,
  Note,
  Section,
  CtaRow,
} from "@/components/site/PageShell";
import Zmanim from "@/components/site/Zmanim";
import FindUs from "@/components/site/FindUs";

export default function PrayersPage() {
  const { c } = useLocale();
  const p = c.pages.prayers;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <Schedule rows={p.schedule} title={c.events.kicker} />
          <div className="space-y-8">
            <Note>{p.note}</Note>
            <CtaRow
              links={[
                { label: c.zmanim.cta.label, href: ROUTES.zmanim },
                { label: c.pages.synagogue.title, href: ROUTES.synagogue },
              ]}
            />
          </div>
        </div>
      </Section>

      <Zmanim />
      <FindUs />
    </>
  );
}
