# AGENTS.md

Instructions for any AI coding agent (Claude Code, Cursor, etc.) working in this repo.

## What this project is

An MCP (Model Context Protocol) server that gives an AI agent decision-support
tools over internal business-operations knowledge: incident escalation policy,
vendor SLAs, and procurement approval rules. It's a reference implementation
for the kind of internal tool a Decision Engineer would ship — small, real,
and immediately useful to a non-technical team via their existing AI agent.

## Project layout

- `src/index.ts` — MCP server entrypoint. Registers and handles three tools:
  `search_ops_docs`, `triage_incident`, `check_spend_approval`.
- `src/retrieval.ts` — dependency-free retrieval engine over the knowledge
  base. Chunks markdown by `##` heading, scores with a simple TF-IDF variant.
  No API key required to run. See "Extending this" in README.md to swap in
  real embeddings.
- `src/knowledge-base/*.md` — the source documents. Treat these as the
  "internal docs" a real ops team would maintain. Add new `.md` files here
  and they're picked up automatically at build time — no code changes needed.
- `SKILLS.md` — reusable prompting/usage patterns for agents calling this
  server's tools (see that file).

## Conventions

- TypeScript, ESM modules (`"type": "module"` in package.json). Use `.js`
  extensions in relative imports even though source files are `.ts` —
  Node16 module resolution requires this.
- Keep tool handlers pure and side-effect-free where possible; they're
  called by an agent, not a human, so predictable output matters more than
  convenience.
- New tools go through the same pattern: define a zod input schema, write
  the handler, register it in both `ListToolsRequestSchema` and
  `CallToolRequestSchema` in `src/index.ts`.
- Every new tool needs a one-line addition to `SKILLS.md` showing an example
  invocation, so other agents (and humans) know it exists and how to use it.

## Before committing

1. `npm run build` — must compile clean (`tsc` + copies `knowledge-base/`
   into `dist/`, since markdown assets aren't picked up by `tsc` alone).
2. If you touch `src/retrieval.ts` or add a knowledge-base doc, manually
   sanity-check retrieval quality — run `node dist/index.js` and send a
   `tools/call` for `search_ops_docs` with a realistic query. There's no
   automated eval harness yet (good candidate for a follow-up tool).
