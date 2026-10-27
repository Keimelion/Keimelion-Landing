import fr from './fr.json' with { type: 'json' }
import en from './en.json' with { type: 'json' }

export const Locales = {
  FR: 'fr',
  EN: 'en',
} as const

export type Locale = (typeof Locales)[keyof typeof Locales]

export type Translation = typeof fr

const catalogues: Record<Locale, Translation> = {
  [Locales.FR]: fr,
  [Locales.EN]: en satisfies Translation,
}

export function getTranslation(locale: Locale): Translation {
  return catalogues[locale]
}

export function getAlternateLocale(locale: Locale): Locale {
  if (locale === Locales.FR) return Locales.EN
  return Locales.FR
}

export function getLocalisedHomePath(locale: Locale): string {
  if (locale === Locales.FR) return '/'
  return '/en/'
}
