"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const rules = [
    { label: "Au moins 8 caractères", test: (p: string) => p.length >= 8 },
    { label: "Une lettre minuscule (a, b, c…)", test: (p: string) => /[a-z]/.test(p) },
    { label: "Une lettre majuscule (A, B, C…)", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Un chiffre (0 à 9)", test: (p: string) => /[0-9]/.test(p) },
];

export default function LoginPage() {
    const router = useRouter();
    const [shopName, setShopName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const passwordValid = rules.every((r) => r.test(password));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        if (mode === "signup" && !passwordValid) {
            setMessage("Ton mot de passe ne respecte pas encore toutes les règles ci-dessous.");
            return;
        }

        setLoading(true);

        const { error } =
            mode === "signup"
                ? await supabaseBrowser.auth.signUp({
                    email,
                    password,
                    options: { data: { shop_name: shopName.trim() } },
                })
                : await supabaseBrowser.auth.signInWithPassword({ email, password });

        setLoading(false);

        if (error) {
            setMessage(error.message);
            return;
        }
        router.push("/dashboard");
    }

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold">
                    <span>{mode === "login" ? "Connexion vendeuse" : "Créer mon compte"}</span>
                </h1>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {mode === "signup" && (
                        <div>
                            <label className="text-sm font-medium">Nom de ta boutique</label>
                            <input
                                required
                                maxLength={40}
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                                placeholder="Ex : Boutique Aïcha"
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Ce nom sera visible par tes clientes sur la page de paiement.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium">Adresse e-mail</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Mot de passe</label>
                        <div className="relative mt-1">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-24"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600 underline"
                            >
                                <span>{showPassword ? "Masquer" : "Afficher"}</span>
                            </button>
                        </div>

                        {mode === "signup" && (
                            <div className="mt-3 rounded-lg bg-gray-50 p-3">
                                <p className="text-xs font-medium text-gray-700">
                                    Choisis un mot de passe difficile à deviner :
                                </p>
                                <ul className="mt-2 space-y-1">
                                    {rules.map((r) => {
                                        const ok = r.test(password);
                                        return (
                                            <li
                                                key={r.label}
                                                className={`text-xs ${ok ? "text-green-700" : "text-gray-500"}`}
                                            >
                                                <span>{ok ? "✓" : "○"}</span> <span>{r.label}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <p className="mt-2 text-xs text-gray-500">
                                    Astuce : évite ton prénom, ton numéro de téléphone ou « 12345678 ».
                                    Ne réutilise pas le mot de passe d’un autre compte.
                                </p>
                            </div>
                        )}
                    </div>

                    {message && (
                        <p className="text-sm text-red-600">
                            <span>{message}</span>
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || (mode === "signup" && !passwordValid)}
                        className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
                    >
                        <span>
                            {loading ? "Patiente..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
                        </span>
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => {
                        setMode(mode === "login" ? "signup" : "login");
                        setMessage("");
                    }}
                    className="mt-4 w-full text-center text-sm text-gray-600 underline"
                >
                    <span>
                        {mode === "login" ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
                    </span>
                </button>
            </div>
        </main>
    );
}