"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { ROUTES, SITE } from "@/lib/content";
import {
  COMPLEX,
  STAY_LABELS,
  type StayCategory,
  type StayUnit,
  unitsIn,
} from "@/lib/stays";
import Reveal from "./Reveal";
import Arrow from "./Arrow";

/* ── icons ──────────────────────────────────────────────── */

function IconGuests({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle
        cx="9"
        cy="8"
        r="3.1"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path
        d="M3.4 19.2c0-3 2.5-5.1 5.6-5.1s5.6 2.1 5.6 5.1"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M16.4 6.2a2.7 2.7 0 0 1 0 5.3M17.6 14.4c2 .5 3.3 2.2 3.3 4.4"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBed({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M3 18v-8.4M3 13.2h18V18M21 18v-3"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M6.2 13.2v-2.6c0-.7.6-1.3 1.3-1.3h9c1.9 0 3.4 1.5 3.4 3.4v.5"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="8.4" cy="11" r="1.3" fill="currentColor" />
    </svg>
  );
}

function IconSize({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path
        d="M7.4 12.6V7.4h5.2M16.6 11.4v5.2h-5.2"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── the two big banners ────────────────────────────────── */

function Banner({ cat, delay }: { cat: StayCategory; delay: number }) {
  const { locale } = useLocale();
  const k = COMPLEX[cat];
  const l = STAY_LABELS[locale];
  const count = unitsIn(cat).length;

  return (
    <Reveal delay={delay} className="h-full">
      <Link
        href={`${ROUTES.hotels}/${cat}`}
        className="group relative flex h-full min-h-[26rem] flex-col justify-end overflow-hidden md:min-h-[34rem]"
      >
        <img
          src={k.hero}
          alt={k.label[locale]}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-1600 ease-editorial group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10 transition-opacity duration-700 group-hover:opacity-90" />
        <div className="grain absolute inset-0" />

        <span className="absolute inset-x-0 top-0 h-[3px] w-0 bg-gold transition-[width] duration-[900ms] ease-editorial group-hover:w-full" />

        <div className="relative p-8 md:p-11">
          <span className="inline-flex items-center gap-3 font-ui text-[0.62rem] font-bold uppercase tracking-[0.28em] text-gold">
            <span className="block h-px w-8 bg-gold/60" />
            {count} {l.units}
          </span>

          <h3 className="mt-5 font-display text-[clamp(2.2rem,5.4vw,3.6rem)] leading-[0.96] tracking-tightest text-sand">
            {k.label[locale]}
          </h3>

          <p className="mt-3 font-serif text-[1.05rem] italic text-gold/85">
            {k.tagline[locale]}
          </p>

          <p className="mt-4 max-w-sm font-ui text-[0.95rem] leading-relaxed text-sand/60">
            {k.blurb[locale]}
          </p>

          <span className="mt-8 inline-flex items-center gap-3 border-b border-sand/30 pb-2 font-ui text-[0.86rem] font-semibold text-sand transition-colors duration-500 group-hover:border-gold group-hover:text-gold">
            {k.cta[locale]}
            <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5">
              <Arrow className="h-4 w-4" />
            </span>
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

export function StayBanners() {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
      <Banner cat="suites" delay={0} />
      <Banner cat="apartments" delay={110} />
    </div>
  );
}

/* ── unit card — only the decisive facts ────────────────── */

export function UnitCard({
  unit,
  delay = 0,
}: { unit: StayUnit; delay?: number }) {
  const { locale } = useLocale();
  const l = STAY_LABELS[locale];
  const href = `${ROUTES.hotels}/${unit.category}/${unit.slug}`;
  const coverIndex = unit.photos.length
    ? unit.slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      Math.min(unit.photos.length, 8)
    : 0;
  const cover = unit.photos[coverIndex];

  return (
    <Reveal delay={delay} className="h-full">
      <article className="group flex h-full flex-col border border-ink/12 bg-parchment transition-all duration-700 ease-editorial hover:-translate-y-1 hover:border-clay/40 hover:shadow-[0_28px_60px_-32px_rgb(8_25_27/0.55)]">
        <Link
          href={href}
          prefetch
          className="relative block aspect-[4/3] overflow-hidden bg-sand"
        >
          {cover ? (
            <img
              src={cover.src}
              alt={unit.name[locale]}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1400 ease-editorial group-hover:scale-[1.05]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent opacity-70" />

          <span className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 bg-ink/70 px-2.5 py-1 font-ui text-[0.66rem] font-semibold tracking-wide text-sand backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
              <rect
                x="3"
                y="6"
                width="18"
                height="13"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
              />
              <circle
                cx="12"
                cy="12.5"
                r="3.2"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
              />
              <path
                d="M8.6 6 10 3.6h4L15.4 6"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinejoin="round"
              />
            </svg>
            {unit.photos.length}
          </span>
        </Link>

        <div className="flex flex-1 flex-col p-5 md:p-6">
          <p className="font-ui text-[0.6rem] font-bold uppercase tracking-[0.24em] text-clay">
            {locale === "he" ? unit.latin : COMPLEX[unit.category].label.en}
          </p>

          <h3 className="mt-2 font-display text-[1.4rem] leading-tight text-ink">
            <Link
              href={href}
              prefetch
              className="transition-colors duration-500 hover:text-jade"
            >
              {unit.name[locale]}
            </Link>
          </h3>

          <p className="mt-2 font-serif text-[0.98rem] italic leading-snug text-clay/90">
            {unit.highlight[locale]}
          </p>

          <dl className="mt-4 flex items-center divide-x divide-ink/10 border-y border-ink/10 py-3 rtl:divide-x-reverse">
            <Stat
              icon={<IconGuests className="h-4 w-4" />}
              label={l.guests}
              value={String(unit.guests)}
            />
            <Stat
              icon={<IconBed className="h-4 w-4" />}
              label={l.bedrooms}
              value={String(unit.bedrooms)}
            />
            <Stat
              icon={<IconSize className="h-4 w-4" />}
              label={l.size}
              value={unit.size}
              suffix={l.sizeUnit}
            />
          </dl>

          <p className="mt-3 font-ui text-[0.82rem] leading-relaxed text-ink/60">
            {unit.beds[locale]}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            <Link
              href={href}
              prefetch
              className="group/btn inline-flex items-center gap-2 bg-ink px-5 py-3 font-ui text-[0.82rem] font-semibold text-sand transition-colors duration-500 hover:bg-jade"
            >
              {l.details}
              <span className="inline-block transition-transform duration-500 ease-editorial group-hover/btn:translate-x-1 rtl:group-hover/btn:-translate-x-1">
                <Arrow className="h-3.5 w-3.5" />
              </span>
            </Link>
            <a
              href={unit.airbnb}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-ink/20 px-5 py-3 font-ui text-[0.82rem] font-semibold text-ink transition-colors duration-500 hover:border-clay hover:text-clay"
            >
              {l.book}
            </a>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function Stat({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2 first:ps-0 last:pe-0">
      <span className="flex shrink-0 text-jade/70">{icon}</span>
      <span className="min-w-0">
        <span className="block font-display text-[0.95rem] leading-none text-ink">
          {value}
          {suffix ? (
            <span className="ms-1 font-ui text-[0.56rem] text-stone">
              {suffix}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate font-ui text-[0.54rem] uppercase tracking-[0.08em] text-stone">
          {label}
        </span>
      </span>
    </div>
  );
}

export function UnitGrid({ category }: { category: StayCategory }) {
  const units = unitsIn(category);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {units.map((u, i) => (
        <UnitCard key={u.slug} unit={u} delay={i * 55} />
      ))}
    </div>
  );
}

/* ── gallery with lightbox ──────────────────────────────── */

export function Gallery({ unit }: { unit: StayUnit }) {
  const { locale } = useLocale();
  const l = STAY_LABELS[locale];
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const touchX = useRef<number | null>(null);
  const total = unit.photos.length;

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback(
    (step: number) =>
      setOpen((i) => (i === null ? null : (i + step + total) % total)),
    [total],
  );

  useEffect(() => {
    if (open === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    };

    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, move]);

  if (!total) return null;

  const idx = open;
  const current = idx === null ? null : unit.photos[idx];

  const lightbox =
    current === null || idx === null ? null : (
      <div
        className="fixed inset-0 z-[2000] flex flex-col bg-ink/95 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label={locale === "he" ? "סגירה" : "Close"}
          onClick={close}
          className="absolute inset-0 h-full w-full cursor-zoom-out"
        />

        <div className="pointer-events-none relative flex items-center justify-between px-4 py-4 md:px-8">
          <span className="pointer-events-auto bg-ink/70 px-3 py-1.5 font-ui text-[0.78rem] tabular-nums tracking-[0.16em] text-sand/80">
            {idx + 1} / {total}
          </span>

          <button
            type="button"
            onClick={close}
            className="pointer-events-auto group inline-flex items-center gap-2.5 border border-sand/30 bg-ink/70 px-4 py-2.5 font-ui text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-sand transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink"
          >
            {locale === "he" ? "סגירה" : "Close"}
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          className="pointer-events-none relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-4 md:px-20"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;

            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <img
            key={current.src}
            src={current.src}
            alt={`${unit.name[locale]} — ${idx + 1}`}
            className="pointer-events-auto max-h-full max-w-full animate-[fade_0.35s_ease-out] object-contain shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]"
          />

          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={locale === "he" ? "הקודם" : "Previous"}
            className="pointer-events-auto absolute start-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-sand/30 bg-ink/70 text-sand transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink md:start-6 md:h-14 md:w-14"
          >
            <Arrow className="h-5 w-5 rotate-180 rtl:rotate-0" />
          </button>

          <button
            type="button"
            onClick={() => move(1)}
            aria-label={locale === "he" ? "הבא" : "Next"}
            className="pointer-events-auto absolute end-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-sand/30 bg-ink/70 text-sand transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink md:end-6 md:h-14 md:w-14"
          >
            <Arrow className="h-5 w-5 rtl:rotate-180" />
          </button>
        </div>

        <div className="pointer-events-none relative px-4 pb-5 md:px-8">
          <div className="pointer-events-auto mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1">
            {unit.photos.map((p, i) => (
              <button
                key={p.src}
                type="button"
                onClick={() => setOpen(i)}
                className={cn(
                  "h-12 w-16 shrink-0 overflow-hidden border transition-all duration-300 md:h-14 md:w-20",
                  i === idx
                    ? "border-gold opacity-100"
                    : "border-transparent opacity-45 hover:opacity-80",
                )}
              >
                <img
                  src={p.src}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {unit.photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setOpen(i)}
            className={cn(
              "group relative overflow-hidden bg-sand",
              i === 0
                ? "col-span-2 row-span-2 aspect-[4/3] md:aspect-[16/11]"
                : "aspect-[4/3]",
            )}
          >
            <img
              src={p.src}
              alt={`${unit.name[locale]} — ${i + 1}`}
              loading={i < 4 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-editorial group-hover:scale-[1.06]"
            />
            <span className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/20" />
          </button>
        ))}
      </div>

      <p className="mt-4 font-ui text-[0.78rem] text-stone">
        {total} {l.photos}
      </p>

      {mounted && lightbox ? createPortal(lightbox, document.body) : null}
    </>
  );
}

/* ── booking row ────────────────────────────────────────── */

export function BookRow({ unit }: { unit: StayUnit }) {
  const { locale } = useLocale();
  const l = STAY_LABELS[locale];

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={unit.airbnb}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-2.5 bg-clay px-7 py-4 font-ui text-[0.9rem] font-semibold text-sand transition-colors duration-500 hover:bg-ember"
      >
        {l.bookAirbnb}
        <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
          <Arrow />
        </span>
      </a>

      <a
        href={SITE.luxuryWhatsapp}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2.5 border border-ink/20 px-7 py-4 font-ui text-[0.9rem] font-semibold text-ink transition-colors duration-500 hover:border-jade hover:text-jade"
      >
        {l.ask}
        <span dir="ltr" className="text-stone">
          {SITE.luxuryWhatsappDisplay}
        </span>
      </a>
    </div>
  );
}
