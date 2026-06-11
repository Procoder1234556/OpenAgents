import type { Incident } from "@/lib/types";

export const incidentCatalog: Incident[] = [
  {
    id: "checkout-latency-spike",
    title: "Checkout latency spike after release 4.8.0",
    service: "checkout-api",
    environment: "prod",
    severity: "critical",
    detectedAt: "2026-06-10T14:16:00Z",
    category: "release regression",
    shortSummary:
      "P95 latency jumped 5x within 12 minutes of a backend deploy, and the queue behind payment authorization is backing up.",
    symptoms: [
      "P95 latency moved from 310ms to 1.8s",
      "HTTP 5xx rate rose from 0.3% to 4.9%",
      "Order completion funnel dropped by 11%",
    ],
    metrics: [
      {
        label: "P95 latency",
        value: "1.8s",
        baseline: "310ms",
        trend: "up",
        note: "The response curve follows the deployment window, not the normal traffic slope.",
      },
      {
        label: "5xx rate",
        value: "4.9%",
        baseline: "0.3%",
        trend: "up",
        note: "Errors cluster on checkout confirmation and payment callback routes.",
      },
      {
        label: "Queue depth",
        value: "1,420",
        baseline: "290",
        trend: "up",
        note: "The payment-authorization queue is the first obvious backpressure point.",
      },
    ],
    signals: [
      {
        label: "Dynatrace alert",
        detail: "Service response time anomaly on checkout-api with correlated increase in failed downstream calls.",
      },
      {
        label: "Deployment correlation",
        detail: "Version 4.8.0 shipped 17 minutes before the first sustained latency breach.",
      },
      {
        label: "Downstream dependency",
        detail: "Payment authorization calls show a new retry pattern and longer TLS handshake duration.",
      },
    ],
    deployment: {
      version: "4.8.0",
      author: "release-bot",
      at: "2026-06-10T13:59:00Z",
      note: "Enabled a new fraud scoring path and a stricter circuit-breaker timeout.",
    },
    topology: ["checkout-api", "payment-authorization", "fraud-scorer", "order-queue"],
    likelyBlastRadius: "Online checkout, abandoned carts, and downstream settlement retries.",
    mcpQueryHint: "Find checkout-api response time anomalies, downstream payment errors, and recent changes around release 4.8.0.",
    remediationGuardrails: [
      "Do not auto-roll back without human approval.",
      "Prefer a targeted config revert over a full deployment revert when the evidence supports it.",
      "Preserve the current deployment artifact hash in the incident report.",
    ],
  },
  {
    id: "auth-error-surge",
    title: "Authentication failures on partner portal",
    service: "identity-gateway",
    environment: "prod",
    severity: "high",
    detectedAt: "2026-06-10T15:02:00Z",
    category: "identity",
    shortSummary:
      "Login failures rose sharply for SSO users and the error pattern suggests a malformed token-validation change or key rotation mismatch.",
    symptoms: [
      "401 responses jumped to 17%",
      "SSO callback error bursts repeat every 90 seconds",
      "Support tickets mention 'invalid audience' and 'token expired'",
    ],
    metrics: [
      {
        label: "Auth failure rate",
        value: "17%",
        baseline: "1.2%",
        trend: "up",
        note: "The surge is isolated to partner SSO traffic.",
      },
      {
        label: "Callback latency",
        value: "940ms",
        baseline: "210ms",
        trend: "up",
        note: "Token verification now takes longer, likely from repeated retries.",
      },
      {
        label: "Retry count",
        value: "4.6x",
        baseline: "1.0x",
        trend: "up",
        note: "Retry storms amplify the failure surface.",
      },
    ],
    signals: [
      {
        label: "Dynatrace alert",
        detail: "Authentication failure anomaly with a strong user-impact score on the partner portal.",
      },
      {
        label: "Recent change",
        detail: "Identity-provider configuration was rotated during the maintenance window.",
      },
    ],
    topology: ["identity-gateway", "oidc-provider", "token-introspection", "partner-portal"],
    likelyBlastRadius: "Partner users, customer success workflows, and login-dependent APIs.",
    mcpQueryHint: "Correlate auth failures with token validation, key rotation, and callback retries.",
    remediationGuardrails: [
      "Avoid rotating signing keys a second time until the issuer mismatch is confirmed.",
      "Require SSO owner approval before changes that alter token validation.",
      "Record a clean audit trail for any rollback or key-pair substitution.",
    ],
  },
  {
    id: "memory-leak-recs",
    title: "Recommendation engine memory growth",
    service: "reco-worker",
    environment: "prod",
    severity: "medium",
    detectedAt: "2026-06-10T16:11:00Z",
    category: "resource exhaustion",
    shortSummary:
      "Workers stay healthy, but memory usage climbs steadily and throughput softens as garbage collection gets more aggressive.",
    symptoms: [
      "Memory usage rises 1.5GB over 45 minutes",
      "GC pause time doubles",
      "Recommendation latency drifts upward but remains under SLA",
    ],
    metrics: [
      {
        label: "Resident memory",
        value: "3.8GB",
        baseline: "2.2GB",
        trend: "up",
        note: "The slope is linear rather than spiky, which suggests a leak or cache churn.",
      },
      {
        label: "GC pause",
        value: "42ms",
        baseline: "19ms",
        trend: "up",
        note: "Garbage collection is working harder as the heap grows.",
      },
      {
        label: "Throughput",
        value: "1,240 req/min",
        baseline: "1,410 req/min",
        trend: "down",
        note: "Performance is degrading before user-visible outages appear.",
      },
    ],
    signals: [
      {
        label: "Dynatrace alert",
        detail: "JVM memory trend crossed the forecast band but no crash loop has started yet.",
      },
      {
        label: "Topology hint",
        detail: "The worker pool is caching per-user feature vectors without a TTL.",
      },
    ],
    topology: ["reco-worker", "feature-store", "cache-layer", "event-stream"],
    likelyBlastRadius: "Personalized recommendations and browse-page ranking.",
    mcpQueryHint: "Check memory growth, GC pauses, and cache hit ratios on reco-worker.",
    remediationGuardrails: [
      "Do not purge caches blindly; preserve hot keys if the service is still within SLO.",
      "Prefer a controlled rollout with memory profiling enabled.",
      "Escalate to the platform owner if the leak source cannot be isolated within one loop.",
    ],
  },
];

export function getIncidentCatalog(): Incident[] {
  return incidentCatalog;
}

export function getIncidentById(incidentId: string): Incident | undefined {
  return incidentCatalog.find((incident) => incident.id === incidentId);
}
