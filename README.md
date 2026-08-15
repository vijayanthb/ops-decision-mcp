# ops-decision-mcp

**Status: ✅ Live & verified** — built, compiled, connected to Claude Desktop, and tested end-to-end with real queries against the live tool. Not a mockup or a scaffold — see "Verified live" below.

An MCP (Model Context Protocol) server that gives any MCP-compatible AI agent
(Claude Desktop, Claude Code, Cursor, etc.) decision-support tools over
internal business-operations knowledge: incident escalation policy, vendor
SLAs, and procurement approval rules.

Built as a reference implementation of the kind of internal tool a Decision
Engineer ships — small, real, and immediately useful to a non-technical
team through an AI agent they already use. Point Claude Desktop at this
server and it can answer "who approves a $50K purchase" or "what's the
RMA policy for our primary GPU vendor" by actually reading the internal
docs, not guessing.

## Why this exists

I built this to demonstrate the specific skills in Fluidstack's Decision
Engineer, Business Operations role: shipping AI-powered internal tools,
building and using MCP servers, integrating LLMs with internal systems, and
maintaining shared AI infrastructure (`AGENTS.md` / `SKILLS.md`) that other
agents and teammates can pick up. Everything here is real and runnable —
not a mockup.

## What it does

Three tools, exposed over the MCP protocol:

| Tool | What it does |
|---|---|
| `search_ops_docs` | Free-text search over the knowledge base, returns ranked, cited results |
| `triage_incident` | Given a short incident description, surfaces the matching severity/escalation policy |
| `check_spend_approval` | Given a dollar amount, returns the required approval path per the procurement matrix |

The knowledge base (`src/knowledge-base/*.md`) is a stand-in for real
internal docs — escalation policy, vendor SLA terms, and a procurement
approval matrix. Retrieval is a dependency-free TF-IDF-style search, so the
server runs with **zero API keys and zero external services** — clone it and
it works immediately. See "Extending this" below for swapping in real
embeddings for production use.

## Quickstart

```bash
npm install
npm run build
npm start
```

The server speaks MCP over stdio. To use it with Claude Desktop, add to your
MCP config:

```json
{
  "mcpServers": {
    "ops-decision": {
      "command": "node",
      "args": ["/absolute/path/to/ops-decision-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop and ask it something like *"What's our escalation
policy for a SEV-1 GPU issue?"* — it will call `search_ops_docs` or
`triage_incident` automatically.

## Verified live

This isn't just compiled — it's been run and queried for real.

**Protocol-level test:** the repo includes a raw JSON-RPC test harness (see
`AGENTS.md` for the pattern) that spawns the server and sends real
`initialize`, `tools/list`, and `tools/call` messages over stdio — the same
protocol Claude Desktop uses. All three tools were verified end-to-end this
way: correct tool listing, correct ranked retrieval results with source
citations, and correct approval-tier logic (including the SEV-1 fast-track
exception).

**Live in Claude Desktop:** connected as a local MCP server and queried
directly. Example — asking *"What's our escalation policy for a SEV-1 GPU
issue?"* returns the actual severity definition, the correct escalation
path (page the on-call lead, notify VP Ops within 15 minutes, war room
opens automatically), and the right vendor path for hardware replacement
(Vendor A first, 24-hour expedited RMA with VP approval, advance
replacement above $2M annual spend) — all pulled from the knowledge base,
not guessed.

## Extending this

- **Real embeddings:** swap the TF-IDF scoring in `src/retrieval.ts` for a
  call to Bedrock Titan Embeddings, OpenAI, or Anthropic — the `search()`
  function signature stays the same, so nothing else in the server needs to
  change.
- **Real internal systems:** the JD calls for Slack/GitHub/Notion/JIRA/
  Salesforce integrations. The natural next tools here would be
  `create_jira_ticket_from_incident` or `post_escalation_to_slack`, following
  the same pattern documented in `AGENTS.md`.
- **More knowledge:** drop new `.md` files into `src/knowledge-base/` — no
  code changes needed, they're picked up automatically at build time.

## Repo structure

```
ops-decision-mcp/
├── AGENTS.md              # how an AI coding agent should work in this repo
├── SKILLS.md               # usage patterns for the tools, with real examples
├── src/
│   ├── index.ts            # MCP server: tool registration + handlers
│   ├── retrieval.ts         # dependency-free RAG-style search
│   └── knowledge-base/      # the "internal docs" (escalation, vendor SLA, procurement)
└── package.json
```
