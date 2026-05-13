import {
  getUtcMsForLocalTime,
  normalizeTimeZone,
} from "@me3-core/plugin-calendar";

export const AGENT_CHAT_PLUGIN_ID = "me3.agent-chat";

export const AGENT_CHAT_RUNTIME = {
  id: AGENT_CHAT_PLUGIN_ID,
  packageName: "@me3-core/plugin-agent-chat",
  bundled: true,
  runtimeStatus: "sandbox_chat_runtime",
  routes: ["/api/agent/sandbox"],
  notes: [
    "Core bundles the owner chat runtime through a first-party plugin package.",
    "The plugin is enabled by default because agent chat is part of the baseline ME3 Core experience.",
    "Tool surfaces should be added behind this package boundary so hosted ME3 and Core installs share one implementation contract.",
  ],
} as const;

export type AgentChatSource =
  | "openai"
  | "anthropic"
  | "workers-ai"
  | "workers-ai-gateway"
  | "fallback"
  | "tool"
  | null;

export type AgentSandboxDispatchInput = {
  userId: string;
  connectionId: string;
  sourceEventId: string;
  turnId: string;
  messageText: string;
  replyToMessageId?: string | number | null;
};

export type AgentSandboxDispatchResponse = {
  ok: boolean;
  auditId: string | null;
  turnId: string | null;
  specialist: string | null;
  replyText: string | null;
  model: string | null;
  source: AgentChatSource;
  fallbackReason?: string | null;
  debugError?: string | null;
  emailAction?: null;
  reminderAction?: null;
  contentAction?: null;
  contactsChanged?: boolean;
  error?: string;
};

export type AgentReminderInput = {
  title?: unknown;
  notes?: unknown;
  date?: unknown;
  time?: unknown;
  timezone?: unknown;
  recurrence?: unknown;
};

export type AgentReminder = {
  id: string;
  title: string;
  notes: string | null;
  remindAt: string;
  timezone: string | null;
  recurrenceRule: string | null;
  contextType?: "contact" | "booking" | null;
  contextId?: string | null;
  contextLabel?: string | null;
  status: "pending" | "delivered" | "dismissed" | "cancelled" | "failed";
  deliveredAt?: string | null;
  dismissedAt?: string | null;
  createdAt?: string;
};

export type AgentReminderParseResult =
  | {
      title: string;
      notes: string | null;
      remindAt: string;
      timezone: string;
      recurrenceRule: string | null;
    }
  | { error: string };

export type AgentContactSource =
  | "booking"
  | "manual"
  | "agent"
  | "import"
  | "outreach"
  | "soulink";

export type AgentContactRelationship = "client" | "prospect" | "contact";
export type AgentContactStatus = "active" | "archived" | "dormant";
export type AgentContactCloseness = "very_close" | "close" | "acquaintance" | null;
export type AgentContactOutreachStatus =
  | "new"
  | "drafted"
  | "sent"
  | "replied"
  | "booked"
  | "converted"
  | "not_interested"
  | "no_response"
  | null;

export type AgentContactInput = Partial<{
  name: string;
  email: string | null;
  phone: string | null;
  source: AgentContactSource;
  sourceRef: string | null;
  relationship: AgentContactRelationship;
  closeness: AgentContactCloseness;
  status: AgentContactStatus;
  notes: string | null;
  tags: string[];
  lastInteractionAt: string | null;
  nextFollowupAt: string | null;
  outreachStatus: AgentContactOutreachStatus;
  socialHandles: Record<string, string>;
  metadata: Record<string, unknown> | null;
}>;

export type AgentContact = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: AgentContactSource;
  sourceRef: string | null;
  relationship: AgentContactRelationship;
  closeness: string | null;
  status: AgentContactStatus;
  notes: string | null;
  tags: string[];
  lastInteractionAt: string | null;
  nextFollowupAt: string | null;
  outreachStatus: AgentContactOutreachStatus;
  socialHandles: Record<string, string>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  bookingCount: number;
  lastBookingAt: string | null;
};

export type AgentContactsSummary = {
  total: number;
  clients: number;
  prospects: number;
  contacts: number;
  active: number;
  dormant: number;
  archived: number;
  needsFollowUp: number;
  outreach: Record<Exclude<AgentContactOutreachStatus, null>, number>;
};

type CoreAgentChatEnv = {
  DB: D1Like;
  AI?: {
    run(model: string, input: unknown): Promise<unknown>;
  };
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  ME3_AI_MODEL?: string;
  ME3_AI_DEFAULT_PROVIDER?: string;
  ME3_AI_DEFAULT_MODEL?: string;
  ME3_AI_CHAT_PROVIDER?: string;
  ME3_AI_CHAT_MODEL?: string;
};

type D1Like = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results?: T[] }>;
      run(): Promise<unknown>;
    };
    first<T = unknown>(): Promise<T | null>;
  };
};

type AgentSandboxConnection = {
  id: string;
};

type AgentSandboxSourceEvent = {
  id: string;
};

export type AgentSandboxTurnRecord = {
  connection: AgentSandboxConnection;
  sourceEvent: AgentSandboxSourceEvent;
  turnId: string;
  messageText: string;
  replyToMessageId: string | number | null;
};

type StorageLike = {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put<T = unknown>(key: string, value: T): Promise<void>;
};

type OwnerProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  bio: string | null;
  timezone: string | null;
  locale?: string | null;
};

type AiCredentialRow = {
  provider_id: string;
  encrypted_api_key: string | null;
};

type AiDefaultRow = {
  provider_id: string;
  model: string;
};

type DbReminderRow = {
  id: string;
  title: string;
  notes: string | null;
  remind_at: string;
  timezone: string | null;
  recurrence_rule: string | null;
  context_type?: "contact" | "booking" | null;
  context_id?: string | null;
  context_label?: string | null;
  status: "pending" | "delivered" | "dismissed" | "cancelled" | "failed";
  delivered_at?: string | null;
  dismissed_at?: string | null;
  created_at?: string;
};

type DbContactRow = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: AgentContactSource;
  source_ref: string | null;
  relationship: AgentContactRelationship;
  status: AgentContactStatus;
  notes: string | null;
  tags: string | null;
  last_interaction_at: string | null;
  next_followup_at: string | null;
  outreach_status: AgentContactOutreachStatus;
  social_handles: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  booking_count?: number | string | null;
  last_booking_at?: string | null;
};

type D1RunResultLike = {
  meta?: {
    changes?: number;
  };
};

type AiProviderId = "workers-ai" | "openai" | "anthropic";

type AiRoute = {
  providerId: AiProviderId;
  model: string;
  apiKey: string | null;
  ai: CoreAgentChatEnv["AI"] | null;
  configured: boolean;
};

const DEFAULT_WORKERS_AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";
const INSTALL_ENCRYPTION_KEY_NAME = "TOKEN_ENCRYPTION_KEY";
const CONTACT_SOURCES = new Set<AgentContactSource>([
  "booking",
  "manual",
  "agent",
  "import",
  "outreach",
  "soulink",
]);
const CONTACT_RELATIONSHIPS = new Set<AgentContactRelationship>([
  "client",
  "prospect",
  "contact",
]);
const CONTACT_STATUSES = new Set<AgentContactStatus>([
  "active",
  "archived",
  "dormant",
]);
const OUTREACH_STATUSES = new Set<Exclude<AgentContactOutreachStatus, null>>([
  "new",
  "drafted",
  "sent",
  "replied",
  "booked",
  "converted",
  "not_interested",
  "no_response",
]);

export function isAgentSandboxDispatchInput(
  value: unknown,
): value is AgentSandboxDispatchInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<AgentSandboxDispatchInput>;
  return (
    typeof input.userId === "string" &&
    typeof input.connectionId === "string" &&
    typeof input.sourceEventId === "string" &&
    typeof input.turnId === "string" &&
    typeof input.messageText === "string"
  );
}

export function parseAgentReminderInput(
  input: AgentReminderInput | null | undefined,
): AgentReminderParseResult {
  const title = normalizeNullableText(input?.title);
  const notes = normalizeNullableText(input?.notes);
  const date = typeof input?.date === "string" ? input.date.trim() : "";
  const time = typeof input?.time === "string" ? input.time.trim() : "";

  if (!title) return { error: "Title is required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Date must be in YYYY-MM-DD format" };
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return { error: "Time must be in HH:MM format" };
  }

  const timezone = normalizeTimeZone(input?.timezone) || "UTC";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const remindAt = new Date(
    getUtcMsForLocalTime({ year, month, day, hour, minute }, timezone),
  ).toISOString();
  const recurrenceRule = parseReminderRecurrenceRule(input?.recurrence, date);
  if (hasExplicitReminderRecurrence(input?.recurrence) && !recurrenceRule) {
    return { error: "Invalid recurrence value" };
  }

  return { title, notes, remindAt, timezone, recurrenceRule };
}

export function parseAgentContactInput(value: unknown): AgentContactInput {
  if (!isPlainObject(value)) return {};
  return {
    name: normalizeNullableText(value.name) || undefined,
    email: normalizeEmail(value.email),
    phone: normalizeNullableText(value.phone),
    source: CONTACT_SOURCES.has(String(value.source) as AgentContactSource)
      ? (value.source as AgentContactSource)
      : "manual",
    sourceRef: normalizeNullableText(value.sourceRef),
    relationship: CONTACT_RELATIONSHIPS.has(
      String(value.relationship) as AgentContactRelationship,
    )
      ? (value.relationship as AgentContactRelationship)
      : "contact",
    closeness: normalizeNullableText(value.closeness) as AgentContactCloseness,
    status: CONTACT_STATUSES.has(String(value.status) as AgentContactStatus)
      ? (value.status as AgentContactStatus)
      : "active",
    notes: normalizeNullableText(value.notes),
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    lastInteractionAt: normalizeNullableText(value.lastInteractionAt),
    nextFollowupAt: normalizeNullableText(value.nextFollowupAt),
    outreachStatus: normalizeContactOutreachStatus(value.outreachStatus),
    socialHandles: isPlainObject(value.socialHandles)
      ? stringRecord(value.socialHandles)
      : {},
    metadata: isPlainObject(value.metadata)
      ? { ...(value.metadata as Record<string, unknown>) }
      : null,
  };
}

export async function listAgentContacts(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
): Promise<{ contacts: AgentContact[]; summary: AgentContactsSummary }> {
  const rows = await env.DB.prepare(
    `SELECT c.id, c.user_id, c.name, c.email, c.phone, c.source, c.source_ref,
            c.relationship, c.status, c.notes, c.tags, c.last_interaction_at,
            c.next_followup_at, c.outreach_status, c.social_handles, c.metadata,
            c.created_at, c.updated_at,
            COUNT(b.id) AS booking_count,
            MAX(b.starts_at) AS last_booking_at
     FROM contacts c
     LEFT JOIN bookings b ON b.guest_email = c.email
     LEFT JOIN sites s ON s.id = b.site_id AND s.user_id = c.user_id
     WHERE c.user_id = ?
     GROUP BY c.id
     ORDER BY COALESCE(c.last_interaction_at, c.updated_at, c.created_at) DESC`,
  )
    .bind(userId)
    .all<DbContactRow>();

  const contacts = (rows.results || []).map(serializeAgentContact);
  return { contacts, summary: summarizeAgentContacts(contacts) };
}

export async function createAgentContact(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  value: unknown,
): Promise<AgentContact | { error: string; status: 400 }> {
  const input = parseAgentContactInput(value);
  if (!input.name?.trim()) {
    return { error: "Contact name is required", status: 400 };
  }

  const id = crypto.randomUUID();
  const metadata = normalizeContactMetadata(input);
  await env.DB.prepare(
    `INSERT INTO contacts (
       id, user_id, name, email, phone, source, source_ref, relationship, status,
       notes, tags, last_interaction_at, next_followup_at, outreach_status,
       social_handles, metadata
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      input.name,
      input.email || null,
      input.phone || null,
      input.source || "manual",
      input.sourceRef || null,
      input.relationship || "contact",
      input.status || "active",
      input.notes || null,
      JSON.stringify(input.tags || []),
      input.lastInteractionAt || null,
      input.nextFollowupAt || null,
      input.outreachStatus || null,
      JSON.stringify(input.socialHandles || {}),
      metadata ? JSON.stringify(metadata) : null,
    )
    .run();

  const contact = await getAgentContact(env, userId, id);
  if (!contact) return { error: "Contact not found", status: 400 };
  return contact;
}

export async function updateAgentContact(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  contactId: string,
  value: unknown,
): Promise<AgentContact | { error: string; status: 404 }> {
  const input = parseAgentContactInput(value);
  const existing = await getAgentContactRow(env, userId, contactId);
  if (!existing) return { error: "Contact not found", status: 404 };

  const merged: AgentContactInput = {
    name: input.name ?? existing.name,
    email: input.email ?? existing.email,
    phone: input.phone ?? existing.phone,
    source: input.source ?? existing.source,
    sourceRef: input.sourceRef ?? existing.source_ref,
    relationship: input.relationship ?? existing.relationship,
    status: input.status ?? existing.status,
    notes: input.notes ?? existing.notes,
    tags: input.tags ?? parseJsonArray(existing.tags),
    lastInteractionAt: input.lastInteractionAt ?? existing.last_interaction_at,
    nextFollowupAt: input.nextFollowupAt ?? existing.next_followup_at,
    outreachStatus: input.outreachStatus ?? existing.outreach_status,
    socialHandles: input.socialHandles ?? stringRecord(parseJsonRecord(existing.social_handles)),
    metadata: input.metadata ?? parseJsonRecord(existing.metadata),
    closeness:
      input.closeness ??
      (parseJsonRecord(existing.metadata).closeness as AgentContactCloseness),
  };
  const metadata = normalizeContactMetadata(merged);

  await env.DB.prepare(
    `UPDATE contacts
     SET name = ?, email = ?, phone = ?, source = ?, source_ref = ?,
         relationship = ?, status = ?, notes = ?, tags = ?,
         last_interaction_at = ?, next_followup_at = ?, outreach_status = ?,
         social_handles = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ?`,
  )
    .bind(
      merged.name,
      merged.email || null,
      merged.phone || null,
      merged.source || "manual",
      merged.sourceRef || null,
      merged.relationship || "contact",
      merged.status || "active",
      merged.notes || null,
      JSON.stringify(merged.tags || []),
      merged.lastInteractionAt || null,
      merged.nextFollowupAt || null,
      merged.outreachStatus || null,
      JSON.stringify(merged.socialHandles || {}),
      metadata ? JSON.stringify(metadata) : null,
      userId,
      contactId,
    )
    .run();

  const contact = await getAgentContact(env, userId, contactId);
  return contact || { error: "Contact not found", status: 404 };
}

export async function deleteAgentContact(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  contactId: string,
): Promise<{ ok: true } | { error: string; status: 404 }> {
  const result = (await env.DB.prepare("DELETE FROM contacts WHERE user_id = ? AND id = ?")
    .bind(userId, contactId)
    .run()) as D1RunResultLike;
  if ((result.meta?.changes || 0) === 0) {
    return { error: "Contact not found", status: 404 };
  }
  return { ok: true };
}

export async function updateAgentContactOutreachStatus(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  contactId: string,
  input: { outreachStatus?: unknown; nextFollowupAt?: unknown },
): Promise<AgentContact | { error: string; status: 404 }> {
  const outreachStatus = normalizeContactOutreachStatus(input.outreachStatus);
  const result = (await env.DB.prepare(
    `UPDATE contacts
     SET outreach_status = ?, next_followup_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ?`,
  )
    .bind(outreachStatus, normalizeNullableText(input.nextFollowupAt), userId, contactId)
    .run()) as D1RunResultLike;
  if ((result.meta?.changes || 0) === 0) {
    return { error: "Contact not found", status: 404 };
  }

  const contact = await getAgentContact(env, userId, contactId);
  return contact || { error: "Contact not found", status: 404 };
}

export async function convertAgentContactToClient(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  contactId: string,
): Promise<AgentContact | { error: string; status: 404 }> {
  const result = (await env.DB.prepare(
    `UPDATE contacts
     SET relationship = 'client', outreach_status = 'converted', updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND id = ?`,
  )
    .bind(userId, contactId)
    .run()) as D1RunResultLike;
  if ((result.meta?.changes || 0) === 0) {
    return { error: "Contact not found", status: 404 };
  }

  const contact = await getAgentContact(env, userId, contactId);
  return contact || { error: "Contact not found", status: 404 };
}

export async function createAgentReminder(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  input: AgentReminderInput,
): Promise<AgentReminder | { error: string }> {
  const parsed = parseAgentReminderInput(input);
  if ("error" in parsed) return parsed;

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO user_reminders
       (id, user_id, title, notes, remind_at, timezone, recurrence_rule, status, created_via)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'agent')`,
  )
    .bind(
      id,
      userId,
      parsed.title,
      parsed.notes,
      parsed.remindAt,
      parsed.timezone,
      parsed.recurrenceRule,
    )
    .run();

  return {
    id,
    title: parsed.title,
    notes: parsed.notes,
    remindAt: parsed.remindAt,
    timezone: parsed.timezone,
    recurrenceRule: parsed.recurrenceRule,
    status: "pending",
  };
}

export async function updateAgentReminder(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  reminderId: string,
  input: AgentReminderInput,
): Promise<AgentReminder | { error: string; status?: 400 | 404 }> {
  const parsed = parseAgentReminderInput(input);
  if ("error" in parsed) return { ...parsed, status: 400 };

  const result = (await env.DB.prepare(
    `UPDATE user_reminders
     SET title = ?, notes = ?, remind_at = ?, timezone = ?, recurrence_rule = ?,
         error_message = NULL, updated_at = datetime('now')
     WHERE id = ? AND user_id = ? AND status IN ('pending', 'failed')`,
  )
    .bind(
      parsed.title,
      parsed.notes,
      parsed.remindAt,
      parsed.timezone,
      parsed.recurrenceRule,
      reminderId,
      userId,
    )
    .run()) as D1RunResultLike;

  if ((result.meta?.changes || 0) === 0) {
    return { error: "Reminder not found", status: 404 };
  }

  return {
    id: reminderId,
    title: parsed.title,
    notes: parsed.notes,
    remindAt: parsed.remindAt,
    timezone: parsed.timezone,
    recurrenceRule: parsed.recurrenceRule,
    status: "pending",
  };
}

export async function cancelAgentReminder(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  reminderId: string,
): Promise<{ ok: true } | { error: string; status: 404 }> {
  const result = (await env.DB.prepare(
    `UPDATE user_reminders
     SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND user_id = ? AND status IN ('pending', 'failed')`,
  )
    .bind(reminderId, userId)
    .run()) as D1RunResultLike;

  if ((result.meta?.changes || 0) === 0) {
    return { error: "Reminder not found", status: 404 };
  }
  return { ok: true };
}

export function serializeAgentReminder(reminder: DbReminderRow): AgentReminder {
  return {
    id: reminder.id,
    title: reminder.title,
    notes: reminder.notes,
    remindAt: reminder.remind_at,
    timezone: reminder.timezone,
    recurrenceRule: reminder.recurrence_rule,
    contextType: reminder.context_type ?? null,
    contextId: reminder.context_id ?? null,
    contextLabel: reminder.context_label ?? null,
    status: reminder.status,
    deliveredAt: reminder.delivered_at ?? null,
    dismissedAt: reminder.dismissed_at ?? null,
    createdAt: reminder.created_at,
  };
}

export function serializeAgentContact(row: DbContactRow): AgentContact {
  const metadata = parseJsonRecord(row.metadata);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    sourceRef: row.source_ref,
    relationship: row.relationship,
    closeness: typeof metadata.closeness === "string" ? metadata.closeness : null,
    status: row.status,
    notes: row.notes,
    tags: parseJsonArray(row.tags),
    lastInteractionAt: row.last_interaction_at,
    nextFollowupAt: row.next_followup_at,
    outreachStatus: row.outreach_status,
    socialHandles: stringRecord(parseJsonRecord(row.social_handles)),
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookingCount: Number(row.booking_count || 0),
    lastBookingAt: row.last_booking_at || null,
  };
}

export async function createAgentSandboxTurnRecord(
  env: Pick<CoreAgentChatEnv, "DB">,
  input: {
    userId: string;
    messageText: string;
    replyToMessageId?: string | number | null;
  },
): Promise<AgentSandboxTurnRecord> {
  const messageText = input.messageText.trim();
  const replyToMessageId =
    typeof input.replyToMessageId === "string" ||
    typeof input.replyToMessageId === "number"
      ? input.replyToMessageId
      : null;
  const connection = await upsertSandboxConnection(env, input.userId);
  const turnId = crypto.randomUUID();
  const sourceEvent = await insertSandboxEvent(env, {
    connectionId: connection.id,
    turnId,
    messageText,
    replyToMessageId,
  });

  return {
    connection,
    sourceEvent,
    turnId,
    messageText,
    replyToMessageId,
  };
}

export async function dispatchAgentSandboxTurn(
  env: CoreAgentChatEnv,
  storage: StorageLike,
  input: AgentSandboxDispatchInput,
): Promise<AgentSandboxDispatchResponse> {
  const resultKey = `agent-chat:sandbox:${input.turnId}`;
  const existing = await storage.get<AgentSandboxDispatchResponse>(resultKey);
  if (existing) return { ...existing, ok: true };

  await storage.put("userId", input.userId);
  await storage.put("lastSandboxConnectionId", input.connectionId);
  await storage.put("lastSandboxTurnId", input.turnId);
  await storage.put("lastSandboxTurnAt", new Date().toISOString());

  const owner = await getOwnerProfile(env, input.userId);
  const route = await resolveAiRoute(env, input.userId);
  const recent = await loadRecentMessages(env, input.userId);
  const messages = buildChatMessages(owner, recent, input.messageText);

  let response: AgentSandboxDispatchResponse;
  if (!route.configured) {
    response = {
      ok: true,
      auditId: null,
      turnId: input.turnId,
      specialist: "core.agent-chat",
      replyText:
        "ME3 Core chat is connected. Add an AI provider in Account settings or bind Workers AI to turn this into a live model response.",
      model: route.model,
      source: "fallback",
      fallbackReason: "AI provider setup required",
      debugError: null,
      emailAction: null,
      reminderAction: null,
      contentAction: null,
      contactsChanged: false,
    };
  } else {
    response = await runModelTurn(route, messages, input.turnId);
  }

  await persistAssistantMessage(env, input.userId, "user", input.messageText);
  if (response.replyText) {
    await persistAssistantMessage(env, input.userId, "assistant", response.replyText);
  }

  await storage.put(resultKey, response);
  return response;
}

function parseReminderRecurrenceRule(recurrence: unknown, date: string): string | null {
  const normalized =
    typeof recurrence === "string" ? recurrence.trim().toLowerCase() : recurrence;
  if (normalized == null || normalized === "" || normalized === "none") return null;
  if (normalized === "daily") return "daily";

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  const weekday =
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay()
    ];

  if (normalized === "weekly") return `weekly:${weekday}`;
  if (normalized === "monthly") return `monthly:${day}`;
  return null;
}

function hasExplicitReminderRecurrence(recurrence: unknown): boolean {
  if (recurrence == null) return false;
  if (typeof recurrence !== "string") return true;
  const normalized = recurrence.trim().toLowerCase();
  return normalized !== "" && normalized !== "none";
}

async function getAgentContact(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  contactId: string,
): Promise<AgentContact | null> {
  const row = await getAgentContactRow(env, userId, contactId);
  return row ? serializeAgentContact(row) : null;
}

async function getAgentContactRow(
  env: Pick<CoreAgentChatEnv, "DB">,
  userId: string,
  contactId: string,
): Promise<DbContactRow | null> {
  return env.DB.prepare(
    `SELECT id, user_id, name, email, phone, source, source_ref,
            relationship, status, notes, tags, last_interaction_at,
            next_followup_at, outreach_status, social_handles, metadata,
            created_at, updated_at, 0 AS booking_count, NULL AS last_booking_at
     FROM contacts
     WHERE user_id = ? AND id = ?`,
  )
    .bind(userId, contactId)
    .first<DbContactRow>();
}

function summarizeAgentContacts(contacts: AgentContact[]): AgentContactsSummary {
  const outreach: AgentContactsSummary["outreach"] = {
    new: 0,
    drafted: 0,
    sent: 0,
    replied: 0,
    booked: 0,
    converted: 0,
    not_interested: 0,
    no_response: 0,
  };
  for (const contact of contacts) {
    if (contact.outreachStatus && contact.outreachStatus in outreach) {
      outreach[contact.outreachStatus] += 1;
    }
  }
  return {
    total: contacts.length,
    clients: contacts.filter((contact) => contact.relationship === "client").length,
    prospects: contacts.filter((contact) => contact.relationship === "prospect").length,
    contacts: contacts.filter((contact) => contact.relationship === "contact").length,
    active: contacts.filter((contact) => contact.status === "active").length,
    dormant: contacts.filter((contact) => contact.status === "dormant").length,
    archived: contacts.filter((contact) => contact.status === "archived").length,
    needsFollowUp: contacts.filter(
      (contact) => contact.nextFollowupAt && contact.status === "active",
    ).length,
    outreach,
  };
}

function normalizeContactMetadata(
  input: AgentContactInput,
): Record<string, unknown> | null {
  const metadata = { ...(input.metadata || {}) };
  if (input.closeness) metadata.closeness = input.closeness;
  return Object.keys(metadata).length > 0 ? metadata : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email || null;
}

function normalizeContactOutreachStatus(value: unknown): AgentContactOutreachStatus {
  const normalized = typeof value === "string" ? value.trim() : "";
  return OUTREACH_STATUSES.has(normalized as Exclude<AgentContactOutreachStatus, null>)
    ? (normalized as Exclude<AgentContactOutreachStatus, null>)
    : null;
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function parseJsonRecord(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") result[key] = entry;
  }
  return result;
}

async function upsertSandboxConnection(
  env: Pick<CoreAgentChatEnv, "DB">,
  ownerId: string,
): Promise<AgentSandboxConnection> {
  const existing = await env.DB.prepare(
    `SELECT id
     FROM agent_channel_connections
     WHERE user_id = ? AND channel = 'sandbox'
     LIMIT 1`,
  )
    .bind(ownerId)
    .first<AgentSandboxConnection>();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE agent_channel_connections
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
      .bind(existing.id)
      .run();
    return existing;
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO agent_channel_connections
       (id, user_id, channel, status, setup_token, connected_at, created_at, updated_at)
     VALUES (?, ?, 'sandbox', 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  )
    .bind(id, ownerId, crypto.randomUUID())
    .run();

  return { id };
}

async function insertSandboxEvent(
  env: Pick<CoreAgentChatEnv, "DB">,
  input: {
    connectionId: string;
    turnId: string;
    messageText: string;
    replyToMessageId: string | number | null;
  },
): Promise<AgentSandboxSourceEvent> {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO agent_channel_events
       (id, connection_id, channel, direction, event_type, status,
        reply_to_message_id, text_body, raw_json, created_at, updated_at)
     VALUES (?, ?, 'sandbox', 'inbound', 'message', 'received',
        ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  )
    .bind(
      id,
      input.connectionId,
      input.replyToMessageId === null ? null : String(input.replyToMessageId),
      input.messageText,
      JSON.stringify({ runtime: "sandbox", turnId: input.turnId }),
    )
    .run();

  return { id };
}

async function runModelTurn(
  route: AiRoute,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  turnId: string,
): Promise<AgentSandboxDispatchResponse> {
  try {
    const replyText =
      route.providerId === "openai"
        ? await runOpenAi(route, messages)
        : route.providerId === "anthropic"
          ? await runAnthropic(route, messages)
        : await runWorkersAi(route, messages);

    return {
      ok: true,
      auditId: null,
      turnId,
      specialist: "core.agent-chat",
      replyText,
      model: route.model,
      source: route.providerId,
      fallbackReason: null,
      debugError: null,
      emailAction: null,
      reminderAction: null,
      contentAction: null,
      contactsChanged: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model request failed";
    return {
      ok: true,
      auditId: null,
      turnId,
      specialist: "core.agent-chat",
      replyText:
        "I reached the ME3 Core agent runtime, but the model call failed. Check your AI provider settings and try again.",
      model: route.model,
      source: "fallback",
      fallbackReason: "Model request failed",
      debugError: message,
      emailAction: null,
      reminderAction: null,
      contentAction: null,
      contactsChanged: false,
    };
  }
}

async function runOpenAi(
  route: AiRoute,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  if (!route.apiKey) throw new Error("OpenAI API key is not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${route.apiKey}`,
    },
    body: JSON.stringify({
      model: route.model,
      messages,
      temperature: 0.4,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed (${response.status})`);
  }

  return (
    payload?.choices?.[0]?.message?.content?.trim() ||
    "I couldn't turn that into a useful reply just yet."
  );
}

async function runAnthropic(
  route: AiRoute,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  if (!route.apiKey) throw new Error("Anthropic API key is not configured");

  const system = messages.find((message) => message.role === "system")?.content || "";
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": route.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: route.model,
      max_tokens: 800,
      system,
      messages: turns,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        content?: Array<{ type?: string; text?: string }>;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Anthropic request failed (${response.status})`);
  }

  return (
    payload?.content
      ?.map((part) => (part.type === "text" ? part.text || "" : ""))
      .join("")
      .trim() || "I couldn't turn that into a useful reply just yet."
  );
}

async function runWorkersAi(
  route: AiRoute,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  if (!route.ai) throw new Error("Workers AI binding is not configured");
  const result = (await route.ai.run(route.model, { messages })) as
    | { response?: string; result?: { response?: string } }
    | string
    | null;

  if (typeof result === "string") return result.trim();
  return (
    result?.response?.trim() ||
    result?.result?.response?.trim() ||
    "I couldn't turn that into a useful reply just yet."
  );
}

async function resolveAiRoute(
  env: CoreAgentChatEnv,
  ownerId: string,
): Promise<AiRoute> {
  const stored = await getStoredChatDefault(env, ownerId);
  const envProvider = normalizeProviderId(env.ME3_AI_CHAT_PROVIDER);
  const envModel = normalizeModel(env.ME3_AI_CHAT_MODEL) || normalizeModel(env.ME3_AI_MODEL);
  const storedProvider = normalizeProviderId(stored?.provider_id);
  const providerId =
    storedProvider ||
    envProvider ||
    (envModel ? "workers-ai" : null) ||
    (env.OPENAI_API_KEY ? "openai" : null) ||
    (env.ANTHROPIC_API_KEY ? "anthropic" : null) ||
    (env.AI ? "workers-ai" : "workers-ai");
  const model =
    normalizeModel(stored?.model) ||
    envModel ||
    defaultModelForProvider(providerId);
  const apiKey =
    providerId === "openai"
      ? env.OPENAI_API_KEY || (await getStoredApiKey(env, ownerId, providerId))
      : providerId === "anthropic"
        ? env.ANTHROPIC_API_KEY || (await getStoredApiKey(env, ownerId, providerId))
        : null;

  return {
    providerId,
    model,
    apiKey,
    ai: env.AI || null,
    configured:
      providerId === "workers-ai" ? Boolean(env.AI && model) : Boolean(apiKey && model),
  };
}

async function getStoredChatDefault(
  env: CoreAgentChatEnv,
  ownerId: string,
): Promise<AiDefaultRow | null> {
  try {
    return env.DB.prepare(
      `SELECT provider_id, model
       FROM ai_model_defaults
       WHERE user_id = ? AND use_case = 'chat'
       LIMIT 1`,
    )
      .bind(ownerId)
      .first<AiDefaultRow>();
  } catch {
    return null;
  }
}

async function getStoredApiKey(
  env: CoreAgentChatEnv,
  ownerId: string,
  providerId: AiProviderId,
): Promise<string | null> {
  try {
    const row = await env.DB.prepare(
      `SELECT provider_id, encrypted_api_key
       FROM ai_provider_credentials
       WHERE user_id = ? AND provider_id = ?
       LIMIT 1`,
    )
      .bind(ownerId, providerId)
      .first<AiCredentialRow>();
    if (!row?.encrypted_api_key) return null;
    const installKey = await getInstallEncryptionKey(env);
    return installKey ? decryptProviderSecret(row.encrypted_api_key, installKey) : null;
  } catch {
    return null;
  }
}

async function getInstallEncryptionKey(env: CoreAgentChatEnv): Promise<string | null> {
  if (env.TOKEN_ENCRYPTION_KEY) return env.TOKEN_ENCRYPTION_KEY;
  try {
    const row = await env.DB.prepare("SELECT value FROM install_secrets WHERE name = ?")
      .bind(INSTALL_ENCRYPTION_KEY_NAME)
      .first<{ value: string }>();
    return row?.value || null;
  } catch {
    return null;
  }
}

async function decryptProviderSecret(
  encrypted: string,
  installKey: string,
): Promise<string | null> {
  const parts = encrypted.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const iv = decodeBase64UrlBytes(parts[1]);
  const ciphertext = decodeBase64UrlBytes(parts[2]);
  const key = await importSecretCryptoKey(installKey, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

async function importSecretCryptoKey(
  installKey: string,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(installKey),
  );
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, usages);
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function getOwnerProfile(
  env: CoreAgentChatEnv,
  ownerId: string,
): Promise<OwnerProfileRow | null> {
  try {
    return env.DB.prepare(
      `SELECT id, email, name, username, bio, timezone
       FROM owner_profile
       WHERE id = ?
       LIMIT 1`,
    )
      .bind(ownerId)
      .first<OwnerProfileRow>();
  } catch {
    return null;
  }
}

async function loadRecentMessages(
  env: CoreAgentChatEnv,
  ownerId: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  try {
    const rows = await env.DB.prepare(
      `SELECT role, content
       FROM assistant_messages
       WHERE owner_id = ? AND role IN ('user', 'assistant')
       ORDER BY created_at DESC
       LIMIT 12`,
    )
      .bind(ownerId)
      .all<{ role: "user" | "assistant"; content: string }>();
    return (rows.results || []).reverse();
  } catch {
    return [];
  }
}

function buildChatMessages(
  owner: OwnerProfileRow | null,
  recent: Array<{ role: "user" | "assistant"; content: string }>,
  messageText: string,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const ownerName = owner?.name?.trim() || owner?.username?.trim() || "the owner";
  const system = [
    "You are ME3 Core, a concise personal/business assistant running inside the owner's private ME3 Core install.",
    `The owner is ${ownerName}.`,
    owner?.bio ? `Owner profile context: ${owner.bio}` : null,
    owner?.timezone ? `Owner timezone: ${owner.timezone}` : null,
    "Answer helpfully and plainly. Do not claim external actions are complete unless a tool result says they are.",
    "This first Core chat slice can converse and reason, but richer plugin tools are still being wired in.",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: system },
    ...recent,
    { role: "user", content: messageText },
  ];
}

async function persistAssistantMessage(
  env: CoreAgentChatEnv,
  ownerId: string,
  role: "user" | "assistant",
  content: string,
) {
  try {
    await env.DB.prepare(
      "INSERT INTO assistant_messages (id, owner_id, role, content) VALUES (?, ?, ?, ?)",
    )
      .bind(crypto.randomUUID(), ownerId, role, content)
      .run();
  } catch {
    // Conversation persistence is useful context, but chat turns should not fail on audit writes.
  }
}

function normalizeProviderId(value: unknown): AiProviderId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "openai") return "openai";
  if (normalized === "anthropic" || normalized === "claude") return "anthropic";
  if (
    normalized === "workers-ai" ||
    normalized === "workers_ai" ||
    normalized === "workers" ||
    normalized === "cloudflare"
  ) {
    return "workers-ai";
  }
  return null;
}

function normalizeModel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const model = value.trim();
  if (!model || model.length > 160) return null;
  return model;
}

function defaultModelForProvider(providerId: AiProviderId): string {
  if (providerId === "openai") return DEFAULT_OPENAI_MODEL;
  if (providerId === "anthropic") return DEFAULT_ANTHROPIC_MODEL;
  return DEFAULT_WORKERS_AI_MODEL;
}
