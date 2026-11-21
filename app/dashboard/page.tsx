"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useT } from "@/components/LanguageProvider";
import ShopSetup, { type Shop } from "@/components/ShopSetup";

type MyProduct = { slug: string; name: string; price: number };

export default function DashboardPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const d = t.dashboard;

    const [userId, setUserId] = useState<string | null>(null);
    const [defaultName, setDefaultName] = useState("");
    const [shop, setShop] = useState<Shop | null>(null);
    const [products, setProducts] = useState<MyProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

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
                .select("slug, name, price")
                .eq("seller_id", user.id)
                .order("created_at", { ascending: false });

            setProducts(data ?? []);
            setLoading(false);
        }
        load();
    }, [router]);

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

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{d.title}</h1>
                        <p className="text-sm text-gray-500">{shop.name}</p>
                    </div>
                    <button onClick={logout} className="text-sm text-gray-600 underline">
                        {d.logout}
                    </button>
                </div>

                <Link
                    href="/dashboard/new"
                    className="mt-6 block rounded-lg bg-green-700 px-4 py-3 text-center font-semibold text-white"
                >
                    {d.add}
                </Link>

                <Link
                    href="/dashboard/orders"
                    className="mt-3 block rounded-lg border border-green-700 px-4 py-3 text-center font-semibold text-green-700"
                >
                    {d.orders}
                </Link>

                <div className="mt-6 space-y-3">
                    {products.length === 0 ? (
                        <p className="rounded-xl bg-white p-5 text-gray-600 shadow-sm">{d.empty}</p>
                    ) : (
                        products.map((p) => (
                            <div key={p.slug} className="rounded-xl bg-white p-5 shadow-sm">
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-gray-600">{fmt.format(p.price)} FCFA</p>
                                <p className="mt-1 break-all text-xs text-gray-400">
                                    /{shop.handle}/{p.slug}
                                </p>
                                <div className="mt-3 flex gap-4 text-sm">
                                    <button
                                        onClick={() => copyLink(p.slug)}
                                        className="font-medium text-green-700 underline"
                                    >
                                        {copied === p.slug ? d.copied : d.copy}
                                    </button>
                                    <Link
                                        href={`/${shop.handle}/${p.slug}`}
                                        className="text-gray-600 underline"
                                    >
                                        {d.view}
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}