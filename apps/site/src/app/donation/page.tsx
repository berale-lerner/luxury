"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import { extra } from "@/lib/pages";
import { PageHero, Note, Section } from "@/components/site/PageShell";
import { CardGrid } from "@/components/site/Blocks";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";

export default function DonationPage() {
  const { c, locale } = useLocale();
  const p = c.pages.donation;
  const x = extra[locale].donation;
  const [selected, setSelected] = useState(1);

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
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-px border border-ink/12 bg-ink/12 sm:grid-cols-2 lg:grid-cols-4">
            {p.tiers.map((t, i) => (
              <Reveal key={t.amount} delay={i * 70}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex h-full w-full flex-col items-center gap-2 p-7 transition-colors duration-500",
                    selected === i
                      ? "bg-jade text-sand"
                      : "bg-parchment text-ink hover:bg-sand",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-[2.1rem] leading-none",
                      selected === i ? "text-gold" : "text-clay",
                    )}
                    dir="ltr"
                  >
                    ${t.amount}
                  </span>
                  <span
                    className={cn(
                      "font-ui text-[0.84rem] leading-snug",
                      selected === i ? "text-sand/75" : "text-stone",
                    )}
                  >
                    {t.label}
                  </span>
                </button>
              </Reveal>
            ))}
          </div>

          <Reveal delay={140} className="mt-10 flex flex-col items-center gap-6">
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2.5 bg-clay px-9 py-4 font-ui text-[0.95rem] font-semibold text-sand transition-colors duration-500 hover:bg-ember"
            >
              {c.donate.cta.label}
              <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                <Arrow />
              </span>
            </a>
            <div className="w-full max-w-xl">
              <Note>{p.note}</Note>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section>
        <CardGrid
          eyebrow={c.donate.kicker}
          title={x.ways.title}
          items={x.ways.items}
          columns={2}
        />
      </Section>
    </>
  );
}
