export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm font-semibold text-green-700">
          Pour les vendeurs WhatsApp et Instagram
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">
          Encaissez vos ventes avec un simple lien.
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Envoyez un lien de paiement à votre cliente dans la conversation.
          Elle paie par mobile money ou par carte, et vous êtes prévenue
          automatiquement. Fini les fausses captures d’écran.
        </p>

        <div className="mt-8 rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Exemple de produit</p>
          <h2 className="mt-1 text-xl font-semibold">Robe bleue</h2>
          <p className="mt-1 text-2xl font-bold">15 000 FCFA</p>
          <button className="mt-4 w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white">
            Payer maintenant
          </button>
          <p className="mt-3 text-center text-xs text-gray-500">
            Mobile money · Carte bancaire
          </p>
        </div>
      </section>
    </main>
  );
}