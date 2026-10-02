"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import {
  countdown,
  formatTime,
  getShabbat,
  type ShabbatInfo,
} from "@/lib/zmanim";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function ShabbatBar() {
  const { c, locale } = useLocale();
  const [info, setInfo] = useState<ShabbatInfo | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setInfo(getShabbat(n));
    };

    tick();

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!info || !now) {
    return <div className="h-[76px] w-full border-t border-gold/20" />;
  }

  const target = info.inShabbat ? info.ends : info.candles;
  const left = countdown(target, now);

  const label = info.inShabbat ? c.hero.statusEndsLabel : c.hero.statusLabel;
  const shabbatTimes =
    locale === "he"
      ? `הדלקת נרות ${formatTime(info.candles)} · צאת שבת ${formatTime(info.ends)}`
      : `Candles ${formatTime(info.candles)} · Shabbat ends ${formatTime(info.ends)}`;

  const clock = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SITE.timeZone,
  }).format(now);

  const units: Array<[string, string]> = [
    [pad(left.days), locale === "he" ? "ימים" : "days"],
    [pad(left.hours), locale === "he" ? "שעות" : "hrs"],
    [pad(left.minutes), locale === "he" ? "דק׳" : "min"],
    [pad(left.seconds), locale === "he" ? "שנ׳" : "sec"],
  ];

  return (
    <div className="w-full border-t border-gold/25 bg-ink/45 backdrop-blur-xl">
      <div className="container flex items-center justify-between gap-5 py-3 md:gap-8 md:py-4">
        <div className="flex items-center gap-3 md:gap-4">
          <span className="relative flex h-8 w-3 items-end justify-center">
            <span className="block h-5 w-[3px] rounded-sm bg-sand/70" />
            <span className="animate-flicker absolute -top-0.5 h-3.5 w-[7px] rounded-full bg-gradient-to-t from-clay via-gold to-sand blur-[0.5px]" />
          </span>

          <div className="leading-tight">
            <p className="font-ui text-[0.62rem] font-bold uppercase tracking-[0.28em] text-gold/85">
              {label}
            </p>
            <p className="mt-1 font-display text-[0.95rem] text-sand md:text-lg">
              {info.inShabbat
                ? `${c.hero.statusEndsLabel} ${formatTime(info.ends)}`
                : shabbatTimes}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-5 sm:flex">
          {units.map(([v, u], i) => (
            <div key={u} className="flex items-center gap-5">
              <div className="text-center">
                <p className="font-display text-[1.35rem] leading-none text-sand tabular-nums">
                  {v}
                </p>
                <p className="mt-1.5 font-ui text-[0.56rem] font-semibold uppercase tracking-[0.2em] text-sand/45">
                  {u}
                </p>
              </div>
              {i < units.length - 1 ? (
                <span className="h-6 w-px bg-sand/15" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-jade-soft" />
          <p className="font-ui text-[0.74rem] text-sand/55">
            {c.ui.localTime}
            <span className="mx-2 text-sand/25">·</span>
            <span className="font-semibold text-sand/85 tabular-nums">
              {clock}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
