"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, type Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; setLang: (lang: Lang) => void };

const LanguageContext = createContext<Ctx>({ lang: "fr", setLang: () => { } });

export function LanguageProvider({
    initialLang,
    children,
}: {
    initialLang: Lang;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [lang, setLangState] = useState<Lang>(initialLang);

    function setLang(next: Lang) {
        document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
        setLangState(next);
        router.refresh();
    }

    return (
        <LanguageContext.Provider value={{ lang, setLang }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useT() {
    const { lang } = useContext(LanguageContext);
    return { t: dictionaries[lang], lang };
}

export function LanguageSwitcher() {
    const { lang, setLang } = useContext(LanguageContext);
    const options: Lang[] = ["fr", "en"];

    return (
        <div
            translate="no"
            className="absolute right-3 top-3 z-50 flex overflow-hidden rounded-full border border-gray-300 bg-white text-xs font-semibold shadow-sm"
        >
            {options.map((code) => (
                <button
                    key={code}
                    type="button"
                    aria-pressed={lang === code}
                    onClick={() => setLang(code)}
                    className={`px-3 py-1 ${lang === code ? "bg-green-700 text-white" : "text-gray-600"
                        }`}
                >
                    {code.toUpperCase()}
                </button>
            ))}
        </div>
    );
}