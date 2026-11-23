// Vérifie la configuration SasPay et affiche seulement ce qui concerne le Togo.
// La clé n'est jamais affichée.
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

function hasTogoValue(v) {
    if (typeof v === "string") return /^tg$/i.test(v.trim()) || /togo/i.test(v);
    if (v && typeof v === "object") return Object.values(v).some(hasTogoValue);
    return false;
}

function collect(node, out) {
    if (!node || typeof node !== "object") return;
    let recursed = false;
    for (const [k, v] of Object.entries(node)) {
        if (/^(tg|togo)$/i.test(k)) {
            out.push(v);
            recursed = true;
        } else if (v && typeof v === "object" && hasTogoValue(v)) {
            collect(v, out);
            recursed = true;
        }
    }
    if (!recursed && hasTogoValue(node)) out.push(node);
}

async function check(path, auth) {
    console.log(`\n=== GET ${path} ===`);
    try {
        const res = await fetch(BASE + path, {
            headers: auth ? { Authorization: `Bearer ${key}` } : {},
        });
        console.log("Réponse HTTP :", res.status);

        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch {
            console.log("Réponse non lisible :", text.slice(0, 200));
            return;
        }

        if (!res.ok) {
            console.log("Erreur :", JSON.stringify(json).slice(0, 300));
            return;
        }

        const found = [];
        collect(json, found);
        if (found.length === 0) {
            console.log("Aucune ligne Togo trouvée.");
            if (json && typeof json === "object") {
                console.log("Clés de la réponse :", Object.keys(json).join(", "));
            }
            return;
        }
        for (const item of found.slice(0, 15)) {
            console.log(JSON.stringify(item, null, 2));
        }
    } catch (e) {
        console.log("Appel impossible :", e instanceof Error ? e.message : e);
    }
}

await check("/countries/", false);
await check("/pricing/my-rates/", true);