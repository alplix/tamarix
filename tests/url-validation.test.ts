import { describe, it, expect, vi, beforeEach } from "vitest";

const lookupMock = vi.fn();

vi.mock("node:dns/promises", () => ({
  default: {
    lookup: (...args: unknown[]) => lookupMock(...args),
  },
}));

const { validateTargetUrl, isBlockedIp, normalizeUrl } = await import("../src/lib/url-validation");

beforeEach(() => {
  lookupMock.mockReset();
});

describe("isBlockedIp", () => {
  it("blocks loopback addresses", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
  });

  it("blocks private IPv4 ranges", () => {
    expect(isBlockedIp("10.1.2.3")).toBe(true);
    expect(isBlockedIp("172.16.5.5")).toBe(true);
    expect(isBlockedIp("192.168.0.10")).toBe(true);
  });

  it("blocks link-local addresses", () => {
    expect(isBlockedIp("169.254.1.1")).toBe(true);
  });

  it("blocks cloud metadata address", () => {
    expect(isBlockedIp("169.254.169.254")).toBe(true);
  });

  it("allows public IPv4 addresses", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false);
    expect(isBlockedIp("93.184.216.34")).toBe(false);
  });
});

describe("validateTargetUrl", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(validateTargetUrl("ftp://example.com")).rejects.toThrow();
  });

  it("rejects malformed URLs", async () => {
    await expect(validateTargetUrl("not a url")).rejects.toThrow();
  });

  it("rejects localhost by hostname", async () => {
    await expect(validateTargetUrl("http://localhost:3000")).rejects.toThrow();
  });

  it("rejects literal loopback IP", async () => {
    await expect(validateTargetUrl("http://127.0.0.1")).rejects.toThrow();
  });

  it("rejects literal private IP", async () => {
    await expect(validateTargetUrl("http://192.168.1.1")).rejects.toThrow();
  });

  it("rejects credentials embedded in the URL", async () => {
    await expect(validateTargetUrl("https://user:pass@example.com")).rejects.toThrow();
  });

  it("accepts a literal public IP", async () => {
    const result = await validateTargetUrl("https://93.184.216.34");
    expect(result.resolvedIps).toEqual(["93.184.216.34"]);
  });

  it("rejects a domain that resolves to a private IP", async () => {
    lookupMock.mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }]);
    await expect(validateTargetUrl("https://internal.example.com")).rejects.toThrow();
  });

  it("accepts a domain that resolves to a public IP", async () => {
    lookupMock.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }]);
    const result = await validateTargetUrl("https://example.com");
    expect(result.resolvedIps).toEqual(["93.184.216.34"]);
  });
});

describe("normalizeUrl", () => {
  it("strips default ports and hash fragments", () => {
    expect(normalizeUrl(new URL("https://example.com:443/path#section"))).toBe("https://example.com/path");
    expect(normalizeUrl(new URL("http://example.com:80/"))).toBe("http://example.com/");
  });
});
