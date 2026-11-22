const OWNER = "zhangjiongli22-ui";
const REPO = "paopaowu";
const PASS_HASH = "6f65bb65";
async function mergeOverrides(json, env) {
  try {
    const list = await env.RATINGS.list({ prefix: "item:" });
    if (!list.keys.length) return json;
    const values = await Promise.all(list.keys.map((k) => env.RATINGS.get(k.name, "json")));
    const byId = new Map();
    values.filter(Boolean).forEach((v) => byId.set(String(v.id), v));
    json.items = (json.items || []).map((it) => {
      const ov = byId.get(String(it.id));
      if (!ov) return it;
      const merged = { ...it, ...ov };
      Object.keys(ov).forEach((k) => {
        if (ov[k] === null || ov[k] === undefined) delete merged[k];
      });
      return merged;
    });
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
        else next.rating = null;
        if (typeof body.note === "string" && body.note.trim()) next.note = body.note.trim();
        else next.note = null;
        if (body.status) next.status = body.status;
        if (body.date) next.date = body.date;
        if (body.time) next.time = body.time;
        if (body.rated_on) next.rated_on = body.rated_on;
        else next.rated_on = null;
        if (body.pinned !== undefined && body.pinned !== null) next.pinned = !!body.pinned;
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
        const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/records.json?t=${Date.now()}`, { cf: { cacheEverything: false, cacheTtl: 0 } });
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
        const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/chat.json?t=${Date.now()}`, { cf: { cacheEverything: false, cacheTtl: 0 } });
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
