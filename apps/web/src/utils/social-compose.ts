export type SupportedSocialPlatform =
  | "x"
  | "linkedin"
  | "instagram"
  | "instagram_business"
  | "youtube";

export const SOCIAL_COMPOSE_LIMITS: Record<SupportedSocialPlatform, number> = {
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  instagram_business: 2200,
  youtube: 5000,
};

export function socialPlatformLabel(platform: SupportedSocialPlatform): string {
  switch (platform) {
    case "x":
      return "X";
    case "linkedin":
      return "LinkedIn";
    case "instagram":
      return "Instagram";
    case "instagram_business":
      return "Instagram (Business)";
    case "youtube":
      return "YouTube";
  }
}

export function formatSocialPlatforms(
  platforms: SupportedSocialPlatform[],
): string {
  const labels = platforms.map((platform) => socialPlatformLabel(platform));
  if (labels.length <= 1) return labels[0] || "social";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function getSocialBlockingIssues(params: {
  caption: string;
  platforms: SupportedSocialPlatform[];
  hasUsableImages: boolean;
}): string[] {
  const issues: string[] = [];
  const count = params.caption.length;

  for (const platform of params.platforms) {
    const limit = SOCIAL_COMPOSE_LIMITS[platform];
    if (count > limit) {
      issues.push(`${socialPlatformLabel(platform)} exceeds its character limit.`);
    }
    if (
      (platform === "instagram" || platform === "instagram_business") &&
      !params.hasUsableImages
    ) {
      issues.push(`${socialPlatformLabel(platform)} needs at least one image.`);
    }
  }

  return Array.from(new Set(issues));
}
