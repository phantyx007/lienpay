import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";

    const phoneOk = /^\+?[0-9 ]{6,20}$/.test(phone);
    if (
        !UUID.test(productId) ||
        name.length < 2 || name.length > 80 ||
        !phoneOk ||
        address.length < 3 || address.length > 200
    ) {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
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

    return NextResponse.json({ orderId: order.id });
}