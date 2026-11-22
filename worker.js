const OWNER = "zhangjiongli22-ui";
const REPO = "paopaowu";
const PASS_HASH = "6f65bb65";

function shiftPass(input) {
  let x = 5381;
  for (let i = 0; i < input.length; i++) {
    x = ((x << 5) + x) ^ input.charCodeAt(i);
    x >>>= 0;
  }
  return x.toString(16);
}
async function mergeOverrides(json, env) {
  try {
    let keys = [];
    let cursor = undefined;
    do {
      const page = await env.RATINGS.list({ prefix: "item:", cursor, limit: 1000 });
      keys = keys.concat(page.keys || []);
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    json.__ovCount = keys.length;
    if (!keys.length) return json;
    const byId = new Map();
    for (const k of keys) {
      try {
        const v = await env.RATINGS.get(k.name, "json");
        if (v && v.id) byId.set(String(v.id), v);
      } catch (e) {}
    }
    json.items = (json.items || []).map((it) => {
      try {
        const ov = byId.get(String(it.id));
        if (!ov) return it;
        const merged = Object.assign({}, it, ov);
        Object.keys(ov).forEach((k) => {
          if (ov[k] === null || ov[k] === undefined) delete merged[k];
        });
        return merged;
      } catch (e) {
        return it;
      }
    });
  } catch (e) {
    json.__ovErr = String(e).slice(0, 120);
  }
  return json;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/debug") {
      const id = url.searchParams.get("id") || "";
      const kv = await env.RATINGS.get("item:" + id, "json");
      const keys = await env.RATINGS.list({ prefix: "item:" });
      const data = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/records.json?t=${Date.now()}`, { cf: { cacheTtl: 0 } }).then((r) => r.json()).catch(() => ({}));
      const it = (data.items || []).find((x) => String(x.id) === id) || null;
      return new Response(JSON.stringify({ id, kv, keyCount: keys.keys.length, item: it }), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }

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
        if ("rating" in body) next.rating = typeof body.rating === "number" ? body.rating : null;
        if ("note" in body) next.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
        if (body.status) next.status = body.status;
        if (body.date) next.date = body.date;
        if (body.time) next.time = body.time;
        if ("rated_on" in body) next.rated_on = body.rated_on || null;
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
