import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncOrderWithSaspay } from "@/lib/orders";
import { SasPayError } from "@/lib/saspay";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 1) l'horloge ne doit pas s'écarter de plus de 300 secondes ;
// 2) la signature est calculée sur le corps brut : "{timestamp}.{corps}".
function signatureIsValid(raw: string, signature: string, timestamp: string, secret: string) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const expected = createHmac("sha256", secret)
        .update(`${timestamp}.${raw}`)
        .digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
    const secret = process.env.SASPAY_WEBHOOK_SECRET;
    if (!secret) {
        console.error("[webhook] SASPAY_WEBHOOK_SECRET manquante");
        return NextResponse.json({ error: "server_config" }, { status: 500 });
    }

    const raw = await request.text();
    const signature = request.headers.get("x-webhook-signature") ?? "";
    const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
    const event = request.headers.get("x-webhook-event") ?? "";

    if (!signatureIsValid(raw, signature, timestamp, secret)) {
        console.error("[webhook] signature invalide ou message trop ancien");
        return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    let payload: unknown = null;
    try {
        payload = JSON.parse(raw);
    } catch {
        payload = null;
    }

    // On répond tout de suite (2xx), puis on traite en arrière-plan.
    after(async () => {
        const { error: logError } = await supabaseAdmin
            .from("webhook_events")
            .insert({ event, signature_ok: true, payload });
        if (logError) console.error("[webhook] journal :", logError.message);

        if (!event.startsWith("transaction.")) return;

        // Le message sert de signal : chaque commande est revérifiée auprès de SasPay.
        const data =
            payload && typeof payload === "object"
                ? ((payload as Record<string, unknown>).data as Record<string, unknown> | undefined)
                : undefined;
        const metadata =
            data && typeof data.metadata === "object"
                ? (data.metadata as Record<string, unknown>)
                : undefined;
        const orderId =
            metadata && typeof metadata.order_id === "string" && UUID.test(metadata.order_id)
                ? metadata.order_id
                : null;

        let query = supabaseAdmin
            .from("orders")
            .select("id, saspay_session_id, status")
            .not("saspay_session_id", "is", null)
            .in("status", ["pending", "failed"]);

        if (orderId) {
            query = query.eq("id", orderId);
        } else {
            const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
            query = query
                .gte("created_at", since)
                .order("created_at", { ascending: false })
                .limit(20);
        }

        const { data: orders } = await query;
        for (const o of orders ?? []) {
            try {
                await syncOrderWithSaspay(o);
            } catch (e) {
                // Sur un 429, on s'arrête : on n'insiste pas.
                if (e instanceof SasPayError && e.status === 429) break;
                console.error("[webhook] vérification impossible :", e instanceof Error ? e.message : e);
            }
        }
    });

    return NextResponse.json({ ok: true });
}