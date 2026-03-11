/**
 * me3 Protocol v0.1
 *
 * A protocol for portable personal websites.
 * Your site lives in a single me.json file that you can take anywhere.
 */

// ============================================================================
// Types
// ============================================================================

export interface Me3Page {
  /** URL-friendly identifier */
  slug: string;
  /** Display name for navigation */
  title: string;
  /** Path to markdown file (relative to me.json) */
  file: string;
  /** Whether to show in navigation */
  visible: boolean;
}

export interface Me3Post {
  /** URL-friendly identifier */
  slug: string;
  /** Display name for listing */
  title: string;
  /** Path to markdown file (relative to me.json) */
  file: string;
  /** Post format (optional) */
  type?: Me3PostType;
  /** Media payload for non-text posts (optional) */
  media?: Me3Media;
  /** ISO publish date (optional) */
  publishedAt?: string;
  /** Short excerpt for archive/listing (optional) */
  excerpt?: string;
  /** ISO timestamp when post was sent to newsletter subscribers (optional) */
  emailedAt?: string;
}

export type Me3PostType =
  | "article"
  | "note"
  | "video"
  | "audio"
  | "image"
  | "link";

export interface Me3Media {
  /** Media URL (player or file) */
  url?: string;
  /** Duration in seconds (optional) */
  duration?: number;
  /** Thumbnail URL (optional) */
  thumbnail?: string;
  /** Provider identifier (optional) */
  provider?: string;
  /** Provider-specific id (optional) */
  id?: string;
}

export interface Me3Product {
  /** URL-friendly identifier */
  slug: string;
  /** Product name */
  title: string;
  /** Path to markdown file (relative to me.json) */
  file: string;
  /** Product price in cents (e.g., 2999 for $29.99) */
  price: number;
  /** Currency code */
  currency: "USD" | "GBP" | "EUR";
  /** Product images (URLs) */
  images?: string[];
  /** Whether product is available for purchase */
  available?: boolean;
  /** ISO publish date (optional) */
  publishedAt?: string;
  /** Short excerpt for listings (optional) */
  excerpt?: string;
}

export interface Me3Testimonial {
  /** Person's display name */
  name: string;
  /** Social handle (optional) */
  handle?: string;
  /** Avatar image URL */
  avatar?: string;
  /** The testimonial quote text */
  quote: string;
  /** Link to their profile/site (optional) */
  profileUrl?: string;
}

export type Me3TestimonialDisplay = "homepage" | "standalone";

export interface Me3Links {
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  email?: string;
  [key: string]: string | undefined;
}

export interface Me3Button {
  /** Button text (max 30 chars) */
  text: string;
  /** URL to open when clicked */
  url: string;
  /** Button style */
  style?: "primary" | "secondary" | "outline";
  /** Optional icon (emoji or icon identifier) */
  icon?: string;
}

export interface Me3FooterLink {
  /** Link text */
  text: string;
  /** URL to open when clicked */
  url: string;
}

export interface Me3Footer {
  /** Custom footer text (e.g. "Built by Jane") */
  text?: string;
  /** Optional custom footer link */
  link?: Me3FooterLink;
}

export interface Me3Verification {
  /** Whether the author is a verified human */
  verified: boolean;
  /** The domain used for verification */
  verifiedDomain?: string;
  /** When verification occurred (ISO timestamp) */
  verifiedAt?: string;
}

// ============================================================================
// Intents - Machine-readable actions visitors can take
// ============================================================================

/**
 * Newsletter subscription intent.
 * When enabled, the site accepts email subscriptions via POST /api/subscribe
 */
export interface Me3IntentSubscribe {
  /** Whether newsletter signups are enabled */
  enabled: boolean;
  /** Newsletter title (e.g., "AI Weekly") - for agents to present context */
  title?: string;
  /** What subscribers will receive - for agents to explain the value */
  description?: string;
  /** How often subscribers will hear from you */
  frequency?: "daily" | "weekly" | "monthly" | "irregular";
}

/**
 * Availability windows for booking.
 * Defines when the person is available for meetings.
 */
export interface Me3BookingAvailability {
  /** Timezone for the availability windows (e.g., "America/New_York") */
  timezone: string;
  /** Weekly availability windows by day */
  windows: {
    monday?: string[];
    tuesday?: string[];
    wednesday?: string[];
    thursday?: string[];
    friday?: string[];
    saturday?: string[];
    sunday?: string[];
  };
}

/**
 * Booking pricing configuration.
 * Allows hosts to charge for meetings with a sliding scale pay-what-you-want model.
 */
export interface Me3BookingPricing {
  /** Whether paid meetings are enabled */
  enabled: boolean;
  /** Suggested price amount in dollars (e.g., 50 for $50) */
  suggestedAmount: number;
  /** Currency code */
  currency: "USD" | "GBP" | "EUR";
  /** Minimum amount bookers can pay (always $5) */
  minimumAmount: 5;
  /** Whether to allow free meetings alongside paid ones */
  allowFree: boolean;
}

/**
 * Booking/scheduling intent.
 * Declares that the person accepts meeting bookings.
 */
export interface Me3IntentBook {
  /** Whether booking is enabled */
  enabled: boolean;
  /** Meeting title (e.g., "30-min Consultation") */
  title?: string;
  /** What the meeting is about */
  description?: string;
  /** Meeting duration in minutes */
  duration?: number;
  /** Buffer time between meetings in minutes (default: 0) */
  bufferTime?: number;
  /** Booking provider (e.g., "cal.com", "calendly") - for external providers */
  provider?: string;
  /** Direct booking URL - for external booking systems */
  url?: string;
  /** Availability windows - for native me3 booking */
  availability?: Me3BookingAvailability;
  /** Pricing configuration for paid meetings (optional) */
  pricing?: Me3BookingPricing;
}

/**
 * Shop intent.
 * Declares that the person sells products via a simple shop.
 */
export interface Me3IntentShop {
  /** Whether shop is enabled */
  enabled: boolean;
  /** Shop title/name */
  title?: string;
  /** Shop description */
  description?: string;
  /** Shop currency */
  currency: "USD" | "GBP" | "EUR";
}

/**
 * Intents object - declares what actions visitors/agents can take.
 * This is the machine-readable API contract for interacting with a person.
 */
export interface Me3Intents {
  /** Newsletter subscription */
  subscribe?: Me3IntentSubscribe;
  /** Meeting booking */
  book?: Me3IntentBook;
  /** Shop intent */
  shop?: Me3IntentShop;
}

export interface Me3Profile {
  /** Protocol version */
  version: string;
  /** Display name (required) */
  name: string;
  /** Username/handle */
  handle?: string;
  /** Freeform location string (e.g. "Remote", "Berlin, Germany") */
  location?: string;
  /** Short bio */
  bio?: string;
  /** Avatar URL (absolute or relative) */
  avatar?: string;
  /** Banner/header image URL */
  banner?: string;
  /** Social and external links */
  links?: Me3Links;
  /** Call-to-action buttons (max 3) */
  buttons?: Me3Button[];
  /** Custom pages (markdown) */
  pages?: Me3Page[];
  /** Blog posts (markdown) */
  posts?: Me3Post[];
  /** Products (markdown) */
  products?: Me3Product[];
  /** Testimonials / social proof */
  testimonials?: Me3Testimonial[];
  /** Where testimonials should be displayed */
  testimonialDisplay?: Me3TestimonialDisplay;
  /** Title for the testimonials section/page */
  testimonialsTitle?: string;
  /**
   * Custom footer configuration.
   * - `undefined`: default footer behavior (renderer-defined)
   * - `false`: hide footer (renderer may restrict this to Pro tiers)
   */
  footer?: Me3Footer | false;
  /**
   * Intents - machine-readable actions that visitors/agents can take.
   * This is the API contract for interacting with the person.
   */
  intents?: Me3Intents;
  /**
   * Human verification status (populated from account, not editable per-site)
   */
  verification?: Me3Verification;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  profile?: Me3Profile;
}

const CURRENT_VERSION = "0.1";
const MAX_NAME_LENGTH = 100;
const MAX_BIO_LENGTH = 500;
const MAX_HANDLE_LENGTH = 30;
const HANDLE_REGEX = /^[a-z0-9_-]+$/i;
const MAX_LOCATION_LENGTH = 100;
const MAX_BUTTONS = 3;
const MAX_BUTTON_TEXT_LENGTH = 30;
const VALID_BUTTON_STYLES = ["primary", "secondary", "outline"];
const URL_REGEX = /^https?:\/\/.+/i;
const MAX_FOOTER_TEXT_LENGTH = 200;
const MAX_FOOTER_LINK_TEXT_LENGTH = 60;
const MAX_INTENT_TITLE_LENGTH = 100;
const MAX_INTENT_DESCRIPTION_LENGTH = 300;
const VALID_FREQUENCIES = ["daily", "weekly", "monthly", "irregular"];
const VALID_CURRENCIES = ["USD", "GBP", "EUR"];
const VALID_TESTIMONIAL_DISPLAYS = ["homepage", "standalone"];

/**
 * Validate a me3 profile object
 */
export function validateProfile(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: [{ field: "root", message: "Profile must be an object" }],
    };
  }

  const profile = data as Record<string, unknown>;

  // Version (required)
  if (!profile.version || typeof profile.version !== "string") {
    errors.push({ field: "version", message: "Version is required" });
  } else if (profile.version !== CURRENT_VERSION) {
    errors.push({
      field: "version",
      message: `Unsupported version. Expected ${CURRENT_VERSION}`,
    });
  }

  // Name (required)
  if (!profile.name || typeof profile.name !== "string") {
    errors.push({ field: "name", message: "Name is required" });
  } else if (profile.name.length > MAX_NAME_LENGTH) {
    errors.push({
      field: "name",
      message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
    });
  }

  // Handle (optional)
  if (profile.handle !== undefined) {
    if (typeof profile.handle !== "string") {
      errors.push({ field: "handle", message: "Handle must be a string" });
    } else if (profile.handle.length > MAX_HANDLE_LENGTH) {
      errors.push({
        field: "handle",
        message: `Handle must be ${MAX_HANDLE_LENGTH} characters or less`,
      });
    } else if (!HANDLE_REGEX.test(profile.handle)) {
      errors.push({
        field: "handle",
        message:
          "Handle can only contain letters, numbers, underscores, and hyphens",
      });
    }
  }

  // Location (optional)
  if (profile.location !== undefined) {
    if (typeof profile.location !== "string") {
      errors.push({ field: "location", message: "Location must be a string" });
    } else if (profile.location.length > MAX_LOCATION_LENGTH) {
      errors.push({
        field: "location",
        message: `Location must be ${MAX_LOCATION_LENGTH} characters or less`,
      });
    }
  }

  // Bio (optional)
  if (profile.bio !== undefined) {
    if (typeof profile.bio !== "string") {
      errors.push({ field: "bio", message: "Bio must be a string" });
    } else if (profile.bio.length > MAX_BIO_LENGTH) {
      errors.push({
        field: "bio",
        message: `Bio must be ${MAX_BIO_LENGTH} characters or less`,
      });
    }
  }

  // Avatar (optional)
  if (profile.avatar !== undefined && typeof profile.avatar !== "string") {
    errors.push({ field: "avatar", message: "Avatar must be a string URL" });
  }

  // Banner (optional)
  if (profile.banner !== undefined && typeof profile.banner !== "string") {
    errors.push({ field: "banner", message: "Banner must be a string URL" });
  }

  // Links (optional)
  if (profile.links !== undefined) {
    if (typeof profile.links !== "object" || profile.links === null) {
      errors.push({ field: "links", message: "Links must be an object" });
    }
  }

  // Buttons (optional)
  if (profile.buttons !== undefined) {
    if (!Array.isArray(profile.buttons)) {
      errors.push({ field: "buttons", message: "Buttons must be an array" });
    } else {
      if (profile.buttons.length > MAX_BUTTONS) {
        errors.push({
          field: "buttons",
          message: `Maximum ${MAX_BUTTONS} buttons allowed`,
        });
      }
      profile.buttons.forEach((button, index) => {
        if (!button || typeof button !== "object") {
          errors.push({
            field: `buttons[${index}]`,
            message: "Button must be an object",
          });
          return;
        }
        if (!button.text || typeof button.text !== "string") {
          errors.push({
            field: `buttons[${index}].text`,
            message: "Button text is required",
          });
        } else if (button.text.length > MAX_BUTTON_TEXT_LENGTH) {
          errors.push({
            field: `buttons[${index}].text`,
            message: `Button text must be ${MAX_BUTTON_TEXT_LENGTH} characters or less`,
          });
        }
        if (!button.url || typeof button.url !== "string") {
          errors.push({
            field: `buttons[${index}].url`,
            message: "Button URL is required",
          });
        } else if (!URL_REGEX.test(button.url)) {
          errors.push({
            field: `buttons[${index}].url`,
            message:
              "Button URL must be a valid URL starting with http:// or https://",
          });
        }
        if (
          button.style !== undefined &&
          !VALID_BUTTON_STYLES.includes(button.style)
        ) {
          errors.push({
            field: `buttons[${index}].style`,
            message: `Button style must be one of: ${VALID_BUTTON_STYLES.join(", ")}`,
          });
        }
        if (button.icon !== undefined && typeof button.icon !== "string") {
          errors.push({
            field: `buttons[${index}].icon`,
            message: "Button icon must be a string",
          });
        }
      });
    }
  }

  // Footer (optional)
  if (profile.footer !== undefined) {
    if (profile.footer === false) {
      // ok (renderer may enforce tier restrictions)
    } else if (typeof profile.footer !== "object" || profile.footer === null) {
      errors.push({
        field: "footer",
        message: "Footer must be an object or false",
      });
    } else {
      const footer = profile.footer as Record<string, unknown>;

      if (footer.text !== undefined) {
        if (typeof footer.text !== "string") {
          errors.push({
            field: "footer.text",
            message: "Footer text must be a string",
          });
        } else if (footer.text.length > MAX_FOOTER_TEXT_LENGTH) {
          errors.push({
            field: "footer.text",
            message: `Footer text must be ${MAX_FOOTER_TEXT_LENGTH} characters or less`,
          });
        }
      }

      if (footer.link !== undefined) {
        if (typeof footer.link !== "object" || footer.link === null) {
          errors.push({
            field: "footer.link",
            message: "Footer link must be an object",
          });
        } else {
          const link = footer.link as Record<string, unknown>;
          if (!link.text || typeof link.text !== "string") {
            errors.push({
              field: "footer.link.text",
              message: "Footer link text is required",
            });
          } else if (link.text.length > MAX_FOOTER_LINK_TEXT_LENGTH) {
            errors.push({
              field: "footer.link.text",
              message: `Footer link text must be ${MAX_FOOTER_LINK_TEXT_LENGTH} characters or less`,
            });
          }

          if (!link.url || typeof link.url !== "string") {
            errors.push({
              field: "footer.link.url",
              message: "Footer link URL is required",
            });
          } else if (!URL_REGEX.test(link.url)) {
            errors.push({
              field: "footer.link.url",
              message:
                "Footer link URL must be a valid URL starting with http:// or https://",
            });
          }
        }
      }
    }
  }

  // Pages (optional)
  if (profile.pages !== undefined) {
    if (!Array.isArray(profile.pages)) {
      errors.push({ field: "pages", message: "Pages must be an array" });
    } else {
      profile.pages.forEach((page, index) => {
        if (!page || typeof page !== "object") {
          errors.push({
            field: `pages[${index}]`,
            message: "Page must be an object",
          });
          return;
        }
        if (!page.slug || typeof page.slug !== "string") {
          errors.push({
            field: `pages[${index}].slug`,
            message: "Page slug is required",
          });
        }
        if (!page.title || typeof page.title !== "string") {
          errors.push({
            field: `pages[${index}].title`,
            message: "Page title is required",
          });
        }
        if (!page.file || typeof page.file !== "string") {
          errors.push({
            field: `pages[${index}].file`,
            message: "Page file is required",
          });
        }
        if (typeof page.visible !== "boolean") {
          errors.push({
            field: `pages[${index}].visible`,
            message: "Page visible must be a boolean",
          });
        }
      });
    }
  }

  // Posts (optional)
  if ((profile as any).posts !== undefined) {
    const posts = (profile as any).posts;
    if (!Array.isArray(posts)) {
      errors.push({ field: "posts", message: "Posts must be an array" });
    } else {
      const allowedPostTypes = new Set([
        "article",
        "note",
        "video",
        "audio",
        "image",
        "link",
      ]);
      posts.forEach((post: any, index: number) => {
        if (!post || typeof post !== "object") {
          errors.push({
            field: `posts[${index}]`,
            message: "Post must be an object",
          });
          return;
        }
        if (!post.slug || typeof post.slug !== "string") {
          errors.push({
            field: `posts[${index}].slug`,
            message: "Post slug is required",
          });
        }
        if (!post.title || typeof post.title !== "string") {
          errors.push({
            field: `posts[${index}].title`,
            message: "Post title is required",
          });
        }
        if (!post.file || typeof post.file !== "string") {
          errors.push({
            field: `posts[${index}].file`,
            message: "Post file is required",
          });
        }
        if (post.type !== undefined && typeof post.type !== "string") {
          errors.push({
            field: `posts[${index}].type`,
            message: "Post type must be a string",
          });
        } else if (post.type && !allowedPostTypes.has(post.type)) {
          errors.push({
            field: `posts[${index}].type`,
            message: "Post type is invalid",
          });
        }
        if (post.media !== undefined) {
          if (!post.media || typeof post.media !== "object") {
            errors.push({
              field: `posts[${index}].media`,
              message: "Post media must be an object",
            });
          } else {
            if (
              post.media.url !== undefined &&
              typeof post.media.url !== "string"
            ) {
              errors.push({
                field: `posts[${index}].media.url`,
                message: "Post media url must be a string",
              });
            }
            if (
              post.media.duration !== undefined &&
              typeof post.media.duration !== "number"
            ) {
              errors.push({
                field: `posts[${index}].media.duration`,
                message: "Post media duration must be a number",
              });
            }
            if (
              post.media.thumbnail !== undefined &&
              typeof post.media.thumbnail !== "string"
            ) {
              errors.push({
                field: `posts[${index}].media.thumbnail`,
                message: "Post media thumbnail must be a string",
              });
            }
            if (
              post.media.provider !== undefined &&
              typeof post.media.provider !== "string"
            ) {
              errors.push({
                field: `posts[${index}].media.provider`,
                message: "Post media provider must be a string",
              });
            }
            if (
              post.media.id !== undefined &&
              typeof post.media.id !== "string"
            ) {
              errors.push({
                field: `posts[${index}].media.id`,
                message: "Post media id must be a string",
              });
            }
          }
        }
        if (
          post.publishedAt !== undefined &&
          typeof post.publishedAt !== "string"
        ) {
          errors.push({
            field: `posts[${index}].publishedAt`,
            message: "Post publishedAt must be a string",
          });
        }
        if (post.excerpt !== undefined && typeof post.excerpt !== "string") {
          errors.push({
            field: `posts[${index}].excerpt`,
            message: "Post excerpt must be a string",
          });
        }
        if (
          post.emailedAt !== undefined &&
          typeof post.emailedAt !== "string"
        ) {
          errors.push({
            field: `posts[${index}].emailedAt`,
            message: "Post emailedAt must be a string",
          });
        }
      });
    }
  }

  // Products (optional)
  if ((profile as any).products !== undefined) {
    const products = (profile as any).products;
    if (!Array.isArray(products)) {
      errors.push({ field: "products", message: "Products must be an array" });
    } else {
      products.forEach((product: any, index: number) => {
        if (!product || typeof product !== "object") {
          errors.push({
            field: `products[${index}]`,
            message: "Product must be an object",
          });
          return;
        }
        if (!product.slug || typeof product.slug !== "string") {
          errors.push({
            field: `products[${index}].slug`,
            message: "Product slug is required",
          });
        }
        if (!product.title || typeof product.title !== "string") {
          errors.push({
            field: `products[${index}].title`,
            message: "Product title is required",
          });
        }
        if (!product.file || typeof product.file !== "string") {
          errors.push({
            field: `products[${index}].file`,
            message: "Product file is required",
          });
        }
        if (typeof product.price !== "number") {
          errors.push({
            field: `products[${index}].price`,
            message: "Product price must be a number (in cents)",
          });
        }
        if (
          typeof product.currency !== "string" ||
          !VALID_CURRENCIES.includes(product.currency)
        ) {
          errors.push({
            field: `products[${index}].currency`,
            message: `Product currency must be one of: ${VALID_CURRENCIES.join(", ")}`,
          });
        }
        if (
          product.available !== undefined &&
          typeof product.available !== "boolean"
        ) {
          errors.push({
            field: `products[${index}].available`,
            message: "Product available must be a boolean",
          });
        }
        if (product.images !== undefined) {
          if (!Array.isArray(product.images)) {
            errors.push({
              field: `products[${index}].images`,
              message: "Product images must be an array of strings",
            });
          } else if (
            product.images.some((img: any) => typeof img !== "string")
          ) {
            errors.push({
              field: `products[${index}].images`,
              message: "Product images must be an array of strings",
            });
          }
        }
        if (
          product.publishedAt !== undefined &&
          typeof product.publishedAt !== "string"
        ) {
          errors.push({
            field: `products[${index}].publishedAt`,
            message: "Product publishedAt must be a string",
          });
        }
        if (
          product.excerpt !== undefined &&
          typeof product.excerpt !== "string"
        ) {
          errors.push({
            field: `products[${index}].excerpt`,
            message: "Product excerpt must be a string",
          });
        }
      });
    }
  }

  // Testimonials (optional)
  if ((profile as any).testimonials !== undefined) {
    const testimonials = (profile as any).testimonials;
    if (!Array.isArray(testimonials)) {
      errors.push({
        field: "testimonials",
        message: "Testimonials must be an array",
      });
    } else {
      testimonials.forEach((testimonial: any, index: number) => {
        if (!testimonial || typeof testimonial !== "object") {
          errors.push({
            field: `testimonials[${index}]`,
            message: "Testimonial must be an object",
          });
          return;
        }
        if (!testimonial.name || typeof testimonial.name !== "string") {
          errors.push({
            field: `testimonials[${index}].name`,
            message: "Testimonial name is required",
          });
        }
        if (!testimonial.quote || typeof testimonial.quote !== "string") {
          errors.push({
            field: `testimonials[${index}].quote`,
            message: "Testimonial quote is required",
          });
        }
        if (
          testimonial.handle !== undefined &&
          typeof testimonial.handle !== "string"
        ) {
          errors.push({
            field: `testimonials[${index}].handle`,
            message: "Testimonial handle must be a string",
          });
        }
        if (
          testimonial.avatar !== undefined &&
          typeof testimonial.avatar !== "string"
        ) {
          errors.push({
            field: `testimonials[${index}].avatar`,
            message: "Testimonial avatar must be a string",
          });
        }
        if (
          testimonial.profileUrl !== undefined &&
          typeof testimonial.profileUrl !== "string"
        ) {
          errors.push({
            field: `testimonials[${index}].profileUrl`,
            message: "Testimonial profileUrl must be a string",
          });
        }
      });
    }
  }

  // Testimonial display (optional)
  if ((profile as any).testimonialDisplay !== undefined) {
    const display = (profile as any).testimonialDisplay;
    if (typeof display !== "string") {
      errors.push({
        field: "testimonialDisplay",
        message: "Testimonial display must be a string",
      });
    } else if (!VALID_TESTIMONIAL_DISPLAYS.includes(display)) {
      errors.push({
        field: "testimonialDisplay",
        message: `Testimonial display must be one of: ${VALID_TESTIMONIAL_DISPLAYS.join(", ")}`,
      });
    }
  }

  // Testimonials title (optional)
  if ((profile as any).testimonialsTitle !== undefined) {
    const title = (profile as any).testimonialsTitle;
    if (typeof title !== "string") {
      errors.push({
        field: "testimonialsTitle",
        message: "Testimonials title must be a string",
      });
    }
  }

  // Intents (optional)
  if (profile.intents !== undefined) {
    if (typeof profile.intents !== "object" || profile.intents === null) {
      errors.push({ field: "intents", message: "Intents must be an object" });
    } else {
      const intents = profile.intents as Record<string, unknown>;

      // Validate subscribe intent
      if (intents.subscribe !== undefined) {
        if (
          typeof intents.subscribe !== "object" ||
          intents.subscribe === null
        ) {
          errors.push({
            field: "intents.subscribe",
            message: "Subscribe intent must be an object",
          });
        } else {
          const subscribe = intents.subscribe as Record<string, unknown>;

          if (typeof subscribe.enabled !== "boolean") {
            errors.push({
              field: "intents.subscribe.enabled",
              message: "Subscribe enabled must be a boolean",
            });
          }

          if (subscribe.title !== undefined) {
            if (typeof subscribe.title !== "string") {
              errors.push({
                field: "intents.subscribe.title",
                message: "Subscribe title must be a string",
              });
            } else if (subscribe.title.length > MAX_INTENT_TITLE_LENGTH) {
              errors.push({
                field: "intents.subscribe.title",
                message: `Subscribe title must be ${MAX_INTENT_TITLE_LENGTH} characters or less`,
              });
            }
          }

          if (subscribe.description !== undefined) {
            if (typeof subscribe.description !== "string") {
              errors.push({
                field: "intents.subscribe.description",
                message: "Subscribe description must be a string",
              });
            } else if (
              subscribe.description.length > MAX_INTENT_DESCRIPTION_LENGTH
            ) {
              errors.push({
                field: "intents.subscribe.description",
                message: `Subscribe description must be ${MAX_INTENT_DESCRIPTION_LENGTH} characters or less`,
              });
            }
          }

          if (
            subscribe.frequency !== undefined &&
            !VALID_FREQUENCIES.includes(subscribe.frequency as string)
          ) {
            errors.push({
              field: "intents.subscribe.frequency",
              message: `Subscribe frequency must be one of: ${VALID_FREQUENCIES.join(", ")}`,
            });
          }
        }
      }

      // Validate book intent
      if (intents.book !== undefined) {
        if (typeof intents.book !== "object" || intents.book === null) {
          errors.push({
            field: "intents.book",
            message: "Book intent must be an object",
          });
        } else {
          const book = intents.book as Record<string, unknown>;

          if (typeof book.enabled !== "boolean") {
            errors.push({
              field: "intents.book.enabled",
              message: "Book enabled must be a boolean",
            });
          }

          if (book.title !== undefined) {
            if (typeof book.title !== "string") {
              errors.push({
                field: "intents.book.title",
                message: "Book title must be a string",
              });
            } else if (book.title.length > MAX_INTENT_TITLE_LENGTH) {
              errors.push({
                field: "intents.book.title",
                message: `Book title must be ${MAX_INTENT_TITLE_LENGTH} characters or less`,
              });
            }
          }

          if (book.description !== undefined) {
            if (typeof book.description !== "string") {
              errors.push({
                field: "intents.book.description",
                message: "Book description must be a string",
              });
            } else if (
              book.description.length > MAX_INTENT_DESCRIPTION_LENGTH
            ) {
              errors.push({
                field: "intents.book.description",
                message: `Book description must be ${MAX_INTENT_DESCRIPTION_LENGTH} characters or less`,
              });
            }
          }

          if (
            book.duration !== undefined &&
            typeof book.duration !== "number"
          ) {
            errors.push({
              field: "intents.book.duration",
              message: "Book duration must be a number (minutes)",
            });
          }

          if (
            book.provider !== undefined &&
            typeof book.provider !== "string"
          ) {
            errors.push({
              field: "intents.book.provider",
              message: "Book provider must be a string",
            });
          }

          // URL is optional if availability is set (native me3 booking)
          if (book.url !== undefined) {
            if (typeof book.url !== "string") {
              errors.push({
                field: "intents.book.url",
                message: "Book URL must be a string",
              });
            } else if (!URL_REGEX.test(book.url as string)) {
              errors.push({
                field: "intents.book.url",
                message:
                  "Book URL must be a valid URL starting with http:// or https://",
              });
            }
          }

          // Validate availability if present
          if (book.availability !== undefined) {
            if (
              typeof book.availability !== "object" ||
              book.availability === null
            ) {
              errors.push({
                field: "intents.book.availability",
                message: "Book availability must be an object",
              });
            } else {
              const availability = book.availability as Record<string, unknown>;

              if (
                !availability.timezone ||
                typeof availability.timezone !== "string"
              ) {
                errors.push({
                  field: "intents.book.availability.timezone",
                  message: "Availability timezone is required",
                });
              }

              if (availability.windows !== undefined) {
                if (
                  typeof availability.windows !== "object" ||
                  availability.windows === null
                ) {
                  errors.push({
                    field: "intents.book.availability.windows",
                    message: "Availability windows must be an object",
                  });
                } else {
                  const windows = availability.windows as Record<
                    string,
                    unknown
                  >;
                  const validDays = [
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                  ];
                  const timeWindowRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

                  for (const [day, value] of Object.entries(windows)) {
                    if (!validDays.includes(day)) {
                      errors.push({
                        field: `intents.book.availability.windows.${day}`,
                        message: `Invalid day: ${day}`,
                      });
                      continue;
                    }

                    if (!Array.isArray(value)) {
                      errors.push({
                        field: `intents.book.availability.windows.${day}`,
                        message: `Windows for ${day} must be an array`,
                      });
                      continue;
                    }

                    for (const window of value) {
                      if (
                        typeof window !== "string" ||
                        !timeWindowRegex.test(window)
                      ) {
                        errors.push({
                          field: `intents.book.availability.windows.${day}`,
                          message: `Invalid time window format. Use HH:MM-HH:MM`,
                        });
                      }
                    }
                  }
                }
              }
            }
          }

          // Either URL or availability must be set for booking to work
          if (!book.url && !book.availability) {
            errors.push({
              field: "intents.book",
              message:
                "Book intent requires either a URL (for external booking) or availability (for native booking)",
            });
          }

          // Validate pricing if present
          if (book.pricing !== undefined) {
            if (typeof book.pricing !== "object" || book.pricing === null) {
              errors.push({
                field: "intents.book.pricing",
                message: "Book pricing must be an object",
              });
            } else {
              const pricing = book.pricing as Record<string, unknown>;

              if (typeof pricing.enabled !== "boolean") {
                errors.push({
                  field: "intents.book.pricing.enabled",
                  message: "Pricing enabled must be a boolean",
                });
              }

              if (pricing.enabled) {
                if (typeof pricing.suggestedAmount !== "number") {
                  errors.push({
                    field: "intents.book.pricing.suggestedAmount",
                    message: "Suggested amount must be a number",
                  });
                } else if (pricing.suggestedAmount < 5) {
                  errors.push({
                    field: "intents.book.pricing.suggestedAmount",
                    message: "Suggested amount must be at least $5",
                  });
                }

                if (
                  typeof pricing.currency !== "string" ||
                  !VALID_CURRENCIES.includes(pricing.currency)
                ) {
                  errors.push({
                    field: "intents.book.pricing.currency",
                    message: `Currency must be one of: ${VALID_CURRENCIES.join(", ")}`,
                  });
                }

                if (pricing.minimumAmount !== 5) {
                  errors.push({
                    field: "intents.book.pricing.minimumAmount",
                    message: "Minimum amount must be 5",
                  });
                }

                if (typeof pricing.allowFree !== "boolean") {
                  errors.push({
                    field: "intents.book.pricing.allowFree",
                    message: "Allow free must be a boolean",
                  });
                }
              }
            }
          }
        }
      }

      // Validate shop intent
      if (intents.shop !== undefined) {
        if (typeof intents.shop !== "object" || intents.shop === null) {
          errors.push({
            field: "intents.shop",
            message: "Shop intent must be an object",
          });
        } else {
          const shop = intents.shop as Record<string, unknown>;

          if (typeof shop.enabled !== "boolean") {
            errors.push({
              field: "intents.shop.enabled",
              message: "Shop enabled must be a boolean",
            });
          }

          if (shop.title !== undefined) {
            if (typeof shop.title !== "string") {
              errors.push({
                field: "intents.shop.title",
                message: "Shop title must be a string",
              });
            } else if (shop.title.length > MAX_INTENT_TITLE_LENGTH) {
              errors.push({
                field: "intents.shop.title",
                message: `Shop title must be ${MAX_INTENT_TITLE_LENGTH} characters or less`,
              });
            }
          }

          if (shop.description !== undefined) {
            if (typeof shop.description !== "string") {
              errors.push({
                field: "intents.shop.description",
                message: "Shop description must be a string",
              });
            } else if (
              shop.description.length > MAX_INTENT_DESCRIPTION_LENGTH
            ) {
              errors.push({
                field: "intents.shop.description",
                message: `Shop description must be ${MAX_INTENT_DESCRIPTION_LENGTH} characters or less`,
              });
            }
          }

          if (
            typeof shop.currency !== "string" ||
            !VALID_CURRENCIES.includes(shop.currency)
          ) {
            errors.push({
              field: "intents.shop.currency",
              message: `Shop currency must be one of: ${VALID_CURRENCIES.join(", ")}`,
            });
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    profile: profile as unknown as Me3Profile,
  };
}

/**
 * Parse and validate a me.json string
 */
export function parseMe3Json(jsonString: string): ValidationResult {
  try {
    const data = JSON.parse(jsonString);
    return validateProfile(data);
  } catch (e) {
    return {
      valid: false,
      errors: [{ field: "root", message: "Invalid JSON" }],
    };
  }
}

export const ME3_VERSION = CURRENT_VERSION;
export const ME3_FILENAME = "me.json";
