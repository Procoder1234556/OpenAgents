"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Download,
  Flame,
  Layers3,
  Sparkles,
  Workflow,
} from "lucide-react";

type QueueResponse =
  | {
      ok: true;
      forwardedTo: string;
      body: unknown;
    }
  | {
      ok: false;
      error: string;
    };

const defaultWorkflowPath = "/workflows/x-auto-scheduler.workflow.json";

const initialForm = {
  topic: "Daily AI automation update",
  tone: "clear and concise",
  audience: "X followers",
  cta: "Follow for more automation ideas",
  hashtags: "ai, automation, x",
  scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  webhookUrl: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? "",
};

function toJsonBody(values: typeof initialForm) {
  return {
    topic: values.topic.trim(),
    tone: values.tone.trim(),
    audience: values.audience.trim(),
    cta: values.cta.trim(),
    hashtags: values.hashtags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    scheduled_for: new Date(values.scheduledFor).toISOString(),
    platform: "x",
    max_length: 280,
  };
}

export function SchedulerDashboard() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QueueResponse | null>(null);

  const webhookLabel = useMemo(() => {
    if (!form.webhookUrl) return "Set NEXT_PUBLIC_N8N_WEBHOOK_URL to your n8n webhook.";
    try {
      const url = new URL(form.webhookUrl);
      return `${url.host}${url.pathname}`;
    } catch {
      return form.webhookUrl;
    }
  }, [form.webhookUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...toJsonBody(form),
          webhookUrl: form.webhookUrl,
        }),
      });

      const payload = (await response.json()) as QueueResponse;
      if (!response.ok) {
        setResult({ ok: false, error: "error" in payload ? payload.error : "Unable to queue post." });
        return;
      }

      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Something went wrong while queueing the post.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell scheduler-page">
      <section className="dashboard">
        <header className="hero panel scheduler-hero">
          <div className="hero-copy">
            <div className="brand-lockup">
              <div className="brand-orb">
                <Workflow size={30} />
              </div>
              <div>
                <div className="brand-name">OpenAgents Social Studio</div>
                <div className="brand-subtitle">n8n-powered X scheduler deployed on Vercel</div>
              </div>
            </div>

            <div className="eyebrow">
              <Sparkles size={14} />
              Workflow-driven publishing
            </div>

            <h1>Build posts in the web UI, hand off scheduling to n8n, and publish without the manual grind.</h1>
            <p>
              Use this dashboard to queue a post, generate the payload for n8n, and keep the entire automation
              stack portable. The UI stays on Vercel. The workflow lives in n8n. X publishing happens from the
              automation layer.
            </p>

            <div className="hero-actions">
              <a className="button primary" href={defaultWorkflowPath} download>
                <Download size={16} />
                Download workflow JSON
              </a>
              <a className="button secondary" href="#queue-form">
                <ArrowRight size={16} />
                Queue a post
              </a>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-label">Stack</div>
              <div className="stat-value">Vercel UI + n8n webhook</div>
              <div className="stat-note">No local backend required for the public flow.</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Trigger</div>
              <div className="stat-value">Webhook + Wait</div>
              <div className="stat-note">n8n receives the job and pauses until the scheduled time.</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Publish target</div>
              <div className="stat-value">X / Twitter</div>
              <div className="stat-note">The automation publishes when the scheduled time arrives.</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Webhook</div>
              <div className="stat-value">{webhookLabel}</div>
              <div className="stat-note">Set the webhook in Vercel env vars before deploying.</div>
            </div>
          </div>
        </header>

        <section className="workspace scheduler-workspace">
          <div className="panel form-panel" id="queue-form">
            <div className="section-heading">
              <div>
                <h2>Queue a post</h2>
                <p>Fill this out, and the UI will forward it to your n8n workflow.</p>
              </div>
              <span className="mini-badge">
                <Layers3 size={12} />
                n8n payload
              </span>
            </div>

            <form className="scheduler-form" onSubmit={handleSubmit}>
              <label>
                <span>Topic</span>
                <input
                  value={form.topic}
                  onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
                  placeholder="What should the post be about?"
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>Tone</span>
                  <input
                    value={form.tone}
                    onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value }))}
                    placeholder="clear and concise"
                  />
                </label>
                <label>
                  <span>Audience</span>
                  <input
                    value={form.audience}
                    onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
                    placeholder="X followers"
                  />
                </label>
              </div>
              <label>
                <span>CTA</span>
                <input
                  value={form.cta}
                  onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))}
                  placeholder="Follow for more automation ideas"
                />
              </label>
              <label>
                <span>Hashtags</span>
                <input
                  value={form.hashtags}
                  onChange={(event) => setForm((current) => ({ ...current, hashtags: event.target.value }))}
                  placeholder="ai, automation, x"
                />
              </label>
              <div className="form-grid">
                <label>
                  <span>Schedule for</span>
                  <input
                    type="datetime-local"
                    value={form.scheduledFor}
                    onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))}
                  />
                </label>
                <label>
                  <span>n8n webhook URL</span>
                  <input
                    value={form.webhookUrl}
                    onChange={(event) => setForm((current) => ({ ...current, webhookUrl: event.target.value }))}
                    placeholder="https://n8n.example.com/webhook/openagents-social"
                  />
                </label>
              </div>

              <button className="button primary submit-button" type="submit" disabled={submitting}>
                <CalendarClock size={16} />
                {submitting ? "Queueing..." : "Queue through n8n"}
              </button>
            </form>

            {result ? (
              <div className={`result-box ${result.ok ? "success" : "error"}`}>
                <div className="result-title">
                  {result.ok ? <CheckCircle2 size={16} /> : <Flame size={16} />}
                  {result.ok ? "Queued through n8n" : "Queue failed"}
                </div>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            ) : null}
          </div>

          <aside className="panel side-panel">
            <div className="section-heading">
              <div>
                <h3>How it works</h3>
                <p>One UI, one webhook, one automation path.</p>
              </div>
            </div>

            <ol className="timeline-list">
              <li className="timeline-item">
                <strong>1. Enter the post details</strong>
                <p>The form builds a clean JSON payload with topic, tone, audience, CTA, hashtags, and schedule time.</p>
              </li>
              <li className="timeline-item">
                <strong>2. Send to n8n</strong>
                <p>The Vercel route proxies the payload to your n8n webhook so the workflow can pick it up.</p>
              </li>
              <li className="timeline-item">
                <strong>3. Wait and publish</strong>
                <p>n8n waits until the requested time, then posts to X with your automation credentials.</p>
              </li>
            </ol>

            <div className="subpanel code-panel">
              <div className="section-heading">
                <div>
                  <h4>Workflow assets</h4>
                  <p>Keep the import file handy when setting up a new n8n instance.</p>
                </div>
              </div>
              <p className="code-note">Download: <code>{defaultWorkflowPath}</code></p>
              <p className="code-note">
                Env var: <code>NEXT_PUBLIC_N8N_WEBHOOK_URL</code> for the UI, <code>N8N_WEBHOOK_URL</code> for the proxy.
              </p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
