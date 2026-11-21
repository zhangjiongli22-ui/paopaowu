const RAW = "https://raw.githubusercontent.com/zhangjiongli22-ui/paopaowu/main/data/records.json";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/data/records.json" || url.pathname === "/data/chat.json") {
      const path = url.pathname.replace("/", "");
      try {
        const res = await fetch(`https://raw.githubusercontent.com/zhangjiongli22-ui/paopaowu/main/${path}`, {
          cf: { cacheTtl: 15, cacheEverything: true },
        });
        if (!res.ok) throw new Error("upstream " + res.status);
        return new Response(res.body, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=15",
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
