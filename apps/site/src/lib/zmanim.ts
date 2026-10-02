import { SITE } from "./content";

const RAD = Math.PI / 180;
const J2000 = 2451545.0;
const DAY_MS = 86400000;

/* ── Julian helpers ─────────────────────────────────────────── */
const toJulian = (d: Date) => d.getTime() / DAY_MS + 2440587.5;
const fromJulian = (j: number) => new Date((j - 2440587.5) * DAY_MS);

/**
 * Time (as a Julian date) at which the sun reaches `altitude` degrees
 * on the day containing `date`, for the given coordinates.
 * `dir` = -1 for the morning event, +1 for the evening event.
 * Returns null when the sun never reaches that altitude (never happens here).
 */
function solarEvent(
  date: Date,
  lat: number,
  lng: number,
  altitude: number,
  dir: -1 | 1,
): Date | null {
  const n = Math.round(toJulian(date) - J2000 - 0.0009 + 0.5) - 0.5;
  const jStar = n - lng / 360;

  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const Mr = M * RAD;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = ((M + C + 180 + 102.9372) % 360) * RAD;

  const jTransit =
    J2000 + jStar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambda);

  const decl = Math.asin(Math.sin(lambda) * Math.sin(23.4397 * RAD));
  const phi = lat * RAD;

  const cosOmega =
    (Math.sin(altitude * RAD) - Math.sin(phi) * Math.sin(decl)) /
    (Math.cos(phi) * Math.cos(decl));

  if (cosOmega > 1 || cosOmega < -1) return null;

  const omega = Math.acos(cosOmega) / RAD;
  return fromJulian(jTransit + (dir * omega) / 360);
}

function solarNoon(date: Date, lng: number): Date {
  const n = Math.round(toJulian(date) - J2000 - 0.0009 + 0.5) - 0.5;
  const jStar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const Mr = M * RAD;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = ((M + C + 180 + 102.9372) % 360) * RAD;
  return fromJulian(
    J2000 + jStar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambda),
  );
}

const add = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60000);

export type ZmanimKey =
  | "alot"
  | "misheyakir"
  | "sunrise"
  | "shmaMGA"
  | "shmaGRA"
  | "tfila"
  | "chatzot"
  | "minchaGedola"
  | "plag"
  | "sunset"
  | "tzeit"
  | "chatzotNight";

export type Zmanim = Record<ZmanimKey, Date | null>;

export function getZmanim(date = new Date()): Zmanim {
  const { lat, lng } = SITE;

  const sunrise = solarEvent(date, lat, lng, -0.833, -1);
  const sunset = solarEvent(date, lat, lng, -0.833, 1);
  const chatzot = solarNoon(date, lng);

  const shaa =
    sunrise && sunset ? (sunset.getTime() - sunrise.getTime()) / 12 / 60000 : 0;

  const alot = solarEvent(date, lat, lng, -16.1, -1);
  const tzeit = solarEvent(date, lat, lng, -8.5, 1);

  // Magen Avraham day: dawn → nightfall
  const shaaMGA =
    alot && tzeit ? (tzeit.getTime() - alot.getTime()) / 12 / 60000 : 0;

  return {
    alot,
    misheyakir: solarEvent(date, lat, lng, -11, -1),
    sunrise,
    shmaMGA: alot ? add(alot, shaaMGA * 3) : null,
    shmaGRA: sunrise ? add(sunrise, shaa * 3) : null,
    tfila: sunrise ? add(sunrise, shaa * 4) : null,
    chatzot,
    minchaGedola: chatzot ? add(chatzot, shaa * 0.5) : null,
    plag: sunset ? add(sunset, -shaa * 1.25) : null,
    sunset,
    tzeit,
    chatzotNight: chatzot ? add(chatzot, 12 * 60) : null,
  };
}

/* ── Formatting in Guatemala local time ─────────────────────── */
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: SITE.timeZone,
});

export const formatTime = (d: Date | null) => (d ? timeFmt.format(d) : "—");

export function formatDate(d: Date, locale: "he" | "en") {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: SITE.timeZone,
  }).format(d);
}

/* ── Shabbat ────────────────────────────────────────────────── */

/** Day-of-week (0 = Sunday) in Guatemala, regardless of the viewer's zone. */
function localDay(d: Date) {
  const s = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: SITE.timeZone,
  }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(s);
}

export type ShabbatInfo = {
  candles: Date;
  ends: Date;
  /** true while Shabbat is actually in */
  inShabbat: boolean;
};

export function getShabbat(now = new Date()): ShabbatInfo | null {
  for (let offset = -1; offset <= 8; offset++) {
    const probe = new Date(now.getTime() + offset * DAY_MS);
    if (localDay(probe) !== 5) continue; // Friday

    const z = getZmanim(probe);
    if (!z.sunset) continue;
    const candles = add(z.sunset, -18);

    const saturday = new Date(probe.getTime() + DAY_MS);
    const zs = getZmanim(saturday);
    if (!zs.tzeit) continue;
    const ends = zs.tzeit;

    if (now.getTime() > ends.getTime()) continue;

    return {
      candles,
      ends,
      inShabbat:
        now.getTime() >= candles.getTime() && now.getTime() <= ends.getTime(),
    };
  }
  return null;
}

export function countdown(target: Date, now = new Date()) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(diff / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    seconds: Math.floor((diff % 60000) / 1000),
  };
}
