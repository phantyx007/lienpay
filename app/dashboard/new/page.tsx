"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

function makeSlug(name: string) {
    const base = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base || "produit"}-${suffix}`;
}

export default function NewProductPage() {
    const router = useRouter();
    const [shop, setShop] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function init() {
            const {
                data: { user },
            } = await supabaseBrowser.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }
            setShop(user.user_metadata?.shop_name ?? "");
        }
        init();
    }, [router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const amount = Number(price);
        if (!Number.isInteger(amount) || amount <= 0) {
            setMessage("Le prix doit être un nombre entier supérieur à 0.");
            return;
        }

        setLoading(true);
        const { error } = await supabaseBrowser.from("products").insert({
            slug: makeSlug(name),
            name: name.trim(),
            price: amount,
            seller: shop.trim(),
        });
        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }
        router.push("/dashboard");
    }

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold">Nouveau produit</h1>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium">Nom de ta boutique</label>
                        <input
                            required
                            value={shop}
                            onChange={(e) => setShop(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Nom du produit</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Prix (FCFA)</label>
                        <input
                            required
                            inputMode="numeric"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </div>

                    {message && (
                        <p className="text-sm text-red-600">
                            <span>{message}</span>
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
                    >
                        <span>{loading ? "Patiente..." : "Créer le produit"}</span>
                    </button>
                </form>

                <Link
                    href="/dashboard"
                    className="mt-4 block text-center text-sm text-gray-600 underline"
                >
                    Retour à mes produits
                </Link>
            </div>
        </main>
    );
}