export const CALENDAR_PLUGIN_ID = "me3.calendar";

export const CALENDAR_RUNTIME = {
  id: CALENDAR_PLUGIN_ID,
  packageName: "@me3-core/plugin-calendar",
  bundled: true,
  runtimeStatus: "calendar_runtime",
  recurrenceRules: ["daily", "weekly", "monthly", "yearly"],
  notes: [
    "Core bundles calendar recurrence and feed expansion through a first-party plugin package.",
    "The app calendar remains available as a default workspace surface while plugin install state catches up.",
  ],
} as const;

export type CalendarEventKind = "event" | "birthday";

export type CalendarEventLike = {
  starts_at: string;
  ends_at: string;
  timezone: string | null;
  all_day: number;
  recurrence_rule: string | null;
};

const WEEKDAY_TOKENS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timezone = value.trim();
  if (!timezone) return null;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return null;
  }
}

export function resolveTimeZone(value: unknown): string {
  return normalizeTimeZone(value) || "UTC";
}

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function getUtcMsForLocalTime(
  parts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second?: number;
  },
  timezone: string,
): number {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second || 0,
  );
  const actual = localDateParts(new Date(utcGuess).toISOString(), timezone);
  const deltaMinutes =
    (Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      0,
    ) -
      utcGuess) /
    60_000;
  return utcGuess - deltaMinutes * 60_000;
}

export function normalizeEventRecurrenceRule(
  value: unknown,
  kind: CalendarEventKind,
  startDate: string,
): string | null {
  if (kind === "birthday") return "yearly";
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : null;
  if (!normalized || normalized === "none") return null;
  if (normalized === "daily" || normalized === "yearly") return normalized;

  const [year, month, day] = startDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  if (normalized === "weekly") {
    const weekday =
      WEEKDAY_TOKENS[new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay()];
    return `weekly:${weekday}`;
  }

  if (normalized === "monthly") {
    return `monthly:${day}`;
  }

  if (
    /^weekly:(sun|mon|tue|wed|thu|fri|sat)(,(sun|mon|tue|wed|thu|fri|sat))*$/.test(
      normalized,
    ) ||
    /^monthly:([1-9]|[12]\d|3[01])$/.test(normalized)
  ) {
    return normalized;
  }

  return null;
}

export function formatEventRecurrence(rule: string | null | undefined): string {
  if (rule === "daily") return "Daily";
  if (rule?.startsWith("weekly:")) {
    return `Weekly on ${rule.slice("weekly:".length).replace(/,/g, ", ")}`;
  }
  if (rule?.startsWith("monthly:")) {
    return `Monthly on day ${rule.slice("monthly:".length)}`;
  }
  if (rule === "yearly") return "Yearly";
  return rule || "";
}

export function expandRecurringCalendarEvents<T extends CalendarEventLike>(
  events: T[],
  windowStart: string,
  windowEnd: string,
): T[] {
  const startMs = new Date(windowStart).getTime();
  const endMs = new Date(windowEnd).getTime();
  const startYear = new Date(windowStart).getUTCFullYear() - 1;
  const endYear = new Date(windowEnd).getUTCFullYear() + 1;
  const expanded: T[] = [];

  for (const event of events) {
    const rule = event.recurrence_rule?.trim().toLowerCase();
    if (!rule) continue;

    const timezone = resolveTimeZone(event.timezone);
    const start = localDateParts(event.starts_at, timezone);
    const originalStartMs = new Date(event.starts_at).getTime();
    const durationMs = Math.max(
      1,
      new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime(),
    );

    const addOccurrence = (year: number, month: number, day: number) => {
      const startsAt = new Date(
        getUtcMsForLocalTime(
          {
            year,
            month,
            day,
            hour: start.hour,
            minute: start.minute,
            second: 0,
          },
          timezone,
        ),
      );
      const endsAt = new Date(startsAt.getTime() + durationMs);

      if (
        startsAt.getTime() < originalStartMs ||
        endsAt.getTime() <= startMs ||
        startsAt.getTime() >= endMs
      ) {
        return;
      }

      expanded.push({
        ...event,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      });
    };

    if (rule === "daily") {
      const cursor = new Date(startMs);
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      for (let i = 0; i < 370 && cursor.getTime() < endMs; i += 1) {
        const local = localDateParts(cursor.toISOString(), timezone);
        addOccurrence(local.year, local.month, local.day);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      continue;
    }

    if (rule.startsWith("weekly:")) {
      const days = new Set(
        rule
          .slice("weekly:".length)
          .split(",")
          .map((value) => value.trim()),
      );
      const cursor = new Date(startMs);
      cursor.setUTCDate(cursor.getUTCDate() - 7);
      for (let i = 0; i < 430 && cursor.getTime() < endMs; i += 1) {
        const local = localDateParts(cursor.toISOString(), timezone);
        const weekday =
          WEEKDAY_TOKENS[
            new Date(Date.UTC(local.year, local.month - 1, local.day, 12, 0, 0)).getUTCDay()
          ];
        if (days.has(weekday)) {
          addOccurrence(local.year, local.month, local.day);
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      continue;
    }

    if (rule.startsWith("monthly:")) {
      const day = Number(rule.slice("monthly:".length));
      if (!Number.isFinite(day) || day < 1 || day > 31) continue;
      for (let year = startYear; year <= endYear; year += 1) {
        for (let month = 1; month <= 12; month += 1) {
          const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
          addOccurrence(year, month, Math.min(day, maxDay));
        }
      }
      continue;
    }

    for (let year = startYear; year <= endYear; year += 1) {
      addOccurrence(year, start.month, start.day);
    }
  }

  return expanded;
}

function localDateParts(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"),
    minute: get("minute"),
  };
}
