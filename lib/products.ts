import { supabase } from "./supabase";

export type Product = {
    slug: string;
    name: string;
    price: number;
    seller: string;
};

export async function getProduct(slug: string): Promise<Product | null> {
    const { data, error } = await supabase
        .from("products")
        .select("slug, name, price, seller")
        .eq("slug", slug)
        .maybeSingle();

    if (error) {
        console.error("Erreur Supabase :", error.message);
        return null;
    }
    return data;
}

export function formatPrice(amount: number, lang: "fr" | "en" = "fr") {
    return (
        new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR").format(amount) +
        " FCFA"
    );
}