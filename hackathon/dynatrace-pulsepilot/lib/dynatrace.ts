import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import type { DynatraceObservation, Incident, InvestigationMode } from "@/lib/types";

interface McpTool {
  name: string;
  description?: string;
}

function parseToolArgs(): string[] {
  const raw = process.env.DYNATRACE_MCP_ARGS?.trim();
  if (!raw) {
    return ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
      return parsed;
    }
  } catch {
    // Fall back to the default launcher when the env value is malformed.
  }

  return ["-y", "@dynatrace-oss/dynatrace-mcp-server@latest"];
}

function buildToolArguments(toolName: string, incident: Incident): Record<string, string> {
  const query = [
    incident.mcpQueryHint,
    `Service: ${incident.service}`,
    `Incident: ${incident.title}`,
  ].join(" ");

  if (toolName.toLowerCase().includes("query")) {
    return { query };
  }

  if (toolName.toLowerCase().includes("dql")) {
    return { dql: query };
  }

  if (toolName.toLowerCase().includes("search")) {
    return { query };
  }

  if (toolName.toLowerCase().includes("entity")) {
    return { entity: incident.service };
  }

  if (toolName.toLowerCase().includes("log")) {
    return { query };
  }

  if (toolName.toLowerCase().includes("metric")) {
    return { query };
  }

  return { query };
}

async function attemptMcpObservation(incident: Incident): Promise<DynatraceObservation> {
  const environment = process.env.DYNATRACE_ENVIRONMENT?.trim();
  if (!environment) {
    return {
      mode: "mock",
      connected: false,
      toolNames: [],
      note: "Dynatrace MCP is disabled because DYNATRACE_ENVIRONMENT is not configured.",
    };
  }

  const transport = new StdioClientTransport({
    command: process.env.DYNATRACE_MCP_COMMAND?.trim() || "npx",
    args: parseToolArgs(),
    env: {
      ...process.env,
      DT_ENVIRONMENT: environment,
    },
  });

  const client = new Client(
    {
      name: "dynatrace-pulsepilot",
      version: "1.0.0",
    },
    {} as never,
  );

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const tools = (listed.tools ?? []) as McpTool[];
    const names = tools.map((tool) => tool.name);

    const orderedCandidates = tools
      .filter((tool) =>
        /query|search|dql|log|metric|entity|problem|service/i.test(tool.name),
      )
      .slice(0, 3);

    let snippet = "";
    for (const candidate of orderedCandidates) {
      try {
        const result = await client.callTool({
          name: candidate.name,
          arguments: buildToolArguments(candidate.name, incident),
        });

        const content = (result as { content?: unknown[] }).content ?? [];
        snippet =
          content
            .map((part: unknown) => {
              if (typeof part === "object" && part && "text" in part) {
                return String((part as { text?: string }).text ?? "");
              }

              return JSON.stringify(part);
            })
            .join("\n")
            .slice(0, 1400) ?? "";

        if (snippet) {
          break;
        }
      } catch {
        // Try the next tool; not every MCP exposes the same contract.
      }
    }

    return {
      mode: "mcp",
      connected: true,
      toolNames: names,
      note:
        orderedCandidates.length > 0
          ? "Dynatrace MCP connected and queried with a prioritized tool selection."
          : "Dynatrace MCP connected, but no obvious query/search tool was exposed by the server.",
      rawSnippet: snippet || undefined,
    };
  } catch {
    return {
      mode: "mock",
      connected: false,
      toolNames: [],
      note:
        "Dynatrace MCP could not be reached, so the agent is running in deterministic fallback mode.",
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function loadDynatraceObservation(incident: Incident): Promise<DynatraceObservation> {
  const enableMcp = process.env.DYNATRACE_ENABLE_MCP?.toLowerCase() === "true";
  if (!enableMcp) {
    return {
      mode: "mock",
      connected: false,
      toolNames: [],
      note: "Live Dynatrace MCP is off, so the app is using structured local telemetry only.",
    };
  }

  return attemptMcpObservation(incident);
}

export function summarizeObservation(observation: DynatraceObservation): string {
  const toolSummary =
    observation.toolNames.length > 0
      ? `Tools exposed: ${observation.toolNames.slice(0, 6).join(", ")}`
      : "No tools were exposed.";

  return [observation.note, toolSummary, observation.rawSnippet ? observation.rawSnippet.slice(0, 600) : ""]
    .filter(Boolean)
    .join(" ");
}

export function getObservationMode(observation: DynatraceObservation): InvestigationMode {
  return observation.mode;
}
