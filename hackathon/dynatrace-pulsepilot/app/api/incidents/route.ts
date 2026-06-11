import { NextResponse } from "next/server";

import { getIncidentCatalog } from "@/lib/incidents";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    incidents: getIncidentCatalog(),
  });
}
