export const LOCALES = [
  { code: "en", name: "English" },
  { code: "tr", name: "Türkçe" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "ro", name: "Română" },
  { code: "el", name: "Ελληνικά" },
  { code: "cs", name: "Čeština" },
  { code: "sk", name: "Slovenčina" },
  { code: "hu", name: "Magyar" },
  { code: "sv", name: "Svenska" },
  { code: "da", name: "Dansk" },
  { code: "fi", name: "Suomi" },
  { code: "bg", name: "Български" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "zh", name: "中文" },
  { code: "vi", name: "Tiếng Việt" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";

const LOCALE_SET = new Set<string>(LOCALES.map((l) => l.code));

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && LOCALE_SET.has(value);
}

export const LOCALE_COOKIE = "tamarix_locale";

/** Picks the best supported locale from an Accept-Language header value. */
export function parseAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const candidates = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .map((tag) => tag.split("-")[0]);
  for (const tag of candidates) {
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
