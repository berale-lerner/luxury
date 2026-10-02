"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";
import { IMG } from "@/lib/content";
import Arrow from "@/components/site/Arrow";

export default function NotFound() {
  const { c, locale } = useLocale();

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-ink pt-[74px]">
      <div className="absolute inset-0">
        <div
          className="h-full w-full bg-cover bg-center opacity-35"
          style={{ backgroundImage: `url(${IMG.lake})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/60" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="container relative py-24 text-center">
        <p className="font-serif text-[clamp(5rem,18vw,12rem)] leading-none text-gold/25">
          404
        </p>
        <h1 className="-mt-6 font-display text-[clamp(1.7rem,4.6vw,3rem)] leading-tight text-sand">
          {locale === "he"
            ? "הדף הזה איבד את הדרך אל האגם"
            : "This page lost its way to the lake"}
        </h1>
        <p className="mx-auto mt-5 max-w-md font-ui text-[1rem] leading-relaxed text-sand/55">
          {locale === "he"
            ? "קורה לטובים ביותר. בואו נחזור להתחלה."
            : "It happens to the best of us. Let's head back."}
        </p>
        <Link
          href="/"
          className="group mt-9 inline-flex items-center gap-2.5 bg-sand px-7 py-4 font-ui text-[0.92rem] font-semibold text-ink transition-colors duration-500 hover:bg-gold"
        >
          {c.ui.backHome}
          <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
            <Arrow />
          </span>
        </Link>
      </div>
    </section>
  );
}
