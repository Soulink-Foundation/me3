export type AgentSkillTaskType =
  | "client_discovery"
  | "outreach_initial"
  | "outreach_follow_up"
  | "outreach_after_reply"
  | "email_composition"
  | "landing_page_generation"
  | "relationship_scan"
  | "daily_briefing";

export type AgentSkillTaskOption = {
  id: AgentSkillTaskType;
  label: string;
  description: string;
};

export type BuiltInAgentSkill = {
  id: string;
  label: string;
  summary: string;
  content: string;
  taskTypes: AgentSkillTaskType[];
};

export type UserAgentSkill = {
  id: string;
  label: string;
  content: string;
  taskTypes: AgentSkillTaskType[] | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};
