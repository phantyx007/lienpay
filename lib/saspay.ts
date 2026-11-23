import "server-only";

const BASE = "https://api.saspay.me/api/v1";

type Json = Record<string, unknown>;

type CreateInput = {
    orderId: string;
    amount: number;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    returnUrl: string;
};

export class SasPayError extends Error {
    status: number;
    code: string | null;

    constructor(status: number, code: string | null, message: string) {
        super(message);
        this.name = "SasPayError";
        this.status = status;
        this.code = code;
    }
}

export function explainStatus(status: number): string {
    switch (status) {
        case 400:
            return "requête mal formée : corriger le code";
        case 401:
            return "clé API absente, invalide ou expirée : ne pas réessayer, vérifier la clé";
        case 403:
            return "compte suspendu, ressource d'un autre compte ou IP non autorisée";
        case 404:
            return "ressource introuvable";
        case 409:
            return "conflit d'idempotence : ne pas réexécuter sans vérifier";
        case 410:
            return "lien ou session expiré";
        case 422:
            return "opération impossible en l'état";
        case 429:
            return "trop de requêtes : espacer les appels";
        default:
            return "erreur inattendue";
    }
}

const debug = () => process.env.SASPAY_DEBUG === "true";

function buildHeaders(idempotencyKey?: string): Record<string, string> {
    const key = process.env.SASPAY_API_KEY;
    if (!key) throw new Error("SASPAY_API_KEY manquante");
    return {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    };
}

// Les réponses réussies sont enveloppées : {"success": true, "data": {...}}
function unwrap(json: unknown): Json {
    if (json && typeof json === "object") {
        const obj = json as Json;
        if (obj.data && typeof obj.data === "object") return obj.data as Json;
        return obj;
    }
    return {};
}

function errorInfo(json: unknown): { code: string | null; message: string } {
    if (json && typeof json === "object") {
        const err = (json as Json).error;
        if (err && typeof err === "object") {
            const e = err as Json;
            return {
                code: typeof e.code === "string" ? e.code : null,
                message: typeof e.message === "string" ? e.message : "",
            };
        }
    }
    return { code: null, message: "" };
}

function fail(status: number, json: unknown, where: string): never {
    const info = errorInfo(json);
    console.error(
        `[saspay] ${where} : HTTP ${status}` +
        (info.code ? ` (${info.code})` : "") +
        ` : ${explainStatus(status)}`
    );
    if (debug()) console.error("[saspay] corps :", JSON.stringify(json));
    throw new SasPayError(status, info.code, info.message || explainStatus(status));
}

export async function createCheckoutSession(input: CreateInput) {
    const res = await fetch(`${BASE}/checkout-sessions/`, {
        method: "POST",
        headers: buildHeaders(`order-${input.orderId}`),
        body: JSON.stringify({
            amount: `${input.amount}.00`,
            currency: "XOF",
            description: input.description.slice(0, 120),
            customer_email: input.customerEmail,
            customer_name: input.customerName,
            customer_phone: input.customerPhone,
            return_url: input.returnUrl,
            fee_charge_mode:
                process.env.SASPAY_FEE_MODE === "ADD_ON" ? "ADD_ON" : "DEDUCTED",
            metadata: { order_id: input.orderId },
        }),
        cache: "no-store",
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) fail(res.status, json, "création de la session");

    const data = unwrap(json);
    const id = data.id != null ? String(data.id) : "";
    const checkoutUrl =
        typeof data.checkout_url === "string" ? data.checkout_url : "";
    const slug = typeof data.slug === "string" ? data.slug : null;

    if (!id || !checkoutUrl) {
        console.error("[saspay] réponse inattendue à la création de session");
        if (debug()) console.error("[saspay] corps :", JSON.stringify(json));
        throw new SasPayError(502, null, "réponse inattendue");
    }
    if (debug()) console.log("[saspay] session créée :", id);

    return { id, slug, checkoutUrl };
}

export async function getCheckoutStatus(sessionId: string) {
    const res = await fetch(
        `${BASE}/checkout-sessions/${encodeURIComponent(sessionId)}/status/`,
        { headers: buildHeaders(), cache: "no-store" }
    );

    const json = await res.json().catch(() => null);
    if (!res.ok) fail(res.status, json, "lecture du statut");

    const data = unwrap(json);
    if (debug()) console.log("[saspay] statut brut :", JSON.stringify(data));

    const status =
        typeof data.status === "string" ? data.status.toUpperCase() : "";
    return { status };
}