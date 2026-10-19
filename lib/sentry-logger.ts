import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Logging & Observability Helpers following Sentry Best Practices
 */

export interface LogContext {
  [key: string]: unknown;
}

export interface AgentRunParams {
  agentName: string;
  conversationId: string;
  model?: string;
  systemPrompt?: string;
  input: string;
  run: () => Promise<string | Record<string, unknown>>;
}

export interface AgentTurnParams {
  conversationId: string;
  agentName: string;
  model: string;
  prompt: string;
  response: string;
  inputTokens?: number;
  outputTokens?: number;
  toolsUsed?: Array<{ toolName: string; input: unknown; output: unknown }>;
}

export const sentryLogger = {
  /**
   * Log an informational event with structured context.
   * Captured as a breadcrumb and an informational message when critical.
   */
  info(message: string, context?: LogContext, tags?: Record<string, string>) {
    Sentry.addBreadcrumb({
      category: "log.info",
      message,
      data: context,
      level: "info",
    });

    if (tags) {
      Sentry.withScope((scope) => {
        Object.entries(tags).forEach(([k, v]) => scope.setTag(k, v));
        if (context) scope.setContext("details", context);
        Sentry.captureMessage(message, "info");
      });
    }
  },

  /**
   * Log a warning event with context.
   */
  warn(message: string, context?: LogContext, tags?: Record<string, string>) {
    Sentry.addBreadcrumb({
      category: "log.warn",
      message,
      data: context,
      level: "warning",
    });

    Sentry.withScope((scope) => {
      if (tags) {
        Object.entries(tags).forEach(([k, v]) => scope.setTag(k, v));
      }
      if (context) scope.setContext("warning_context", context);
      Sentry.captureMessage(message, "warning");
    });
  },

  /**
   * Log an error with an optional Error object or string description.
   */
  error(errorOrMessage: Error | string, context?: LogContext, tags?: Record<string, string>) {
    Sentry.withScope((scope) => {
      if (tags) {
        Object.entries(tags).forEach(([k, v]) => scope.setTag(k, v));
      }
      if (context) scope.setContext("error_context", context);

      if (typeof errorOrMessage === "string") {
        Sentry.captureMessage(errorOrMessage, "error");
      } else {
        Sentry.captureException(errorOrMessage);
      }
    });
  },

  /**
   * Track high-level operations using custom spans for performance monitoring.
   */
  async traceOperation<T>(
    operationName: string,
    op: string,
    callback: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return Sentry.startSpan(
      {
        name: operationName,
        op,
        attributes,
      },
      async () => {
        return await callback();
      }
    );
  },

  /**
   * Trace an AI Agent run with standard Sentry GenAI semantic conventions and Conversation tracking.
   * Groups multi-turn interactions using gen_ai.conversation.id.
   */
  async traceAgentRun({
    agentName,
    conversationId,
    model = "gemini-2.5-flash",
    run,
  }: AgentRunParams) {
    return Sentry.startSpan(
      {
        name: `agent.${agentName}`,
        op: "gen_ai.agent",
        attributes: {
          "gen_ai.agent.name": agentName,
          "gen_ai.conversation.id": conversationId,
          "gen_ai.request.model": model,
          "gen_ai.system": "google_genai",
        },
      },
      async () => {
        try {
          const result = await run();
          return result;
        } catch (err) {
          Sentry.captureException(err);
          throw err;
        }
      }
    );
  },

  /**
   * Record a complete conversational turn in an AI agent chat thread.
   */
  recordConversationTurn({
    conversationId,
    agentName,
    model,
    inputTokens,
    outputTokens,
    toolsUsed,
  }: AgentTurnParams) {
    Sentry.startSpan(
      {
        name: `chat.turn`,
        op: "gen_ai.chat",
        attributes: {
          "gen_ai.conversation.id": conversationId,
          "gen_ai.agent.name": agentName,
          "gen_ai.request.model": model,
          ...(inputTokens !== undefined && { "gen_ai.usage.input_tokens": inputTokens }),
          ...(outputTokens !== undefined && { "gen_ai.usage.output_tokens": outputTokens }),
          ...(inputTokens !== undefined &&
            outputTokens !== undefined && {
              "gen_ai.usage.total_tokens": inputTokens + outputTokens,
            }),
        },
      },
      (span) => {
        if (toolsUsed && toolsUsed.length > 0) {
          for (const tool of toolsUsed) {
            Sentry.startSpan(
              {
                name: `tool.${tool.toolName}`,
                op: "gen_ai.execute_tool",
                attributes: {
                  "gen_ai.tool.name": tool.toolName,
                  "gen_ai.conversation.id": conversationId,
                },
              },
              () => {}
            );
          }
        }
        span?.setStatus({ code: 1, message: "ok" });
      }
    );
  },

  /**
   * Application Metrics tracking (count, distribution, gauge).
   */
  metrics: {
    count(name: string, value = 1, attributes?: Record<string, string | number | boolean>) {
      Sentry.metrics.count(name, value, attributes ? { attributes } : undefined);
    },
    distribution(name: string, value: number, attributes?: Record<string, string | number | boolean>) {
      Sentry.metrics.distribution(name, value, attributes ? { attributes } : undefined);
    },
    gauge(name: string, value: number, attributes?: Record<string, string | number | boolean>) {
      Sentry.metrics.gauge(name, value, attributes ? { attributes } : undefined);
    },
  },
};
