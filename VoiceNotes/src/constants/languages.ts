export interface Language {
  code: string;
  flag: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'ru-RU', flag: '🇷🇺', name: 'Русский',          nativeName: 'Русский' },
  { code: 'en-US', flag: '🇺🇸', name: 'English (US)',     nativeName: 'English' },
  { code: 'en-GB', flag: '🇬🇧', name: 'English (UK)',     nativeName: 'English' },
  { code: 'de-DE', flag: '🇩🇪', name: 'Deutsch',          nativeName: 'Deutsch' },
  { code: 'fr-FR', flag: '🇫🇷', name: 'Français',         nativeName: 'Français' },
  { code: 'es-ES', flag: '🇪🇸', name: 'Español',          nativeName: 'Español' },
  { code: 'zh-CN', flag: '🇨🇳', name: '中文 (普通话)',     nativeName: '中文' },
  { code: 'uk-UA', flag: '🇺🇦', name: 'Українська',       nativeName: 'Українська' },
  { code: 'el-GR', flag: '🇬🇷', name: 'Ελληνικά',         nativeName: 'Ελληνικά' },
];

export function getLangName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function getLangNativeName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.nativeName ?? code;
}
