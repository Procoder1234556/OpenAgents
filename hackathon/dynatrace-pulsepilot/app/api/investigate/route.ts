import { NextResponse } from "next/server";
import { z } from "zod";

import { investigateIncident } from "@/lib/agent";
import { getIncidentById } from "@/lib/incidents";

export const runtime = "nodejs";

const bodySchema = z.object({
  incidentId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const incident = getIncidentById(parsed.data.incidentId);
  if (!incident) {
    return NextResponse.json(
      {
        error: "Unknown incident identifier.",
      },
      { status: 404 },
    );
  }

  const report = await investigateIncident(incident);
  return NextResponse.json({ report });
}
