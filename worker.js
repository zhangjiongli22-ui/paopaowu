const OWNER = "zhangjiongli22-ui";
const REPO = "paopaowu";
const PASS_HASH = "6f65bb65";

async function shiftPass(input) {
  let x = 5381;
  for (let i = 0; i < input.length; i++) {
    x = ((x << 5) + x) ^ input.charCodeAt(i);
    x >>>= 0;
  }
  return x.toString(16);
}

async function mergeOverrides(json, env) {
  try {
    const list = await env.RATINGS.list({ prefix: "item:" });
    if (!list.keys.length) return json;
    const values = await Promise.all(list.keys.map((k) => env.RATINGS.get(k.name, "json")));
    const byId = new Map();
    values.filter(Boolean).forEach((v) => byId.set(String(v.id), v));
    json.items = (json.items || []).map((it) => (byId.has(String(it.id)) ? { ...it, ...byId.get(String(it.id)) } : it));
  } catch (e) {}
  return json;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/rate" && request.method === "POST") {
      try {
        const body = await request.json();
        if ((await shiftPass(body.pass || "")) !== PASS_HASH) {
          return new Response(JSON.stringify({ ok: false, error: "密码不对" }), {
            status: 403,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }
        const id = String(body.id || "");
        if (!id) throw new Error("missing id");
        const existing = (await env.RATINGS.get("item:" + id, "json")) || { id };
        const next = { ...existing, id };
        if (typeof body.rating === "number") next.rating = body.rating;
        if (body.rating === null) delete next.rating;
        if (typeof body.note === "string") {
          if (body.note.trim()) next.note = body.note.trim();
          else delete next.note;
        }
        if (body.status) next.status = body.status;
        if (body.date) next.date = body.date;
        if (body.time) next.time = body.time;
        if (body.rated_on) next.rated_on = body.rated_on;
        else delete next.rated_on;
        await env.RATINGS.put("item:" + id, JSON.stringify(next));
        return new Response(JSON.stringify({ ok: true, item: next }), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e) }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
    }

    if (url.pathname === "/data/records.json") {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/records.json?nocache=${Date.now()}`, {
          cf: { cacheEverything: false, cacheTtl: 0 },
        });
        if (!res.ok) throw new Error("upstream " + res.status);
        const json = await res.json();
        const merged = await mergeOverrides(json, env);
        return new Response(JSON.stringify(merged), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return env.ASSETS.fetch(request);
      }
    }

    if (url.pathname === "/data/chat.json") {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/chat.json?nocache=${Date.now()}`, {
          cf: { cacheEverything: false, cacheTtl: 0 },
        });
        return new Response(res.body, {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return env.ASSETS.fetch(request);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
