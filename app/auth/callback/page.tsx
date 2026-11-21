"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
            router.replace(session ? "/dashboard" : "/login");
        });
    }, [router]);

    return (
        <main translate="no" className="p-6 text-gray-600">
            ...
        </main>
    );
}