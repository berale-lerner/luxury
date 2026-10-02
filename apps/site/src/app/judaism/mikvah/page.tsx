"use client";

import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import { extra } from "@/lib/pages";
import { PageHero, Note, Section } from "@/components/site/PageShell";
import { Steps } from "@/components/site/Blocks";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";
import FindUs from "@/components/site/FindUs";

export default function MikvahPage() {
  const { c, locale } = useLocale();
  const p = c.pages.mikvah;
  const x = extra[locale].mikvah;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <div className="mx-auto max-w-3xl space-y-6">
          {x.body.map((para, i) => (
            <Reveal key={para.slice(0, 20)} delay={i * 70}>
              <p className="font-ui text-[1.06rem] leading-[1.85] text-ink/80">
                {para}
              </p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="sand" className="!pt-0">
        <div className="mx-auto max-w-4xl">
          <Steps items={x.steps} />
          <div className="mt-10">
            <Note>{x.privacy}</Note>
          </div>
        </div>
      </Section>

      <Section className="!pt-0">
        <div className="flex justify-center">
          <a
            href={SITE.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2.5 bg-jade px-7 py-4 font-ui text-[0.9rem] font-semibold text-sand transition-colors duration-500 hover:bg-deep"
          >
            {c.ui.talkToUs}
            <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              <Arrow />
            </span>
          </a>
        </div>
      </Section>

      <FindUs />
    </>
  );
}
