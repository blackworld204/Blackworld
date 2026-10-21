export const LOCALES = [
  { id: "en", code: "EN", native: "English", name: "English", dir: "ltr" },
  { id: "es", code: "ES", native: "Español", name: "Spanish", dir: "ltr" },
  { id: "fr", code: "FR", native: "Français", name: "French", dir: "ltr" },
  { id: "de", code: "DE", native: "Deutsch", name: "German", dir: "ltr" },
  { id: "pt", code: "PT", native: "Português", name: "Portuguese", dir: "ltr" },
  { id: "it", code: "IT", native: "Italiano", name: "Italian", dir: "ltr" },
  { id: "nl", code: "NL", native: "Nederlands", name: "Dutch", dir: "ltr" },
  { id: "pl", code: "PL", native: "Polski", name: "Polish", dir: "ltr" },
  { id: "ru", code: "RU", native: "Русский", name: "Russian", dir: "ltr" },
  { id: "uk", code: "UK", native: "Українська", name: "Ukrainian", dir: "ltr" },
  { id: "tr", code: "TR", native: "Türkçe", name: "Turkish", dir: "ltr" },
  { id: "sv", code: "SV", native: "Svenska", name: "Swedish", dir: "ltr" },
  { id: "da", code: "DA", native: "Dansk", name: "Danish", dir: "ltr" },
  { id: "no", code: "NO", native: "Norsk", name: "Norwegian", dir: "ltr" },
  { id: "fi", code: "FI", native: "Suomi", name: "Finnish", dir: "ltr" },
  { id: "el", code: "EL", native: "Ελληνικά", name: "Greek", dir: "ltr" },
  { id: "cs", code: "CS", native: "Čeština", name: "Czech", dir: "ltr" },
  { id: "sk", code: "SK", native: "Slovenčina", name: "Slovak", dir: "ltr" },
  { id: "hu", code: "HU", native: "Magyar", name: "Hungarian", dir: "ltr" },
  { id: "ro", code: "RO", native: "Română", name: "Romanian", dir: "ltr" },
  { id: "bg", code: "BG", native: "Български", name: "Bulgarian", dir: "ltr" },
  { id: "hr", code: "HR", native: "Hrvatski", name: "Croatian", dir: "ltr" },
  { id: "sr", code: "SR", native: "Српски", name: "Serbian", dir: "ltr" },
  { id: "sl", code: "SL", native: "Slovenščina", name: "Slovenian", dir: "ltr" },
  { id: "lt", code: "LT", native: "Lietuvių", name: "Lithuanian", dir: "ltr" },
  { id: "lv", code: "LV", native: "Latviešu", name: "Latvian", dir: "ltr" },
  { id: "et", code: "ET", native: "Eesti", name: "Estonian", dir: "ltr" },
  { id: "ga", code: "GA", native: "Gaeilge", name: "Irish", dir: "ltr" },
  { id: "ca", code: "CA", native: "Català", name: "Catalan", dir: "ltr" },
  { id: "zh", code: "ZH", native: "中文", name: "Chinese", dir: "ltr" },
  { id: "ja", code: "JA", native: "日本語", name: "Japanese", dir: "ltr" },
  { id: "ko", code: "KO", native: "한국어", name: "Korean", dir: "ltr" },
  { id: "vi", code: "VI", native: "Tiếng Việt", name: "Vietnamese", dir: "ltr" },
  { id: "th", code: "TH", native: "ไทย", name: "Thai", dir: "ltr" },
  { id: "id", code: "ID", native: "Bahasa Indonesia", name: "Indonesian", dir: "ltr" },
  { id: "ms", code: "MS", native: "Bahasa Melayu", name: "Malay", dir: "ltr" },
  { id: "fil", code: "FIL", native: "Filipino", name: "Filipino", dir: "ltr" },
  { id: "hi", code: "HI", native: "हिन्दी", name: "Hindi", dir: "ltr" },
  { id: "bn", code: "BN", native: "বাংলা", name: "Bengali", dir: "ltr" },
  { id: "ta", code: "TA", native: "தமிழ்", name: "Tamil", dir: "ltr" },
  { id: "te", code: "TE", native: "తెలుగు", name: "Telugu", dir: "ltr" },
  { id: "mr", code: "MR", native: "मराठी", name: "Marathi", dir: "ltr" },
  { id: "ur", code: "UR", native: "اردو", name: "Urdu", dir: "rtl" },
  { id: "ar", code: "AR", native: "العربية", name: "Arabic", dir: "rtl" },
  { id: "he", code: "HE", native: "עברית", name: "Hebrew", dir: "rtl" },
  { id: "fa", code: "FA", native: "فارسی", name: "Persian", dir: "rtl" },
  { id: "sw", code: "SW", native: "Kiswahili", name: "Swahili", dir: "ltr" },
  { id: "am", code: "AM", native: "አማርኛ", name: "Amharic", dir: "ltr" },
  { id: "af", code: "AF", native: "Afrikaans", name: "Afrikaans", dir: "ltr" },
  { id: "zu", code: "ZU", native: "isiZulu", name: "Zulu", dir: "ltr" },
] as const;

export type LocaleId = (typeof LOCALES)[number]["id"];

export function localeById(id: string) {
  return LOCALES.find((item) => item.id === id) ?? LOCALES[0];
}

export function foldLanguage(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
