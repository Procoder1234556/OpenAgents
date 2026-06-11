import type { Incident } from "@/lib/types";
import { cx, formatTimestamp, severityLabel } from "@/lib/utils";

interface IncidentListProps {
  incidents: Incident[];
  selectedIncidentId: string;
  onSelectIncident: (incidentId: string) => void;
}

export function IncidentList({ incidents, selectedIncidentId, onSelectIncident }: IncidentListProps) {
  return (
    <section className="panel incident-list">
      <div className="section-heading">
        <div>
          <h2>Active incidents</h2>
          <p>Pick a signal bundle, then let the agent build the evidence chain.</p>
        </div>
      </div>

      <div className="list-stack">
        {incidents.map((incident) => {
          const active = incident.id === selectedIncidentId;

          return (
            <button
              key={incident.id}
              type="button"
              className={cx("incident-card", active && "active")}
              onClick={() => onSelectIncident(incident.id)}
            >
              <div className="incident-title">
                <h3>{incident.title}</h3>
                <span>{formatTimestamp(incident.detectedAt)}</span>
              </div>
              <p className="incident-summary">{incident.shortSummary}</p>
              <div className="tag-row">
                <span className={cx("tag", incident.severity)}>{severityLabel(incident.severity)}</span>
                <span className="tag">{incident.service}</span>
                <span className="tag">{incident.environment.toUpperCase()}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
