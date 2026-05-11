import { beforeEach, describe, expect, it } from "vitest";
import { useAgentChat } from "./useAgentChat";

describe("useAgentChat", () => {
  beforeEach(() => {
    useAgentChat().resetState();
  });

  it("starts with the MVP assistant intro copy", () => {
    const agentChat = useAgentChat();

    expect(agentChat.messages.value).toHaveLength(1);
    expect(agentChat.messages.value[0]).toMatchObject({
      id: "assistant-ready",
      role: "assistant",
      text: "Ask me to check bookings, draft follow-up emails, manage reminders, update a contact, or help with your site and content.",
      meta: "ME3 ready",
    });
  });

  it("restores the default intro after reset", () => {
    const agentChat = useAgentChat();

    agentChat.appendMessage({
      role: "user",
      text: "Check tomorrow's bookings",
    });

    expect(agentChat.messages.value).toHaveLength(2);

    agentChat.resetMessages();

    expect(agentChat.messages.value).toHaveLength(1);
    expect(agentChat.messages.value[0]?.id).toBe("assistant-ready");
  });
});
