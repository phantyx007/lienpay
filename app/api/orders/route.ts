import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createCheckoutSession, SasPayError } from "@/lib/saspay";
import { markOrderFailed } from "@/lib/orders";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Plafonds : ils protègent la limite de 300 requêtes par minute de ton compte SasPay.
const MAX_ORDERS_PER_MINUTE = 30;
const MAX_PENDING_PER_PHONE_PER_HOUR = 5;

export async function POST(request: Request) {
    if (!process.env.SUPABASE_SECRET_KEY) {
        console.error("[orders] SUPABASE_SECRET_KEY est vide ou absente");
        return NextResponse.json({ error: "server_config" }, { status: 500 });
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const productId = typeof body.productId === "string" ? body.productId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";

    const phoneOk = /^\+?[0-9 ]{6,20}$/.test(phone);
    if (
        !UUID.test(productId) ||
        name.length < 2 || name.length > 80 ||
        !EMAIL.test(email) || email.length > 120 ||
        !phoneOk ||
        address.length < 3 || address.length > 200
    ) {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    // Garde-fous contre les envois en rafale
    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

    const { count: lastMinute } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", minuteAgo);
    if ((lastMinute ?? 0) >= MAX_ORDERS_PER_MINUTE) {
        console.error("[orders] plafond par minute atteint");
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { count: pendingForPhone } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_phone", phone)
        .eq("status", "pending")
        .gte("created_at", hourAgo);
    if ((pendingForPhone ?? 0) >= MAX_PENDING_PER_PHONE_PER_HOUR) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    // Le prix est lu dans la base : on ne fait jamais confiance au navigateur.
    const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id, slug, name, price, seller_id")
        .eq("id", productId)
        .maybeSingle();

    if (productError) {
        console.error("[orders] lecture du produit :", productError.message);
        return NextResponse.json({ error: "product_read_failed" }, { status: 500 });
    }
    if (!product) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
            product_id: product.id,
            product_slug: product.slug,
            product_name: product.name,
            seller_id: product.seller_id,
            amount: product.price,
            currency: "XOF",
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            delivery_address: address,
            status: "pending",
            delivery_status: "to_prepare",
        })
        .select("id")
        .single();

    if (orderError || !order) {
        console.error("[orders] création de la commande :", orderError?.message);
        return NextResponse.json({ error: "order_failed" }, { status: 500 });
    }

    // Sans clé SasPay (développement local), on garde le paiement simulé.
    if (!process.env.SASPAY_API_KEY) {
        return NextResponse.json({ orderId: order.id });
    }

    const origin =
        process.env.APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;

    try {
        const session = await createCheckoutSession({
            orderId: order.id,
            amount: product.price,
            description: `Commande ${product.name}`,
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            returnUrl: `${origin}/commande/${order.id}`,
        });

        const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({ saspay_session_id: session.id, saspay_slug: session.slug })
            .eq("id", order.id);

        if (updateError) throw new Error(updateError.message);

        return NextResponse.json({
            orderId: order.id,
            checkoutUrl: session.checkoutUrl,
        });
    } catch (e) {
        // Pas de réessai automatique : la commande est marquée échouée.
        await markOrderFailed(order.id).catch(() => { });
        if (e instanceof SasPayError) {
            return NextResponse.json(
                { error: "payment_unavailable" },
                { status: e.status === 429 ? 429 : 502 }
            );
        }
        console.error("[orders] erreur :", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
    }
}