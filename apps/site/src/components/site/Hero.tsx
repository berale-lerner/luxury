"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import Arrow from "./Arrow";
import ShabbatBar from "./ShabbatBar";

export default function Hero() {
  const { c } = useLocale();
  const [i, setI] = useState(0);
  const slides = c.hero.slides;

  useEffect(() => {
    const id = window.setInterval(
      () => setI((p) => (p + 1) % slides.length),
      7000,
    );
    return () => window.clearInterval(id);
  }, [slides.length]);

  return (
    <section className="relative flex min-h-[43rem] flex-col overflow-hidden bg-ink sm:min-h-[100svh]">
      {/* image stack */}
      <div className="absolute inset-0">
        {slides.map((s, idx) => (
          <div
            key={s.src}
            className={cn(
              "absolute inset-0 transition-opacity ease-editorial",
              idx === i ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDuration: "1600ms" }}
          >
            <div
              className={cn(
                "h-full w-full bg-cover bg-center",
                idx === i && "animate-kenburns",
              )}
              style={{ backgroundImage: `url(${s.src})` }}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-lake-fade" />
        <div className="grain absolute inset-0" />
      </div>

      {/* content */}
      <div className="container relative flex flex-1 flex-col justify-center pb-7 pt-[94px] md:pb-12 md:pt-[104px]">
        <div className="max-w-3xl">
          <span
            className="eyebrow inline-flex items-center gap-3 text-gold"
            style={{ animation: "rise .9s cubic-bezier(.22,1,.36,1) both" }}
          >
            <span className="block h-px w-10 bg-gold/60" />
            {c.hero.kicker}
          </span>

          <h1 className="mt-4 font-display text-[clamp(2.45rem,8.2vw,6.4rem)] leading-[0.98] tracking-tightest text-sand md:mt-6">
            {c.hero.titleLines.map((line, idx) => (
              <span
                key={line}
                className="block"
                style={{
                  animation: `rise 1s cubic-bezier(.22,1,.36,1) ${0.12 + idx * 0.12}s both`,
                }}
              >
                {idx === c.hero.titleLines.length - 1 ? (
                  <span className="text-gold">{line}</span>
                ) : (
                  line
                )}
              </span>
            ))}
          </h1>

          <div
            className="mt-5 max-w-xl md:mt-7"
            style={{
              animation: "rise 1s cubic-bezier(.22,1,.36,1) .42s both",
            }}
          >
            <p className="border-s-2 border-gold/70 bg-ink/55 px-5 py-4 font-ui text-[1.02rem] leading-relaxed text-sand shadow-lift backdrop-blur-md md:text-[1.1rem]">
              {c.hero.lead}
            </p>
          </div>

          <div
            className="mt-7 grid max-w-xl grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3"
            style={{
              animation: "rise 1s cubic-bezier(.22,1,.36,1) .56s both",
            }}
          >
            <a
              href={SITE.registration}
              target="_blank"
              rel="noreferrer"
              className="group col-span-2 inline-flex min-h-12 items-center justify-center gap-2.5 bg-clay px-5 py-3.5 font-ui text-[0.88rem] font-semibold text-sand transition-all duration-500 ease-editorial hover:bg-ember sm:col-span-1 sm:px-7 sm:py-4 sm:text-[0.92rem]"
            >
              {c.ui.registerPay}
              <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                <Arrow />
              </span>
            </a>
            <a
              href={SITE.directions}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2.5 bg-sand px-4 py-3.5 font-ui text-[0.88rem] font-semibold text-ink transition-colors duration-500 hover:bg-gold sm:px-7 sm:py-4 sm:text-[0.92rem]"
            >
              {c.ui.navigate}
            </a>
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-sand/35 bg-ink/30 px-4 py-3.5 font-ui text-[0.88rem] font-semibold text-sand backdrop-blur-sm transition-colors duration-500 hover:border-gold hover:text-gold sm:px-7 sm:py-4 sm:text-[0.92rem]"
            >
              WhatsApp
            </a>
          </div>
        </div>

        {/* caption + index */}
        <div className="mt-8 hidden items-end justify-between gap-6 sm:flex md:mt-14">
          <p
            key={slides[i].caption}
            className="max-w-xs bg-ink/45 px-3.5 py-2 font-serif text-[0.9rem] italic leading-snug text-sand/85 backdrop-blur-sm"
            style={{ animation: "rise .8s cubic-bezier(.22,1,.36,1) both" }}
          >
            {slides[i].caption}
          </p>

          <div className="flex items-center gap-3">
            {slides.map((s, idx) => (
              <button
                key={s.src}
                type="button"
                aria-label={s.caption}
                onClick={() => setI(idx)}
                className="group py-3"
              >
                <span
                  className={cn(
                    "block h-[2px] transition-all duration-500 ease-editorial",
                    idx === i
                      ? "w-14 bg-gold"
                      : "w-7 bg-sand/30 group-hover:bg-sand/60",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <ShabbatBar />
      </div>
    </section>
  );
}
