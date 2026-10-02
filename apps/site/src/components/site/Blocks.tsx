"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import Reveal from "./Reveal";
import { Eyebrow } from "./SectionHead";

/* ── Pull quote ─────────────────────────────────────────── */
export function Quote({ text, source }: { text: string; source: string }) {
  return (
    <Reveal className="relative mx-auto max-w-3xl text-center">
      <span className="block font-serif text-[4rem] leading-none text-clay/25">
        &ldquo;
      </span>
      <p className="-mt-6 font-display text-[clamp(1.4rem,3.4vw,2.2rem)] leading-[1.3] text-ink text-balance">
        {text}
      </p>
      <p className="mt-6 font-ui text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-stone">
        {source}
      </p>
    </Reveal>
  );
}

/* ── Card grid (title + text) ───────────────────────────── */
export function CardGrid({
  eyebrow,
  title,
  lead,
  items,
  columns = 3,
}: {
  eyebrow?: string;
  title?: string;
  lead?: string;
  items: { title: string; text: string }[];
  columns?: 2 | 3;
}) {
  return (
    <div>
      {title ? (
        <Reveal className="max-w-2xl">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="mt-4 font-display text-[clamp(1.7rem,4vw,2.8rem)] leading-[1.08] tracking-tight text-ink">
            {title}
          </h2>
          {lead ? (
            <p className="mt-4 font-ui text-[1rem] leading-relaxed text-stone">
              {lead}
            </p>
          ) : null}
        </Reveal>
      ) : null}

      <div
        className={cn(
          "mt-10 grid gap-px border border-ink/12 bg-ink/12",
          columns === 3
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "sm:grid-cols-2",
        )}
      >
        {items.map((it, i) => (
          <Reveal
            key={it.title}
            delay={i * 60}
            className="group bg-parchment p-7 transition-colors duration-500 hover:bg-sand"
          >
            <span className="block h-px w-8 bg-clay transition-all duration-500 group-hover:w-14" />
            <h3 className="mt-5 font-display text-[1.22rem] leading-snug text-ink">
              {it.title}
            </h3>
            <p className="mt-3 font-ui text-[0.94rem] leading-relaxed text-ink/70">
              {it.text}
            </p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ── Bullet card ────────────────────────────────────────── */
export function BulletCard({
  title,
  items,
  tone = "light",
}: {
  title: string;
  items: string[];
  tone?: "light" | "dark";
}) {
  return (
    <Reveal
      className={cn(
        "h-full border p-7 md:p-8",
        tone === "dark"
          ? "border-sand/15 bg-deep"
          : "border-ink/12 bg-parchment",
      )}
    >
      <h3
        className={cn(
          "font-display text-[1.25rem] leading-snug",
          tone === "dark" ? "text-sand" : "text-ink",
        )}
      >
        {title}
      </h3>
      <ul className="mt-5 space-y-3.5">
        {items.map((it) => (
          <li key={it} className="flex gap-3">
            <span
              className={cn(
                "mt-[0.55rem] block h-1 w-1 shrink-0 rotate-45",
                tone === "dark" ? "bg-gold" : "bg-jade",
              )}
            />
            <span
              className={cn(
                "font-ui text-[0.93rem] leading-relaxed",
                tone === "dark" ? "text-sand/60" : "text-ink/72",
              )}
            >
              {it}
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/* ── Numbered steps ─────────────────────────────────────── */
export function Steps({
  title,
  items,
  note,
}: {
  title?: string;
  items: { n: string; title: string; text: string }[];
  note?: string;
}) {
  return (
    <div>
      {title ? (
        <Reveal>
          <Eyebrow>{title}</Eyebrow>
        </Reveal>
      ) : null}

      <ol className="mt-8 grid gap-6 md:grid-cols-3">
        {items.map((s, i) => (
          <Reveal key={s.n} delay={i * 90} as="li" className="relative">
            <div className="flex h-full flex-col border-t-2 border-clay/70 pt-5">
              <span className="font-serif text-[2.2rem] leading-none text-clay/35">
                {s.n}
              </span>
              <h4 className="mt-3 font-display text-[1.18rem] leading-snug text-ink">
                {s.title}
              </h4>
              <p className="mt-2.5 font-ui text-[0.93rem] leading-relaxed text-ink/70">
                {s.text}
              </p>
            </div>
          </Reveal>
        ))}
      </ol>

      {note ? (
        <Reveal className="mt-8 border-s-2 border-gold bg-sand/70 p-5">
          <p className="font-ui text-[0.92rem] leading-relaxed text-ink/75">
            {note}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

/* ── Trips ──────────────────────────────────────────────── */
export function TripList({
  title,
  lead,
  note,
  items,
}: {
  title: string;
  lead?: string;
  note?: string;
  items: { name: string; time: string; level: string; text: string }[];
}) {
  return (
    <div>
      <Reveal className="max-w-2xl">
        <Eyebrow tone="light">{title}</Eyebrow>
        {lead ? (
          <p className="mt-4 font-ui text-[1rem] leading-relaxed text-sand/55">
            {lead}
          </p>
        ) : null}
      </Reveal>

      {note ? (
        <Reveal delay={80} className="mt-8">
          <div className="flex items-start gap-4 border border-gold/40 bg-gold/[0.08] p-5 md:p-6">
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-5 w-5 shrink-0 text-gold"
              aria-hidden="true"
            >
              <title>note</title>
              <path
                d="M12 3.2 21 19H3l9-15.8Z"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinejoin="round"
              />
              <path
                d="M12 9.4v4.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
            </svg>
            <p className="font-ui text-[0.98rem] font-medium leading-relaxed text-gold">
              {note}
            </p>
          </div>
        </Reveal>
      ) : null}

      <ul className="mt-10">
        {items.map((t, i) => (
          <Reveal key={t.name} delay={i * 60} as="li">
            <div className="group grid gap-3 border-t border-sand/12 py-6 last:border-b md:grid-cols-[1.1fr_0.8fr_1.6fr] md:items-baseline md:gap-8">
              <h3 className="font-display text-[1.28rem] leading-snug text-sand transition-colors duration-500 group-hover:text-gold">
                {t.name}
              </h3>
              <div className="flex items-center gap-3">
                <span className="font-ui text-[0.82rem] text-sand/50">
                  {t.time}
                </span>
                <span className="border border-gold/35 px-2 py-0.5 font-ui text-[0.6rem] font-bold uppercase tracking-[0.14em] text-gold/80">
                  {t.level}
                </span>
              </div>
              <p className="font-ui text-[0.93rem] leading-relaxed text-sand/50">
                {t.text}
              </p>
            </div>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

/* ── Phrase book ────────────────────────────────────────── */
export function PhraseBook({
  title,
  lead,
  items,
}: {
  title: string;
  lead?: string;
  items: { es: string; he: string }[];
}) {
  return (
    <Reveal className="border border-ink/12 bg-sand">
      <span className="textile-band block h-[6px]" />
      <div className="p-7 md:p-9">
        <Eyebrow>{title}</Eyebrow>
        {lead ? (
          <p className="mt-3 font-ui text-[0.94rem] text-stone">{lead}</p>
        ) : null}
        <dl className="mt-6 grid gap-x-10 sm:grid-cols-2">
          {items.map((p) => (
            <div
              key={p.es}
              className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-3"
            >
              <dt
                dir="ltr"
                className="font-serif text-[1.02rem] italic text-clay"
              >
                {p.es}
              </dt>
              <dd className="font-ui text-[0.9rem] text-ink/70">{p.he}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Reveal>
  );
}

/* ── Venues (kosher food detail) ────────────────────────── */
export function VenueList({
  items,
}: {
  items: {
    name: string;
    kind: string;
    img: string;
    active: boolean;
    hours: string;
    text: string;
    highlights: string[];
  }[];
}) {
  const { c } = useLocale();

  return (
    <div className="space-y-px bg-ink/12">
      {items.map((v, i) => (
        <Reveal key={v.name} delay={i * 70}>
          <article className="grid bg-parchment md:grid-cols-[0.85fr_1.15fr]">
            <div className="relative min-h-[15rem] overflow-hidden">
              <div
                className={cn(
                  "absolute inset-0 bg-cover bg-center",
                  !v.active && "grayscale",
                )}
                style={{ backgroundImage: `url(${v.img})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
              <span className="absolute bottom-4 start-4 bg-parchment/95 px-2.5 py-1 font-ui text-[0.62rem] font-bold uppercase tracking-[0.14em] text-jade">
                {v.kind}
              </span>
            </div>

            <div className="flex flex-col p-7 md:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-[1.6rem] leading-tight text-ink">
                  {v.name}
                </h3>
                {v.active ? (
                  <span className="inline-flex items-center gap-1.5 border border-jade/40 px-2 py-0.5 font-ui text-[0.6rem] font-bold uppercase tracking-[0.14em] text-jade">
                    <span className="block h-1 w-1 rounded-full bg-jade" />
                    {c.ui.active}
                  </span>
                ) : (
                  <span className="border border-stone/40 px-2 py-0.5 font-ui text-[0.6rem] font-bold uppercase tracking-[0.14em] text-stone">
                    {c.ui.inactive}
                  </span>
                )}
              </div>

              <p className="mt-4 font-ui text-[0.97rem] leading-relaxed text-ink/72">
                {v.text}
              </p>

              <p className="mt-5 flex items-center gap-2.5 font-ui text-[0.86rem] text-stone">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-clay"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                  />
                  <path
                    d="M12 7v5.2l3.2 1.9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                {v.hours}
              </p>

              <div className="mt-6 flex flex-wrap gap-2 pt-1">
                {v.highlights.map((h) => (
                  <span
                    key={h}
                    className="border border-ink/12 bg-sand px-3 py-1.5 font-ui text-[0.8rem] text-ink/70"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

/* ── Places (accommodation detail) ──────────────────────── */
export function PlaceList({
  items,
}: {
  items: {
    name: string;
    kind: string;
    walk: string;
    price: string;
    img: string;
    text: string;
    amenities: string[];
  }[];
}) {
  const { c } = useLocale();

  return (
    <div className="grid gap-px border border-ink/12 bg-ink/12 md:grid-cols-2">
      {items.map((p, i) => (
        <Reveal key={p.name} delay={i * 70} className="bg-parchment">
          <article className="flex h-full flex-col">
            <div className="relative h-52 overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${p.img})` }}
              />
              <span className="absolute top-4 start-4 bg-parchment/95 px-2.5 py-1 font-ui text-[0.6rem] font-bold uppercase tracking-[0.14em] text-jade">
                {p.kind}
              </span>
              <span
                dir="ltr"
                className="absolute top-4 end-4 bg-ink/70 px-2.5 py-1 font-ui text-[0.7rem] font-bold tracking-[0.1em] text-gold backdrop-blur-sm"
              >
                {p.price}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-7">
              <h3 className="font-display text-[1.3rem] leading-snug text-ink">
                {p.name}
              </h3>
              <p className="mt-3 font-ui text-[0.94rem] leading-relaxed text-ink/70">
                {p.text}
              </p>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {p.amenities.map((a) => (
                  <span
                    key={a}
                    className="border border-ink/12 px-2.5 py-1 font-ui text-[0.74rem] text-stone"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <p className="mt-auto flex items-center gap-2 pt-6 font-ui text-[0.8rem] text-stone">
                <span className="font-display text-[1.15rem] text-clay">
                  {p.walk}
                </span>
                {c.ui.walk}
              </p>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

/* ── Weekly rhythm ──────────────────────────────────────── */
export function WeeklyList({
  title,
  items,
  note,
}: {
  title: string;
  items: { day: string; title: string; time: string; text: string }[];
  note?: string;
}) {
  return (
    <div>
      <Reveal>
        <Eyebrow>{title}</Eyebrow>
      </Reveal>

      <ul className="mt-8">
        {items.map((w, i) => (
          <Reveal key={w.day + w.title} delay={i * 55} as="li">
            <div className="group grid gap-2 border-t border-ink/12 py-6 last:border-b md:grid-cols-[0.5fr_1.1fr_0.5fr_1.9fr] md:items-baseline md:gap-8">
              <span className="font-ui text-[0.68rem] font-bold uppercase tracking-[0.24em] text-clay">
                {w.day}
              </span>
              <h3 className="font-display text-[1.2rem] leading-snug text-ink transition-colors duration-500 group-hover:text-jade">
                {w.title}
              </h3>
              <span
                dir="ltr"
                className="font-display text-[1.05rem] text-jade tabular-nums"
              >
                {w.time}
              </span>
              <p className="font-ui text-[0.92rem] leading-relaxed text-ink/65">
                {w.text}
              </p>
            </div>
          </Reveal>
        ))}
      </ul>

      {note ? (
        <Reveal className="mt-7">
          <p className="font-serif text-[0.98rem] italic text-stone">{note}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/* ── Timetable (time → activity) ────────────────────────── */
export function Timetable({
  title,
  rows,
  note,
  accent = "jade",
}: {
  title: string;
  rows: { t: string; a: string }[];
  note?: string;
  accent?: "jade" | "clay";
}) {
  return (
    <Reveal className="flex h-full flex-col border border-ink/12 bg-parchment">
      <span
        className={cn(
          "block h-[3px]",
          accent === "jade" ? "bg-jade" : "bg-clay",
        )}
      />
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <h3 className="font-display text-[1.2rem] leading-snug text-ink">
          {title}
        </h3>

        <ol className="mt-5 flex-1">
          {rows.map((r) => (
            <li
              key={r.a}
              className="flex items-baseline gap-4 border-b border-ink/10 py-3 last:border-0"
            >
              <span className="w-14 shrink-0">
                {r.t ? (
                  <span
                    dir="ltr"
                    className={cn(
                      "font-display text-[1rem] tabular-nums",
                      accent === "jade" ? "text-jade" : "text-clay",
                    )}
                  >
                    {r.t}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "ms-1 block h-1.5 w-1.5 rotate-45",
                      accent === "jade" ? "bg-jade/45" : "bg-clay/45",
                    )}
                  />
                )}
              </span>
              <span className="font-ui text-[0.95rem] leading-relaxed text-ink/78">
                {r.a}
              </span>
            </li>
          ))}
        </ol>

        {note ? (
          <p className="mt-5 border-s-2 border-gold ps-3 font-ui text-[0.86rem] leading-relaxed text-ink/60">
            {note}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}

/* ── Lead paragraph ─────────────────────────────────────── */
export function Lead({ children }: { children: React.ReactNode }) {
  return (
    <Reveal className="mx-auto max-w-3xl">
      <p className="font-ui text-[1.12rem] leading-[1.8] text-ink/80 text-pretty">
        {children}
      </p>
    </Reveal>
  );
}

/* ── Activity list — name / time · level / description ──── */
export function ActivityList({
  items,
  tone = "light",
}: {
  items: { name: string; time: string; level: string; text: string }[];
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <ul className="mt-10">
      {items.map((t, i) => (
        <Reveal key={t.name} delay={i * 45} as="li">
          <div
            className={cn(
              "group grid gap-3 border-t py-6 last:border-b md:grid-cols-[1.15fr_0.85fr_1.6fr] md:items-baseline md:gap-8",
              dark ? "border-sand/12" : "border-ink/12",
            )}
          >
            <h3
              className={cn(
                "font-display text-[1.28rem] leading-snug transition-colors duration-500",
                dark
                  ? "text-sand group-hover:text-gold"
                  : "text-ink group-hover:text-jade",
              )}
            >
              {t.name}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "font-ui text-[0.82rem]",
                  dark ? "text-sand/50" : "text-stone",
                )}
              >
                {t.time}
              </span>
              <span
                className={cn(
                  "border px-2 py-0.5 font-ui text-[0.6rem] font-bold uppercase tracking-[0.14em]",
                  dark
                    ? "border-gold/35 text-gold/80"
                    : "border-clay/35 text-clay",
                )}
              >
                {t.level}
              </span>
            </div>
            <p
              className={cn(
                "font-ui text-[0.93rem] leading-relaxed",
                dark ? "text-sand/50" : "text-ink/70",
              )}
            >
              {t.text}
            </p>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}

/* ── Cards with a time badge (what Chabad offers) ───────── */
export function TimeCards({
  items,
}: {
  items: { title: string; time: string; text: string }[];
}) {
  return (
    <div className="mt-10 grid gap-px border border-sand/12 bg-sand/12 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <Reveal
          key={it.title}
          delay={i * 55}
          className="group relative bg-ink p-7 transition-colors duration-500 hover:bg-abyss"
        >
          <span className="inline-flex items-center gap-2 border border-gold/35 px-2.5 py-1 font-ui text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gold">
            {it.time}
          </span>
          <h3 className="mt-5 font-display text-[1.24rem] leading-snug text-sand">
            {it.title}
          </h3>
          <p className="mt-3 font-ui text-[0.93rem] leading-relaxed text-sand/55">
            {it.text}
          </p>
          <span className="absolute inset-x-0 bottom-0 h-0 bg-gold transition-[height] duration-500 ease-editorial group-hover:h-[3px]" />
        </Reveal>
      ))}
    </div>
  );
}

/* ── Compact cards: name + meta + text ──────────────────── */
export function MiniCards({
  items,
  columns = 4,
}: {
  items: { name: string; meta: string; text: string }[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={cn(
        "mt-10 grid gap-px border border-ink/12 bg-ink/12 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {items.map((it, i) => (
        <Reveal
          key={it.name}
          delay={i * 45}
          className="group flex h-full flex-col bg-parchment p-6 transition-colors duration-500 hover:bg-sand"
        >
          <span className="font-ui text-[0.62rem] font-bold uppercase tracking-[0.2em] text-clay">
            {it.meta}
          </span>
          <h3 className="mt-3 font-display text-[1.15rem] leading-snug text-ink">
            {it.name}
          </h3>
          <p className="mt-2.5 font-ui text-[0.9rem] leading-relaxed text-ink/70">
            {it.text}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

/* ── Day-by-day itinerary ───────────────────────────────── */
export function Itinerary({
  days,
}: {
  days: { day: string; text: string }[];
}) {
  return (
    <ol className="mt-10 border-s border-ink/12 ps-6 md:ps-10">
      {days.map((d, i) => (
        <Reveal key={d.day} delay={i * 55} as="li" className="relative pb-9 last:pb-0">
          <span className="absolute start-[-1.72rem] top-2 flex h-3 w-3 items-center justify-center md:start-[-2.72rem]">
            <span className="block h-2 w-2 rotate-45 bg-clay" />
          </span>
          <p className="font-ui text-[0.68rem] font-bold uppercase tracking-[0.24em] text-jade">
            {d.day}
          </p>
          <p className="mt-2 max-w-2xl font-ui text-[1rem] leading-[1.8] text-ink/75">
            {d.text}
          </p>
        </Reveal>
      ))}
    </ol>
  );
}
