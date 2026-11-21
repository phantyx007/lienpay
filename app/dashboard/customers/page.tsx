"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useT } from "@/components/LanguageProvider";

type OrderRow = {
    customer_name: string | null;
    customer_phone: string | null;
    delivery_address: string | null;
    amount: number;
    created_at: string;
};

type Customer = {
    key: string;
    name: string;
    otherNames: string[];
    phone: string;
    address: string;
    orders: number;
    total: number;
    lastOrder: string;
};

type Acc = {
    key: string;
    names: string[];
    phone: string;
    address: string;
    orders: number;
    total: number;
    lastOrder: string;
};

function phoneKey(phone: string) {
    return phone.replace(/\D/g, "").replace(/^00/, "");
}

function whatsappLink(phone: string) {
    const trimmed = phone.trim();
    if (!trimmed.startsWith("+") && !trimmed.startsWith("00")) return null;
    const digits = phoneKey(trimmed);
    return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export default function CustomersPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const p = t.customersPage;

    const [rows, setRows] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabaseBrowser.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }

            const { data, error } = await supabaseBrowser
                .from("orders")
                .select("customer_name, customer_phone, delivery_address, amount, created_at")
                .eq("seller_id", user.id)
                .eq("status", "paid")
                .order("created_at", { ascending: false })
                .limit(1000);

            if (error) setLoadError(true);
            else setRows((data as OrderRow[]) ?? []);
            setLoading(false);
        }
        load();
    }, [router]);

    const customers = useMemo(() => {
        const map = new Map<string, Acc>();

        // Les commandes arrivent de la plus récente à la plus ancienne :
        // la première rencontrée donne l'adresse et la date les plus récentes.
        for (const r of rows) {
            const phone = (r.customer_phone ?? "").trim();
            const key = phoneKey(phone) || phone;
            const name = (r.customer_name ?? "").trim();

            let acc = map.get(key);
            if (!acc) {
                acc = {
                    key,
                    names: [],
                    phone,
                    address: r.delivery_address ?? "",
                    orders: 0,
                    total: 0,
                    lastOrder: r.created_at,
                };
                map.set(key, acc);
            }

            acc.orders += 1;
            acc.total += r.amount;

            const known = acc.names.some((n) => n.toLowerCase() === name.toLowerCase());
            if (name && !known) acc.names.push(name);
        }

        const list: Customer[] = Array.from(map.values()).map((a) => {
            // Les noms sont classés du plus récent au plus ancien :
            // le nom principal est celui de la toute première commande.
            const main = a.names.length > 0 ? a.names[a.names.length - 1] : "";
            return {
                key: a.key,
                name: main,
                otherNames: a.names.slice(0, -1),
                phone: a.phone,
                address: a.address,
                orders: a.orders,
                total: a.total,
                lastOrder: a.lastOrder,
            };
        });

        return list.sort((a, b) => b.total - a.total);
    }, [rows]);

    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const filtered = q
        ? customers.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.otherNames.some((n) => n.toLowerCase().includes(q)) ||
                (qDigits !== "" && phoneKey(c.phone).includes(qDigits))
        )
        : customers;

    const repeatCount = customers.filter((c) => c.orders >= 2).length;
    const fmt = new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR");
    const dateLocale = lang === "en" ? "en-GB" : "fr-FR";

    if (loading) {
        return (
            <main translate="no" className="p-6 text-gray-600">
                {p.loading}
            </main>
        );
    }

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-2xl font-bold">{p.title}</h1>
                <Link
                    href="/dashboard"
                    className="mt-1 block text-sm text-gray-600 underline"
                >
                    {p.back}
                </Link>

                {loadError && (
                    <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                        {p.loadError}
                    </p>
                )}

                {!loadError && customers.length === 0 && (
                    <p className="mt-6 rounded-xl bg-white p-5 text-gray-600 shadow-sm">
                        {p.empty}
                    </p>
                )}

                {customers.length > 0 && (
                    <>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                                <p className="text-2xl font-bold">{customers.length}</p>
                                <p className="text-xs text-gray-500">{p.customersCount}</p>
                            </div>
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                                <p className="text-2xl font-bold">{repeatCount}</p>
                                <p className="text-xs text-gray-500">{p.repeatCustomers}</p>
                            </div>
                        </div>

                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={p.search}
                            className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                        />

                        <div className="mt-4 space-y-3">
                            {filtered.length === 0 ? (
                                <p className="rounded-xl bg-white p-5 text-gray-600 shadow-sm">
                                    {p.noResult}
                                </p>
                            ) : (
                                filtered.map((c) => {
                                    const wa = whatsappLink(c.phone);
                                    return (
                                        <div key={c.key} className="rounded-xl bg-white p-5 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold">{c.name}</p>
                                                    <p className="text-sm text-gray-600">{c.phone}</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="font-bold text-green-700">
                                                        {fmt.format(c.total)} FCFA
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {c.orders} {c.orders === 1 ? p.orderOne : p.orderMany}
                                                    </p>
                                                </div>
                                            </div>

                                            {c.otherNames.length > 0 && (
                                                <p className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                                                    {p.otherNames} : {c.otherNames.join(", ")}
                                                </p>
                                            )}

                                            <p className="mt-2 text-sm text-gray-600">{c.address}</p>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {p.lastOrder} :{" "}
                                                {new Date(c.lastOrder).toLocaleDateString(dateLocale)}
                                            </p>

                                            {wa && (
                                                <a
                                                    href={wa}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-3 inline-block rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700"
                                                >
                                                    {p.whatsapp}
                                                </a>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}