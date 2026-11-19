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

export function formatPrice(amount: number) {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}