"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useT } from "@/components/LanguageProvider";
import ShopSetup, { type Shop } from "@/components/ShopSetup";

type MyProduct = {
    slug: string;
    name: string;
    price: number;
    image_path: string | null;
};

export default function DashboardPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const d = t.dashboard;

    const [userId, setUserId] = useState<string | null>(null);
    const [defaultName, setDefaultName] = useState("");
    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<MyProduct[]>([]);
    const [paidOrders, setPaidOrders] = useState(0);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [confirmLogout, setConfirmLogout] = useState(false);

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabaseBrowser.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }
            setUserId(user.id);
            setDefaultName(
                user.user_metadata?.shop_name ?? user.user_metadata?.full_name ?? ""
            );

            const { data: shopData } = await supabaseBrowser
                .from("shops")
                .select("handle, name")
                .eq("seller_id", user.id)
                .maybeSingle();
            setShop(shopData ?? null);

            const { data } = await supabaseBrowser
                .from("products")
                .select("slug, name, price, image_path")
                .eq("seller_id", user.id)
                .order("created_at", { ascending: false });
            setProducts(data ?? []);

            const { count } = await supabaseBrowser
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq("seller_id", user.id)
                .eq("status", "paid");
            setPaidOrders(count ?? 0);

            setLoading(false);
        }
        load();
    }, [router]);

    useEffect(() => {
        if (!confirmLogout) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setConfirmLogout(false);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [confirmLogout]);

    async function logout() {
        await supabaseBrowser.auth.signOut();
        router.replace("/login");
    }

    async function copyLink(slug: string) {
        if (!shop) return;
        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}/${shop.handle}/${slug}`
            );
            setCopied(slug);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            setCopied(null);
        }
    }

    const fmt = new Intl.NumberFormat(lang === "en" ? "en-US" : "fr-FR");

    if (loading) {
        return (
            <main translate="no" className="p-6 text-gray-600">
                {d.loading}
            </main>
        );
    }

    if (!shop && userId) {
        return (
            <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
                <ShopSetup userId={userId} defaultName={defaultName} onCreated={setShop} />
            </main>
        );
    }

    if (!shop) return null;

    const initial = (Array.from(shop.name.trim())[0] ?? "?").toUpperCase();

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-2xl">
                <div className="rounded-2xl bg-green-800 p-5 text-white shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                            {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs uppercase tracking-wide text-green-100">
                                {d.subtitle}
                            </p>
                            <h1 className="truncate text-2xl font-bold">{shop.name}</h1>
                            <p className="truncate text-sm text-green-100">@{shop.handle}</p>
                        </div>
                        <button
                            onClick={() => setConfirmLogout(true)}
                            className="shrink-0 rounded-full border border-white/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
                        >
                            {d.logout}
                        </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/10 p-3">
                            <p className="text-2xl font-bold">{products.length}</p>
                            <p className="text-xs text-green-100">{d.productsCount}</p>
                        </div>
                        <div className="rounded-xl bg-white/10 p-3">
                            <p className="text-2xl font-bold">{paidOrders}</p>
                            <p className="text-xs text-green-100">{d.paidOrders}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link
                        href="/dashboard/new"
                        className="rounded-lg bg-green-700 px-4 py-3 text-center font-semibold text-white"
                    >
                        {d.add}
                    </Link>
                    <Link
                        href="/dashboard/orders"
                        className="rounded-lg border border-green-700 bg-white px-4 py-3 text-center font-semibold text-green-700"
                    >
                        {d.orders}
                    </Link>
                </div>

                <h2 className="mt-8 text-lg font-bold">{d.title}</h2>

                <div className="mt-3 space-y-3">
                    {products.length === 0 ? (
                        <p className="rounded-xl bg-white p-5 text-gray-600 shadow-sm">{d.empty}</p>
                    ) : (
                        products.map((p) => (
                            <div key={p.slug} className="rounded-xl bg-white p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    {p.image_path && (
                                        <img
                                            src={
                                                supabaseBrowser.storage
                                                    .from("product-images")
                                                    .getPublicUrl(p.image_path).data.publicUrl
                                            }
                                            alt=""
                                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                                        />
                                    )}
                                    <p className="min-w-0 flex-1 font-semibold">{p.name}</p>
                                    <p className="shrink-0 font-bold text-green-700">
                                        {fmt.format(p.price)} FCFA
                                    </p>
                                </div>

                                <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                                    /{shop.handle}/{p.slug}
                                </p>

                                <div className="mt-3 flex gap-3 text-sm">
                                    <button
                                        onClick={() => copyLink(p.slug)}
                                        className="rounded-full bg-green-50 px-4 py-1.5 font-medium text-green-700"
                                    >
                                        {copied === p.slug ? d.copied : d.copy}
                                    </button>
                                    <Link
                                        href={`/${shop.handle}/${p.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-full border border-gray-300 px-4 py-1.5 text-gray-700"
                                    >
                                        {d.view}
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {confirmLogout && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setConfirmLogout(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-title"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                    >
                        <h2 id="logout-title" className="text-lg font-bold">
                            {d.logoutTitle}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">{d.logoutText}</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setConfirmLogout(false)}
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700"
                            >
                                {d.cancel}
                            </button>
                            <button
                                onClick={logout}
                                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white"
                            >
                                {d.logoutConfirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}