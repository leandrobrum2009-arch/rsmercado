// Image processor: converte imagens para WEBP, gera miniaturas (200/600),
// deduplica por SHA-256 e atualiza o registro em product_images.
//
// Entrada: POST { image_id: uuid } OU { product_id, file_name } (caminho no bucket "products")
// Saída: { data: { url, thumb_200, thumb_600, width, height, file_hash, file_size } }
import { createClient } from "npm:@supabase/supabase-js@2";
import { decode as decodeJpeg } from "npm:@jsquash/jpeg@1.5.0";
import { decode as decodePng } from "npm:@jsquash/png@3.0.1";
import { decode as decodeWebp, encode as encodeWebp } from "npm:@jsquash/webp@1.4.0";
import resize from "npm:@jsquash/resize@2.1.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "products";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function decodeImage(bytes: Uint8Array, mime: string): Promise<ImageData> {
  if (mime.includes("jpeg") || mime.includes("jpg")) return await decodeJpeg(bytes);
  if (mime.includes("png")) return await decodePng(bytes);
  if (mime.includes("webp")) return await decodeWebp(bytes);
  // fallback: try jpeg
  return await decodeJpeg(bytes);
}

async function toWebp(img: ImageData, quality = 82): Promise<Uint8Array> {
  const out = await encodeWebp(img, { quality });
  return new Uint8Array(out);
}

async function resizeTo(img: ImageData, maxW: number): Promise<ImageData> {
  if (img.width <= maxW) return img;
  const h = Math.round((img.height * maxW) / img.width);
  return await resize(img, { width: maxW, height: h, method: "lanczos3" });
}

async function uploadVariant(path: string, bytes: Uint8Array): Promise<string> {
  await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/webp",
    upsert: true,
  });
  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    let { image_id, product_id, file_name } = body as {
      image_id?: string; product_id?: string; file_name?: string;
    };

    let imageRow: any = null;
    if (image_id) {
      const { data, error } = await admin
        .from("product_images")
        .select("*")
        .eq("id", image_id)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "image_not_found" }, 404);
      imageRow = data;
      product_id = data.product_id;
      file_name = data.file_name;
    }
    if (!file_name || !product_id) return json({ error: "missing_params" }, 400);

    // Download original
    const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(file_name);
    if (dlErr || !blob) return json({ error: dlErr?.message || "download_failed" }, 500);
    const original = new Uint8Array(await blob.arrayBuffer());
    const mime = blob.type || "image/jpeg";
    const hash = await sha256Hex(original);

    // Dedup: se já existe outra imagem com mesmo hash, retorna ela
    const { data: existing } = await admin
      .from("product_images")
      .select("id,url,file_hash")
      .eq("file_hash", hash)
      .neq("id", image_id || "00000000-0000-0000-0000-000000000000")
      .limit(1)
      .maybeSingle();
    if (existing) {
      return json({ data: { duplicate: true, of: existing.id, url: existing.url } });
    }

    // Decode + gerar variantes WEBP
    const decoded = await decodeImage(original, mime);
    const mainImg = await resizeTo(decoded, 1600);
    const thumb600 = await resizeTo(decoded, 600);
    const thumb200 = await resizeTo(decoded, 200);

    const [mainBytes, t600Bytes, t200Bytes] = await Promise.all([
      toWebp(mainImg, 85),
      toWebp(thumb600, 80),
      toWebp(thumb200, 75),
    ]);

    const base = `${product_id}/${hash}`;
    const [mainUrl, t600Url, t200Url] = await Promise.all([
      uploadVariant(`${base}.webp`, mainBytes),
      uploadVariant(`${base}_600.webp`, t600Bytes),
      uploadVariant(`${base}_200.webp`, t200Bytes),
    ]);

    // Atualiza ou cria o registro
    const update = {
      file_name: `${base}.webp`,
      url: mainUrl,
      mime_type: "image/webp",
      width: mainImg.width,
      height: mainImg.height,
      file_size: mainBytes.byteLength,
      file_hash: hash,
    };

    if (image_id) {
      await admin.from("product_images").update(update).eq("id", image_id);
    }

    return json({
      data: {
        url: mainUrl,
        thumb_600: t600Url,
        thumb_200: t200Url,
        width: mainImg.width,
        height: mainImg.height,
        file_size: mainBytes.byteLength,
        file_hash: hash,
      },
    });
  } catch (e: any) {
    return json({ error: e?.message || "internal_error" }, 500);
  }
});