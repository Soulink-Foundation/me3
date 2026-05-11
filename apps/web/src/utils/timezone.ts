export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value.trim() }).format(
      new Date(),
    );
    return true;
  } catch {
    return false;
  }
}

export function detectBrowserTimeZone(): string | null {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(detected) ? detected : null;
}

export function listSupportedTimeZones(): string[] {
  const detected = detectBrowserTimeZone();
  const supported = (Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  }).supportedValuesOf?.("timeZone");

  if (Array.isArray(supported) && supported.length > 0) {
    return supported;
  }

  return Array.from(new Set([detected, "UTC"].filter(Boolean))) as string[];
}

function getTimeZoneNamePart(
  timeZone: string,
  mode: "short" | "longOffset",
  date = new Date(),
): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: mode,
    }).formatToParts(date);
    return parts.find((part) => part.type === "timeZoneName")?.value ?? null;
  } catch {
    return null;
  }
}

export function getTimeZoneOffsetLabel(
  timeZone: string,
  date = new Date(),
): string {
  const label = getTimeZoneNamePart(timeZone, "longOffset", date);
  if (!label) return "UTC";
  return label.replace(/^GMT/, "UTC");
}

export function getTimeZoneShortName(
  timeZone: string,
  date = new Date(),
): string {
  return getTimeZoneNamePart(timeZone, "short", date) || getTimeZoneOffsetLabel(timeZone, date);
}

export function getTimeZoneDisplayLabel(
  timeZone: string,
  date = new Date(),
): string {
  return `${timeZone} (${getTimeZoneOffsetLabel(timeZone, date)})`;
}
