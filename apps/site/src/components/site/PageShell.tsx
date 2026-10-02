"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import Reveal from "./Reveal";
import { Eyebrow } from "./SectionHead";
import Arrow from "./Arrow";

export function PageHero({
  eyebrow,
  title,
  lead,
  img,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  img: string;
}) {
  const { c } = useLocale();
  return (
    <section className="relative overflow-hidden bg-ink pt-[74px]">
      <div className="absolute inset-0">
        <div
          className="animate-kenburns h-full w-full bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${img})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/45" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="container relative flex min-h-[22rem] flex-col justify-end pb-14 pt-16 md:min-h-[27rem]">
        <nav className="mb-6 flex items-center gap-2 font-ui text-[0.74rem] text-sand/40">
          <Link href="/" className="transition-colors hover:text-gold">
            {c.brand.name}
          </Link>
          <span className="text-sand/25">/</span>
          <span className="text-sand/65">{title}</span>
        </nav>

        <Eyebrow tone="light">{eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.1rem,6vw,4.2rem)] leading-[1.02] tracking-tightest text-sand text-balance">
          {title}
        </h1>
        {lead ? (
          <p className="mt-5 max-w-xl font-ui text-[1.02rem] leading-relaxed text-sand/60">
            {lead}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-6">
      {paragraphs.map((p, i) => (
        <Reveal key={p.slice(0, 24)} delay={i * 70}>
          <p
            className={cn(
              "font-ui leading-[1.85] text-ink/80",
              i === 0
                ? "text-[1.12rem] first-letter:float-start first-letter:me-3 first-letter:font-display first-letter:text-[3.4rem] first-letter:leading-[0.82] first-letter:text-clay"
                : "text-[1.02rem]",
            )}
          >
            {p}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

export function Schedule({
  rows,
  title,
}: {
  rows: { k: string; v: string }[];
  title?: string;
}) {
  return (
    <div className="border border-ink/12 bg-sand">
      <span className="textile-band block h-[6px]" />
      <div className="p-6 md:p-8">
        {title ? (
          <p className="eyebrow mb-5 text-jade">{title}</p>
        ) : null}
        <dl>
          {rows.map((r) => (
            <div
              key={r.k}
              className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/10 py-3.5 last:border-0"
            >
              <dt className="font-ui text-[0.94rem] text-ink/80">{r.k}</dt>
              <dd className="font-display text-[1.02rem] text-clay">{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <Reveal className="flex items-start gap-4 border-s-2 border-gold bg-sand/70 p-5">
      <svg
        viewBox="0 0 24 24"
        className="mt-0.5 h-5 w-5 shrink-0 text-clay"
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
          d="M12 7.6v.6M12 11v5.2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <p className="font-ui text-[0.92rem] leading-relaxed text-ink/75">
        {children}
      </p>
    </Reveal>
  );
}

export function Facts({ items }: { items: { k: string; v: string }[] }) {
  return (
    <div className="grid gap-px border border-ink/12 bg-ink/12 sm:grid-cols-2">
      {items.map((f, i) => (
        <Reveal key={f.k} delay={i * 70} className="bg-parchment p-6">
          <p className="eyebrow text-jade">{f.k}</p>
          <p className="mt-3 font-display text-[1.15rem] leading-snug text-ink">
            {f.v}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

export function InfoBlocks({
  sections,
}: {
  sections: { title: string; items: string[] }[];
}) {
  return (
    <div className="grid gap-px border border-ink/12 bg-ink/12 md:grid-cols-2">
      {sections.map((s, i) => (
        <Reveal key={s.title} delay={i * 80} className="bg-parchment p-7 md:p-9">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[1.6rem] leading-none text-clay/35">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="font-display text-[1.35rem] leading-tight text-ink">
              {s.title}
            </h3>
          </div>
          <ul className="mt-5 space-y-3.5">
            {s.items.map((it) => (
              <li key={it} className="flex gap-3">
                <span className="mt-[0.55rem] block h-1 w-1 shrink-0 rotate-45 bg-jade" />
                <span className="font-ui text-[0.94rem] leading-relaxed text-ink/75">
                  {it}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}

export function CtaRow({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((l, i) => {
        const cls = cn(
          "group inline-flex items-center gap-2.5 px-6 py-3.5 font-ui text-[0.88rem] font-semibold transition-colors duration-500",
          i === 0
            ? "bg-jade text-sand hover:bg-deep"
            : "border border-ink/20 text-ink hover:border-clay hover:text-clay",
        );
        const inner = (
          <>
            {l.label}
            <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
              <Arrow />
            </span>
          </>
        );

        return l.href.startsWith("http") ? (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className={cls}
          >
            {inner}
          </a>
        ) : (
          <Link key={l.href} href={l.href} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

export function Section({
  children,
  tone = "parchment",
  className,
}: {
  children: React.ReactNode;
  tone?: "parchment" | "sand";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "py-20 md:py-28",
        tone === "parchment" ? "bg-parchment" : "bg-sand",
        className,
      )}
    >
      <div className="container">{children}</div>
    </section>
  );
}
