# Demo Runbook

Use this when recording the hackathon video or walking a judge through the project.

## 1. Opening

- Show the PulsePilot landing hero.
- Call out the logo, the incident-response framing, and the Google Cloud Rapid Agent Hackathon context.
- Mention that the app supports both deterministic fallback mode and live Dynatrace MCP mode.

## 2. Incident selection

- Click through the three incidents in the left rail.
- Pause on the checkout regression first because it has the strongest signal chain.
- Point out severity, service, environment, and blast radius.

## 3. Investigation flow

- Click `Run current investigation`.
- Call out the summary, hypothesis, root cause, and confidence score.
- Scroll through the evidence chain and show how the deployment, signal, and metric evidence reinforce each other.

## 4. Safety posture

- Highlight the approval-gated remediation actions.
- Explain that the app never auto-executes risky changes.
- Emphasize that the MCP mode is optional and fails safely back to local reasoning.

## 5. Technical credibility

- Mention the route handlers:
  - `GET /api/incidents`
  - `POST /api/investigate`
- Mention the agent stack:
  - incident catalog
  - scoring heuristics
  - optional Gemini drafting
  - Dynatrace MCP adapter

## 6. Closing line

- End with: "PulsePilot turns production signals into a safe, explainable incident response loop."
