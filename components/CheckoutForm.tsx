"use client";

import { useMemo, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import {
    buildPhone,
    getCountryOptions,
    getPhoneExample,
} from "@/lib/countries";

type Labels = {
    title: string;
    name: string;
    phone: string;
    phoneHint: string;
    country: string;
    address: string;
    pay: string;
    fieldsError: string;
    error: string;
};

export default function CheckoutForm({
    productId,
    lang,
    labels,
}: {
    productId: string;
    lang: "fr" | "en";
    labels: Labels;
}) {
    const [name, setName] = useState("");
    const [countryCode, setCountryCode] = useState<CountryCode>("TG");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);

    const { africa, abroad } = useMemo(() => getCountryOptions(lang), [lang]);
    const example = useMemo(() => getPhoneExample(countryCode), [countryCode]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrorText("");

        const fullPhone = buildPhone(countryCode, phone);
        if (!fullPhone) {
            setErrorText(labels.fieldsError);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, name, phone: fullPhone, address }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 400) {
                setErrorText(labels.fieldsError);
                setLoading(false);
                return;
            }
            if (!res.ok || !data.orderId) throw new Error("order_failed");
            window.location.href = `/commande/${data.orderId}`;
        } catch {
            setErrorText(labels.error);
            setLoading(false);
        }
    }

    return (
        <form onSubmit={submit} className="mt-6 space-y-4">
            <p className="text-sm font-semibold">{labels.title}</p>

            <div>
                <label className="text-sm font-medium">{labels.name}</label>
                <input
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
            </div>

            <div>
                <label className="text-sm font-medium">{labels.phone}</label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <select
                        aria-label={labels.country}
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value as CountryCode)}
                        className="w-full shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2.5 sm:w-48"
                    >
                        {africa.map((c) => (
                            <option key={c.code} value={c.code}>
                                +{c.dial} {c.name}
                            </option>
                        ))}
                        <option disabled>──────────</option>
                        {abroad.map((c) => (
                            <option key={c.code} value={c.code}>
                                +{c.dial} {c.name}
                            </option>
                        ))}
                    </select>
                    <input
                        required
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={example}
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5"
                    />
                </div>
                <p className="mt-1 text-xs text-gray-500">{labels.phoneHint}</p>
            </div>

            <div>
                <label className="text-sm font-medium">{labels.address}</label>
                <input
                    required
                    maxLength={200}
                    autoComplete="street-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"
                />
            </div>

            <p translate="no" className="text-sm text-red-600">
                {errorText}
            </p>

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
                {labels.pay}
            </button>
        </form>
    );
}