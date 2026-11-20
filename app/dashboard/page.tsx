"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type MyProduct = { slug: string; name: string; price: number };

export default function DashboardPage() {
    const router = useRouter();
    const [displayName, setDisplayName] = useState<string | null>(null);
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
            setDisplayName(user.user_metadata?.shop_name ?? "Ma boutique");

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
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`);
            setCopied(slug);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            setCopied(null);
        }
    }

    if (loading) {
        return <main className="p-6 text-gray-600">Chargement...</main>;
    }

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
            <div className="mx-auto max-w-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Mes produits</h1>
                        <p className="text-sm text-gray-500">
                            <span>{displayName}</span>
                        </p>
                    </div>
                    <button onClick={logout} className="text-sm text-gray-600 underline">
                        Se déconnecter
                    </button>
                </div>

                <Link
                    href="/dashboard/new"
                    className="mt-6 block rounded-lg bg-green-700 px-4 py-3 text-center font-semibold text-white"
                >
                    + Ajouter un produit
                </Link>

                <div className="mt-6 space-y-3">
                    {products.length === 0 ? (
                        <p className="rounded-xl bg-white p-5 text-gray-600 shadow-sm">
                            Tu n’as pas encore de produit. Clique sur « Ajouter un produit » pour créer le premier.
                        </p>
                    ) : (
                        products.map((p) => (
                            <div key={p.slug} className="rounded-xl bg-white p-5 shadow-sm">
                                <p className="font-semibold">
                                    <span>{p.name}</span>
                                </p>
                                <p className="text-gray-600" translate="no">
                                    {new Intl.NumberFormat("fr-FR").format(p.price)} FCFA
                                </p>
                                <p className="mt-1 break-all text-xs text-gray-400" translate="no">
                                    /p/{p.slug}
                                </p>
                                <div className="mt-3 flex gap-4 text-sm">
                                    <button
                                        onClick={() => copyLink(p.slug)}
                                        className="font-medium text-green-700 underline"
                                    >
                                        <span>{copied === p.slug ? "Lien copié !" : "Copier le lien"}</span>
                                    </button>
                                    <Link href={`/p/${p.slug}`} className="text-gray-600 underline">
                                        Voir la page
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