"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import { PageHero, Section } from "@/components/site/PageShell";
import Reveal from "@/components/site/Reveal";
import Arrow from "@/components/site/Arrow";
import Zmanim from "@/components/site/Zmanim";
import { DonateBand } from "@/components/site/Bands";

export default function JudaismPage() {
  const { c } = useLocale();
  const p = c.pages.judaism;

  const cards = [
    {
      title: c.pages.shabbat.title,
      text: c.pages.shabbat.lead,
      href: ROUTES.shabbat,
      img: c.pages.shabbat.img,
    },
    {
      title: c.pages.prayers.title,
      text: c.pages.prayers.lead,
      href: ROUTES.prayers,
      img: c.pages.prayers.img,
    },
    {
      title: c.pages.synagogue.title,
      text: c.pages.synagogue.lead,
      href: ROUTES.synagogue,
      img: c.pages.synagogue.img,
    },
    {
      title: c.pages.mikvah.title,
      text: c.pages.mikvah.lead,
      href: ROUTES.mikvah,
      img: c.pages.mikvah.img,
    },
  ];

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card, i) => (
            <Reveal key={card.href} delay={i * 80}>
              <Link
                href={card.href}
                className="group relative flex min-h-[16rem] flex-col justify-end overflow-hidden p-7"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-1300 ease-editorial group-hover:scale-105"
                  style={{ backgroundImage: `url(${card.img})` }}
                />
                <div className="absolute inset-0 bg-ink-veil" />
                <div className="grain absolute inset-0" />
                <div className="relative">
                  <h3 className="font-display text-[1.5rem] leading-tight text-sand">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 max-w-sm font-ui text-[0.9rem] leading-relaxed text-sand/60">
                    {card.text}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 font-ui text-[0.82rem] font-semibold text-gold transition-all duration-500 group-hover:gap-3.5">
                    {c.ui.details}
                    <Arrow className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <Zmanim />
      <DonateBand />
    </>
  );
}
