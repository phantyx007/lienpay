import {
    getCountryCallingCode,
    getExampleNumber,
    parsePhoneNumberFromString,
    type CountryCode,
    type Examples,
} from "libphonenumber-js";
import examplesJson from "libphonenumber-js/examples.mobile.json";

const EXAMPLES = examplesJson as unknown as Examples;

// Les 54 pays d'Afrique (codes ISO).
const AFRICA: CountryCode[] = [
    "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD",
    "KM", "CG", "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET",
    "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG",
    "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW",
    "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG",
    "TN", "UG", "ZM", "ZW",
];

// Pays où vivent souvent des clientes de la diaspora.
const ABROAD: CountryCode[] = [
    "FR", "BE", "CH", "CA", "US", "GB", "DE", "IT", "ES",
];

export type CountryOption = { code: CountryCode; dial: string; name: string };

export function getCountryOptions(lang: "fr" | "en" = "fr") {
    const names = new Intl.DisplayNames([lang], { type: "region" });

    const make = (code: CountryCode): CountryOption => ({
        code,
        dial: getCountryCallingCode(code),
        name: names.of(code) ?? code,
    });
    const byName = (a: CountryOption, b: CountryOption) =>
        a.name.localeCompare(b.name, lang);

    const africa = AFRICA.map(make).sort(byName);
    const togo = africa.filter((c) => c.code === "TG");
    const otherAfrica = africa.filter((c) => c.code !== "TG");
    const abroad = ABROAD.map(make).sort(byName);

    return { africa: [...togo, ...otherAfrica], abroad };
}

// Un exemple de numéro mobile, écrit comme on l'écrit localement.
export function getPhoneExample(country: CountryCode): string {
    try {
        return getExampleNumber(country, EXAMPLES)?.formatNational() ?? "";
    } catch {
        return "";
    }
}

// Construit un numéro international (format +XXXXXXXX) à partir du pays
// choisi et du numéro tapé. Retourne null si le numéro est impossible.
export function buildPhone(country: CountryCode, input: string): string | null {
    const raw = input.trim();
    if (!raw) return null;

    const international = raw.startsWith("+") || raw.startsWith("00");
    const parsed = international
        ? parsePhoneNumberFromString(raw.startsWith("00") ? `+${raw.slice(2)}` : raw)
        : parsePhoneNumberFromString(raw, country);

    if (!parsed || !parsed.isPossible()) return null;
    return parsed.number;
}