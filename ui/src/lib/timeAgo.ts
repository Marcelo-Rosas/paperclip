import i18n from "../i18n/i18n";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

function localeTag(locale?: string): string {
  const lang = locale || i18n.language || "pt-BR";
  return lang === "pt-BR" ? "pt-BR" : "en";
}

/**
 * Short relative time (seconds → months) for lists, e.g. issue updated.
 */
export function timeAgo(date: Date | string, locale?: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.round((now - then) / 1000);
  const loc = localeTag(locale);
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
  if (diffSec < 0) {
    return rtf.format(Math.ceil(diffSec / 60), "minute");
  }
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.floor(diffSec / 60);
  if (diffSec < HOUR) return rtf.format(-diffMin, "minute");
  const diffH = Math.floor(diffSec / HOUR);
  if (diffSec < DAY) return rtf.format(-diffH, "hour");
  const diffD = Math.floor(diffSec / DAY);
  if (diffSec < WEEK) return rtf.format(-diffD, "day");
  const diffW = Math.floor(diffSec / WEEK);
  if (diffSec < MONTH) return rtf.format(-diffW, "week");
  const diffMo = Math.floor(diffSec / MONTH);
  return rtf.format(-diffMo, "month");
}

/**
 * Relative time for run cards: under ~30 days use Intl; older dates use short locale date.
 */
export function relativeTime(date: Date | string, locale?: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.round((now - then) / 1000);
  const loc = localeTag(locale);
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
  if (diffSec < 0) {
    return rtf.format(Math.ceil(diffSec / 60), "minute");
  }
  if (diffSec < 30 * DAY) {
    if (diffSec < 60) return rtf.format(-diffSec, "second");
    const diffMin = Math.floor(diffSec / 60);
    if (diffSec < HOUR) return rtf.format(-diffMin, "minute");
    const diffH = Math.floor(diffSec / HOUR);
    if (diffSec < DAY) return rtf.format(-diffH, "hour");
    const diffD = Math.floor(diffSec / DAY);
    return rtf.format(-diffD, "day");
  }
  return new Date(date).toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}
