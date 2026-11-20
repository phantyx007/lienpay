"use client";

import { useState } from "react";

type Labels = {
    title: string;
    name: string;
    phone: string;
    phoneHint: string;
    address: string;
    pay: string;
    fieldsError: string;
    error: string;
};

export default function CheckoutForm({
    slug,
    labels,
}: {
    slug: string;
    labels: Labels;
}) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [errorText, setErrorText] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrorText("");
        setLoading(true);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, name, phone, address }),
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
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
            </div>

            <div>
                <label className="text-sm font-medium">{labels.phone}</label>
                <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={labels.phoneHint}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
            </div>

            <div>
                <label className="text-sm font-medium">{labels.address}</label>
                <input
                    required
                    maxLength={200}
                    autoComplete="street-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
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