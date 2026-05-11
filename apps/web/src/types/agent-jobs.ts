export type AgentJobType =
  | "daily_briefing"
  | "weekly_review"
  | "booking_reminders"
  | "invoice_triage"
  | "relationship_scan"
  | "client_discovery"
  | "custom";

export type RelationshipScheduleFrequency = "daily" | "weekly" | "biweekly";

export type AgentJob = {
  id: string;
  jobType: AgentJobType;
  name: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: "success" | "failed" | null;
  nextRunAt: string | null;
  scheduleEditable?: boolean;
  scheduleFrequency?: RelationshipScheduleFrequency | null;
  scheduleHour?: number | null;
  scheduleDayOfWeek?: number | null;
  createdAt: string;
  updatedAt: string;
  /** Set for `client_discovery` jobs from the server. */
  discoveryReady?: boolean;
  discoverySearchSummary?: string;
};
