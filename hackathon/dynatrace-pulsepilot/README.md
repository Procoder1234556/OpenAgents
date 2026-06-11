# OpenAgents Social Studio

A Vercel-hosted n8n scheduler UI for planning and publishing X posts.

## What it does

- Queues post requests from the web UI
- Proxies them to an n8n webhook
- Ships the n8n workflow JSON for easy import

## Environment variables

- `N8N_WEBHOOK_URL` - used by the Vercel route handler to forward queued posts
- `NEXT_PUBLIC_N8N_WEBHOOK_URL` - optional, pre-fills the form for local testing

## Workflow

Import the workflow at [`public/workflows/x-auto-scheduler.workflow.json`](./public/workflows/x-auto-scheduler.workflow.json) into n8n.

## Local run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
