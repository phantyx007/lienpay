"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useT } from "@/components/LanguageProvider";

type PaymentStatus = "pending" | "paid" | "failed" | "canceled";
type DeliveryStatus = "to_prepare" | "shipped" | "delivered" | "canceled";

type Order = {
    id: string;
    product_name: string | null;
    amount: number;
    customer_name: string | null;
    customer_phone: string | null;
    delivery_address: string | null;
    status: PaymentStatus;
    delivery_status: DeliveryStatus;
    created_at: string;
};

export default function OrdersPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const o = t.ordersPage;

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState("");

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabaseBrowser.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }
            const { data } = await supabaseBrowser
                .from("orders")
                .select(
                    "id, product_name, amount, customer_name, customer_phone, delivery_address, status, delivery_status, created_at"
                )
                .eq("seller_id", user.id)
                .order("created_at", { ascending: false });

            setOrders((data as Order[]) ?? []);
            setLoading(false);
        }
        load();
    }, [router]);

    async function setDelivery(id: string, next: DeliveryStatus) {
        setErrorText("");
        const { error } = await supabaseBrowser
            .from("orders")
            .update({ delivery_status: next })
            .eq("id", id);

        if (error) {
            setErrorText(o.updateError);
            return;
        }
        setOrders((prev) =>
            prev.map((x) => (x.id === id ? { ...x, delivery_status: next } : x))
        );
    }

    const paymentLabels: Record<PaymentStatus, string> = {
        pending: o.paymentPending,
        paid: o.paymentPaid,
        failed: o.paymentFailed,
        canceled: o.paymentCanceled,
    };
    const paymentColors: Record<PaymentStatus, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        paid: "bg-green-100 text-green-800",
        failed: "bg-red-100 text-red-800",
        canceled: "bg-gray-100 text-gray-700",
    };
    const deliveryLabels: Record<DeliveryStatus, string> = {
        to_prepare: o.deliveryToPrepare,
        shipped: o.deliveryShipped,
        delivered: o.deliveryDelivered,
        canceled: o.deliveryCanceled,
    };

    const fmt = new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR");
    const dateLocale = lang === "en" ? "en-GB" : "fr-FR";

    if (loading) {
        return (
            <main translate="no" className="p-6 text-gray-600">
                {o.loading}
            </main>
        );
    }

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-2xl font-bold">{o.title}</h1>
                <Link
                    href="/dashboard"
                    className="mt-1 block text-sm text-gray-600 underline"
                >
                    {o.back}
                </Link>

                <p className="mt-3 text-sm text-red-600">{errorText}</p>

                <div className="mt-4 space-y-3">
                    {orders.length === 0 ? (
                        <p className="rounded-xl bg-white p-5 text-gray-600 shadow-sm">
                            {o.empty}
                        </p>
                    ) : (
                        orders.map((order) => (
                            <div key={order.id} className="rounded-xl bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">{order.product_name}</p>
                                        <p className="text-gray-600">{fmt.format(order.amount)} FCFA</p>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentColors[order.status]}`}
                                    >
                                        {o.payment} : {paymentLabels[order.status]}
                                    </span>
                                </div>

                                <div className="mt-3 space-y-1 text-sm text-gray-700">
                                    <p>
                                        {o.customer} : {order.customer_name}
                                    </p>
                                    <p>
                                        {o.phone} : {order.customer_phone}
                                    </p>
                                    <p>
                                        {o.address} : {order.delivery_address}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(order.created_at).toLocaleString(dateLocale)}
                                    </p>
                                </div>

                                {order.status === "paid" && (
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        <span className="text-sm font-medium">
                                            {o.delivery} : {deliveryLabels[order.delivery_status]}
                                        </span>
                                        {order.delivery_status === "to_prepare" && (
                                            <button
                                                onClick={() => setDelivery(order.id, "shipped")}
                                                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"
                                            >
                                                {o.markShipped}
                                            </button>
                                        )}
                                        {order.delivery_status === "shipped" && (
                                            <button
                                                onClick={() => setDelivery(order.id, "delivered")}
                                                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"
                                            >
                                                {o.markDelivered}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}