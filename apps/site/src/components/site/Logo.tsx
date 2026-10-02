"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={cn("h-10 w-10", className)}
    >
      {/* arch / doorway */}
      <path
        d="M6 40V20.5C6 11.9 13.2 5 22 5s16 6.9 16 15.5V40"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.55"
      />
      {/* lake lines */}
      <path
        d="M9 33.5h26M12 37h20"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.4"
      />
      {/* flame */}
      <path
        d="M22 12.5c3.4 3 5.1 5.6 5.1 8.5 0 3.1-2.3 5.4-5.1 5.4s-5.1-2.3-5.1-5.4c0-2.9 1.7-5.5 5.1-8.5Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M22 26.4v4.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const { c } = useLocale();
  return (
    <Link
      href="/"
      className={cn(
        "group flex items-center gap-3 transition-opacity hover:opacity-80",
        className,
      )}
    >
      <Mark
        className={cn(
          "h-9 w-9 shrink-0 transition-colors",
          tone === "dark" ? "text-jade" : "text-gold",
        )}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[1.05rem] tracking-tight",
            tone === "dark" ? "text-ink" : "text-sand",
          )}
        >
          {c.brand.name}
        </span>
        <span
          className={cn(
            "mt-1 font-ui text-[0.6rem] font-semibold uppercase tracking-[0.22em]",
            tone === "dark" ? "text-stone" : "text-sand/55",
          )}
        >
          {c.brand.sub}
        </span>
      </span>
    </Link>
  );
}
