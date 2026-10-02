"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { SITE } from "@/lib/content";
import Reveal from "./Reveal";
import Arrow from "./Arrow";

export function RegisterButton({
  label,
  tone = "clay",
  className,
}: {
  label?: string;
  tone?: "clay" | "gold" | "sand" | "jade";
  className?: string;
}) {
  const { c } = useLocale();

  const tones = {
    clay: "bg-clay text-sand hover:bg-ember",
    gold: "bg-gold text-ink hover:bg-sand",
    sand: "bg-sand text-ink hover:bg-gold",
    jade: "bg-jade text-sand hover:bg-deep",
  } as const;

  return (
    <a
      href={SITE.registration}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group inline-flex items-center gap-2.5 px-7 py-4 font-ui text-[0.92rem] font-semibold transition-colors duration-500",
        tones[tone],
        className,
      )}
    >
      {label ?? c.ui.register}
      <span className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
        <Arrow />
      </span>
    </a>
  );
}

/** Sticky-feeling band placed directly under the Shabbat page hero. */
export function RegisterBanner() {
  const { c, locale } = useLocale();

  return (
    <div className="grain relative overflow-hidden bg-clay">
      <div className="weave pointer-events-none absolute inset-0 opacity-30" />
      <Reveal className="container relative flex flex-col items-center justify-between gap-5 py-7 md:flex-row">
        <div className="flex items-center gap-4">
          <span className="relative flex h-9 w-3 items-end justify-center">
            <span className="block h-5 w-[3px] rounded-sm bg-sand/80" />
            <span className="animate-flicker absolute -top-1 h-3.5 w-[7px] rounded-full bg-gradient-to-t from-ember via-gold to-sand blur-[0.5px]" />
          </span>
          <div className="leading-tight">
            <p className="font-ui text-[0.62rem] font-bold uppercase tracking-[0.28em] text-sand/70">
              {c.ui.registerPay}
            </p>
            <p className="mt-1 font-display text-[1.15rem] text-sand">
              {locale === "he"
                ? "הרשמה ותשלום לסעודות שבת וחג"
                : "Register and pay for Shabbat & holiday meals"}
            </p>
          </div>
        </div>
        <RegisterButton
          tone="sand"
          label={
            locale === "he" ? "לטופס ההרשמה" : "Open the registration form"
          }
        />
      </Reveal>
    </div>
  );
}

/** Full-width invitation band — used on the home page and elsewhere. */
export function RegisterBand() {
  const { c, locale } = useLocale();
  const he = locale === "he";

  const points = he
    ? [
        "סעודת ליל שבת וסעודת שבת בצהריים",
        "סעודות ואירועי חג",
        "אירועים מיוחדים שדורשים הכנה מראש",
      ]
    : [
        "Friday night dinner and Shabbat lunch",
        "Festival meals and holiday programmes",
        "Special events we prepare for in advance",
      ];

  return (
    <section className="bg-parchment pb-20 md:pb-28">
      <div className="container">
        <Reveal className="grain relative overflow-hidden bg-clay">
          <div className="weave pointer-events-none absolute inset-0 opacity-25" />
          <div
            className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light"
            style={{
              backgroundImage:
                "radial-gradient(120% 90% at 100% 0%, rgb(var(--gold)) 0%, transparent 60%)",
            }}
          />

          <div className="relative grid gap-10 p-8 md:grid-cols-[1.25fr_1fr] md:items-center md:gap-16 md:p-14">
            <div>
              <span className="eyebrow inline-flex items-center gap-3 text-sand/70">
                <span className="block h-px w-8 bg-sand/50" />
                {c.ui.registerPay}
              </span>
              <h2 className="mt-4 max-w-xl font-display text-[clamp(1.6rem,3.8vw,2.7rem)] leading-[1.08] tracking-tight text-sand text-balance">
                {he
                  ? "נרשמים מראש — ומגיעים לשולחן ערוך"
                  : "Register in advance — arrive to a table that's ready"}
              </h2>
              <p className="mt-4 max-w-lg font-ui text-[1rem] leading-relaxed text-sand/75">
                {c.ui.registerNote}
              </p>

              <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
                {points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5">
                    <span className="mt-[0.55rem] block h-1 w-1 shrink-0 rotate-45 bg-gold" />
                    <span className="font-ui text-[0.92rem] leading-relaxed text-sand/80">
                      {pt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-start gap-5 border-t border-sand/25 pt-8 md:items-end md:border-s md:border-t-0 md:ps-14 md:pt-0 md:text-end">
              <p className="font-serif text-[1.05rem] italic leading-snug text-sand/70">
                {he
                  ? "ההרשמה נסגרת ביום חמישי, 20:00 שעון מקומי"
                  : "Registration closes Thursday, 20:00 local time"}
              </p>
              <RegisterButton
                tone="sand"
                label={
                  he
                    ? "לטופס ההרשמה והתשלום"
                    : "Open the registration & payment form"
                }
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Compact urgent action row directly below the homepage hero. */
export function HomeRegisterStrip() {
  const { locale } = useLocale();
  const he = locale === "he";

  return (
    <section className="border-b border-ink/10 bg-parchment">
      <div className="container flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-ui text-[0.6rem] font-bold uppercase tracking-[0.22em] text-clay">
            {he ? "השבת הקרובה" : "This Shabbat"}
          </p>
          <p className="mt-1 font-display text-[1.05rem] text-ink sm:text-[1.15rem]">
            {he
              ? "ההרשמה לסעודות נסגרת ביום חמישי ב־20:00"
              : "Meal registration closes Thursday at 20:00"}
          </p>
        </div>
        <RegisterButton
          label={he ? "להרשמה לסעודות" : "Register for meals"}
          className="justify-center !px-5 !py-3"
        />
      </div>
    </section>
  );
}
