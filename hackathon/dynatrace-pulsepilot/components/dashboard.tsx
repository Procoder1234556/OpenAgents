"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrainCircuit, Radar, ShieldAlert } from "lucide-react";
import Image from "next/image";

import { AnalysisPanel } from "@/components/analysis-panel";
import { IncidentList } from "@/components/incident-list";
import type { Incident, InvestigationReport } from "@/lib/types";
import { severityLabel } from "@/lib/utils";

interface DashboardProps {
  incidents: Incident[];
}

async function fetchInvestigation(incidentId: string, signal?: AbortSignal): Promise<InvestigationReport> {
  const response = await fetch("/api/investigate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ incidentId }),
    signal,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error || "Failed to investigate incident.");
  }

  const payload = (await response.json()) as { report: InvestigationReport };
  return payload.report;
}

export function Dashboard({ incidents }: DashboardProps) {
  const initialIncidentId = incidents[0]?.id ?? "";
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0],
    [incidents, selectedIncidentId],
  );

  const loadReport = useCallback(async (incidentId: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const nextReport = await fetchInvestigation(incidentId, signal);
    setReport(nextReport);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedIncident) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadReport(selectedIncident.id, controller.signal).catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") {
          return;
        }

        setError(err instanceof Error ? err.message : "Unexpected investigation failure.");
        setLoading(false);
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadReport, selectedIncident]);

  const primaryStats = [
    {
      label: "Selected incident",
      value: selectedIncident?.service ?? "n/a",
      note: selectedIncident ? selectedIncident.shortSummary : "No incidents loaded.",
    },
    {
      label: "Severity",
      value: selectedIncident ? severityLabel(selectedIncident.severity) : "n/a",
      note: selectedIncident ? `${selectedIncident.environment.toUpperCase()} • ${selectedIncident.category}` : "No severity yet.",
    },
    {
      label: "Mode",
      value: report?.mode === "mcp" ? "Live MCP" : "Deterministic fallback",
      note: report?.mcp.note ?? "The agent can switch to live Dynatrace when the MCP env vars are available.",
    },
    {
      label: "Confidence",
      value: report ? `${report.confidence}%` : "—",
      note: report ? "Confidence combines observability evidence and agent inference." : "Pending first analysis.",
    },
  ];

  return (
    <div className="dashboard">
      <div className="hero">
        <section className="panel hero-copy">
          <div className="brand-lockup">
            <Image
              src="/pulsepilot-logo.png"
              alt="PulsePilot logo"
              width={72}
              height={72}
              priority
              className="brand-logo"
            />
            <div>
              <div className="brand-name">PulsePilot</div>
              <div className="brand-subtitle">Dynatrace incident command center</div>
            </div>
          </div>
          <span className="eyebrow">
            <ShieldAlert className="h-4 w-4" />
            Google Cloud Rapid Agent Hackathon
          </span>
          <h1>PulsePilot turns Dynatrace signals into a safe incident response loop.</h1>
          <p>
            The app uses a structured triage flow inspired by ADK workflow agents, optional live Dynatrace MCP data,
            and a Gemini-backed analysis layer to summarize impact, root cause, and next actions in one place.
          </p>
          <div className="hero-actions">
          <button type="button" className="button primary" onClick={() => selectedIncident && setSelectedIncidentId(selectedIncident.id)}>
            <BrainCircuit className="h-4 w-4" />
            Run current investigation
            </button>
            <button type="button" className="button secondary" onClick={() => setSelectedIncidentId(incidents[0]?.id ?? "")}>
              <Radar className="h-4 w-4" />
              Reset to top incident
            </button>
          </div>
        </section>

        <aside className="panel hero-stats">
          {primaryStats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-note">{stat.note}</div>
            </div>
          ))}
        </aside>
      </div>

      <div className="workspace">
        <IncidentList
          incidents={incidents}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={setSelectedIncidentId}
        />

        <div className="analysis-wrap">
          {error ? (
            <div className="overlay">
              <strong>Investigation error</strong>
              <span>{error}</span>
            </div>
          ) : null}
          <AnalysisPanel
            report={report}
            loading={loading}
            incidentTitle={selectedIncident?.title ?? "selected incident"}
            onInvestigate={() => {
              if (!selectedIncident) {
                return;
              }

              void loadReport(selectedIncident.id).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Unexpected investigation failure.");
                setLoading(false);
              });
            }}
          />
        </div>
      </div>

      <div className="overlay">
        <strong>Submission posture</strong>
        <span>
          This build is structured for a hackathon demo: deterministic offline behavior, optional live MCP, and
          automated remediation behind approval gates.
        </span>
      </div>
    </div>
  );
}
