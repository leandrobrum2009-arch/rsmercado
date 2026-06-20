import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Allow-list of hosts that may be proxied. Add more as needed.
const ALLOWED_HOSTS = new Set<string>([
  "yymtipgsskvepufugfub.supabase.co",
  "images.unsplash.com",
  "cdn.shopify.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
]);
const ALLOWED_HOST_SUFFIXES = [".supabase.co", ".lovableproject.com"];

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "::1") return true;
  // IPv4 private / link-local / loopback
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true; // AWS/GCP metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  return false;
}

function hostAllowed(host: string): boolean {
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (typeof url !== "string" || !url) {
      return new Response(
        JSON.stringify({ error: "No URL provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (parsed.protocol !== "https:") {
      return new Response(
        JSON.stringify({ error: "Only https:// is allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (isPrivateHost(parsed.hostname)) {
      return new Response(
        JSON.stringify({ error: "Host not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!hostAllowed(parsed.hostname)) {
      return new Response(
        JSON.stringify({ error: "Host not on allow-list" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch(parsed.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    // Block any redirect — re-validation would be needed for the new target
    if (upstream.status >= 300 && upstream.status < 400) {
      return new Response(
        JSON.stringify({ error: "Redirects not allowed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lenHeader = upstream.headers.get("content-length");
    if (lenHeader && parseInt(lenHeader) > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: "Response too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const buf = new Uint8Array(await upstream.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: "Response too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(buf, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error(`Proxy error: ${(error as Error).message}`);
    return new Response(
      JSON.stringify({ error: "Upstream fetch failed" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
