import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  topic: z.string().min(3),
  tone: z.string().min(1),
  audience: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  scheduled_for: z.string().datetime(),
  platform: z.literal("x"),
  max_length: z.number().int().positive().max(4000).default(280),
  webhookUrl: z.string().url().optional(),
});

function getWebhookUrl(provided?: string) {
  const configured = provided ?? process.env.N8N_WEBHOOK_URL;
  if (!configured) {
    throw new Error("Missing n8n webhook URL. Set N8N_WEBHOOK_URL or submit a webhookUrl in the request body.");
  }
  return configured;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let webhookUrl: string;
  try {
    webhookUrl = getWebhookUrl(parsed.data.webhookUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Missing n8n webhook URL." },
      { status: 500 },
    );
  }

  const upstream = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: parsed.data.topic,
      tone: parsed.data.tone,
      audience: parsed.data.audience,
      cta: parsed.data.cta,
      hashtags: parsed.data.hashtags,
      scheduled_for: parsed.data.scheduled_for,
      platform: parsed.data.platform,
      max_length: parsed.data.max_length,
    }),
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await upstream.json().catch(() => null)
    : await upstream.text().catch(() => "");

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: "n8n rejected the request.",
        upstreamStatus: upstream.status,
        body,
      },
      { status: upstream.status },
    );
  }

  return NextResponse.json({
    ok: true,
    body,
    forwardedTo: webhookUrl,
  });
}
