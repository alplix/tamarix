import Anthropic from "@anthropic-ai/sdk";
import type { AiSummary, Finding, ScoreResult } from "./types";
import type { Locale } from "./i18n/locales";
import { LOCALES } from "./i18n/locales";
import { translateFinding } from "./findings";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export interface AiSummaryOutcome {
  summary: AiSummary | null;
  error: string | null;
}

function languageName(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.name ?? "English";
}

/** Builds a compact, already-derived, already-localized summary to send to Claude — never raw HTML or full headers. */
function buildPrompt(locale: Locale, url: string, score: ScoreResult, findings: Finding[]): string {
  const nonPassFindings = findings.filter((f) => f.severity !== "PASS");
  const compact = nonPassFindings.map((f) => {
    const translated = translateFinding(locale, f);
    return { category: translated.category, severity: translated.severity, title: translated.title, description: translated.description };
  });

  return `Below is a set of ALREADY-COLLECTED passive security scan findings for a website. You will only interpret this data — you will not send any request to the site yourself.

Site: ${url}
Security score: ${score.score}/100

Findings (JSON):
${JSON.stringify(compact, null, 2)}

Task: Produce a response that matches ONLY the following JSON schema, with no other text:

{
  "overview": "a 2-3 sentence overall assessment",
  "findingExplanations": [
    {
      "title": "the finding's title (must match the title above)",
      "explanation": "a short explanation",
      "whyItMatters": "why it matters",
      "recommendation": "the recommended fix"
    }
  ]
}

findingExplanations must contain exactly one entry per finding above, in the same order. Write ALL text values (overview, title, explanation, whyItMatters, recommendation) in ${languageName(locale)}. Respond with ONLY valid JSON, no markdown code fences.`;
}

function isValidAiSummary(value: unknown): value is AiSummary {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.overview !== "string") return false;
  if (!Array.isArray(obj.findingExplanations)) return false;
  return obj.findingExplanations.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    return (
      typeof e.title === "string" &&
      typeof e.explanation === "string" &&
      typeof e.whyItMatters === "string" &&
      typeof e.recommendation === "string"
    );
  });
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

export async function generateAiSummary(
  url: string,
  score: ScoreResult,
  findings: Finding[],
  locale: Locale
): Promise<AiSummaryOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { summary: null, error: "ANTHROPIC_API_KEY is not configured." };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(locale, url, score, findings) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { summary: null, error: "No text found in the AI response." };
    }

    let parsed: unknown;
    try {
      parsed = extractJson(textBlock.text);
    } catch {
      return { summary: null, error: "The AI response was not valid JSON." };
    }

    if (!isValidAiSummary(parsed)) {
      return { summary: null, error: "The AI response did not match the expected schema." };
    }

    return { summary: parsed, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { summary: null, error: `The AI request failed: ${message}` };
  }
}
