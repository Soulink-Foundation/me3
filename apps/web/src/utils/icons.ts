import { icons } from "lucide";
import type { IconNode } from "lucide";

/** Inlined from Lucide `user-star` (not in lucide@0.515). */
const USER_STAR_ICON: IconNode = [
  [
    "path",
    {
      d: "M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z",
    },
  ],
  ["path", { d: "M8 15H7a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: "10", cy: "7", r: "4" }],
];

export const UI_ICONS = { ...icons, UserStar: USER_STAR_ICON } as typeof icons & {
  UserStar: IconNode;
};

export type LucideIconName = keyof typeof UI_ICONS;

export const UI_ICON_NAMES = Object.keys(UI_ICONS).sort() as LucideIconName[];

const LEGACY_ICON_ALIASES = {
  cart: "ShoppingCart",
  dice: "Dices",
  helpCircle: "HelpCircle",
} as const satisfies Record<string, LucideIconName>;

type LegacyIconAlias = keyof typeof LEGACY_ICON_ALIASES;

export type UiIconName = LucideIconName | LegacyIconAlias;

function toPascalCase(value: string): string {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[\s_-]+/g, " ")
    .trim();
  if (!spaced) return "";
  return spaced
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function resolveUiIconName(value: string): LucideIconName | null {
  if (!value) return null;

  if (Object.prototype.hasOwnProperty.call(UI_ICONS, value)) {
    return value as LucideIconName;
  }

  const legacyAlias = LEGACY_ICON_ALIASES[value as LegacyIconAlias];
  if (legacyAlias && Object.prototype.hasOwnProperty.call(UI_ICONS, legacyAlias)) {
    return legacyAlias;
  }

  const pascal = toPascalCase(value);
  if (pascal && Object.prototype.hasOwnProperty.call(UI_ICONS, pascal)) {
    return pascal as LucideIconName;
  }

  return null;
}

/**
 * Check if a string is a valid UI icon name
 */
export function isUiIconName(value: string): value is UiIconName {
  return resolveUiIconName(value) !== null;
}

function splitWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[\s_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function toTitleCase(value: string): string {
  return splitWords(value)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Icon metadata for the picker UI
 */
export const UI_ICON_META: Record<
  LucideIconName,
  { label: string; keywords: string[] }
> = Object.fromEntries(
  UI_ICON_NAMES.map((name) => {
    const parts = splitWords(name);
    const label = toTitleCase(name);
    const keywords = Array.from(new Set(parts.map((part) => part.toLowerCase())));
    return [name, { label, keywords }];
  }),
) as Record<LucideIconName, { label: string; keywords: string[] }>;

function attrsToString(attrs: Record<string, unknown>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(" ");
}

function renderNode([tag, attrs]: IconNode[number]): string {
  const attrString = attrsToString(attrs);
  return attrString ? `<${tag} ${attrString} />` : `<${tag} />`;
}

/**
 * Generate an SVG string for a given icon name.
 * Used for embedding icons in generated HTML.
 */
export function getIconSvgString(name: UiIconName, size: number = 16): string {
  const resolved = resolveUiIconName(name);
  if (!resolved) return "";

  const icon = UI_ICONS[resolved];
  if (!icon) return "";

  const svgAttrs = attrsToString({
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });

  const paths = icon.map(renderNode).join("");

  return `<svg ${svgAttrs}>${paths}</svg>`;
}
