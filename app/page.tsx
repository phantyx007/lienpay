import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { dictionaries } from "@/lib/i18n";

export default async function Home() {
  const lang = await getLang();
  const t = dictionaries[lang].home;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm font-semibold text-green-700">{t.tag}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">{t.title}</h1>
        <p className="mt-4 text-lg text-gray-600">{t.text}</p>

        <div className="mt-8 rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">{t.example}</p>
          <h2 className="mt-1 text-xl font-semibold">{t.product}</h2>
          <p className="mt-1 text-2xl font-bold">15 000 FCFA</p>
          <button className="mt-4 w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white">
            {t.pay}
          </button>
          <p className="mt-3 text-center text-xs text-gray-500">{t.methods}</p>
        </div>

        <Link
          href="/login"
          className="mt-8 block text-center text-sm text-gray-600 underline"
        >
          {t.sellerArea}
        </Link>
      </section>
    </main>
  );
}