export function slugify(text: string, max: number) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, max)
        .replace(/-+$/g, "");
}

export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;