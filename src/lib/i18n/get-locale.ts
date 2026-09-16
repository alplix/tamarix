import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, parseAcceptLanguage, type Locale } from "./locales";

/** Server Component / Server Action locale detection: cookie first, then Accept-Language, then default. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return parseAcceptLanguage(headerStore.get("accept-language"));
}

/** Route Handler locale detection (NextRequest doesn't share the async cookies()/headers() API). */
export function getLocaleFromRequest(req: NextRequest): Locale {
  const fromCookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return parseAcceptLanguage(req.headers.get("accept-language"));
}

export { DEFAULT_LOCALE };
export type { Locale };
