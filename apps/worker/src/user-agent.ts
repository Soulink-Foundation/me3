import type { Env } from "./types";
import {
  dispatchAgentSandboxTurn,
  isAgentSandboxDispatchInput,
} from "./agent-chat";

export class Me3UserAgent {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/dispatch/sandbox") {
      const input = await request.json().catch(() => null);
      if (!isAgentSandboxDispatchInput(input)) {
        return Response.json(
          { ok: false, error: "Invalid sandbox dispatch payload" },
          { status: 400 },
        );
      }

      const response = await dispatchAgentSandboxTurn(
        this.env,
        this.state.storage,
        input,
      );
      return Response.json(response, { status: response.ok ? 200 : 500 });
    }

    if (url.pathname.endsWith("/health")) {
      return Response.json({
        ok: true,
        service: "me3-core-user-agent",
        storage: Boolean(this.state.storage),
        ai: Boolean(this.env.AI),
      });
    }

    return Response.json(
      {
        ok: true,
        message: "ME3 Core user agent is ready for the first extraction slice.",
      },
      { status: 202 },
    );
  }
}
