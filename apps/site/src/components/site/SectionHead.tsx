"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";
import Arrow from "./Arrow";

export function Eyebrow({
  children,
  tone = "dark",
  className,
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "eyebrow inline-flex items-center gap-3",
        tone === "dark" ? "text-jade" : "text-gold",
        className,
      )}
    >
      <span
        className={cn(
          "block h-px w-8",
          tone === "dark" ? "bg-jade/50" : "bg-gold/60",
        )}
      />
      {children}
    </span>
  );
}

export default function SectionHead({
  eyebrow,
  title,
  sub,
  link,
  tone = "dark",
  align = "start",
  className,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  link?: { label: string; href: string };
  tone?: "dark" | "light";
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center md:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
        <h2
          className={cn(
            "mt-4 font-display text-[clamp(1.9rem,4.6vw,3.4rem)] leading-[1.05] tracking-tight text-balance",
            tone === "dark" ? "text-ink" : "text-sand",
          )}
        >
          {title}
        </h2>
        {sub ? (
          <p
            className={cn(
              "mt-4 max-w-xl font-ui text-[1.02rem] leading-relaxed",
              tone === "dark" ? "text-stone" : "text-sand/60",
            )}
          >
            {sub}
          </p>
        ) : null}
      </div>

      {link ? (
        <Link
          href={link.href}
          className={cn(
            "link-sweep group inline-flex shrink-0 items-center gap-2 font-ui text-sm font-semibold",
            tone === "dark"
              ? "text-jade hover:text-clay"
              : "text-gold hover:text-sand",
          )}
        >
          {link.label}
          <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
            <Arrow />
          </span>
        </Link>
      ) : null}
    </Reveal>
  );
}
