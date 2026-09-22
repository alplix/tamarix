import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Finding, ScoreResult } from "../src/lib/types";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { generateAiSummary } = await import("../src/lib/ai-summary");

const score: ScoreResult = { score: 70, breakdown: [] };
const findings: Finding[] = [
  {
    category: "https",
    severity: "HIGH",
    titleKey: "finding.https.fail.title",
    descriptionKey: "finding.https.fail.description",
    recommendationKey: "finding.https.fail.recommendation",
  },
];

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: { get: (k: string) => init.headers?.[k] ?? null },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  process.env.TAMARIX_TILVAR_API_KEY = "test-key";
});

describe("generateAiSummary", () => {
  it("returns an error when the API key is missing", async () => {
    delete process.env.TAMARIX_TILVAR_API_KEY;
    const result = await generateAiSummary("https://example.com", score, findings, "en");
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/TAMARIX_TILVAR_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a valid JSON response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        reply: JSON.stringify({
          overview: "overview text",
          findingExplanations: [
            { title: "HTTPS is not available", explanation: "e", whyItMatters: "w", recommendation: "r" },
          ],
        }),
        kind: "chat",
      })
    );

    const result = await generateAiSummary("https://example.com", score, findings, "en");
    expect(result.error).toBeNull();
    expect(result.summary?.overview).toBe("overview text");
    expect(result.summary?.findingExplanations).toHaveLength(1);
  });

  it("includes a target-language instruction in the prompt", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reply: '{"overview":"x","findingExplanations":[]}', kind: "chat" }));
    await generateAiSummary("https://example.com", score, findings, "de");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messages[0].content).toMatch(/Deutsch/);
  });

  it("sends the request to Tilvar's chat endpoint with a bearer token", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reply: '{"overview":"x","findingExplanations":[]}', kind: "chat" }));
    await generateAiSummary("https://example.com", score, findings, "en");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://tilvar.athena.org.tr/api/chat");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
  });

  it("strips markdown code fences before parsing", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ reply: "```json\n{\"overview\":\"x\",\"findingExplanations\":[]}\n```", kind: "chat" })
    );
    const result = await generateAiSummary("https://example.com", score, findings, "en");
    expect(result.summary?.overview).toBe("x");
  });

  it("does not crash on invalid JSON and instead reports an error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reply: "not json at all", kind: "chat" }));
    const result = await generateAiSummary("https://example.com", score, findings, "en");
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/JSON/);
  });

  it("rejects a response missing required fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reply: JSON.stringify({ overview: "x" }), kind: "chat" }));
    const result = await generateAiSummary("https://example.com", score, findings, "en");
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/schema/);
  });

  it("handles a network error without throwing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await generateAiSummary("https://example.com", score, findings, "en");
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/network down/);
  });

  it("reports the status and detail on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "too large" }, { status: 413 }));
    const result = await generateAiSummary("https://example.com", score, findings, "en");
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/413/);
    expect(result.error).toMatch(/too large/);
  });

  it("retries once after a 429, honoring Retry-After", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "rate limited" }, { status: 429, headers: { "Retry-After": "1" } }))
      .mockResolvedValueOnce(jsonResponse({ reply: '{"overview":"ok","findingExplanations":[]}', kind: "chat" }));

    const promise = generateAiSummary("https://example.com", score, findings, "en");
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.summary?.overview).toBe("ok");
    vi.useRealTimers();
  });
});
