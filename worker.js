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
async function loadOverrides(env) {
  try {
    return (await env.RATINGS.get("overrides_all", "json")) || {};
  } catch (e) {
    return {};
  }
}

async function mergeOverrides(json, env) {
  try {
    const ov = await loadOverrides(env);
    const ids = Object.keys(ov);
    json.__ovCount = ids.length;
    if (!ids.length) return json;
    json.items = (json.items || []).map((it) => {
      const o = ov[String(it.id)];
      if (!o) return it;
      const merged = Object.assign({}, it, o);
      Object.keys(o).forEach((k) => {
        if (o[k] === null || o[k] === undefined) delete merged[k];
      });
      return merged;
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
      const all = (await env.RATINGS.get("overrides_all", "json")) || {};
      const kv = all[id] || null;
      const data = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/records.json?t=${Date.now()}`, { cf: { cacheTtl: 0 } }).then((r) => r.json()).catch(() => ({}));
      const it = (data.items || []).find((x) => String(x.id) === id) || null;
      return new Response(JSON.stringify({ id, kv, keyCount: Object.keys(all).length, item: it }), {
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
        const all = (await env.RATINGS.get("overrides_all", "json")) || {};
        const existing = all[id] || { id };
        const next = { ...existing, id };
        if ("rating" in body) next.rating = typeof body.rating === "number" ? body.rating : null;
        if ("note" in body) next.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
        if (body.status) next.status = body.status;
        if (body.date) next.date = body.date;
        if (body.time) next.time = body.time;
        if ("rated_on" in body) next.rated_on = body.rated_on || null;
        if (body.pinned !== undefined && body.pinned !== null) next.pinned = !!body.pinned;
        all[id] = next;
        await env.RATINGS.put("overrides_all", JSON.stringify(all));
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

    if (url.pathname === "/api/migrate" && request.method === "POST") {
      try {
        const body = await request.json();
        if ((await shiftPass(body.pass || "")) !== PASS_HASH) {
          return new Response(JSON.stringify({ ok: false, error: "密码不对" }), { status: 403 });
        }
        const all = (await env.RATINGS.get("overrides_all", "json")) || {};
        let keys = [];
        let cursor = undefined;
        do {
          const page = await env.RATINGS.list({ prefix: "item:", cursor, limit: 200 });
          keys = keys.concat(page.keys || []);
          cursor = page.list_complete ? undefined : page.cursor;
        } while (cursor);
        let merged = 0;
        for (const k of keys) {
          const v = await env.RATINGS.get(k.name, "json");
          if (v && v.id && !all[String(v.id)]) {
            all[String(v.id)] = v;
            merged++;
          }
        }
        await env.RATINGS.put("overrides_all", JSON.stringify(all));
        return new Response(JSON.stringify({ ok: true, scanned: keys.length, merged, total: Object.keys(all).length }), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 160) }), { status: 400 });
      }
    }

    if (url.pathname === "/api/data" && request.method === "POST") {
      try {
        const body = await request.json();
        if ((await shiftPass(body.pass || "")) !== PASS_HASH) {
          return new Response(JSON.stringify({ ok: false, error: "密码不对" }), { status: 403 });
        }
        const data = body.data;
        if (!data || !Array.isArray(data.items)) throw new Error("data 不合法");
        const blob = JSON.stringify(data);
        await env.RATINGS.put("records_blob", blob);
        await env.RATINGS.put("records_blob_at", String(Date.now()));
        return new Response(JSON.stringify({ ok: true, items: data.items.length, bytes: blob.length }), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 160) }), { status: 400 });
      }
    }

    if (url.pathname === "/data/records.json") {
      try {
        let json = null;
        let src = "github";
        try {
          const blob = await env.RATINGS.get("records_blob", "json");
          if (blob && Array.isArray(blob.items)) { json = blob; src = "kv"; }
        } catch (e) {}
        if (!json) {
          const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/records.json?t=${Date.now()}`, { cf: { cacheEverything: false, cacheTtl: 0 } });
          if (!res.ok) throw new Error("upstream " + res.status);
          json = await res.json();
        }
        json.__source = src;
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
