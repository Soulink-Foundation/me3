/** Single source for HumanCard pills and HumanTabs strip — keep emoji labels aligned. */
export const HUMAN_LINKS = {
  home: { to: "/home", label: "🏠 Home" },
  contacts: { to: "/contacts", label: "📇 Contacts" },
  calendar: { to: "/calendar", label: "🗓️ Calendar" },
  content: { to: "/content", label: "✍️ Content" },
  email: { to: "/email", label: "📧 Email" },
  accounts: { to: "/accounts", label: "💰 Accounts" },
} as const;

/** Label for the primary-site link in HumanTabs (path is built from `sites[0].username`). */
export const HUMAN_SITES_TAB_LABEL = "🌐 Sites" as const;

export function humanPrimarySitePath(username: string): string {
  return `/sites/${encodeURIComponent(username)}`;
}

/** Horizontal tabs: Home first (workspace landing), then the rest of Human surfaces. */
export const HUMAN_TAB_LINKS = [
  HUMAN_LINKS.home,
  HUMAN_LINKS.calendar,
  HUMAN_LINKS.contacts,
  HUMAN_LINKS.content,
  HUMAN_LINKS.email,
  HUMAN_LINKS.accounts,
] as const;

/** Dashboard Human card grid order (includes Content). */
export const HUMAN_CARD_DEFAULT_LINKS = [
  HUMAN_LINKS.home,
  HUMAN_LINKS.contacts,
  HUMAN_LINKS.calendar,
  HUMAN_LINKS.content,
  HUMAN_LINKS.email,
  HUMAN_LINKS.accounts,
] as const;
