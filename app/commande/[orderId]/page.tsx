import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { markOrderPaid, markOrderFailed, syncOrderWithSaspay } from "@/lib/orders";
import { getLang } from "@/lib/lang-server";
import { dictionaries } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Simulation de paiement : désactivée en production et sans la variable dédiée.
async function simulate(formData: FormData) {
    "use server";
    if (
        process.env.NODE_ENV === "production" ||
        process.env.ENABLE_PAYMENT_SIMULATOR !== "true"
    ) {
        return;
    }

    const orderId = String(formData.get("orderId") ?? "");
    const outcome = String(formData.get("outcome") ?? "");
    if (!UUID.test(orderId)) return;

    if (outcome === "paid") await markOrderPaid(orderId);
    if (outcome === "failed") await markOrderFailed(orderId);

    revalidatePath(`/commande/${orderId}`);
}

export default async function OrderPage({
    params,
}: {
    params: Promise<{ orderId: string }>;
}) {
    const { orderId } = await params;
    if (!UUID.test(orderId)) notFound();

    const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, product_name, product_slug, seller_id, amount, status, saspay_session_id")
        .eq("id", orderId)
        .maybeSingle();

    if (!order) notFound();

    // Le statut affiché est toujours revérifié auprès de SasPay :
    // la redirection de retour seule ne prouve rien.
    let status: string = order.status;
    if (order.saspay_session_id && (status === "pending" || status === "failed")) {
        try {
            status = await syncOrderWithSaspay({
                id: order.id,
                saspay_session_id: order.saspay_session_id,
                status,
            });
        } catch (e) {
            console.error("[commande] vérification impossible :", e instanceof Error ? e.message : e);
        }
    }

    // Lien pour réessayer : retour à la page du produit.
    let retryHref: string | null = null;
    if (status === "failed" && order.seller_id && order.product_slug) {
        const { data: shop } = await supabaseAdmin
            .from("shops")
            .select("handle")
            .eq("seller_id", order.seller_id)
            .maybeSingle();
        if (shop) retryHref = `/${shop.handle}/${order.product_slug}`;
    }

    const lang = await getLang();
    const t = dictionaries[lang].order;
    const amount =
        new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR").format(order.amount) +
        " FCFA";

    const labels: Record<string, string> = {
        pending: t.pending,
        paid: t.paid,
        failed: t.failed,
        canceled: t.canceled,
    };
    const messages: Record<string, string> = {
        pending: t.pendingMessage,
        paid: t.paidMessage,
        failed: t.failedMessage,
        canceled: t.canceled,
    };
    const colors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        paid: "bg-green-100 text-green-800",
        failed: "bg-red-100 text-red-800",
        canceled: "bg-gray-100 text-gray-700",
    };

    const showTools =
        process.env.NODE_ENV !== "production" &&
        process.env.ENABLE_PAYMENT_SIMULATOR === "true" &&
        status === "pending";

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">{t.title}</p>
                <h1 className="mt-1 text-2xl font-bold">{order.product_name}</h1>
                <p className="mt-2 text-3xl font-bold">{amount}</p>

                <p
                    className={`mt-4 inline-block rounded-full px-3 py-1 text-sm font-semibold ${colors[status] ?? colors.pending}`}
                >
                    {labels[status] ?? labels.pending}
                </p>
                <p className="mt-3 text-gray-600">{messages[status] ?? messages.pending}</p>

                {retryHref && (
                    <Link
                        href={retryHref}
                        className="mt-5 block rounded-lg bg-green-700 px-4 py-3 text-center font-semibold text-white"
                    >
                        {t.retry}
                    </Link>
                )}

                {showTools && (
                    <form action={simulate} className="mt-6 rounded-lg border border-dashed border-gray-300 p-4">
                        <p className="text-xs font-semibold text-gray-500">{t.testTitle}</p>
                        <input type="hidden" name="orderId" value={order.id} />
                        <div className="mt-3 flex gap-3">
                            <button
                                type="submit"
                                name="outcome"
                                value="paid"
                                className="flex-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"
                            >
                                {t.testPaid}
                            </button>
                            <button
                                type="submit"
                                name="outcome"
                                value="failed"
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
                            >
                                {t.testFailed}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}