"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import { Eyebrow } from "./SectionHead";
import Reveal from "./Reveal";
import Arrow from "./Arrow";

function MapPanel() {
  const { c, locale } = useLocale();
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        title={c.findUs.name}
        src={SITE.mapEmbed}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-deep"
    >
      {/* topographic rings */}
      <svg
        viewBox="0 0 400 300"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-jade-soft/20"
        preserveAspectRatio="xMidYMid slice"
      >
        <title>map</title>
        {[
          "M60 250c40-70 90-40 130-95s110-30 150-90",
          "M40 270c50-60 100-30 150-85s120-25 170-85",
          "M80 235c35-75 85-45 120-100s100-35 145-80",
          "M100 220c30-65 75-45 105-95s90-40 130-75",
          "M125 205c25-58 65-45 90-90s78-42 115-70",
        ].map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
        <g className="text-gold/25">
          {Array.from({ length: 13 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 33}
              y1="0"
              x2={i * 33}
              y2="300"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={i * 33}
              x2="400"
              y2={i * 33}
              stroke="currentColor"
              strokeWidth="0.5"
            />
          ))}
        </g>
      </svg>
      <div className="grain absolute inset-0" />

      <div className="relative flex flex-col items-center">
        <span className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-clay/25" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-clay text-sand">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <title>pin</title>
              <path
                d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
              />
              <circle cx="12" cy="10" r="2.4" fill="currentColor" />
            </svg>
          </span>
        </span>

        <p
          dir="ltr"
          className="mt-5 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-gold/80"
        >
          14.6919° N · 91.2717° W
        </p>
        <span className="mt-4 inline-flex items-center gap-2 border-b border-sand/35 pb-1 font-ui text-[0.86rem] font-semibold text-sand transition-all duration-500 group-hover:gap-3.5 group-hover:border-gold group-hover:text-gold">
          {locale === "he" ? "הצגת המפה" : "Show the map"}
          <Arrow className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

export default function FindUs() {
  const { c } = useLocale();

  return (
    <section className="bg-parchment py-16 md:py-24">
      <div className="container">
        <div className="grid items-stretch gap-px border border-ink/12 bg-ink/12 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal className="bg-parchment p-6 md:p-12">
            <Eyebrow>{c.findUs.kicker}</Eyebrow>
            <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.06] tracking-tight text-ink">
              {c.findUs.title}
            </h2>

            <div className="mt-6 space-y-1 md:mt-8">
              <p className="font-ui text-[1rem] font-semibold text-ink">
                {c.findUs.name}
              </p>
              <p className="font-ui text-[0.92rem] leading-relaxed text-stone">
                {c.findUs.address}
              </p>
            </div>

            <p className="mt-5 max-w-xs font-serif text-[0.95rem] italic leading-snug text-jade">
              {c.findUs.hint}
            </p>

            <div className="mt-7 flex flex-wrap gap-3 md:mt-9">
              <a
                href={SITE.directions}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2.5 bg-clay px-6 py-3.5 font-ui text-[0.88rem] font-semibold text-sand transition-colors duration-500 hover:bg-ember"
              >
                {c.ui.navigate}
                <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                  <Arrow />
                </span>
              </a>
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 border border-ink/20 px-6 py-3.5 font-ui text-[0.88rem] font-semibold text-ink transition-colors duration-500 hover:border-jade hover:text-jade"
              >
                {c.ui.talkToUs}
              </a>
            </div>
          </Reveal>

          <Reveal delay={100} className="relative min-h-[18rem] bg-deep md:min-h-[22rem]">
            <MapPanel />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
