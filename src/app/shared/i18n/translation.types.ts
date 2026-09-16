export type SupportedLanguage = 'es' | 'en';
export type TranslationDictionary = Readonly<Record<string, string>>;

export interface LanguageOption {
  readonly code: SupportedLanguage;
  readonly label: string;
  readonly shortLabel: string;
}
