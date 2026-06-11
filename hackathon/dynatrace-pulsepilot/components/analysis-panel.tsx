import { BrainCircuit, DatabaseZap, Radar, Sparkles } from "lucide-react";

import type { InvestigationReport } from "@/lib/types";
import { cx, percent, severityLabel } from "@/lib/utils";

interface AnalysisPanelProps {
  report: InvestigationReport | null;
  loading: boolean;
  incidentTitle: string;
  onInvestigate: () => void;
}

export function AnalysisPanel({ report, loading, incidentTitle, onInvestigate }: AnalysisPanelProps) {
  return (
    <section className="panel analysis">
      <div className="section-heading">
        <div>
          <h2>Investigation console</h2>
          <p>Structured triage, evidence, and remediation planning for {incidentTitle}.</p>
        </div>
        <button type="button" className="button secondary" onClick={onInvestigate}>
          <Radar className="h-4 w-4" />
          Re-run analysis
        </button>
      </div>

      {!report && loading ? (
        <div className="loading-skeleton" />
      ) : null}

      {report && !loading ? (
        <div className="analysis-grid">
          <div className="analysis-copy">
            <div className="callout">
              <div className="status-row">
                <span className="tag medium">{severityLabel(report.severity)} severity</span>
                <span className="tag">{percent(report.confidence)} confidence</span>
                <span className="tag">{report.mode === "mcp" ? "Live MCP" : "Fallback telemetry"}</span>
              </div>
              <h3>{report.summary}</h3>
              <p>{report.hypothesis}</p>
            </div>

            <div className="analysis-meta">
              <div className="meta-card">
                <span>Root cause</span>
                <strong>{report.rootCause}</strong>
              </div>
              <div className="meta-card">
                <span>Blast radius</span>
                <strong>{report.blastRadius}</strong>
              </div>
              <div className="meta-card">
                <span>Telemetry mode</span>
                <strong>{report.mcp.connected ? "Dynatrace MCP" : "Local deterministic mode"}</strong>
              </div>
              <div className="meta-card">
                <span>Generated at</span>
                <strong>{new Intl.DateTimeFormat("en-US", { timeStyle: "short", dateStyle: "medium" }).format(new Date(report.generatedAt))}</strong>
              </div>
            </div>

            <div className="analysis-columns">
              <div className="subpanel">
                <h4>Evidence chain</h4>
                <ul className="evidence-list">
                  {report.evidence.map((item) => (
                    <li className="evidence-item" key={`${item.label}-${item.value}`}>
                      <span className="mini-badge">{item.kind}</span>
                      <strong>{item.label}</strong>
                      <p>{item.value}</p>
                      <p>{item.source}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="subpanel">
                <h4>Agent plan</h4>
                <ul className="timeline-list">
                  {report.steps.map((step) => (
                    <li className="timeline-item" key={step.title}>
                      <span className="mini-badge">
                        {step.status === "complete" ? "done" : step.status === "working" ? "working" : "review"}
                      </span>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="analysis-columns">
              <div className="subpanel">
                <h4>Recommended actions</h4>
                <ul className="action-list">
                  {report.actions.map((action) => (
                    <li className="action-item" key={action.action}>
                      <span className={cx("mini-badge", action.safeToAutomate ? "tag low" : "tag high")}>
                        {action.safeToAutomate ? "auto-safe" : "approval required"}
                      </span>
                      <strong>{action.action}</strong>
                      <p>{action.owner}</p>
                      <p>{action.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="subpanel">
                <h4>Suggested queries</h4>
                <ul className="query-list">
                  {report.recommendedQueries.map((query) => (
                    <li className="query-item" key={query}>
                      <span className="mini-badge">
                        <DatabaseZap className="h-3.5 w-3.5" />
                        query
                      </span>
                      <p>{query}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="subpanel">
            <h4>MCP status</h4>
            <div className="status-row" style={{ marginBottom: 14 }}>
              <span className={cx("status-dot", !report.mcp.connected && "offline")} />
              <strong>{report.mcp.connected ? "Connected" : "Offline"}</strong>
            </div>
            <p className="incident-summary">{report.mcp.note}</p>

            <div className="subpanel" style={{ marginBottom: 12 }}>
              <h4 style={{ marginBottom: 10 }}>Exposed tools</h4>
              <p className="incident-summary" style={{ marginBottom: 0 }}>
                {report.mcp.toolNames.length > 0 ? report.mcp.toolNames.join(", ") : "No MCP tools exposed in fallback mode."}
              </p>
            </div>

            <div className="subpanel">
              <h4 style={{ marginBottom: 10 }}>What the agent learned</h4>
              <p className="incident-summary" style={{ marginBottom: 0 }}>
                The report stays conservative on automation and prefers evidence-backed actions. That keeps the loop safe while still surfacing a decisive next move.
              </p>
            </div>

            <div style={{ marginTop: 16 }}>
              <button type="button" className="button primary" onClick={onInvestigate}>
                <Sparkles className="h-4 w-4" />
                Refresh report
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className="callout">
          <h3>Ready to run the first investigation</h3>
          <p>
            Use the prompt-to-plan workflow to reproduce the incident triage flow from the hackathon demo.
          </p>
          <div className="hero-actions" style={{ marginTop: 18 }}>
            <button type="button" className="button primary" onClick={onInvestigate} disabled={loading}>
              <BrainCircuit className="h-4 w-4" />
              {loading ? "Analyzing..." : "Start investigation"}
            </button>
            <span className="tag">human-approved remediation</span>
            <span className="tag">audit trail included</span>
          </div>
        </div>
      )}
    </section>
  );
}
