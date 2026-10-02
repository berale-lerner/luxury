"use client";

import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import SectionHead from "./SectionHead";
import { StayBanners } from "./Stays";

export default function Stay() {
  const { c } = useLocale();

  return (
    <section className="bg-sand py-24 md:py-32">
      <div className="container">
        <SectionHead
          eyebrow={c.stay.kicker}
          title={c.stay.title}
          sub={c.stay.sub}
          link={{ label: c.stay.viewAll, href: ROUTES.hotels }}
        />

        <div className="mt-14">
          <StayBanners />
        </div>
      </div>
    </section>
  );
}
