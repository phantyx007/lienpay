"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { compressImage, IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/image";
import { friendlyError } from "@/lib/i18n";
import { useT } from "@/components/LanguageProvider";

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams<{ slug: string }>();
    const slug = params.slug;
    const { t, lang } = useT();
    const n = t.newProduct;
    const ep = t.editProduct;

    const [userId, setUserId] = useState<string | null>(null);
    const [handle, setHandle] = useState("");
    const [origin, setOrigin] = useState("");
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [removeCurrent, setRemoveCurrent] = useState(false);
    const [newFile, setNewFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setOrigin(window.location.origin);
        async function load() {
            const {
                data: { user },
            } = await supabaseBrowser.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }
            setUserId(user.id);

            const { data: shop } = await supabaseBrowser
                .from("shops")
                .select("handle")
                .eq("seller_id", user.id)
                .maybeSingle();
            if (!shop) {
                router.replace("/dashboard");
                return;
            }
            setHandle(shop.handle);

            const { data: product } = await supabaseBrowser
                .from("products")
                .select("name, price, image_path")
                .eq("seller_id", user.id)
                .eq("slug", slug)
                .maybeSingle();

            if (!product) {
                setNotFound(true);
                setLoading(false);
                return;
            }
            setName(product.name);
            setPrice(String(product.price));
            setCurrentImage(product.image_path ?? null);
            setLoading(false);
        }
        load();
    }, [router, slug]);

    function onFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
        setMessage("");
        if (preview) URL.revokeObjectURL(preview);
        const f = ev.target.files?.[0] ?? null;
        if (!f) {
            setNewFile(null);
            setPreview(null);
            return;
        }
        if (!IMAGE_TYPES.includes(f.type) || f.size > MAX_IMAGE_SIZE) {
            setMessage(n.imageInvalid);
            ev.target.value = "";
            setNewFile(null);
            setPreview(null);
            return;
        }
        setNewFile(f);
        setPreview(URL.createObjectURL(f));
        setRemoveCurrent(false);
    }

    function removeImage() {
        if (preview) URL.revokeObjectURL(preview);
        setNewFile(null);
        setPreview(null);
        setRemoveCurrent(true);
        if (fileRef.current) fileRef.current.value = "";
    }

    async function handleSubmit(ev: React.FormEvent) {
        ev.preventDefault();
        setMessage("");
        if (!userId) return;

        const amount = Number(price);
        if (!Number.isInteger(amount) || amount <= 0) {
            setMessage(n.priceError);
            return;
        }
        if (name.trim().length < 1) return;

        setSaving(true);

        let nextImage: string | null = removeCurrent ? null : currentImage;
        let uploadedPath: string | null = null;

        if (newFile) {
            try {
                const blob = await compressImage(newFile);
                uploadedPath = `${userId}/${crypto.randomUUID()}.jpg`;
                const { error: uploadError } = await supabaseBrowser.storage
                    .from("product-images")
                    .upload(uploadedPath, blob, {
                        contentType: "image/jpeg",
                        cacheControl: "31536000",
                    });
                if (uploadError) throw uploadError;
                nextImage = uploadedPath;
            } catch {
                setSaving(false);
                setMessage(n.imageError);
                return;
            }
        }

        const { data, error } = await supabaseBrowser
            .from("products")
            .update({ name: name.trim(), price: amount, image_path: nextImage })
            .eq("seller_id", userId)
            .eq("slug", slug)
            .select("slug");

        if (error || !data || data.length === 0) {
            if (uploadedPath) {
                await supabaseBrowser.storage.from("product-images").remove([uploadedPath]);
            }
            setSaving(false);
            setMessage(error ? friendlyError(error.message, lang) : ep.saveError);
            return;
        }

        if (currentImage && nextImage !== currentImage) {
            await supabaseBrowser.storage.from("product-images").remove([currentImage]);
        }

        router.push("/dashboard");
    }

    if (loading) {
        return (
            <main translate="no" className="p-6 text-gray-600">
                {ep.loading}
            </main>
        );
    }

    if (notFound) {
        return (
            <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
                <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                    <p className="text-gray-700">{ep.notFound}</p>
                    <Link
                        href="/dashboard"
                        className="mt-4 block text-center text-sm text-gray-600 underline"
                    >
                        {ep.back}
                    </Link>
                </div>
            </main>
        );
    }

    const shownImage =
        preview ??
        (currentImage && !removeCurrent
            ? supabaseBrowser.storage.from("product-images").getPublicUrl(currentImage)
                .data.publicUrl
            : null);

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold">{ep.title}</h1>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium">{n.name}</label>
                        <input
                            required
                            value={name}
                            onChange={(ev) => setName(ev.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">{n.image}</label>
                        {shownImage && (
                            <img
                                src={shownImage}
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
                                className="rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700"
                            >
                                {shownImage ? n.changeImage : n.addImage}
                            </button>
                            {shownImage && (
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-700"
                                >
                                    {n.removeImage}
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{n.imageHint}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium">{n.link}</label>
                        <p className="mt-1 break-all rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                            {origin}/{handle}/{slug}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{ep.linkFixed}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium">{n.price}</label>
                        <input
                            required
                            inputMode="numeric"
                            value={price}
                            onChange={(ev) => setPrice(ev.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                        <p className="mt-1 text-xs text-gray-500">{ep.priceNote}</p>
                    </div>

                    <p className="text-sm text-red-600">{message}</p>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
                    >
                        {saving ? ep.wait : ep.save}
                    </button>
                </form>

                <Link
                    href="/dashboard"
                    className="mt-4 block text-center text-sm text-gray-600 underline"
                >
                    {ep.back}
                </Link>
            </div>
        </main>
    );
}