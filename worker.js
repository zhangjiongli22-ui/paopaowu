const OWNER = "zhangjiongli22-ui";
const REPO = "paopaowu";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/data/records.json" || url.pathname === "/data/chat.json") {
      const path = url.pathname.replace("/", "");
      const target = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${path}?nocache=${Date.now()}`;
      try {
        const res = await fetch(target, {
          cf: { cacheEverything: false, cacheTtl: 0 },
          headers: { "cache-control": "no-cache" },
        });
        if (!res.ok) throw new Error("upstream " + res.status);
        return new Response(res.body, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      } catch (e) {
        return env.ASSETS.fetch(request);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
