"use client";

import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import { extra } from "@/lib/pages";
import {
  PageHero,
  Schedule,
  Note,
  Section,
  CtaRow,
} from "@/components/site/PageShell";
import { Lead, Steps, BulletCard } from "@/components/site/Blocks";
import { RegisterBanner, RegisterButton } from "@/components/site/RegisterCta";
import Reveal from "@/components/site/Reveal";
import Zmanim from "@/components/site/Zmanim";
import { Holidays, DonateBand } from "@/components/site/Bands";

export default function ShabbatPage() {
  const { c, locale } = useLocale();
  const p = c.pages.shabbat;
  const x = extra[locale].shabbat;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />
      <RegisterBanner />

      <Section>
        <Lead>{x.intro}</Lead>
      </Section>

      <Section tone="sand" className="!pt-0">
        <Steps
          title={x.steps.title}
          items={x.steps.items}
          note={x.steps.note}
        />
        <div className="mt-10 flex flex-wrap gap-3">
          <RegisterButton />
          <CtaRow links={[{ label: c.ui.askQuestion, href: ROUTES.faq }]} />
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-6">
            <Schedule
              rows={p.scheduleNight}
              title={locale === "he" ? "ליל שבת" : "Friday night"}
            />
            <Schedule
              rows={p.scheduleDay}
              title={locale === "he" ? "יום שבת קודש" : "Shabbat day"}
            />
          </div>
          <div className="space-y-6">
            <BulletCard title={x.bring.title} items={x.bring.items} />
            <Reveal className="border-s-2 border-clay bg-sand p-6">
              <h3 className="font-display text-[1.2rem] text-ink">
                {x.holidays.title}
              </h3>
              <p className="mt-3 font-ui text-[0.95rem] leading-relaxed text-ink/72">
                {x.holidays.text}
              </p>
            </Reveal>
            <Note>{p.note}</Note>
          </div>
        </div>
      </Section>

      <Holidays />
      <Zmanim />
      <DonateBand />
    </>
  );
}
