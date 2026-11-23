import "server-only";
import { supabaseAdmin } from "./supabase-admin";
import { getCheckoutStatus } from "./saspay";

// Passe une commande à « payée ». Ne fonctionne qu'une seule fois par commande,
// même si la confirmation arrive deux fois. Une commande marquée « échouée »
// peut encore être payée (la cliente peut réessayer sur la page de paiement).
export async function markOrderPaid(orderId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", orderId)
        .in("status", ["pending", "failed"])
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

type SyncInput = {
    id: string;
    saspay_session_id: string | null;
    status: string;
};

// Interroge SasPay et met la commande à jour.
// Seul le statut exact « SUCCESS » confirme un paiement.
export async function syncOrderWithSaspay(order: SyncInput): Promise<string> {
    if (!order.saspay_session_id) return order.status;
    if (order.status !== "pending" && order.status !== "failed") return order.status;

    const { status } = await getCheckoutStatus(order.saspay_session_id);

    if (status === "SUCCESS") {
        await markOrderPaid(order.id);
        return "paid";
    }
    if (status === "FAILED" && order.status === "pending") {
        await markOrderFailed(order.id);
        return "failed";
    }
    return order.status;
}