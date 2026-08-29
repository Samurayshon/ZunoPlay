import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const baseCors = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsHeaders(req: Request) {
  const configured = (Deno.env.get("TURN_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origin = req.headers.get("origin") || "";
  const allowOrigin = configured.length
    ? (configured.includes(origin) ? origin : "null")
    : "*";
  return { ...baseCors, "Access-Control-Allow-Origin": allowOrigin, "Vary": "Origin" };
}

function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

function decodeJwtSubject(authorization: string) {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    return typeof parsed?.sub === "string" ? parsed.sub : null;
  } catch {
    return null;
  }
}

function publishableKey() {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
      const first = Object.values(parsed || {}).find((value) => typeof value === "string" && value);
      if (typeof first === "string") return first;
    } catch {
      // Fall back to the legacy anon key below.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function restRows(
  url: URL,
  apiKey: string,
  authorization: string,
): Promise<unknown[]> {
  const response = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: authorization,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`postgrest_${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method_not_allowed" });

  const authorization = req.headers.get("authorization") || "";
  const userId = decodeJwtSubject(authorization);
  if (!authorization.toLowerCase().startsWith("bearer ") || !userId) {
    return json(req, 401, { error: "authentication_required" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: "invalid_json" });
  }

  const roomId = body.room_id;
  if (!validUuid(roomId)) return json(req, 400, { error: "invalid_room_id" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const apiKey = publishableKey();
  if (!supabaseUrl || !apiKey) {
    return json(req, 500, { error: "supabase_runtime_not_configured" });
  }

  try {
    const memberUrl = new URL(`${supabaseUrl}/rest/v1/room_members`);
    memberUrl.searchParams.set("select", "room_id");
    memberUrl.searchParams.set("room_id", `eq.${roomId}`);
    memberUrl.searchParams.set("user_id", `eq.${userId}`);
    memberUrl.searchParams.set("limit", "1");

    const members = await restRows(memberUrl, apiKey, authorization);
    if (!members.length) return json(req, 403, { error: "room_membership_required" });

    const roomUrl = new URL(`${supabaseUrl}/rest/v1/rooms`);
    roomUrl.searchParams.set("select", "id,status");
    roomUrl.searchParams.set("id", `eq.${roomId}`);
    roomUrl.searchParams.set("status", "eq.active");
    roomUrl.searchParams.set("limit", "1");

    const rooms = await restRows(roomUrl, apiKey, authorization);
    if (!rooms.length) return json(req, 403, { error: "active_room_required" });
  } catch (error) {
    console.error("TURN membership verification failed", error instanceof Error ? error.message : error);
    return json(req, 502, { error: "room_authorization_unavailable" });
  }

  const urls = (Deno.env.get("TURN_URLS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^turns?:/i.test(value));
  const username = Deno.env.get("TURN_USERNAME") || "";
  const credential = Deno.env.get("TURN_CREDENTIAL") || "";

  if (!urls.length || !username || !credential) {
    return json(req, 503, {
      error: "turn_not_configured",
      message: "TURN provider credentials are not configured.",
    });
  }

  return json(req, 200, {
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
      { urls, username, credential },
    ],
  });
});
