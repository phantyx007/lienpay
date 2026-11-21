import { supabase } from "./supabase";

export type Product = {
    id: string;
    slug: string;
    name: string;
    price: number;
    seller: string;
    imageUrl: string | null;
};

export async function getProductByLink(
    handle: string,
    slug: string
): Promise<Product | null> {
    const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("seller_id, name")
        .eq("handle", handle)
        .maybeSingle();

    if (shopError) {
        console.error("[lien] erreur boutique :", shopError.message);
        return null;
    }
    if (!shop) return null;

    const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price, image_path")
        .eq("seller_id", shop.seller_id)
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        console.error("[lien] erreur produit :", error.message);
        return null;
    }
    if (!data) return null;

    const imageUrl = data.image_path
        ? supabase.storage.from("product-images").getPublicUrl(data.image_path).data
            .publicUrl
        : null;

    return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        price: data.price,
        seller: shop.name,
        imageUrl,
    };
}

export function formatPrice(amount: number, lang: "fr" | "en" = "fr") {
    return (
        new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR").format(amount) +
        " FCFA"
    );
}