import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
    console.log("[orders] requête reçue");

    if (!process.env.SUPABASE_SECRET_KEY) {
        console.error("[orders] SUPABASE_SECRET_KEY est vide ou absente");
        return NextResponse.json({ error: "server_config" }, { status: 500 });
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        console.error("[orders] corps de la requête illisible");
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";

    const phoneOk = /^\+?[0-9 ]{6,20}$/.test(phone);
    if (
        !slug || slug.length > 80 ||
        name.length < 2 || name.length > 80 ||
        !phoneOk ||
        address.length < 3 || address.length > 200
    ) {
        console.error("[orders] champs invalides");
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("slug, name, price, seller_id")
        .eq("slug", slug)
        .maybeSingle();

    if (productError) {
        console.error("[orders] lecture du produit :", productError.message);
        return NextResponse.json({ error: "product_read_failed" }, { status: 500 });
    }
    if (!product) {
        console.error("[orders] produit introuvable pour le slug :", slug);
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
            product_slug: product.slug,
            product_name: product.name,
            seller_id: product.seller_id,
            amount: product.price,
            currency: "XOF",
            customer_name: name,
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

    console.log("[orders] commande créée :", order.id);
    return NextResponse.json({ orderId: order.id });
}