"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { friendlyError } from "@/lib/i18n";
import { SLUG_RE, slugify } from "@/lib/slug";
import { useT } from "@/components/LanguageProvider";

const MAX_FILE = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

async function compressImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const max = 1000;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
            "image/jpeg",
            0.8
        )
    );
}

export default function NewProductPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const n = t.newProduct;

    const [userId, setUserId] = useState<string | null>(null);
    const [shop, setShop] = useState<{ handle: string; name: string } | null>(null);
    const [origin, setOrigin] = useState("");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugEdited, setSlugEdited] = useState(false);
    const [price, setPrice] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
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

    function onNameChange(value: string) {
        setName(value);
        if (!slugEdited) setSlug(slugify(value, 50));
    }

    function onSlugChange(value: string) {
        setSlugEdited(true);
        setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMessage("");
        if (preview) URL.revokeObjectURL(preview);
        const f = e.target.files?.[0] ?? null;
        if (!f) {
            setFile(null);
            setPreview(null);
            return;
        }
        if (!TYPES.includes(f.type) || f.size > MAX_FILE) {
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
        if (slug.length < 2 || slug.length > 50 || !SLUG_RE.test(slug)) {
            setMessage(n.linkInvalid);
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

        const { error } = await supabaseBrowser.from("products").insert({
            slug,
            name: name.trim(),
            price: amount,
            seller: shop.name,
            image_path: imagePath,
        });

        if (error) {
            if (imagePath) {
                await supabaseBrowser.storage.from("product-images").remove([imagePath]);
            }
            setLoading(false);
            if (error.code === "23505") setMessage(n.linkTaken);
            else setMessage(friendlyError(error.message, lang));
            return;
        }

        setLoading(false);
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
                        <label className="text-sm font-medium">{n.image}</label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={onFileChange}
                            className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-4 file:py-2 file:font-medium file:text-green-700"
                        />
                        <p className="mt-1 text-xs text-gray-500">{n.imageHint}</p>
                        {preview && (
                            <div className="mt-3">
                                <img
                                    src={preview}
                                    alt=""
                                    className="h-32 w-32 rounded-lg object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="mt-2 text-sm text-gray-600 underline"
                                >
                                    {n.removeImage}
                                </button>
                            </div>
                        )}
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