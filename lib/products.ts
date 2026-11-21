import { supabase } from "./supabase";

export type Product = {
    id: string;
    slug: string;
    name: string;
    price: number;
    seller: string;
};

export async function getProductByLink(
    handle: string,
    slug: string
): Promise<Product | null> {
    console.log("[lien] recherche :", { handle, slug });

    const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("seller_id, name")
        .eq("handle", handle)
        .maybeSingle();

    if (shopError) {
        console.error("[lien] erreur boutique :", shopError.message);
        return null;
    }
    if (!shop) {
        console.error("[lien] aucune boutique avec l'adresse :", handle);
        return null;
    }

    const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price")
        .eq("seller_id", shop.seller_id)
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        console.error("[lien] erreur produit :", error.message);
        return null;
    }
    if (!data) {
        console.error("[lien] aucun produit avec le lien :", slug);
        return null;
    }

    return { ...data, seller: shop.name };
}

export function formatPrice(amount: number, lang: "fr" | "en" = "fr") {
    return (
        new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR").format(amount) +
        " FCFA"
    );
}