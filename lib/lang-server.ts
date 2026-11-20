import { cookies, headers } from "next/headers";
import { resolveLang, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
    const cookieStore = await cookies();
    const headerStore = await headers();
    return resolveLang(
        cookieStore.get("lang")?.value,
        headerStore.get("accept-language")
    );
}