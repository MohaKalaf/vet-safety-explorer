export const numberFormat = new Intl.NumberFormat("en-GB");

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// "2026-10-05" -> "5 October 2026"
export function formatDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? isoDate : dayFormat.format(date);
}
