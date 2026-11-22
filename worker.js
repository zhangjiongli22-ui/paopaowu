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

    if (url.pathname === "/api/overrides" && request.method === "GET") {
      try {
        const pass = url.searchParams.get("pass") || "";
        if ((await shiftPass(pass)) !== PASS_HASH) {
          return new Response(JSON.stringify({ ok: false, error: "密码不对" }), {
            status: 403,
            headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
          });
        }
        const all = (await env.RATINGS.get("overrides_all", "json")) || {};
        return new Response(JSON.stringify({ ok: true, items: all }), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 160) }), { status: 400 });
      }
    }

    if (url.pathname === "/api/comments" && request.method === "GET") {
      let comments = [];
      try {
        comments = (await env.RATINGS.get("comments_all", "json")) || [];
      } catch (e) {}
      return new Response(JSON.stringify({ ok: true, items: Array.isArray(comments) ? comments : [] }), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }

    if (url.pathname === "/api/comment" && request.method === "POST") {
      try {
        const body = await request.json();
        if ((await shiftPass(body.pass || "")) !== PASS_HASH) {
          return new Response(JSON.stringify({ ok: false, error: "密码不对" }), {
            status: 403,
            headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
          });
        }
        const who = String(body.who || "").trim().slice(0, 12);
        const text = String(body.text || "").trim().slice(0, 1200);
        if (!who || !text) throw new Error("缺内容");

        let data = null;
        try {
          const blob = await env.RATINGS.get("records_blob", "json");
          if (blob && Array.isArray(blob.items)) data = blob;
        } catch (e) {}
        if (!data) {
          const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/data/records.json?t=${Date.now()}`, { cf: { cacheEverything: false, cacheTtl: 0 } });
          if (!res.ok) throw new Error("upstream " + res.status);
          data = await res.json();
        }
        if (!Array.isArray(data.items)) data.items = [];

        const now = new Date();
        const sh = new Date(now.getTime() + 8 * 3600 * 1000); // 北京时间
        const pad = (n) => String(n).padStart(2, "0");
        let y = sh.getUTCFullYear(), m = sh.getUTCMonth(), d = sh.getUTCDate();
        const hh = sh.getUTCHours();
        if (hh < 4) {
          const prev = new Date(Date.UTC(y, m, d - 1));
          y = prev.getUTCFullYear(); m = prev.getUTCMonth(); d = prev.getUTCDate();
        }
        const item = {
          id: "cr-" + y + pad(m + 1) + pad(d) + "-" + Math.random().toString(36).slice(2, 6),
          cat: "critique",
          date: `${y}-${pad(m + 1)}-${pad(d)}`,
          time: `${pad(hh)}:${pad(sh.getUTCMinutes())}`,
          who: who,
          text: text,
        };
        if (body.reply_to) item.reply_to = String(body.reply_to).slice(0, 12);
        // 评论单独存一个键，推 records.json 不会覆盖它
        let comments = [];
        try {
          comments = (await env.RATINGS.get("comments_all", "json")) || [];
        } catch (e) {}
        if (!Array.isArray(comments)) comments = [];
        comments.push(item);
        await env.RATINGS.put("comments_all", JSON.stringify(comments));
        return new Response(JSON.stringify({ ok: true, item }), {
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 160) }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
        });
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
        // 把独立存储的评论并进来，页面照常读
        try {
          let comments = (await env.RATINGS.get("comments_all", "json")) || [];
          if (Array.isArray(comments) && comments.length) {
            const ids = new Set((merged.items || []).map((x) => String(x.id)));
            comments.forEach((c) => { if (c && c.id && !ids.has(String(c.id))) merged.items.push(c); });
          }
        } catch (e) {}
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
