import Anthropic from "@anthropic-ai/sdk";
import type { AiSummary, Finding, ScoreResult } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export interface AiSummaryOutcome {
  summary: AiSummary | null;
  error: string | null;
}

/** Builds a compact, already-derived summary to send to Claude — never raw HTML or full headers. */
function buildPrompt(url: string, score: ScoreResult, findings: Finding[]): string {
  const nonPassFindings = findings.filter((f) => f.severity !== "PASS");
  const compact = nonPassFindings.map((f) => ({
    category: f.category,
    severity: f.severity,
    title: f.title,
    description: f.description,
  }));

  return `Aşağıda bir web sitesi için pasif güvenlik taraması sonucu elde edilmiş, ÖNCEDEN TOPLANMIŞ bulgular var. Sen yalnızca bu verileri yorumlayacaksın; siteye herhangi bir istek göndermeyeceksin.

Site: ${url}
Güvenlik skoru: ${score.score}/100

Bulgular (JSON):
${JSON.stringify(compact, null, 2)}

Görev: Bu bulgular için SADECE aşağıdaki JSON şemasına uyan bir yanıt üret, başka hiçbir metin ekleme:

{
  "overview": "2-3 cümlelik genel değerlendirme (Türkçe)",
  "findingExplanations": [
    {
      "title": "bulgunun başlığı (yukarıdaki title ile eşleşmeli)",
      "explanation": "kısa açıklama",
      "whyItMatters": "neden önemli olduğu",
      "recommendation": "önerilen çözüm"
    }
  ]
}

findingExplanations dizisinde yukarıdaki her bulgu için tam olarak bir giriş olmalı, aynı sırada. Yanıtın SADECE geçerli JSON olmalı, markdown code fence kullanma.`;
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

export async function generateAiSummary(url: string, score: ScoreResult, findings: Finding[]): Promise<AiSummaryOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { summary: null, error: "ANTHROPIC_API_KEY yapılandırılmamış." };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(url, score, findings) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { summary: null, error: "AI yanıtında metin bulunamadı." };
    }

    let parsed: unknown;
    try {
      parsed = extractJson(textBlock.text);
    } catch {
      return { summary: null, error: "AI yanıtı geçerli JSON değil." };
    }

    if (!isValidAiSummary(parsed)) {
      return { summary: null, error: "AI yanıtı beklenen şemaya uymuyor." };
    }

    return { summary: parsed, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "bilinmeyen hata";
    return { summary: null, error: `AI isteği başarısız oldu: ${message}` };
  }
}
