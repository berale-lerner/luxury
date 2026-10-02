"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { IMG, ROUTES } from "@/lib/content";
import { extra } from "@/lib/pages";
import {
  PageHero,
  InfoBlocks,
  Section,
  CtaRow,
} from "@/components/site/PageShell";
import { BulletCard, PhraseBook } from "@/components/site/Blocks";
import { Eyebrow } from "@/components/site/SectionHead";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";
import Stay from "@/components/site/Stay";
import Zmanim from "@/components/site/Zmanim";
import FindUs from "@/components/site/FindUs";

export default function TouristInfoPage() {
  const { c, locale } = useLocale();
  const p = c.pages.touristInfo;
  const x = extra[locale].touristInfo;
  const ttd = c.pages.thingsToDo;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <InfoBlocks sections={p.sections} />
      </Section>

      <section className="bg-parchment pb-20 md:pb-28">
        <div className="container">
          <Reveal>
            <Link
              href={ROUTES.thingsToDo}
              className="group relative flex min-h-[20rem] flex-col justify-end overflow-hidden p-8 md:min-h-[24rem] md:p-14"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1400 ease-editorial group-hover:scale-[1.04]"
                style={{ backgroundImage: `url(${IMG.lake})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/94 via-ink/60 to-ink/25" />
              <div className="grain absolute inset-0" />

              <div className="relative">
                <Eyebrow tone="light">{ttd.eyebrow}</Eyebrow>
                <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.7rem,4vw,3rem)] leading-[1.06] tracking-tight text-sand text-balance">
                  {ttd.title}
                </h2>
                <p className="mt-4 max-w-lg font-ui text-[0.98rem] leading-relaxed text-sand/60">
                  {ttd.lead}
                </p>
                <span className="mt-7 inline-flex w-fit items-center gap-2.5 bg-sand px-6 py-3.5 font-ui text-[0.88rem] font-semibold text-ink transition-colors duration-500 group-hover:bg-gold">
                  {c.ui.details}
                  <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                    <Arrow />
                  </span>
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      <Section className="!pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <BulletCard title={x.health.title} items={x.health.items} />
          <BulletCard title={x.money.title} items={x.money.items} />
        </div>

        <div className="mt-10">
          <PhraseBook
            title={x.phrases.title}
            lead={x.phrases.lead}
            items={x.phrases.items}
          />
        </div>

        <div className="mt-10">
          <CtaRow
            links={[
              { label: ttd.title, href: ROUTES.thingsToDo },
              { label: c.food.title, href: ROUTES.food },
              { label: c.ui.askQuestion, href: ROUTES.faq },
            ]}
          />
        </div>
      </Section>

      <Stay />
      <Zmanim />
      <FindUs />
    </>
  );
}
