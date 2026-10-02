"use client";

import { useLocale } from "@/lib/i18n";
import { PageHero } from "@/components/site/PageShell";
import Zmanim from "@/components/site/Zmanim";
import FindUs from "@/components/site/FindUs";
import { DonateBand } from "@/components/site/Bands";

export default function ZmanimPage() {
  const { c } = useLocale();
  const p = c.pages.zmanim;

  return (
    <>
      <PageHero eyebrow={p.eyebrow} title={p.title} lead={p.lead} img={p.img} />
      <Zmanim full />
      <FindUs />
      <DonateBand />
    </>
  );
}
