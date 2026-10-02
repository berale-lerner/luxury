"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import { extra } from "@/lib/pages";
import { PageHero, Section } from "@/components/site/PageShell";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";
import { DonateBand } from "@/components/site/Bands";

export default function FaqPage() {
  const { c, locale } = useLocale();
  const p = c.pages.faq;
  const items = [...p.items, ...extra[locale].faqExtra];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <div className="mx-auto max-w-3xl">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 50}>
                <div className="border-b border-ink/12">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-start justify-between gap-6 py-6 text-start"
                  >
                    <span className="flex items-start gap-4">
                      <span className="mt-1 font-ui text-[0.68rem] font-bold tabular-nums text-clay/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "font-display text-[1.15rem] leading-snug transition-colors duration-300 md:text-[1.3rem]",
                          isOpen
                            ? "text-jade"
                            : "text-ink group-hover:text-jade",
                        )}
                      >
                        {item.q}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center border transition-all duration-500",
                        isOpen
                          ? "rotate-45 border-clay bg-clay text-sand"
                          : "border-ink/20 text-ink/50 group-hover:border-jade group-hover:text-jade",
                      )}
                    >
                      <svg
                        viewBox="0 0 12 12"
                        className="h-3 w-3"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 1v10M1 6h10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>

                  <div
                    className={cn(
                      "grid overflow-hidden transition-all duration-500 ease-editorial",
                      isOpen ? "grid-rows-[1fr] pb-7" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="min-h-0">
                      <p className="max-w-2xl ps-9 font-ui text-[1rem] leading-[1.8] text-ink/70">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}

          <Reveal className="mt-14 flex flex-col items-center gap-5 border border-ink/12 bg-sand p-9 text-center">
            <p className="font-display text-[1.4rem] leading-snug text-ink">
              {c.ui.askQuestion}
            </p>
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
          </Reveal>
        </div>
      </Section>

      <DonateBand />
    </>
  );
}
