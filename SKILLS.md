# SKILLS.md

Usage patterns for agents (or humans) calling the tools exposed by
`ops-decision-mcp`. Each entry: when to reach for the tool, and a real
example call/response pulled from this repo's test run.

---

## Skill: Look up an ops policy before answering a question

**Tool:** `search_ops_docs`
**When:** Any question about escalation policy, vendor SLAs, or procurement
rules — instead of guessing or asking a human, search the knowledge base
first.

Example:
```json
{ "name": "search_ops_docs", "arguments": { "query": "GPU RMA turnaround time" } }
```
Returns the relevant vendor-sla.md section, ranked by relevance, with the
source file cited so the answer is traceable back to the source doc.

---

## Skill: Triage an incoming incident

**Tool:** `triage_incident`
**When:** Someone reports something breaking and you need to know the
severity level and who to page, fast — before a human has time to look it up
manually.

Example:
```json
{ "name": "triage_incident", "arguments": { "description": "GPU rack overheating at Austin site" } }
```
Pulls the matching severity definition from `incident-escalation.md` and
tells the agent (or the human it's assisting) what to do next: assign
severity, page the right on-call channel.

---

## Skill: Check who needs to approve a purchase

**Tool:** `check_spend_approval`
**When:** Before submitting a PO or approving a spend request, check the
approval matrix instead of assuming — thresholds and the SEV-1 fast-track
exception are easy to get wrong from memory.

Example:
```json
{ "name": "check_spend_approval", "arguments": { "amountUsd": 50000 } }
```
→ `"Department director approval required."`

```json
{ "name": "check_spend_approval", "arguments": { "amountUsd": 500000, "isEmergencySev1": true } }
```
→ Fast-track path, single VP approval, logged retroactively.

---

## Adding a new skill

When you add a new tool to `src/index.ts`, add a matching entry here with a
real example call and response. This file is what makes the server
self-documenting for the next agent (or teammate) who picks it up — don't
let it drift out of sync with the code.
