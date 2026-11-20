import { notFound } from "next/navigation";
import { getProduct, formatPrice } from "@/lib/products";
import { getLang } from "@/lib/lang-server";
import { dictionaries } from "@/lib/i18n";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const lang = await getLang();
  const t = dictionaries[lang].product;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">{product.seller}</p>
        <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
        <p className="mt-2 text-3xl font-bold">
          {formatPrice(product.price, lang)}
        </p>

        <CheckoutForm
          slug={product.slug}
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