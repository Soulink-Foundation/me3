import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Me3UserAgent } from "./user-agent";
import type { Env, OwnerProfile } from "./types";

export { Me3UserAgent };

type BootstrapBody = Partial<OwnerProfile> & { bootstrapCode?: string; password?: string };
type LoginBody = { email?: string; password?: string };
type ChatBody = { message?: string };
type SessionPayload = { sub: string; iat: number; exp: number };
type OwnerRecord = OwnerProfile & { password_hash: string | null };

const SESSION_COOKIE_NAME = "me3_core_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_HASH_ITERATIONS = 210_000;

const app = new Hono<{ Bindings: Env }>();
type AppContext = Context<{ Bindings: Env }>;

app.use(
  "*",
  cors({
    origin: (origin, c) => origin || c.env.CORE_WEB_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "me3-core",
    environment: c.env.ENVIRONMENT,
    bindings: {
      db: Boolean(c.env.DB),
      userAgent: Boolean(c.env.ME3_USER_AGENT),
      workersAi: Boolean(c.env.AI),
    },
    setupRequired: getSetupRequired(c.env),
  });
});

app.get("/api/config", async (c) => {
  const authConfigured = await getOwnerAuthConfigured(c.env);

  return c.json({
    apiOrigin: c.env.CORE_API_ORIGIN,
    webOrigin: c.env.CORE_WEB_ORIGIN,
    ai: {
      defaultProvider: c.env.ME3_AI_DEFAULT_PROVIDER ?? "not-configured",
      defaultModel: c.env.ME3_AI_DEFAULT_MODEL ?? "not-configured",
      chatProvider: c.env.ME3_AI_CHAT_PROVIDER ?? "not-configured",
      chatModel: c.env.ME3_AI_CHAT_MODEL ?? "not-configured",
    },
    setupRequired: getSetupRequired(c.env),
    ownerAuthConfigured: authConfigured,
  });
});

app.post("/api/admin/bootstrap", async (c) => {
  const body = await c.req.json<BootstrapBody>().catch((): BootstrapBody => ({}));

  if (!c.env.JWT_SECRET || !c.env.ADMIN_BOOTSTRAP_CODE) {
    return c.json({ ok: false, error: "Owner auth is not configured" }, 503);
  }

  if (body.bootstrapCode !== c.env.ADMIN_BOOTSTRAP_CODE) {
    return c.json({ ok: false, error: "Invalid bootstrap code" }, 401);
  }

  const password = body.password?.trim();
  if (!password || password.length < 8) {
    return c.json({ ok: false, error: "Password must be at least 8 characters" }, 400);
  }

  const email = body.email?.trim() || null;
  if (!email) {
    return c.json({ ok: false, error: "Email is required" }, 400);
  }

  const passwordHash = await hashPassword(password);
  const owner: OwnerProfile = {
    id: "owner",
    email,
    name: body.name ?? "ME3 Core Owner",
    username: body.username ?? "owner",
    bio: body.bio ?? "Personal AI assistant powered by ME3 Core.",
    avatar_url: body.avatar_url ?? null,
    timezone: body.timezone ?? "UTC",
  };

  await c.env.DB.prepare(
    `INSERT INTO owner_profile (id, email, name, username, bio, avatar_url, timezone, password_hash, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       username = excluded.username,
       bio = excluded.bio,
       avatar_url = excluded.avatar_url,
       timezone = excluded.timezone,
       password_hash = excluded.password_hash,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(owner.id, owner.email, owner.name, owner.username, owner.bio, owner.avatar_url, owner.timezone, passwordHash)
    .run();

  await setOwnerSession(c, owner.id);

  return c.json({ ok: true, owner });
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json<LoginBody>().catch((): LoginBody => ({}));
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return c.json({ ok: false, error: "Email and password are required" }, 400);
  }

  const owner = await getOwnerByEmail(c.env, email);
  if (!owner?.password_hash || !(await verifyPassword(password, owner.password_hash))) {
    return c.json({ ok: false, error: "Invalid email or password" }, 401);
  }

  await setOwnerSession(c, owner.id);

  return c.json({ ok: true, owner: toPublicOwner(owner) });
});

app.get("/api/auth/me", async (c) => {
  const ownerId = await getSessionOwnerId(c);
  if (!ownerId) {
    return c.json({ ok: false, user: null }, 401);
  }

  const owner = await getOwnerProfile(c.env, ownerId);
  if (!owner) {
    clearOwnerSession(c);
    return c.json({ ok: false, user: null }, 401);
  }

  return c.json({ ok: true, user: toPublicOwner(owner) });
});

app.post("/api/auth/logout", (c) => {
  clearOwnerSession(c);
  return c.json({ ok: true });
});

app.post("/api/assistant/chat", async (c) => {
  const ownerId = await getSessionOwnerId(c);
  if (!ownerId) {
    return c.json({ ok: false, error: "Authentication required" }, 401);
  }

  const body = await c.req.json<ChatBody>().catch((): ChatBody => ({}));
  const message = body.message?.trim();

  if (!message) {
    return c.json({ ok: false, error: "Message is required" }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO assistant_messages (id, owner_id, role, content) VALUES (?, ?, ?, ?)",
  )
    .bind(id, ownerId, "user", message)
    .run();

  return c.json({
    ok: true,
    reply: "ME3 Core assistant shell is booted. Model execution will be wired in the first bootable slice.",
    setupRequired: getSetupRequired(c.env),
  });
});

app.get("/.well-known/me.json", async (c) => {
  const owner = await getOwnerProfile(c.env, "owner");

  return c.json({
    id: c.env.CORE_API_ORIGIN,
    type: "Person",
    name: owner?.name ?? "ME3 Core Owner",
    username: owner?.username ?? "owner",
    bio: owner?.bio ?? "Personal AI assistant powered by ME3 Core.",
    url: c.env.CORE_WEB_ORIGIN,
    intents: {
      chat: `${c.env.CORE_API_ORIGIN}/api/assistant/chat`,
    },
  });
});

async function getOwnerProfile(env: Env, ownerId: string): Promise<OwnerRecord | null> {
  const result = await env.DB.prepare(
    "SELECT id, email, name, username, bio, avatar_url, timezone, password_hash FROM owner_profile WHERE id = ?",
  )
    .bind(ownerId)
    .first<OwnerRecord>();

  return result ?? null;
}

async function getOwnerByEmail(env: Env, email: string): Promise<OwnerRecord | null> {
  const result = await env.DB.prepare(
    "SELECT id, email, name, username, bio, avatar_url, timezone, password_hash FROM owner_profile WHERE lower(email) = ?",
  )
    .bind(email)
    .first<OwnerRecord>();

  return result ?? null;
}

async function getOwnerAuthConfigured(env: Env): Promise<boolean> {
  const result = await env.DB.prepare(
    "SELECT password_hash FROM owner_profile WHERE id = ?",
  )
    .bind("owner")
    .first<{ password_hash: string | null }>();

  return Boolean(result?.password_hash);
}

function toPublicOwner(owner: OwnerRecord): OwnerProfile {
  return {
    id: owner.id,
    email: owner.email,
    name: owner.name,
    username: owner.username,
    bio: owner.bio,
    avatar_url: owner.avatar_url,
    timezone: owner.timezone,
  };
}

async function setOwnerSession(c: AppContext, ownerId: string) {
  if (!c.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required to issue owner sessions");
  }

  const token = await signSessionToken(
    {
      sub: ownerId,
      iat: currentUnixTime(),
      exp: currentUnixTime() + SESSION_TTL_SECONDS,
    },
    c.env.JWT_SECRET,
  );

  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(c.env),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

function clearOwnerSession(c: AppContext) {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
    secure: shouldUseSecureCookie(c.env),
    sameSite: "Lax",
  });
}

async function getSessionOwnerId(c: AppContext): Promise<string | null> {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token || !c.env.JWT_SECRET) return null;

  const payload = await verifySessionToken(token, c.env.JWT_SECRET);
  if (!payload || payload.exp <= currentUnixTime()) return null;
  if (payload.sub !== "owner") return null;

  return payload.sub;
}

async function signSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodeBase64UrlJson(header);
  const encodedPayload = encodeBase64UrlJson(payload);
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(data, secret);
  return `${data}.${encodeBase64Url(signature)}`;
}

async function verifySessionToken(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = encodeBase64Url(
    await hmacSha256(`${encodedHeader}.${encodedPayload}`, secret),
  );

  if (!constantTimeEqual(encodedSignature, expectedSignature)) return null;

  try {
    const header = JSON.parse(decodeBase64Url(encodedHeader)) as { alg?: string };
    if (header.alg !== "HS256") return null;

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

async function hmacSha256(data: string, secret: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
}

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS);

  return [
    PASSWORD_HASH_ALGORITHM,
    String(PASSWORD_HASH_ITERATIONS),
    encodeBase64Url(salt),
    encodeBase64Url(hash),
  ].join("$");
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, rawIterations, rawSalt, expectedHash] = storedHash.split("$");
  const iterations = Number(rawIterations);

  if (algorithm !== PASSWORD_HASH_ALGORITHM || !Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  try {
    const salt = decodeBase64UrlBytes(rawSalt);
    const actualHash = encodeBase64Url(await derivePasswordHash(password, salt, iterations));
    return constantTimeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<ArrayBuffer> {
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations,
    },
    key,
    256,
  );
}

function encodeBase64UrlJson(value: unknown): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function encodeBase64Url(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  return new TextDecoder().decode(decodeBase64UrlBytes(value));
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

function currentUnixTime(): number {
  return Math.floor(Date.now() / 1000);
}

function shouldUseSecureCookie(env: Env): boolean {
  return env.ENVIRONMENT !== "local" && env.CORE_API_ORIGIN.startsWith("https://");
}

function getSetupRequired(env: Env): string[] {
  const missing: string[] = [];

  if (!env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!env.TOKEN_ENCRYPTION_KEY) missing.push("TOKEN_ENCRYPTION_KEY");
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) {
    missing.push("AI_PROVIDER");
  }

  return missing;
}

export default app;
