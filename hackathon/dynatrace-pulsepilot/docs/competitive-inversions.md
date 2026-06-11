# Competitive Inversions

PulsePilot is informed by several strong open-source references:

- `samuelvinay91/incident-response-adk`
- `Tracer-Cloud/opensre`
- `dynatrace-oss/dynatrace-mcp`
- `Dynatrace/dynatrace-for-ai`
- `google/adk-samples`
- `google/adk-web`
- `arize-ai/phoenix`

## What those projects do well

- `incident-response-adk` proves the ADK workflow shape: sequential triage, parallel diagnostics, and loop-based escalation.
- `opensre` shows that incident response needs evidence-aware evaluation, not just a chat loop.
- `dynatrace-mcp` demonstrates the right boundary for live observability access through MCP.
- `dynatrace-for-ai` makes the domain vocabulary of observability agents portable.
- `adk-samples` and `adk-web` provide the broader agent-development workflow and debugging posture.
- `Phoenix` validates that observability and evaluation need to sit close together.

## Missing pieces PulsePilot adds

1. A productized incident command center instead of only framework examples or MCP tooling.
2. A clean client-side UX that lets judges see the agent reasoning chain in one glance.
3. A deterministic offline mode, so the hackathon demo still works if live MCP credentials are unavailable.
4. Explicit approval gates for remediation, which makes the response story safer and easier to trust.
5. A unified report artifact that captures summary, hypothesis, evidence, queries, and safe actions in one payload.

## Competitive inversion strategy

- Instead of a raw MCP playground, PulsePilot is a finished operator experience.
- Instead of a research-heavy benchmark harness, PulsePilot gives a judge-friendly product workflow.
- Instead of generic observability charts, PulsePilot explains what happened, why it matters, and what to do next.
- Instead of assuming live infrastructure access, PulsePilot is shippable in zero-config fallback mode and upgrades cleanly to live Dynatrace when credentials exist.
