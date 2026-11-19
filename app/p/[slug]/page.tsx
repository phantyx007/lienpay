import { notFound } from "next/navigation";
import { getProduct, formatPrice } from "@/lib/products";
export const dynamic = "force-dynamic";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">{product.seller}</p>
        <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
        <p className="mt-2 text-3xl font-bold">{formatPrice(product.price)}</p>

        <button className="mt-6 w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white">
          Payer maintenant
        </button>
        <p className="mt-3 text-center text-xs text-gray-500">
          Mobile money · Carte bancaire
        </p>
      </div>
    </main>
  );
}