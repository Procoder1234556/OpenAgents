export type Severity = "critical" | "high" | "medium" | "low";

export type InvestigationMode = "mock" | "mcp";

export type EvidenceKind = "metric" | "trace" | "log" | "deployment" | "topology" | "remediation" | "model";

export interface IncidentMetric {
  label: string;
  value: string;
  baseline: string;
  trend: "up" | "down" | "flat";
  note: string;
}

export interface IncidentSignal {
  label: string;
  detail: string;
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  environment: "prod" | "staging";
  severity: Severity;
  detectedAt: string;
  category: string;
  shortSummary: string;
  symptoms: string[];
  metrics: IncidentMetric[];
  signals: IncidentSignal[];
  deployment?: {
    version: string;
    author: string;
    at: string;
    note: string;
  };
  topology: string[];
  likelyBlastRadius: string;
  mcpQueryHint: string;
  remediationGuardrails: string[];
}

export interface EvidenceItem {
  label: string;
  value: string;
  kind: EvidenceKind;
  source: string;
}

export interface InvestigationStep {
  title: string;
  detail: string;
  status: "complete" | "working" | "review";
}

export interface InvestigationAction {
  action: string;
  owner: string;
  rationale: string;
  safeToAutomate: boolean;
}

export interface DynatraceObservation {
  mode: InvestigationMode;
  connected: boolean;
  toolNames: string[];
  note: string;
  rawSnippet?: string;
}

export interface InvestigationReport {
  incidentId: string;
  incidentTitle: string;
  generatedAt: string;
  mode: InvestigationMode;
  confidence: number;
  summary: string;
  hypothesis: string;
  rootCause: string;
  blastRadius: string;
  severity: Severity;
  evidence: EvidenceItem[];
  steps: InvestigationStep[];
  actions: InvestigationAction[];
  recommendedQueries: string[];
  mcp: DynatraceObservation;
}
