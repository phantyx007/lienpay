import "server-only";
import { supabaseAdmin } from "./supabase-admin";

// Passe une commande à « payée ». Ne fonctionne qu'une seule fois par commande,
// même si la confirmation arrive deux fois.
export async function markOrderPaid(orderId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return Boolean(data);
}

export async function markOrderFailed(orderId: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from("orders")
        .update({ status: "failed" })
        .eq("id", orderId)
        .eq("status", "pending");

    if (error) throw new Error(error.message);
}