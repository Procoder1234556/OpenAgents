import { generateIncidentDraft } from "@/lib/gemini";
import { loadDynatraceObservation, summarizeObservation } from "@/lib/dynatrace";
import { prioritizeActions, computeConfidence, computeImpactScore } from "@/lib/scoring";
import type {
  EvidenceItem,
  Incident,
  InvestigationAction,
  InvestigationReport,
  InvestigationStep,
} from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

function buildEvidence(incident: Incident): EvidenceItem[] {
  const evidence: EvidenceItem[] = [
    {
      label: "Detected",
      value: formatTimestamp(incident.detectedAt),
      kind: "metric",
      source: "incident catalog",
    },
    {
      label: "Category",
      value: incident.category,
      kind: "topology",
      source: "incident catalog",
    },
    {
      label: "Blast radius",
      value: incident.likelyBlastRadius,
      kind: "topology",
      source: "incident catalog",
    },
  ];

  incident.metrics.forEach((metric) => {
    evidence.push({
      label: metric.label,
      value: `${metric.value} vs ${metric.baseline}`,
      kind: "metric",
      source: metric.note,
    });
  });

  incident.signals.forEach((signal) => {
    evidence.push({
      label: signal.label,
      value: signal.detail,
      kind: "log",
      source: "observability signal",
    });
  });

  if (incident.deployment) {
    evidence.push({
      label: "Recent deployment",
      value: `${incident.deployment.version} by ${incident.deployment.author}`,
      kind: "deployment",
      source: incident.deployment.note,
    });
  }

  return evidence;
}

function buildSteps(incident: Incident, observationSummary: string): InvestigationStep[] {
  return [
    {
      title: "Scope the incident",
      status: "complete",
      detail: `The agent focused on ${incident.service} in ${incident.environment.toUpperCase()} and pulled the strongest signals first.`,
    },
    {
      title: "Correlate evidence",
      status: "complete",
      detail: observationSummary,
    },
    {
      title: "Form a root-cause hypothesis",
      status: "working",
      detail: "The anomaly pattern is being matched against deployment timing, dependency pressure, and resource trends.",
    },
    {
      title: "Produce a safe remediation plan",
      status: "review",
      detail: "Any auto-remediation candidate stays behind a human approval gate until the evidence clears the threshold.",
    },
  ];
}

function buildFallbackNarrative(incident: Incident): {
  summary: string;
  hypothesis: string;
  rootCause: string;
  blastRadius: string;
  confidenceDelta: number;
} {
  if (incident.category === "release regression") {
    return {
      summary:
        "Checkout latency and payment errors are tightly coupled to the most recent deployment, so the agent is treating this as a release regression rather than a traffic-only spike.",
      hypothesis:
        "The new fraud-scoring path introduced an over-tight timeout or retry loop that is amplifying downstream payment latency.",
      rootCause:
        "A configuration or code-path regression in release 4.8.0 is the most probable cause.",
      blastRadius:
        "Customer checkout, payment authorization, and order completion are all exposed until the regression is isolated.",
      confidenceDelta: 6,
    };
  }

  if (incident.category === "identity") {
    return {
      summary:
        "The auth surge is isolated to SSO users and aligns with the recent identity-provider maintenance window, which strongly suggests a token-validation mismatch.",
      hypothesis:
        "Issuer or audience validation drift, or a signing-key rotation mismatch, is breaking partner login flows.",
      rootCause:
        "The identity gateway is rejecting valid partner tokens because the validation contract no longer matches the upstream issuer.",
      blastRadius:
        "Partner onboarding, customer success workflows, and any downstream session-based APIs are affected.",
      confidenceDelta: 4,
    };
  }

  return {
    summary:
      "Memory usage is climbing in a linear way while throughput softens, which is the classic signature of a leak or cache churn rather than a sudden traffic shock.",
    hypothesis:
      "The recommendation worker is retaining per-user objects without a stable eviction policy, causing heap pressure and heavier garbage collection.",
    rootCause:
      "A memory leak or unbounded cache growth in the recommendation worker is the leading explanation.",
    blastRadius:
      "Recommendation quality stays visible, but the worker pool risks latency degradation and eventual saturation if the trend continues.",
    confidenceDelta: 5,
  };
}

function mergeActions(
  incident: Incident,
  draftActions: InvestigationAction[] | undefined,
): InvestigationAction[] {
  const fallback = prioritizeActions(incident);
  if (!draftActions || draftActions.length === 0) {
    return fallback;
  }

  return draftActions.slice(0, 3).map((action, index) => ({
    action: action.action || fallback[index]?.action || fallback[0].action,
    owner: action.owner || fallback[index]?.owner || fallback[0].owner,
    rationale: action.rationale || fallback[index]?.rationale || fallback[0].rationale,
    safeToAutomate: typeof action.safeToAutomate === "boolean" ? action.safeToAutomate : fallback[index]?.safeToAutomate ?? false,
  }));
}

export async function investigateIncident(incident: Incident): Promise<InvestigationReport> {
  const observation = await loadDynatraceObservation(incident);
  const observationSummary = summarizeObservation(observation);
  const evidence = buildEvidence(incident);
  const steps = buildSteps(incident, observationSummary);
  const impactScore = computeImpactScore(incident);
  const confidenceScore = computeConfidence(incident, evidence, observation);
  const fallback = buildFallbackNarrative(incident);

  const draft = await generateIncidentDraft(
    [
      `Incident: ${incident.title}`,
      `Service: ${incident.service}`,
      `Environment: ${incident.environment}`,
      `Impact score: ${impactScore}`,
      `Confidence score: ${confidenceScore}`,
      `Evidence: ${evidence.map((item) => `${item.label}=${item.value}`).join("; ")}`,
      `Observation: ${observationSummary}`,
      `Guardrails: ${incident.remediationGuardrails.join(" | ")}`,
    ].join("\n"),
  );

  const confidence = Math.max(
    35,
    Math.min(98, confidenceScore + (draft?.confidenceDelta ?? fallback.confidenceDelta)),
  );

  return {
    incidentId: incident.id,
    incidentTitle: incident.title,
    generatedAt: new Date().toISOString(),
    mode: observation.mode,
    confidence,
    summary: draft?.summary ?? fallback.summary,
    hypothesis: draft?.hypothesis ?? fallback.hypothesis,
    rootCause: draft?.rootCause ?? fallback.rootCause,
    blastRadius: draft?.blastRadius ?? fallback.blastRadius,
    severity: incident.severity,
    evidence,
    steps,
    actions: mergeActions(incident, draft?.actions),
    recommendedQueries:
      draft?.recommendedQueries?.length
        ? draft.recommendedQueries
        : [
            incident.mcpQueryHint,
            `Show the latest errors for ${incident.service}`,
            `Correlate ${incident.service} with recent deployment changes`,
          ],
    mcp: observation,
  };
}
