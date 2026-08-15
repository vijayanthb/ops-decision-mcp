#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { search, listSources } from "./retrieval.js";

const server = new Server(
  {
    name: "ops-decision-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ---- Tool schemas ----

const SearchOpsDocsInput = z.object({
  query: z.string().describe("Natural-language question about ops policy, escalation, vendors, or procurement"),
  topK: z.number().int().min(1).max(10).optional().describe("Number of results to return (default 3)"),
});

const TriageIncidentInput = z.object({
  description: z.string().describe("Short description of what's happening, e.g. 'GPU rack overheating at Austin site'"),
});

const CheckSpendApprovalInput = z.object({
  amountUsd: z.number().positive().describe("Dollar amount of the purchase or spend"),
  isEmergencySev1: z.boolean().optional().describe("Whether this is tied to an open SEV-1 incident (enables fast-track)"),
});

// ---- Tool implementations ----

function searchOpsDocs(input: z.infer<typeof SearchOpsDocsInput>) {
  const results = search(input.query, input.topK ?? 3);
  if (results.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No matching guidance found for "${input.query}". Available knowledge base sources: ${listSources().join(", ")}`,
        },
      ],
    };
  }
  const formatted = results
    .map(
      (r, i) =>
        `${i + 1}. [${r.source} — ${r.heading}] (relevance: ${r.score})\n${r.text}`
    )
    .join("\n\n---\n\n");
  return { content: [{ type: "text" as const, text: formatted }] };
}

function triageIncident(input: z.infer<typeof TriageIncidentInput>) {
  const results = search(input.description + " severity escalation page", 2);
  const guidance = results.map((r) => r.text).join("\n\n---\n\n");
  return {
    content: [
      {
        type: "text" as const,
        text: guidance
          ? `Relevant escalation guidance for: "${input.description}"\n\n${guidance}\n\nNext step: assign a severity level per the policy above and page the correct on-call channel.`
          : `No specific escalation guidance matched. Default to SEV-2 and notify the team lead until triaged further.`,
      },
    ],
  };
}

function checkSpendApproval(input: z.infer<typeof CheckSpendApprovalInput>) {
  const { amountUsd, isEmergencySev1 } = input;
  let approver: string;
  if (isEmergencySev1) {
    approver =
      "Fast-track: single VP approval regardless of amount (must be logged retroactively in the procurement system within 24 hours).";
  } else if (amountUsd < 10_000) {
    approver = "Team lead approval required.";
  } else if (amountUsd < 100_000) {
    approver = "Department director approval required.";
  } else if (amountUsd < 1_000_000) {
    approver = "VP of function approval + Finance review required.";
  } else {
    approver = "CFO + CEO sign-off required.";
  }
  return {
    content: [
      {
        type: "text" as const,
        text: `Spend amount: $${amountUsd.toLocaleString()}\nApproval path: ${approver}`,
      },
    ],
  };
}

// ---- Wire up MCP protocol handlers ----

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_ops_docs",
      description:
        "Search internal business-operations knowledge (escalation policy, vendor SLAs, procurement approval rules) and return the most relevant sections.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural-language question" },
          topK: { type: "number", description: "Number of results (default 3)" },
        },
        required: ["query"],
      },
    },
    {
      name: "triage_incident",
      description:
        "Given a short incident description, pull the matching escalation policy and recommend the severity/paging path.",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string", description: "What's happening" },
        },
        required: ["description"],
      },
    },
    {
      name: "check_spend_approval",
      description:
        "Given a dollar amount (and whether it's an emergency SEV-1 purchase), return who needs to approve it per the procurement matrix.",
      inputSchema: {
        type: "object",
        properties: {
          amountUsd: { type: "number", description: "Purchase amount in USD" },
          isEmergencySev1: { type: "boolean", description: "Tied to an open SEV-1 incident?" },
        },
        required: ["amountUsd"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_ops_docs":
      return searchOpsDocs(SearchOpsDocsInput.parse(args));
    case "triage_incident":
      return triageIncident(TriageIncidentInput.parse(args));
    case "check_spend_approval":
      return checkSpendApproval(CheckSpendApprovalInput.parse(args));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ops-decision-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting ops-decision-mcp:", err);
  process.exit(1);
});
