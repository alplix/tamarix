import type { Locale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";
import en, { type MessageKey } from "./messages/en";
import tr from "./messages/tr";
import de from "./messages/de";
import fr from "./messages/fr";
import es from "./messages/es";
import it from "./messages/it";
import pt from "./messages/pt";
import nl from "./messages/nl";
import pl from "./messages/pl";
import ro from "./messages/ro";
import el from "./messages/el";
import cs from "./messages/cs";
import sk from "./messages/sk";
import hu from "./messages/hu";
import sv from "./messages/sv";
import da from "./messages/da";
import fi from "./messages/fi";
import bg from "./messages/bg";
import ru from "./messages/ru";
import uk from "./messages/uk";
import zh from "./messages/zh";
import vi from "./messages/vi";

export type { MessageKey };

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  en,
  tr,
  de,
  fr,
  es,
  it,
  pt,
  nl,
  pl,
  ro,
  el,
  cs,
  sk,
  hu,
  sv,
  da,
  fi,
  bg,
  ru,
  uk,
  zh,
  vi,
};

export function getDictionary(locale: Locale): Record<MessageKey, string> {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Translates `key` for `locale`, interpolating `{param}` placeholders. Falls back to English, then the key itself. */
export function t(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const template = dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
