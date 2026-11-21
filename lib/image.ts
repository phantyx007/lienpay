export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function compressImage(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const max = 1000;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
            "image/jpeg",
            0.8
        )
    );
}