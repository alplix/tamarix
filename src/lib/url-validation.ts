import dns from "node:dns/promises";
import net from "node:net";

export type ScanErrorCode =
  | "invalid_url"
  | "blocked_protocol"
  | "blocked_credentials"
  | "blocked_target"
  | "blocked_ip_literal"
  | "dns_failure"
  | "dns_empty"
  | "blocked_ip_resolved"
  | "request_timeout"
  | "connection_failed"
  | "too_many_redirects";

/** Carries a language-neutral error code; the API layer translates it for the client. */
export class UnsafeUrlError extends Error {
  code: ScanErrorCode;
  constructor(code: ScanErrorCode) {
    super(code);
    this.name = "UnsafeUrlError";
    this.code = code;
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
]);

/** IPv4 ranges that must never be scanned: loopback, private, link-local, CGNAT, multicast, reserved, cloud metadata. */
const BLOCKED_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function ipv4ToInt(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) + Number.parseInt(octet, 10), 0) >>> 0;
}

function isIpv4InRange(ip: string, range: string, prefix: number): boolean {
  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

function isBlockedIpv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some(([range, prefix]) => isIpv4InRange(ip, range, prefix));
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  // IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) — check the embedded IPv4.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  // Unique local (fc00::/7) and link-local (fe80::/10) addresses.
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not a recognizable IP — treat as unsafe rather than assume safe
}

export interface ValidatedUrl {
  url: URL;
  resolvedIps: string[];
}

/**
 * Validates a user-supplied URL is safe to fetch: http(s) only, resolvable,
 * and every resolved address is public (no loopback/private/link-local/metadata).
 * Must be re-run on every redirect hop, not just the initial URL.
 */
export async function validateTargetUrl(rawUrl: string): Promise<ValidatedUrl> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("invalid_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("blocked_protocol");
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError("blocked_credentials");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError("blocked_target");
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new UnsafeUrlError("blocked_target");
  }

  // If the hostname is already a literal IP, validate it directly.
  const literalVersion = net.isIP(hostname.replace(/^\[|\]$/g, ""));
  if (literalVersion) {
    const literal = hostname.replace(/^\[|\]$/g, "");
    if (isBlockedIp(literal)) {
      throw new UnsafeUrlError("blocked_ip_literal");
    }
    return { url, resolvedIps: [literal] };
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new UnsafeUrlError("dns_failure");
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError("dns_empty");
  }

  for (const ip of addresses) {
    if (isBlockedIp(ip)) {
      throw new UnsafeUrlError("blocked_ip_resolved");
    }
  }

  return { url, resolvedIps: addresses };
}

export function normalizeUrl(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  if (
    (normalized.protocol === "https:" && normalized.port === "443") ||
    (normalized.protocol === "http:" && normalized.port === "80")
  ) {
    normalized.port = "";
  }
  return normalized.toString();
}
