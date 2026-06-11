import { z } from "zod";

const DraftSchema = z.object({
  summary: z.string(),
  hypothesis: z.string(),
  rootCause: z.string(),
  blastRadius: z.string(),
  confidenceDelta: z.number().min(-10).max(10).optional(),
  recommendedQueries: z.array(z.string()).default([]),
  actions: z
    .array(
      z.object({
        action: z.string(),
        owner: z.string(),
        rationale: z.string(),
        safeToAutomate: z.boolean(),
      }),
    )
    .default([]),
});

export type GeminiDraft = z.infer<typeof DraftSchema>;

function getGeminiEndpoint(): string | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

export async function generateIncidentDraft(prompt: string): Promise<GeminiDraft | null> {
  const endpoint = getGeminiEndpoint();
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "You are a senior incident commander. Return only JSON that matches this contract:",
                  JSON.stringify(
                    {
                      summary: "string",
                      hypothesis: "string",
                      rootCause: "string",
                      blastRadius: "string",
                      confidenceDelta: 0,
                      recommendedQueries: ["string"],
                      actions: [
                        {
                          action: "string",
                          owner: "string",
                          rationale: "string",
                          safeToAutomate: false,
                        },
                      ],
                    },
                    null,
                    2,
                  ),
                  "",
                  "Context:",
                  prompt,
                ].join("\n"),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      return null;
    }

    const parsed = DraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
