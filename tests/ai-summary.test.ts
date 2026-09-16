import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Finding, ScoreResult } from "../src/lib/types";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: (...args: unknown[]) => createMock(...args) };
  },
}));

const { generateAiSummary } = await import("../src/lib/ai-summary");

const score: ScoreResult = { score: 70, breakdown: [] };
const findings: Finding[] = [
  { category: "HTTPS", severity: "HIGH", title: "HTTPS kullanılamıyor", description: "d", recommendation: "r" },
];

beforeEach(() => {
  createMock.mockReset();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("generateAiSummary", () => {
  it("returns an error when the API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generateAiSummary("https://example.com", score, findings);
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("parses a valid JSON response", async () => {
    createMock.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            overview: "genel bakış",
            findingExplanations: [
              { title: "HTTPS kullanılamıyor", explanation: "e", whyItMatters: "w", recommendation: "r" },
            ],
          }),
        },
      ],
    });

    const result = await generateAiSummary("https://example.com", score, findings);
    expect(result.error).toBeNull();
    expect(result.summary?.overview).toBe("genel bakış");
    expect(result.summary?.findingExplanations).toHaveLength(1);
  });

  it("strips markdown code fences before parsing", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "```json\n{\"overview\":\"x\",\"findingExplanations\":[]}\n```" }],
    });
    const result = await generateAiSummary("https://example.com", score, findings);
    expect(result.summary?.overview).toBe("x");
  });

  it("does not crash on invalid JSON and instead reports an error", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "not json at all" }] });
    const result = await generateAiSummary("https://example.com", score, findings);
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/JSON/);
  });

  it("rejects a response missing required fields", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: JSON.stringify({ overview: "x" }) }] });
    const result = await generateAiSummary("https://example.com", score, findings);
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/şema/);
  });

  it("handles API errors without throwing", async () => {
    createMock.mockRejectedValueOnce(new Error("network down"));
    const result = await generateAiSummary("https://example.com", score, findings);
    expect(result.summary).toBeNull();
    expect(result.error).toMatch(/network down/);
  });
});
