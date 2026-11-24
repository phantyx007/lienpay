"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { friendlyError } from "@/lib/i18n";
import { slugify } from "@/lib/slug";
import { compressImage, IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/image";
import { useT } from "@/components/LanguageProvider";

export default function NewProductPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const n = t.newProduct;

    const [userId, setUserId] = useState<string | null>(null);
    const [shop, setShop] = useState<{ handle: string; name: string } | null>(null);
    const [origin, setOrigin] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState<{ slug: string; name: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

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
            setUserId(user.id);
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

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMessage("");
        if (preview) URL.revokeObjectURL(preview);
        const f = e.target.files?.[0] ?? null;
        if (!f) {
            setFile(null);
            setPreview(null);
            return;
        }
        if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_SIZE) {
            setMessage(n.imageInvalid);
            e.target.value = "";
            setFile(null);
            setPreview(null);
            return;
        }
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    function removeImage() {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");
        if (!shop || !userId) return;

        const amount = Number(price);
        if (!Number.isInteger(amount) || amount < 200) {
            setMessage(n.priceError);
            return;
        }

        setLoading(true);

        let imagePath: string | null = null;
        if (file) {
            try {
                const blob = await compressImage(file);
                imagePath = `${userId}/${crypto.randomUUID()}.jpg`;
                const { error: uploadError } = await supabaseBrowser.storage
                    .from("product-images")
                    .upload(imagePath, blob, {
                        contentType: "image/jpeg",
                        cacheControl: "31536000",
                    });
                if (uploadError) throw uploadError;
            } catch {
                setLoading(false);
                setMessage(n.imageError);
                return;
            }
        }

        // Le lien est créé automatiquement à partir du nom du produit.
        // En cas de doublon, on ajoute quatre caractères au hasard.
        const base = slugify(name, 40);
        const root = base.length >= 2 ? base : "produit";

        let createdSlug: string | null = null;
        let lastError: { code?: string; message: string } | null = null;

        for (let attempt = 0; attempt < 4; attempt++) {
            const slug =
                attempt === 0
                    ? root
                    : `${root}-${Math.random().toString(36).slice(2, 6)}`;

            const { error } = await supabaseBrowser.from("products").insert({
                slug,
                name: name.trim(),
                price: amount,
                seller: shop.name,
                image_path: imagePath,
            });

            if (!error) {
                createdSlug = slug;
                break;
            }
            lastError = error;
            if (error.code !== "23505") break;
        }

        if (!createdSlug) {
            if (imagePath) {
                await supabaseBrowser.storage.from("product-images").remove([imagePath]);
            }
            setLoading(false);
            setMessage(friendlyError(lastError?.message ?? "", lang));
            return;
        }

        setLoading(false);
        setCreated({ slug: createdSlug, name: name.trim() });
    }

    async function copyLink(link: string) {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    function addAnother() {
        removeImage();
        setName("");
        setPrice("");
        setMessage("");
        setCopied(false);
        setCreated(null);
    }

    if (created && shop) {
        const link = `${origin}/${shop.handle}/${created.slug}`;
        return (
            <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
                <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold text-green-700">{n.createdTitle}</p>
                    <h1 className="mt-1 text-2xl font-bold">{created.name}</h1>

                    <p className="mt-5 text-sm text-gray-600">{n.yourLink}</p>
                    <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-800">
                        {link}
                    </p>

                    <button
                        onClick={() => copyLink(link)}
                        className="mt-4 w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white"
                    >
                        {copied ? n.linkCopied : n.copyLink}
                    </button>

                    <Link
                        href={`/${shop.handle}/${created.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block rounded-lg border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700"
                    >
                        {n.viewPage}
                    </Link>

                    <button
                        onClick={addAnother}
                        className="mt-3 w-full rounded-lg border border-green-700 px-4 py-3 font-semibold text-green-700"
                    >
                        {n.addAnother}
                    </button>

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
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">{n.image}</label>
                        {preview && (
                            <img
                                src={preview}
                                alt=""
                                className="mt-2 h-32 w-32 rounded-lg object-cover"
                            />
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={onFileChange}
                            className="hidden"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700"
                            >
                                {preview ? n.changeImage : n.addImage}
                            </button>
                            {preview && (
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700"
                                >
                                    {n.removeImage}
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{n.imageHint}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium">{n.price}</label>
                        <input
                            required
                            inputMode="numeric"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
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