import type { Env } from "./types";

export const INSTALL_ENCRYPTION_KEY_NAME = "TOKEN_ENCRYPTION_KEY";
export const INSTALL_SESSION_SECRET_NAME = "JWT_SECRET";

type InstallSecretRow = {
  value: string;
};

export async function hasInstallEncryptionKey(env: Env): Promise<boolean> {
  if (env.TOKEN_ENCRYPTION_KEY) return true;

  try {
    const row = await getStoredInstallSecret(env, INSTALL_ENCRYPTION_KEY_NAME);
    return Boolean(row?.value);
  } catch {
    return false;
  }
}

export async function getOrCreateInstallEncryptionKey(env: Env): Promise<string> {
  if (env.TOKEN_ENCRYPTION_KEY) return env.TOKEN_ENCRYPTION_KEY;

  return getOrCreateStoredInstallSecret(env, INSTALL_ENCRYPTION_KEY_NAME);
}

export async function getOrCreateInstallSessionSecret(env: Env): Promise<string> {
  if (env.JWT_SECRET) return env.JWT_SECRET;

  return getOrCreateStoredInstallSecret(env, INSTALL_SESSION_SECRET_NAME);
}

async function getOrCreateStoredInstallSecret(env: Env, name: string): Promise<string> {
  const existing = await getStoredInstallSecret(env, name);
  if (existing?.value) return existing.value;

  const generated = generateInstallSecret();
  await env.DB.prepare(
    `INSERT INTO install_secrets (name, value, created_at, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(name) DO NOTHING`,
  )
    .bind(name, generated)
    .run();

  const stored = await getStoredInstallSecret(env, name);
  return stored?.value || generated;
}

async function getStoredInstallSecret(
  env: Env,
  name: string,
): Promise<InstallSecretRow | null> {
  return env.DB.prepare("SELECT value FROM install_secrets WHERE name = ?")
    .bind(name)
    .first<InstallSecretRow>();
}

function generateInstallSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
