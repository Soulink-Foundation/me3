/** Shared Telegram connection UI helpers (account accordion badge + connect panel). */

export type TelegramConnectionLike = {
  status: "pending" | "active" | "disconnected";
} | null;

export function telegramAccordionStatusLabel(
  available: boolean,
  configured: boolean,
  connection: TelegramConnectionLike,
): string {
  if (!available) return "Not available";
  if (!connection) {
    return configured ? "Not connected" : "Unavailable";
  }

  switch (connection.status) {
    case "active":
      return "Connected";
    case "disconnected":
      return "Disconnected";
    default:
      return "Pending setup";
  }
}

export function telegramAccordionStatusClass(
  available: boolean,
  connection: TelegramConnectionLike,
): string {
  if (!available || !connection) {
    return "pending_setup";
  }

  if (connection.status === "disconnected") {
    return "paused";
  }

  return connection.status;
}
