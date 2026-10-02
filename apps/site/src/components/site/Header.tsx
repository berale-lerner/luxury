"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { ROUTES } from "@/lib/content";
import Logo from "./Logo";
import Arrow from "./Arrow";

export default function Header() {
  const { c, locale, toggle } = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const overHero = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the mobile sheet if the viewport grows to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setOpen(false);
        setOpenGroup(null);
      }
    };
    onChange(mq);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = scrolled || !overHero;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-editorial",
          solid
            ? "border-b border-ink/10 bg-parchment/90 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container flex h-[74px] items-center justify-between gap-6">
          <Logo tone={solid ? "dark" : "light"} />

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {c.nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <div key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-1.5 px-2.5 py-2 font-ui text-[0.86rem] font-medium transition-colors xl:px-3.5 xl:text-[0.9rem]",
                      solid
                        ? active
                          ? "text-clay"
                          : "text-ink/75 hover:text-jade"
                        : active
                          ? "text-gold"
                          : "text-sand/85 hover:text-white",
                    )}
                  >
                    {item.label}
                    {item.children ? (
                      <svg
                        viewBox="0 0 10 6"
                        className="h-[5px] w-[9px] opacity-60 transition-transform duration-300 group-hover:rotate-180"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 1l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : null}
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-x-2.5 bottom-1 xl:inset-x-3.5 h-px origin-center scale-x-0 bg-current transition-transform duration-500 ease-editorial group-hover:scale-x-100",
                        active && "scale-x-100",
                      )}
                    />
                  </Link>

                  {item.children ? (
                    <div className="invisible absolute top-full start-0 w-64 translate-y-2 opacity-0 transition-all duration-300 ease-editorial group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      <div className="mt-1 overflow-hidden border border-ink/10 bg-parchment shadow-lift-lg">
                        <span className="textile-band block h-[3px]" />
                        {item.children.map((sub) => {
                          const external = sub.href.startsWith("http");
                          const cls =
                            "flex items-center justify-between gap-3 border-b border-ink/[0.06] px-4 py-3 font-ui text-[0.85rem] text-ink/75 transition-colors last:border-0 hover:bg-sand hover:text-jade";
                          const body = (
                            <>
                              {sub.label}
                              {external ? (
                                <svg
                                  viewBox="0 0 14 14"
                                  className="h-3 w-3 shrink-0 text-clay"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M5 2h7v7M12 2 5.5 8.5M11 9v3H2V3h3"
                                    stroke="currentColor"
                                    strokeWidth="1.3"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </>
                          );
                          return external ? (
                            <a
                              key={sub.href}
                              href={sub.href}
                              target="_blank"
                              rel="noreferrer"
                              className={cls}
                            >
                              {body}
                            </a>
                          ) : (
                            <Link key={sub.href} href={sub.href} className={cls}>
                              {body}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          {/* actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label="Switch language"
              className={cn(
                "hidden h-9 items-center gap-1.5 border px-3 font-ui text-[0.72rem] font-bold uppercase tracking-[0.18em] transition-colors sm:flex",
                solid
                  ? "border-ink/15 text-ink/70 hover:border-jade hover:text-jade"
                  : "border-white/25 text-sand/85 hover:border-gold hover:text-gold",
              )}
            >
              {c.ui.langShort}
            </button>

            <Link
              href={ROUTES.donation}
              className={cn(
                "hidden h-9 items-center px-4 font-ui text-[0.82rem] font-semibold transition-all duration-300 xl:inline-flex",
                solid
                  ? "bg-jade text-sand hover:bg-deep"
                  : "bg-sand/12 text-sand backdrop-blur-md hover:bg-sand hover:text-ink",
              )}
            >
              {c.ui.donate}
            </Link>

            <Link
              href={ROUTES.shabbat}
              className="hidden h-9 items-center bg-clay px-4 font-ui text-[0.82rem] font-semibold text-sand transition-colors duration-300 hover:bg-ember sm:inline-flex"
            >
              {c.ui.shabbatCta}
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={c.ui.menu}
              className={cn(
                "flex h-9 w-9 items-center justify-center transition-colors lg:hidden",
                solid ? "text-ink" : "text-sand",
              )}
            >
              <span className="sr-only">{c.ui.menu}</span>
              <span className="flex flex-col gap-[5px]">
                <span className="block h-px w-6 bg-current" />
                <span className="block h-px w-6 bg-current" />
                <span className="block h-px w-4 bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── mobile overlay ─────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-[60] transition-[visibility] duration-500 lg:hidden",
          open
            ? "pointer-events-auto visible"
            : "pointer-events-none invisible",
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-ink transition-opacity duration-500",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "grain absolute inset-0 flex flex-col overflow-y-auto transition-all duration-500 ease-editorial",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-4 opacity-0",
          )}
        >
          <div className="container flex h-[74px] shrink-0 items-center justify-between">
            <Logo tone="light" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={c.ui.close}
              className="flex h-9 w-9 items-center justify-center text-sand"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M5 5l14 14M19 5L5 19"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <nav className="container flex flex-1 flex-col justify-center gap-1 py-8">
            {c.nav.map((item, i) => (
              <div
                key={item.href}
                className="border-b border-sand/10"
                style={{
                  transitionDelay: `${i * 45}ms`,
                }}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={item.href}
                    className="flex-1 py-4 font-display text-[1.7rem] leading-none text-sand transition-colors hover:text-gold"
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <button
                      type="button"
                      aria-label={item.label}
                      onClick={() =>
                        setOpenGroup((p) =>
                          p === item.href ? null : item.href,
                        )
                      }
                      className="p-3 text-gold"
                    >
                      <svg
                        viewBox="0 0 12 12"
                        className={cn(
                          "h-3 w-3 transition-transform duration-300",
                          openGroup === item.href && "rotate-45",
                        )}
                        aria-hidden="true"
                      >
                        <path
                          d="M6 1v10M1 6h10"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
                {item.children ? (
                  <div
                    className={cn(
                      "grid overflow-hidden transition-all duration-500 ease-editorial",
                      openGroup === item.href
                        ? "grid-rows-[1fr] pb-4"
                        : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="min-h-0">
                      <div className="flex flex-col gap-1 ps-4">
                        {item.children.map((sub) => {
                          const external = sub.href.startsWith("http");
                          const cls =
                            "py-2 font-ui text-[0.95rem] text-sand/60 transition-colors hover:text-gold";
                          const body = (
                            <span className="inline-flex items-center gap-2">
                              {sub.label}
                              {external ? (
                                <svg
                                  viewBox="0 0 14 14"
                                  className="h-3 w-3 shrink-0 text-sand/45"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M5 2h7v7M12 2 5.5 8.5M11 9v3H2V3h3"
                                    stroke="currentColor"
                                    strokeWidth="1.3"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </span>
                          );
                          return external ? (
                            <a
                              key={sub.href}
                              href={sub.href}
                              target="_blank"
                              rel="noreferrer"
                              className={cls}
                            >
                              {body}
                            </a>
                          ) : (
                            <Link key={sub.href} href={sub.href} className={cls}>
                              {body}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="container shrink-0 pb-10">
            <div className="flex flex-wrap gap-2">
              <Link
                href={ROUTES.donation}
                className="flex-1 bg-jade px-5 py-3.5 text-center font-ui text-sm font-semibold text-sand"
              >
                {c.ui.donate}
              </Link>
              <Link
                href={ROUTES.shabbat}
                className="flex-1 bg-clay px-5 py-3.5 text-center font-ui text-sm font-semibold text-sand"
              >
                {c.ui.shabbatCta}
              </Link>
              <button
                type="button"
                onClick={toggle}
                className="border border-sand/25 px-5 py-3.5 font-ui text-sm font-semibold uppercase tracking-[0.16em] text-sand"
              >
                {c.ui.langShort}
              </button>
            </div>
            <p className="mt-6 font-ui text-[0.72rem] uppercase tracking-[0.28em] text-sand/35">
              {locale === "he"
                ? "אגם אטיטלן · גואטמלה"
                : "Lake Atitlán · Guatemala"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
