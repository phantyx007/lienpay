import { notFound } from "next/navigation";
import { getProductByLink, formatPrice } from "@/lib/products";
import { getLang } from "@/lib/lang-server";
import { dictionaries } from "@/lib/i18n";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function ProductPage({
    params,
}: {
    params: Promise<{ handle: string; slug: string }>;
}) {
    const { handle, slug } = await params;
    const product = await getProductByLink(handle.toLowerCase(), slug);

    if (!product) notFound();

    const lang = await getLang();
    const t = dictionaries[lang].product;

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">{product.seller}</p>
                {product.imageUrl && (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="mb-5 aspect-square w-full rounded-xl object-cover"
                    />
                )}
                <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
                <p className="mt-2 text-3xl font-bold">
                    {formatPrice(product.price, lang)}
                </p>

                <CheckoutForm
                    productId={product.id}
                    labels={{
                        title: t.formTitle,
                        name: t.nameLabel,
                        phone: t.phoneLabel,
                        phoneHint: t.phoneHint,
                        address: t.addressLabel,
                        pay: t.pay,
                        fieldsError: t.fieldsError,
                        error: t.error,
                    }}
                />

                <p className="mt-3 text-center text-xs text-gray-500">{t.methods}</p>
            </div>
        </main>
    );
}