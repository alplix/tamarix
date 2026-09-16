# Tamarix

*Coded by [Alperen Yavuz](https://github.com/alplix)*

Tamarix is a web application that scans a website for common security and configuration issues using **safe, passive** checks only, and turns the results into a clear, readable report.

The user enters a URL (`https://example.com`), Tamarix sends harmless HTTP requests to the site, scores the results against fixed weights, and uses the Claude API **only to explain the results in plain language** — never to attack the target.

> **This tool is NOT a penetration testing / attack tool.** It never performs brute force, exploit execution, SQL injection/XSS attempts, DDoS, port/directory scanning, or credential guessing. It only performs safe, passive, publicly-available checks. See [Security Boundaries](#security-boundaries) for details.

## Screenshots

**Home page** — dark theme, a single input and a single button:

![Tamarix home page](docs/screenshots/landing.png)

**Scan result (dashboard)** — Security Score gauge, AI summary, 6 check cards (PASS/WARNING/FAIL), findings/recommendations sorted by severity, and a transparent score breakdown (shown here with sample data):

![Tamarix scan result dashboard](docs/screenshots/dashboard.png)

## Features

- Start a scan instantly from a single URL
- A 0-100 Security Score computed from **fixed, code-defined weights**
- Check cards with PASS / WARNING / FAIL status
- Findings and recommendations sorted by severity (HIGH/MEDIUM/LOW/PASS)
- A short AI-generated summary that explains the technical results in plain language
- Results are cached in the database per URL (default: 1 hour) — no redundant scans or AI calls
- A list of past scans
- **Multi-language UI** — the interface, findings, and AI summary can be viewed in over 20 languages (see [Supported Languages](#supported-languages))

## Security Checks

| Category | Weight | What's checked |
|---|---|---|
| HTTPS | 25 | HTTPS reachability, TLS handshake, HTTP→HTTPS redirection |
| Security Headers | 30 | `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Cookies | 15 | `Secure`, `HttpOnly`, `SameSite` flags |
| Information Disclosure | 10 | `Server` / `X-Powered-By` headers, HTML `generator` meta tag, visible error/debug traces |
| Exposure Checks | 10 | presence of `robots.txt`, `sitemap.xml`, `.well-known/security.txt` (only these fixed, well-known files — no brute forcing) |
| HTTP Methods | 10 | passively reading the `Allow` header from a single `OPTIONS` request |

Each category earns its full weight on PASS, half on WARNING, and zero on FAIL. Weights are explicitly defined in [`src/lib/scoring.ts`](src/lib/scoring.ts) — the score is never random or AI-generated.

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **PostgreSQL** + **Prisma**
- **Claude API** (`@anthropic-ai/sdk`) — used only to summarize already-collected results
- **Vitest** — unit tests

## Setup

### Requirements

- Node.js 20+
- A PostgreSQL database (local or hosted)
- A Claude API key

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/db?schema=public`) |
| `ANTHROPIC_API_KEY` | Claude API key ([console.anthropic.com](https://console.anthropic.com/)) |
| `ANTHROPIC_MODEL` | (optional) model to use, defaults to `claude-sonnet-5` |

### PostgreSQL Setup

To quickly run a local PostgreSQL instance with Docker:

```bash
docker run --name tamarix-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tamarix -p 5432:5432 -d postgres:16
```

Then apply the schema to the database:

```bash
npm run db:migrate
```

### Claude API Setup

1. Create an API key at [console.anthropic.com](https://console.anthropic.com/).
2. Paste it into `ANTHROPIC_API_KEY` in your `.env` file.
3. The app still works without an API key — scans still run and produce results, but the AI summary is replaced with an "AI summary could not be generated" message instead of the app crashing.

## Development

```bash
npm run dev
```

The app opens at `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

## Test, Lint, Typecheck

```bash
npm run test        # Vitest unit tests
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

## Architecture

```
src/
  app/
    page.tsx                → Home page (URL form + recent scans)
    scan/[id]/page.tsx       → Scan result dashboard
    api/scan/route.ts        → POST: start a new scan, GET: list history
    api/scan/[id]/route.ts   → Fetch a single scan
  components/                → UI components (ScoreGauge, CheckCard, FindingCard, LanguageSwitcher, ...)
  lib/
    url-validation.ts        → SSRF protection (protocol, DNS, IP-range validation)
    safe-fetch.ts             → Timeout + size-limited + redirect-revalidating fetch wrapper
    scanner/                  → One passive module per check category, emitting language-neutral codes
    scoring.ts                 → Fixed-weight, deterministic score calculation
    findings.ts                 → Turns raw check results into language-neutral findings (message key + params)
    ai-summary.ts                → Claude API call + JSON schema validation, locale-aware
    scan-service.ts               → Caching, scan orchestration, database persistence
    i18n/                          → Locale list, message dictionaries, translation helper, locale detection
prisma/schema.prisma            → Scan and Finding models
```

Flow: `URL submitted → SSRF validation → cache check → passive HTTP checks → score calculation → language-neutral finding generation → (on first view per language) AI summary via Claude → persisted to the database → dashboard, rendered in the viewer's language`.

Scans themselves are **language-independent** (checks, score and findings are stored as codes/keys, not prose), so the same scan is reused for every viewer regardless of language — only the AI summary is generated (and cached) once per URL **and** language, keeping AI usage to a minimum.

## Supported Languages

The UI, findings/recommendations, and the AI summary are all available in:

English, Turkish, German, French, Spanish, Italian, Portuguese, Dutch, Polish, Romanian, Greek, Czech, Slovak, Hungarian, Swedish, Danish, Finnish, Bulgarian, Russian, Ukrainian, Chinese (Simplified), and Vietnamese.

Switch languages from the dropdown in the header — the choice is remembered for future visits. Adding another language only requires adding one dictionary file under [`src/lib/i18n/messages/`](src/lib/i18n/messages/); see that folder's `en.ts` for the full list of keys.

## Security Boundaries

Tamarix **never**:

- Performs brute force or credential guessing
- Runs exploits, sends SQL injection / XSS payloads, or attempts command injection
- Performs DDoS or aggressive/high-volume scanning
- Performs port scanning or directory brute forcing
- Bypasses CAPTCHAs or rate limits
- Reaches internal networks or `localhost` through a user-supplied target (SSRF protection: [`src/lib/url-validation.ts`](src/lib/url-validation.ts) validates every request and every redirect hop by protocol, hostname, and resolved IP address; loopback, private, link-local, CGNAT, and cloud-metadata addresses are all rejected)

This tool is **not a penetration testing tool**. It only passively reads and explains information that is already publicly accessible (HTTP headers, cookie flags, well-known files). It is not designed to confirm or exploit any vulnerability it finds.

## Roadmap

- User accounts with a personal scan history
- Scheduled/recurring re-scans with regression tracking
- PDF/CSV report export
- Additional passive checks (DNS CAA record, email security — SPF/DMARC)
