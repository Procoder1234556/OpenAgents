import type { DynatraceObservation, EvidenceItem, Incident, Severity } from "@/lib/types";
import { clamp } from "@/lib/utils";

const severityBaseline: Record<Severity, number> = {
  critical: 95,
  high: 80,
  medium: 60,
  low: 40,
};

export function computeImpactScore(incident: Incident): number {
  const symptomWeight = incident.symptoms.length * 4;
  const metricWeight = incident.metrics.length * 5;
  const deploymentWeight = incident.deployment ? 10 : 0;
  return clamp(severityBaseline[incident.severity] + symptomWeight + metricWeight + deploymentWeight, 0, 100);
}

export function computeConfidence(
  incident: Incident,
  evidence: EvidenceItem[],
  observation: DynatraceObservation,
): number {
  const evidenceScore = evidence.length * 6;
  const observationScore = observation.connected ? 14 : 4;
  const deploymentScore = incident.deployment ? 10 : 4;
  const severityScore = severityBaseline[incident.severity] / 6;
  return clamp(Math.round(40 + evidenceScore + observationScore + deploymentScore + severityScore), 35, 98);
}

export function prioritizeActions(incident: Incident): Array<{ action: string; owner: string; rationale: string; safeToAutomate: boolean }> {
  const actionSets: Record<string, Array<{ action: string; owner: string; rationale: string; safeToAutomate: boolean }>> = {
    "release regression": [
      {
        action: "Compare the release 4.8.0 configuration diff against the last known healthy deployment.",
        owner: "release engineer",
        rationale: "The timing and error pattern point at a rollout-induced regression.",
        safeToAutomate: false,
      },
      {
        action: "Temporarily relax the new fraud-scoring timeout and keep a rollback candidate ready.",
        owner: "service owner",
        rationale: "A targeted config revert is safer than a full deployment rollback while the cause is being verified.",
        safeToAutomate: false,
      },
    ],
    identity: [
      {
        action: "Validate the issuer, audience, and signing key rotation window in the identity provider.",
        owner: "identity platform owner",
        rationale: "SSO-specific failure spikes usually stem from token validation drift or a mismatched key.",
        safeToAutomate: false,
      },
      {
        action: "Switch partner users to the cached token validation path if the issuer mismatch is confirmed.",
        owner: "platform engineer",
        rationale: "A controlled fallback can recover traffic while preserving security guardrails.",
        safeToAutomate: false,
      },
    ],
    "resource exhaustion": [
      {
        action: "Profile the worker heap and inspect the cache TTL behavior for unbounded object growth.",
        owner: "backend engineer",
        rationale: "Linear memory growth is more consistent with a leak or cache churn than a traffic spike.",
        safeToAutomate: true,
      },
      {
        action: "Rebalance the worker pool and enable heap telemetry for the next deploy window.",
        owner: "SRE",
        rationale: "A conservative rebalance can buy headroom while the leak source is isolated.",
        safeToAutomate: true,
      },
    ],
  };

  return actionSets[incident.category] ?? [
    {
      action: "Collect a dependency graph and review the hottest path first.",
      owner: "incident commander",
      rationale: "A ranked investigation path prevents the agent from thrashing across unrelated symptoms.",
      safeToAutomate: false,
    },
    {
      action: "Escalate with a concise evidence bundle if the confidence remains low after one loop.",
      owner: "incident commander",
      rationale: "Human intervention should be cheap and well informed when the evidence plateaus.",
      safeToAutomate: false,
    },
  ];
}
