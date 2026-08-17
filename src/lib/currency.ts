// Localized currency for global marketplace.
// Base price is ₦4,500/month for Bluetek. Convert to each country's local currency.
// Static rate table (no live FX API) — swap for real rates later via AWS.

export type Country = {
  code: string; // ISO-3166 alpha-2
  name: string;
  currency: string; // ISO-4217
  symbol: string;
  rateFromNGN: number; // 1 NGN = X local
  locale: string;
};

// Indicative exchange-rate table used for display; payment settlement remains in the configured transaction currency.
export const COUNTRIES: Country[] = [
  {
    code: "AR",
    name: "Argentina",
    currency: "ARS",
    symbol: "$",
    rateFromNGN: 0.9,
    locale: "es-AR",
  },
  {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    symbol: "A$",
    rateFromNGN: 0.001,
    locale: "en-AU",
  },
  {
    code: "BR",
    name: "Brazil",
    currency: "BRL",
    symbol: "R$",
    rateFromNGN: 0.0035,
    locale: "pt-BR",
  },
  {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    symbol: "C$",
    rateFromNGN: 0.0009,
    locale: "en-CA",
  },
  { code: "CN", name: "China", currency: "CNY", symbol: "¥", rateFromNGN: 0.0045, locale: "zh-CN" },
  {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    symbol: "€",
    rateFromNGN: 0.00058,
    locale: "de-DE",
  },
  { code: "EG", name: "Egypt", currency: "EGP", symbol: "E£", rateFromNGN: 0.031, locale: "ar-EG" },
  {
    code: "FR",
    name: "France",
    currency: "EUR",
    symbol: "€",
    rateFromNGN: 0.00058,
    locale: "fr-FR",
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    rateFromNGN: 0.00049,
    locale: "en-GB",
  },
  {
    code: "GH",
    name: "Ghana",
    currency: "GHS",
    symbol: "GH₵",
    rateFromNGN: 0.0089,
    locale: "en-GH",
  },
  { code: "IN", name: "India", currency: "INR", symbol: "₹", rateFromNGN: 0.053, locale: "en-IN" },
  { code: "JP", name: "Japan", currency: "JPY", symbol: "¥", rateFromNGN: 0.093, locale: "ja-JP" },
  {
    code: "KE",
    name: "Kenya",
    currency: "KES",
    symbol: "KSh",
    rateFromNGN: 0.081,
    locale: "en-KE",
  },
  {
    code: "MA",
    name: "Morocco",
    currency: "MAD",
    symbol: "DH",
    rateFromNGN: 0.0062,
    locale: "fr-MA",
  },
  { code: "NG", name: "Nigeria", currency: "NGN", symbol: "₦", rateFromNGN: 1, locale: "en-NG" },
  {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    symbol: "﷼",
    rateFromNGN: 0.0023,
    locale: "ar-SA",
  },
  {
    code: "SN",
    name: "Senegal",
    currency: "XOF",
    symbol: "CFA",
    rateFromNGN: 0.38,
    locale: "fr-SN",
  },
  {
    code: "TR",
    name: "Türkiye",
    currency: "TRY",
    symbol: "₺",
    rateFromNGN: 0.021,
    locale: "tr-TR",
  },
  { code: "UG", name: "Uganda", currency: "UGX", symbol: "USh", rateFromNGN: 2.3, locale: "en-UG" },
  {
    code: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
    rateFromNGN: 0.00062,
    locale: "en-US",
  },
  {
    code: "ZA",
    name: "South Africa",
    currency: "ZAR",
    symbol: "R",
    rateFromNGN: 0.011,
    locale: "en-ZA",
  },
].sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.code === "NG")!;

// Round nicely — e.g. 4500 NGN * 0.00062 = 2.79 → show 2.79; but big currencies like UGX round to whole.
export function convertFromNGN(ngn: number, c: Country): number {
  const raw = ngn * c.rateFromNGN;
  if (raw >= 1000) return Math.round(raw);
  if (raw >= 10) return Math.round(raw * 10) / 10;
  return Math.round(raw * 100) / 100;
}

export function formatMoney(amount: number, c: Country): string {
  try {
    return new Intl.NumberFormat(c.locale, {
      style: "currency",
      currency: c.currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${c.symbol}${amount.toLocaleString()}`;
  }
}

export function formatFromNGN(ngn: number, c: Country): string {
  return formatMoney(convertFromNGN(ngn, c), c);
}
