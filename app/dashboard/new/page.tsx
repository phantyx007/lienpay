"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { friendlyError } from "@/lib/i18n";
import { SLUG_RE, slugify } from "@/lib/slug";
import { useT } from "@/components/LanguageProvider";

export default function NewProductPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const n = t.newProduct;

    const [shop, setShop] = useState<{ handle: string; name: string } | null>(null);
    const [origin, setOrigin] = useState("");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugEdited, setSlugEdited] = useState(false);
    const [price, setPrice] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);
        async function init() {
            const {
                data: { user },
            } = await supabaseBrowser.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }
            const { data } = await supabaseBrowser
                .from("shops")
                .select("handle, name")
                .eq("seller_id", user.id)
                .maybeSingle();
            if (!data) {
                router.replace("/dashboard");
                return;
            }
            setShop(data);
        }
        init();
    }, [router]);

    function onNameChange(value: string) {
        setName(value);
        if (!slugEdited) setSlug(slugify(value, 50));
    }

    function onSlugChange(value: string) {
        setSlugEdited(true);
        setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");
        if (!shop) return;

        const amount = Number(price);
        if (!Number.isInteger(amount) || amount <= 0) {
            setMessage(n.priceError);
            return;
        }
        if (slug.length < 2 || slug.length > 50 || !SLUG_RE.test(slug)) {
            setMessage(n.linkInvalid);
            return;
        }

        setLoading(true);
        const { error } = await supabaseBrowser.from("products").insert({
            slug,
            name: name.trim(),
            price: amount,
            seller: shop.name,
        });
        setLoading(false);

        if (error) {
            if (error.code === "23505") setMessage(n.linkTaken);
            else setMessage(friendlyError(error.message, lang));
            return;
        }
        router.push("/dashboard");
    }

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold">{n.title}</h1>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium">{n.name}</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">{n.link}</label>
                        <input
                            required
                            maxLength={50}
                            value={slug}
                            onChange={(e) => onSlugChange(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                        <p className="mt-1 text-xs text-gray-500">{n.linkHint}</p>
                        {shop && (
                            <p className="mt-2 break-all rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                                {n.preview} {origin}/{shop.handle}/{slug || "…"}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium">{n.price}</label>
                        <input
                            required
                            inputMode="numeric"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <p className="text-sm text-red-600">{message}</p>

                    <button
                        type="submit"
                        disabled={loading || !shop}
                        className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
                    >
                        {loading ? n.wait : n.submit}
                    </button>
                </form>

                <Link
                    href="/dashboard"
                    className="mt-4 block text-center text-sm text-gray-600 underline"
                >
                    {n.back}
                </Link>
            </div>
        </main>
    );
}