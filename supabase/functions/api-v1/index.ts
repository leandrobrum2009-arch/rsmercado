// API REST v1 - Produtos, Estoque, Preços, Imagens, Categorias, Webhooks
// Autenticação por API Key (Bearer ou X-API-KEY) com permissões, rate limit e logs.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// =========== Helpers ===========
function uuid() {
  return crypto.randomUUID();
}

function json(body: unknown, init: ResponseInit = {}, requestId?: string) {
  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
    ...(requestId ? { "X-Request-Id": requestId } : {}),
    ...(init.headers || {}),
  };
  return new Response(JSON.stringify(body), { ...init, headers });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
) {
  return json(
    { error: { code, message, details, request_id: requestId } },
    { status },
    requestId,
  );
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// =========== Rate Limit (token bucket em memória) ===========
const buckets = new Map<string, { tokens: number; updatedAt: number }>();
function checkRateLimit(keyId: string, perMinute: number): boolean {
  const now = Date.now();
  const refillPerMs = perMinute / 60000;
  const b = buckets.get(keyId) || { tokens: perMinute, updatedAt: now };
  const elapsed = now - b.updatedAt;
  b.tokens = Math.min(perMinute, b.tokens + elapsed * refillPerMs);
  b.updatedAt = now;
  if (b.tokens < 1) {
    buckets.set(keyId, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(keyId, b);
  return true;
}

// =========== Auth ===========
interface ApiKeyRow {
  id: string;
  name: string;
  permissions: string[];
  allowed_ips: string[] | null;
  rate_limit_per_min: number;
  is_active: boolean;
  expires_at: string | null;
}

async function authenticate(req: Request, requestId: string): Promise<
  | { ok: true; apiKey: ApiKeyRow }
  | { ok: false; response: Response }
> {
  let raw = req.headers.get("x-api-key");
  if (!raw) {
    const auth = req.headers.get("authorization") || "";
    if (auth.toLowerCase().startsWith("bearer ")) raw = auth.slice(7).trim();
  }
  if (!raw) {
    return {
      ok: false,
      response: errorResponse(401, "missing_api_key", "API Key não fornecida (use Authorization: Bearer ou X-API-KEY)", requestId),
    };
  }
  const hash = await sha256(raw);
  const { data, error } = await admin
    .from("api_keys")
    .select("id,name,permissions,allowed_ips,rate_limit_per_min,is_active,expires_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, response: errorResponse(401, "invalid_api_key", "API Key inválida", requestId) };
  }
  if (!data.is_active) {
    return { ok: false, response: errorResponse(401, "inactive_api_key", "API Key inativa", requestId) };
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, response: errorResponse(401, "expired_api_key", "API Key expirada", requestId) };
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
  if (data.allowed_ips && data.allowed_ips.length > 0 && ip && !data.allowed_ips.includes(ip)) {
    return { ok: false, response: errorResponse(403, "ip_not_allowed", "IP não autorizado", requestId) };
  }

  if (!checkRateLimit(data.id, data.rate_limit_per_min || 60)) {
    return { ok: false, response: errorResponse(429, "rate_limit_exceeded", "Limite de requisições excedido", requestId) };
  }
  return { ok: true, apiKey: data as ApiKeyRow };
}

function requirePermission(apiKey: ApiKeyRow, scope: string, requestId: string): Response | null {
  if (apiKey.permissions.includes("*") || apiKey.permissions.includes(scope)) return null;
  return errorResponse(403, "forbidden", `Permissão necessária: ${scope}`, requestId);
}

async function logRequest(args: {
  apiKeyId?: string;
  requestId: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  userAgent: string;
  durationMs: number;
  errorMessage?: string;
}) {
  try {
    await admin.from("api_key_logs").insert({
      api_key_id: args.apiKeyId ?? null,
      request_id: args.requestId,
      method: args.method,
      path: args.path,
      status_code: args.status,
      ip_address: args.ip,
      user_agent: args.userAgent,
      duration_ms: args.durationMs,
      error_message: args.errorMessage ?? null,
    });
  } catch (_) { /* swallow */ }
}

// =========== Webhooks (fire-and-forget) ===========
async function dispatchEvent(eventType: string, payload: unknown) {
  try {
    const { data: hooks } = await admin
      .from("api_webhooks")
      .select("id,url,secret,events,is_active")
      .eq("is_active", true);
    if (!hooks?.length) return;
    const subs = hooks.filter((h: any) => h.events.includes(eventType) || h.events.includes("*"));
    for (const h of subs) {
      const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload });
      const signature = await hmacSha256(h.secret, body);
      const { data: delivery } = await admin
        .from("api_webhook_deliveries")
        .insert({
          webhook_id: h.id,
          event_type: eventType,
          payload: { event: eventType, data: payload },
          status: "pending",
          attempt: 1,
        })
        .select("id")
        .single();
      try {
        const res = await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": `sha256=${signature}`,
            "X-Webhook-Event": eventType,
          },
          body,
        });
        await admin
          .from("api_webhook_deliveries")
          .update({
            status: res.ok ? "delivered" : "failed",
            last_status_code: res.status,
            delivered_at: res.ok ? new Date().toISOString() : null,
            last_error: res.ok ? null : `HTTP ${res.status}`,
          })
          .eq("id", delivery?.id);
      } catch (e: any) {
        await admin
          .from("api_webhook_deliveries")
          .update({ status: "failed", last_error: String(e?.message || e) })
          .eq("id", delivery?.id);
      }
    }
  } catch (_) { /* swallow */ }
}

// =========== Schemas ===========
const productCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  old_price: z.number().nonnegative().optional(),
  promo_price: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  category_id: z.string().uuid().optional(),
  image_url: z.string().url().optional(),
  stock: z.number().int().optional(),
  code: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  length: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
  is_available: z.boolean().optional(),
});
const productUpdateSchema = productCreateSchema.partial();

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon_url: z.string().url().optional(),
});

const stockUpdateSchema = z.object({ stock: z.number().int() });
const priceUpdateSchema = z.object({
  price: z.number().nonnegative().optional(),
  old_price: z.number().nonnegative().optional(),
  promo_price: z.number().nonnegative().nullable().optional(),
});
const bulkSchema = z.object({ items: z.array(z.object({ id: z.string().uuid() }).passthrough()).max(500) });

// =========== Routing helpers ===========
function pagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "20", 10)));
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}

// =========== Handlers ===========
async function handleProducts(
  req: Request, url: URL, segments: string[], apiKey: ApiKeyRow, requestId: string,
): Promise<Response> {
  const method = req.method;
  // /products
  if (segments.length === 1) {
    if (method === "GET") {
      const perm = requirePermission(apiKey, "products:read", requestId);
      if (perm) return perm;
      const { page, perPage, from, to } = pagination(url);
      let q = admin.from("products").select("*", { count: "exact" }).range(from, to);
      const search = url.searchParams.get("search");
      const category = url.searchParams.get("category_id");
      const active = url.searchParams.get("active");
      const updatedSince = url.searchParams.get("updated_since");
      const orderBy = url.searchParams.get("order_by") || "created_at";
      const orderDir = (url.searchParams.get("order_dir") || "desc").toLowerCase() === "asc";
      if (search) q = q.ilike("name", `%${search}%`);
      if (category) q = q.eq("category_id", category);
      if (active !== null) q = q.eq("active", active === "true");
      if (updatedSince) q = q.gte("updated_at", updatedSince);
      q = q.order(orderBy, { ascending: orderDir });
      const { data, error, count } = await q;
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      return json({ data, pagination: { page, per_page: perPage, total: count ?? 0 } }, {}, requestId);
    }
    if (method === "POST") {
      const perm = requirePermission(apiKey, "products:write", requestId);
      if (perm) return perm;
      const body = await req.json().catch(() => null);
      const parsed = productCreateSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
      const { data, error } = await admin.from("products").insert(parsed.data).select().single();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      dispatchEvent("product.created", data);
      return json({ data }, { status: 201 }, requestId);
    }
  }
  // /products/:id
  if (segments.length === 2) {
    const id = segments[1];
    if (method === "GET") {
      const perm = requirePermission(apiKey, "products:read", requestId);
      if (perm) return perm;
      const { data, error } = await admin.from("products").select("*, images:product_images(*)").eq("id", id).maybeSingle();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      if (!data) return errorResponse(404, "not_found", "Produto não encontrado", requestId);
      return json({ data }, {}, requestId);
    }
    if (method === "PUT" || method === "PATCH") {
      const perm = requirePermission(apiKey, "products:write", requestId);
      if (perm) return perm;
      const body = await req.json().catch(() => null);
      const parsed = productUpdateSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
      const { data, error } = await admin.from("products").update(parsed.data).eq("id", id).select().single();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      dispatchEvent("product.updated", data);
      return json({ data }, {}, requestId);
    }
    if (method === "DELETE") {
      const perm = requirePermission(apiKey, "products:delete", requestId);
      if (perm) return perm;
      const { error } = await admin.from("products").delete().eq("id", id);
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      dispatchEvent("product.deleted", { id });
      return json({ data: { id, deleted: true } }, {}, requestId);
    }
  }
  // /products/:id/stock
  if (segments.length === 3 && segments[2] === "stock") {
    const id = segments[1];
    if (method === "PUT" || method === "PATCH") {
      const perm = requirePermission(apiKey, "stock:write", requestId);
      if (perm) return perm;
      const body = await req.json().catch(() => null);
      const parsed = stockUpdateSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
      const { data, error } = await admin.from("products").update({ stock: parsed.data.stock }).eq("id", id).select("id,stock").single();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      dispatchEvent("stock.updated", data);
      return json({ data }, {}, requestId);
    }
  }
  // /products/:id/price
  if (segments.length === 3 && segments[2] === "price") {
    const id = segments[1];
    if (method === "PUT" || method === "PATCH") {
      const perm = requirePermission(apiKey, "prices:write", requestId);
      if (perm) return perm;
      const body = await req.json().catch(() => null);
      const parsed = priceUpdateSchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
      const { data, error } = await admin.from("products").update(parsed.data).eq("id", id).select("id,price,old_price,promo_price").single();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      dispatchEvent("price.updated", data);
      return json({ data }, {}, requestId);
    }
  }
  // /products/:id/images and sub-routes
  if (segments.length >= 3 && segments[2] === "images") {
    return handleProductImages(req, segments, apiKey, requestId);
  }
  return errorResponse(404, "not_found", "Rota não encontrada", requestId);
}

async function handleProductImages(
  req: Request, segments: string[], apiKey: ApiKeyRow, requestId: string,
): Promise<Response> {
  const productId = segments[1];
  const method = req.method;

  // /products/:id/images
  if (segments.length === 3) {
    if (method === "GET") {
      const perm = requirePermission(apiKey, "products:read", requestId);
      if (perm) return perm;
      const { data, error } = await admin
        .from("product_images").select("*").eq("product_id", productId).order("position");
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      return json({ data }, {}, requestId);
    }
    if (method === "POST") {
      const perm = requirePermission(apiKey, "images:write", requestId);
      if (perm) return perm;
      return uploadProductImage(req, productId, requestId);
    }
  }
  // /products/:id/images/:imageId
  if (segments.length === 4) {
    const imageId = segments[3];
    if (method === "DELETE") {
      const perm = requirePermission(apiKey, "images:delete", requestId);
      if (perm) return perm;
      const { data: img } = await admin.from("product_images").select("file_name").eq("id", imageId).maybeSingle();
      if (img?.file_name) await admin.storage.from("products").remove([img.file_name]);
      const { error } = await admin.from("product_images").delete().eq("id", imageId);
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      dispatchEvent("image.deleted", { id: imageId, product_id: productId });
      return json({ data: { id: imageId, deleted: true } }, {}, requestId);
    }
    if (method === "PATCH") {
      const perm = requirePermission(apiKey, "images:write", requestId);
      if (perm) return perm;
      const body = await req.json().catch(() => ({}));
      const update: Record<string, unknown> = {};
      if (typeof body.is_main === "boolean") update.is_main = body.is_main;
      if (typeof body.position === "number") update.position = body.position;
      if (body.is_main === true) {
        await admin.from("product_images").update({ is_main: false }).eq("product_id", productId);
      }
      const { data, error } = await admin.from("product_images").update(update).eq("id", imageId).select().single();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      dispatchEvent("image.updated", data);
      return json({ data }, {}, requestId);
    }
  }
  return errorResponse(404, "not_found", "Rota de imagem não encontrada", requestId);
}

async function uploadProductImage(req: Request, productId: string, requestId: string): Promise<Response> {
  const contentType = req.headers.get("content-type") || "";
  let bytes: Uint8Array;
  let mime = "image/jpeg";
  let originalName = `image-${Date.now()}.jpg`;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return errorResponse(400, "missing_file", "Campo 'file' obrigatório", requestId);
    if (file.size > 10 * 1024 * 1024) return errorResponse(413, "file_too_large", "Máximo 10MB", requestId);
    bytes = new Uint8Array(await file.arrayBuffer());
    mime = file.type || mime;
    originalName = file.name || originalName;
  } else {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 10 * 1024 * 1024) return errorResponse(413, "file_too_large", "Máximo 10MB", requestId);
    bytes = new Uint8Array(buf);
    mime = contentType || mime;
  }

  const hash = await sha256(Array.from(bytes).map((b) => String.fromCharCode(b)).join(""));
  const ext = (originalName.split(".").pop() || "jpg").toLowerCase();
  const path = `${productId}/${hash}.${ext}`;
  const { error: upErr } = await admin.storage.from("products").upload(path, bytes, {
    contentType: mime, upsert: true,
  });
  if (upErr) return errorResponse(500, "upload_error", upErr.message, requestId);
  const { data: pub } = admin.storage.from("products").getPublicUrl(path);

  const { count } = await admin.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const isMain = (count ?? 0) === 0;
  const { data, error } = await admin.from("product_images").insert({
    product_id: productId,
    file_name: path,
    url: pub.publicUrl,
    is_main: isMain,
    position: count ?? 0,
    file_size: bytes.byteLength,
    mime_type: mime,
    file_hash: hash,
  }).select().single();
  if (error) return errorResponse(500, "db_error", error.message, requestId);
  dispatchEvent("image.created", data);
  // Processa em background: WEBP + miniaturas
  fetch(`${SUPABASE_URL}/functions/v1/image-processor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ image_id: data.id }),
  }).catch(() => {});
  return json({ data }, { status: 201 }, requestId);
}

async function handleCategories(
  req: Request, url: URL, segments: string[], apiKey: ApiKeyRow, requestId: string,
): Promise<Response> {
  const method = req.method;
  if (segments.length === 1) {
    if (method === "GET") {
      const perm = requirePermission(apiKey, "categories:read", requestId);
      if (perm) return perm;
      const { page, perPage, from, to } = pagination(url);
      const { data, error, count } = await admin
        .from("categories").select("*", { count: "exact" }).range(from, to).order("name");
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      return json({ data, pagination: { page, per_page: perPage, total: count ?? 0 } }, {}, requestId);
    }
    if (method === "POST") {
      const perm = requirePermission(apiKey, "categories:write", requestId);
      if (perm) return perm;
      const body = await req.json().catch(() => null);
      const parsed = categorySchema.safeParse(body);
      if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
      const { data, error } = await admin.from("categories").insert(parsed.data).select().single();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      return json({ data }, { status: 201 }, requestId);
    }
  }
  if (segments.length === 2) {
    const id = segments[1];
    if (method === "GET") {
      const { data, error } = await admin.from("categories").select("*").eq("id", id).maybeSingle();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      if (!data) return errorResponse(404, "not_found", "Categoria não encontrada", requestId);
      return json({ data }, {}, requestId);
    }
    if (method === "PUT" || method === "PATCH") {
      const perm = requirePermission(apiKey, "categories:write", requestId);
      if (perm) return perm;
      const body = await req.json().catch(() => null);
      const parsed = categorySchema.partial().safeParse(body);
      if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
      const { data, error } = await admin.from("categories").update(parsed.data).eq("id", id).select().single();
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      return json({ data }, {}, requestId);
    }
    if (method === "DELETE") {
      const perm = requirePermission(apiKey, "categories:delete", requestId);
      if (perm) return perm;
      const { error } = await admin.from("categories").delete().eq("id", id);
      if (error) return errorResponse(500, "db_error", error.message, requestId);
      return json({ data: { id, deleted: true } }, {}, requestId);
    }
  }
  return errorResponse(404, "not_found", "Rota não encontrada", requestId);
}

async function handleBulkStock(req: Request, apiKey: ApiKeyRow, requestId: string): Promise<Response> {
  const perm = requirePermission(apiKey, "stock:write", requestId);
  if (perm) return perm;
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
  const results: any[] = [];
  for (const item of parsed.data.items) {
    const { id, stock } = item as any;
    const { data, error } = await admin.from("products").update({ stock }).eq("id", id).select("id,stock").single();
    results.push(error ? { id, error: error.message } : data);
  }
  dispatchEvent("stock.bulk_updated", { count: results.length });
  return json({ data: results }, {}, requestId);
}

async function handleBulkPrice(req: Request, apiKey: ApiKeyRow, requestId: string): Promise<Response> {
  const perm = requirePermission(apiKey, "prices:write", requestId);
  if (perm) return perm;
  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "validation_error", "Dados inválidos", requestId, parsed.error.flatten());
  const results: any[] = [];
  for (const item of parsed.data.items) {
    const { id, price, old_price, promo_price } = item as any;
    const update: Record<string, unknown> = {};
    if (price !== undefined) update.price = price;
    if (old_price !== undefined) update.old_price = old_price;
    if (promo_price !== undefined) update.promo_price = promo_price;
    const { data, error } = await admin.from("products").update(update).eq("id", id).select("id,price,old_price,promo_price").single();
    results.push(error ? { id, error: error.message } : data);
  }
  dispatchEvent("price.bulk_updated", { count: results.length });
  return json({ data: results }, {}, requestId);
}

async function handleSync(url: URL, segments: string[], apiKey: ApiKeyRow, requestId: string): Promise<Response> {
  const perm = requirePermission(apiKey, "products:read", requestId);
  if (perm) return perm;
  // /sync/full
  if (segments[1] === "full") {
    const { page, perPage, from, to } = pagination(url);
    const { data, error, count } = await admin
      .from("products").select("*", { count: "exact" }).range(from, to).order("id");
    if (error) return errorResponse(500, "db_error", error.message, requestId);
    return json({ data, pagination: { page, per_page: perPage, total: count ?? 0 } }, {}, requestId);
  }
  // /sync/updated?since=ISO
  if (segments[1] === "updated") {
    const since = url.searchParams.get("since");
    if (!since) return errorResponse(400, "missing_param", "Parâmetro 'since' obrigatório (ISO 8601)", requestId);
    const [products, deletions] = await Promise.all([
      admin.from("products").select("*").gte("updated_at", since).order("updated_at"),
      admin.from("image_deletions").select("*").gte("deleted_at", since).order("deleted_at"),
    ]);
    if (products.error) return errorResponse(500, "db_error", products.error.message, requestId);
    return json({
      data: {
        products: products.data,
        image_deletions: deletions.data ?? [],
        synced_at: new Date().toISOString(),
      },
    }, {}, requestId);
  }
  return errorResponse(404, "not_found", "Rota de sync não encontrada", requestId);
}

// =========== Swagger / Docs ===========
const openApiSpec = {
  openapi: "3.0.3",
  info: { title: "RS Mercado API", version: "1.0.0", description: "API REST para integração com ERP, PDV, marketplaces e e-commerce." },
  servers: [{ url: `${SUPABASE_URL}/functions/v1/api-v1` }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-KEY" },
      BearerAuth: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  paths: {
    "/products": {
      get: { summary: "Listar produtos", parameters: [
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "per_page", in: "query", schema: { type: "integer" } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "category_id", in: "query", schema: { type: "string" } },
        { name: "active", in: "query", schema: { type: "boolean" } },
        { name: "updated_since", in: "query", schema: { type: "string", format: "date-time" } },
      ]},
      post: { summary: "Criar produto" },
    },
    "/products/{id}": {
      get: { summary: "Detalhe do produto" },
      put: { summary: "Atualizar produto" },
      patch: { summary: "Atualização parcial" },
      delete: { summary: "Remover produto" },
    },
    "/products/{id}/stock": { put: { summary: "Atualizar estoque" } },
    "/products/{id}/price": { put: { summary: "Atualizar preço" } },
    "/products/{id}/images": {
      get: { summary: "Listar imagens" },
      post: { summary: "Upload de imagem (multipart/form-data, campo 'file')" },
    },
    "/products/{id}/images/{imageId}": {
      patch: { summary: "Atualizar imagem (is_main, position)" },
      delete: { summary: "Remover imagem" },
    },
    "/categories": { get: { summary: "Listar categorias" }, post: { summary: "Criar categoria" } },
    "/categories/{id}": {
      get: { summary: "Detalhe da categoria" }, put: { summary: "Atualizar" }, delete: { summary: "Remover" },
    },
    "/stock/bulk": { post: { summary: "Atualização em lote de estoque (máx 500)" } },
    "/prices/bulk": { post: { summary: "Atualização em lote de preços (máx 500)" } },
    "/sync/full": { get: { summary: "Sincronização completa paginada" } },
    "/sync/updated": { get: { summary: "Sincronização incremental (?since=ISO)" } },
  },
};

const swaggerHtml = `<!doctype html>
<html><head><meta charset="utf-8"/><title>RS Mercado API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/></head>
<body><div id="ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
window.ui = SwaggerUIBundle({ url: './openapi.json', dom_id: '#ui' });
</script></body></html>`;

// =========== Main ===========
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = req.headers.get("x-request-id") || uuid();
  const started = Date.now();
  const url = new URL(req.url);
  // Remove function prefix (/functions/v1/api-v1)
  const path = url.pathname.replace(/^.*\/api-v1/, "") || "/";
  const segments = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
  const ua = req.headers.get("user-agent") || "";

  // Public docs
  if (segments[0] === "docs") {
    return new Response(swaggerHtml, { headers: { ...corsHeaders, "Content-Type": "text/html" } });
  }
  if (segments[0] === "openapi.json") {
    return json(openApiSpec, {}, requestId);
  }
  if (segments[0] === "health") {
    return json({ status: "ok", timestamp: new Date().toISOString() }, {}, requestId);
  }

  // Auth
  const auth = await authenticate(req, requestId);
  if (!auth.ok) {
    const r = auth.response;
    logRequest({ requestId, method: req.method, path, status: r.status, ip, userAgent: ua, durationMs: Date.now() - started, errorMessage: "auth_failed" });
    return r;
  }

  let response: Response;
  try {
    switch (segments[0]) {
      case "products":
        response = await handleProducts(req, url, segments, auth.apiKey, requestId);
        break;
      case "categories":
        response = await handleCategories(req, url, segments, auth.apiKey, requestId);
        break;
      case "stock":
        if (segments[1] === "bulk" && req.method === "POST") {
          response = await handleBulkStock(req, auth.apiKey, requestId);
        } else response = errorResponse(404, "not_found", "Rota não encontrada", requestId);
        break;
      case "prices":
        if (segments[1] === "bulk" && req.method === "POST") {
          response = await handleBulkPrice(req, auth.apiKey, requestId);
        } else response = errorResponse(404, "not_found", "Rota não encontrada", requestId);
        break;
      case "sync":
        response = await handleSync(url, segments, auth.apiKey, requestId);
        break;
      default:
        response = errorResponse(404, "not_found", `Rota ${path} não encontrada`, requestId);
    }
  } catch (e: any) {
    response = errorResponse(500, "internal_error", e?.message || "Erro interno", requestId);
  }

  // Update last_used_at + log (fire and forget)
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", auth.apiKey.id).then(() => {});
  logRequest({
    apiKeyId: auth.apiKey.id, requestId, method: req.method, path,
    status: response.status, ip, userAgent: ua, durationMs: Date.now() - started,
  });

  return response;
});