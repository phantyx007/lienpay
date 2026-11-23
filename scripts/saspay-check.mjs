// Vérifie la configuration SasPay sans afficher la clé.
import { writeFileSync } from "node:fs";

const BASE = "https://api.saspay.me/api/v1";
const key = process.env.SASPAY_API_KEY ?? "";

if (!key) {
    console.error("SASPAY_API_KEY est absente.");
    console.error("Lance : node --env-file=.env.saspay scripts/saspay-check.mjs");
    process.exit(1);
}

const mode = key.startsWith("sk_live_")
    ? "RÉEL (sk_live)"
    : key.startsWith("sk_test_")
        ? "TEST (sk_test)"
        : "format inconnu";
console.log("Mode de la clé :", mode);

let report = `Mode de la clé : ${mode}\n`;

async function call(path, auth) {
    const res = await fetch(BASE + path, {
        headers: auth ? { Authorization: `Bearer ${key}` } : {},
    });
    const text = await res.text();
    console.log(`GET ${path} -> ${res.status}`);
    report += `\nGET ${path} -> ${res.status}\n${text}\n`;
}

await call("/countries/", false);
await call("/pricing/my-rates/", true);

// Le nom commence par ".env" pour que Git l'ignore.
writeFileSync(".env.saspay-output.txt", report);
console.log("Résultat complet écrit dans .env.saspay-output.txt");