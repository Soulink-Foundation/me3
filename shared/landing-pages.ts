export type SiteType = "profile" | "landing_page";

export type LandingPageTemplateId = "event" | "service" | "waitlist";

export type LandingPageSection =
  | {
      type: "text";
      heading: string;
      body: string;
    }
  | {
      type: "list";
      heading: string;
      items: string[];
    }
  | {
      type: "steps";
      heading: string;
      items: string[];
    }
  | {
      type: "pricing";
      heading: string;
      tiers: Array<{
        name: string;
        price: string;
        note?: string;
      }>;
    }
  | {
      type: "faq";
      heading: string;
      items: Array<{
        question: string;
        answer: string;
      }>;
    }
  | {
      type: "signup";
      heading: string;
      body: string;
      buttonLabel: string;
      placeholder?: string;
    }
  | {
      type: "countdown";
      heading: string;
      label: string;
      launchDate: string;
    }
  | {
      type: "profile";
      heading: string;
      body: string;
      profileName?: string;
      profileRole?: string;
      profileImage?: string | null;
      profileLink?: string | null;
    }
  | {
      type: "image";
      heading: string;
      image: string;
      caption?: string;
    }
  | {
      type: "links";
      heading: string;
      items: Array<{
        label: string;
        href: string;
      }>;
    };

export interface LandingPageDocument {
  version: 1;
  template: LandingPageTemplateId;
  title: string;
  brief: string;
  meta: {
    description: string;
    ogImage?: string | null;
  };
  hero: {
    eyebrow?: string;
    headline: string;
    subheadline: string;
    image?: string | null;
    cta: {
      label: string;
      href: string;
    };
  };
  sections: LandingPageSection[];
  footer: {
    cta?: {
      label: string;
      href: string;
    };
    note?: string;
    profileLink?: string | null;
  };
  style: {
    vibe: "warm" | "natural" | "retro" | "tech" | "minimal" | "me3";
    accentColor: string;
  };
  updatedAt?: string;
}

export interface LandingPageTemplateDefinition {
  id: LandingPageTemplateId;
  name: string;
  shortName: string;
  description: string;
  audience: string;
  defaultCta: string;
}

export const LANDING_PAGE_TEMPLATES: LandingPageTemplateDefinition[] = [
  {
    id: "event",
    name: "Event / Workshop / Retreat",
    shortName: "Event",
    description:
      "For time-bound events with a clear date, location, logistics, and booking CTA.",
    audience: "Retreats, workshops, group events",
    defaultCta: "Reserve Your Spot",
  },
  {
    id: "service",
    name: "Service / Offer",
    shortName: "Service",
    description:
      "For focused offer pages that explain a problem, solution, process, and pricing.",
    audience: "Coaching, packages, consulting offers",
    defaultCta: "Book a Call",
  },
  {
    id: "waitlist",
    name: "Waitlist / Coming Soon",
    shortName: "Waitlist",
    description:
      "For launch pages that build anticipation and collect email signups before release.",
    audience: "Courses, launches, products, podcasts",
    defaultCta: "Join the Waitlist",
  },
];

export function getLandingPageTemplate(
  templateId: LandingPageTemplateId,
): LandingPageTemplateDefinition {
  return (
    LANDING_PAGE_TEMPLATES.find((template) => template.id === templateId) ||
    LANDING_PAGE_TEMPLATES[1]
  );
}
