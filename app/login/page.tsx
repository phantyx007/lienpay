"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { friendlyError } from "@/lib/i18n";
import { useT } from "@/components/LanguageProvider";

const rules = [
    { key: "ruleLength", test: (p: string) => p.length >= 8 },
    { key: "ruleLower", test: (p: string) => /[a-z]/.test(p) },
    { key: "ruleUpper", test: (p: string) => /[A-Z]/.test(p) },
    { key: "ruleDigit", test: (p: string) => /[0-9]/.test(p) },
] as const;

export default function LoginPage() {
    const router = useRouter();
    const { t, lang } = useT();
    const l = t.login;

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
            setMessage(l.rulesError);
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
            setMessage(friendlyError(error.message, lang));
            return;
        }
        router.push("/dashboard");
    }

    return (
        <main translate="no" className="min-h-screen bg-gray-50 px-4 py-14 text-gray-900">
            <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-bold">
                    {mode === "login" ? l.titleLogin : l.titleSignup}
                </h1>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {mode === "signup" && (
                        <div>
                            <label className="text-sm font-medium">{l.shopName}</label>
                            <input
                                required
                                maxLength={40}
                                value={shopName}
                                onChange={(e) => setShopName(e.target.value)}
                                placeholder={l.shopPlaceholder}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                            <p className="mt-1 text-xs text-gray-500">{l.shopHint}</p>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium">{l.email}</label>
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
                        <label className="text-sm font-medium">{l.password}</label>
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
                                {showPassword ? l.hide : l.show}
                            </button>
                        </div>

                        {mode === "signup" && (
                            <div className="mt-3 rounded-lg bg-gray-50 p-3">
                                <p className="text-xs font-medium text-gray-700">{l.rulesTitle}</p>
                                <ul className="mt-2 space-y-1">
                                    {rules.map((r) => {
                                        const ok = r.test(password);
                                        return (
                                            <li
                                                key={r.key}
                                                className={`text-xs ${ok ? "text-green-700" : "text-gray-500"}`}
                                            >
                                                {ok ? "✓" : "○"} {l[r.key]}
                                            </li>
                                        );
                                    })}
                                </ul>
                                <p className="mt-2 text-xs text-gray-500">{l.tip}</p>
                            </div>
                        )}
                    </div>

                    {message && <p className="text-sm text-red-600">{message}</p>}

                    <button
                        type="submit"
                        disabled={loading || (mode === "signup" && !passwordValid)}
                        className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
                    >
                        {loading ? l.wait : mode === "login" ? l.submitLogin : l.submitSignup}
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
                    {mode === "login" ? l.switchToSignup : l.switchToLogin}
                </button>
            </div>
        </main>
    );
}