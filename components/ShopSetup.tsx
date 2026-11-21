"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { HANDLE_RE, slugify } from "@/lib/slug";
import { useT } from "@/components/LanguageProvider";

export type Shop = { handle: string; name: string };

export default function ShopSetup({
    userId,
    defaultName,
    onCreated,
}: {
    userId: string;
    defaultName: string;
    onCreated: (shop: Shop) => void;
}) {
    const { t } = useT();
    const s = t.shopSetup;

    const [name, setName] = useState(defaultName);
    const [handle, setHandle] = useState(slugify(defaultName, 30));
    const [handleEdited, setHandleEdited] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    function onNameChange(value: string) {
        setName(value);
        if (!handleEdited) setHandle(slugify(value, 30));
    }

    function onHandleChange(value: string) {
        setHandleEdited(true);
        setHandle(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        const cleanName = name.trim();
        if (cleanName.length < 2 || cleanName.length > 40) {
            setMessage(s.nameInvalid);
            return;
        }
        if (!HANDLE_RE.test(handle)) {
            setMessage(s.handleInvalid);
            return;
        }

        setLoading(true);
        const { error } = await supabaseBrowser
            .from("shops")
            .insert({ seller_id: userId, handle, name: cleanName });
        setLoading(false);

        if (error) {
            if (error.code === "23505") setMessage(s.handleTaken);
            else if (error.code === "23514") setMessage(s.handleReserved);
            else setMessage(s.error);
            return;
        }
        onCreated({ handle, name: cleanName });
    }

    return (
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{s.title}</h1>
            <p className="mt-2 text-sm text-gray-600">{s.intro}</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                    <label className="text-sm font-medium">{s.name}</label>
                    <input
                        required
                        maxLength={40}
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium">{s.handle}</label>
                    <input
                        required
                        maxLength={30}
                        value={handle}
                        onChange={(e) => onHandleChange(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">{s.handleHint}</p>
                </div>

                <p translate="no" className="text-sm text-red-600">
                    {message}
                </p>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                    {s.submit}
                </button>
            </form>
        </div>
    );
}