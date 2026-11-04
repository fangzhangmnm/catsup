// test/probes/fake-cloud.mjs —— 探针共用的两头假件：MSAL 桩脚本（静默续签结果可控）+ Graph 内存小网盘（可挂起、可计数）。created 2026-11-03 by Claude Opus 5.5（从 probe-cloud-gate.mjs 抽出）。
export const MSAL_STUB = `
(() => {
  const mode = () => localStorage.getItem("__fake_msal") || "ok";
  const account = { homeAccountId: "u1.t1", username: "probe@example.com" };
  class PublicClientApplication {
    constructor() {}
    async initialize() {}
    async handleRedirectPromise() { return null; }
    getAllAccounts() { return mode() === "none" ? [] : [account]; }
    getAccountByHomeId() { return account; }
    setActiveAccount() {}
    async clearCache() { localStorage.setItem("__fake_msal", "none"); }
    async loginRedirect() { window.__fakeLogins = (window.__fakeLogins || 0) + 1; }
    async acquireTokenSilent() {
      window.__fakeSilent = (window.__fakeSilent || 0) + 1;
      const m = mode();
      if (m === "hang") return new Promise(() => {});
      if (m === "interaction") throw Object.assign(new Error("AADSTS: login_required"), { name: "InteractionRequiredAuthError", errorCode: "login_required", subError: "" });
      if (m === "network") throw Object.assign(new Error("network"), { name: "BrowserAuthError", errorCode: "no_network_connectivity", subError: "" });
      return { accessToken: "fake-token", account };
    }
  }
  window.msal = { LogLevel: { Error: 0, Warning: 1, Info: 2 }, PublicClientApplication };
})();`;

// ---- 假 Graph：内存小网盘 ----
export function fakeDrive() {
  const items = new Map();   // path → { id, name, eTag, bytes, lastModifiedDateTime }
  let seq = 1;
  const d = { items, requests: 0, hangMeta: false, hangDownload: null, metaGate: null, puts: [], dropNextPutResponse: false, holdPut: null, failPuts: false };   // puts = 每次写的记录（谁、结果码）；dropNextPutResponse = 字节写进网盘但回执丢在路上；holdPut = 写卡住；failPuts = 写不上（断在路上，字节没到）
  const json = (route, status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-expose-headers": "*" }, body: JSON.stringify(body) });
  const view = (it) => ({ id: it.id, name: it.name, size: it.bytes.length, eTag: it.eTag, lastModifiedDateTime: it.lastModifiedDateTime, file: {}, "@microsoft.graph.downloadUrl": `https://fake-dl.test/${it.id}` });
  d.bump = (p) => { const it = items.get(p); it.eTag = `"e${seq++}"`; it.lastModifiedDateTime = new Date().toISOString(); };
  d.attach = async (ctx) => {
    await ctx.route(/fake-dl\.test\//, async (route) => {
      if (d.hangDownload) await d.hangDownload;
      const id = new URL(route.request().url()).pathname.slice(1);
      const it = [...items.values()].find((x) => x.id === id);
      await route.fulfill({ status: it ? 200 : 404, headers: { "access-control-allow-origin": "*" }, contentType: "application/octet-stream", body: it ? Buffer.from(it.bytes) : "" });
    });
    await ctx.route(/graph\.microsoft\.com\/v1\.0\//, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      d.requests++;
      const u = new URL(req.url());
      const p = decodeURIComponent(u.pathname.replace("/v1.0", ""));
      let m;
      if (p === "/me/drive/special/approot") return json(route, 200, { id: "root" });
      if (/\/children$/.test(p)) { const dir = p.replace("/me/drive/special/approot", "").replace(/^:\//, "").replace(/:?\/children$/, ""); return json(route, 200, { value: [...items.entries()].filter(([k]) => (k.includes("/") ? k.slice(0, k.lastIndexOf("/")) : "") === dir).map(([, v]) => view(v)) }); }
      if ((m = /^\/me\/drive\/special\/approot:\/(.+):\/content$/.exec(p)) && req.method() === "PUT") {
        if (d.holdPut) await d.holdPut;
        if (d.failPuts) { d.puts.push({ key: m[1], status: 0 }); return route.abort("connectionreset"); }
        const key = m[1], prev = items.get(key), ifMatch = req.headers()["if-match"];
        const fail = u.searchParams.get("@microsoft.graph.conflictBehavior") === "fail";
        if (prev && ifMatch && ifMatch !== prev.eTag) { d.puts.push({ key, status: 412 }); return json(route, 412, { error: { code: "preconditionFailed" } }); }
        if (prev && !ifMatch && fail) return json(route, 409, { error: { code: "nameAlreadyExists" } });
        const it = prev ?? { id: `i${seq++}`, name: key.split("/").pop() };
        it.bytes = req.postDataBuffer() ?? Buffer.alloc(0); it.eTag = `"e${seq++}"`; it.lastModifiedDateTime = new Date().toISOString();
        items.set(key, it);
        d.puts.push({ key, status: prev ? 200 : 201 });
        if (d.dropNextPutResponse) { d.dropNextPutResponse = false; return route.abort("connectionreset"); }
        return json(route, prev ? 200 : 201, view(it));
      }
      if ((m = /^\/me\/drive\/special\/approot:\/(.+)$/.exec(p)) && req.method() === "GET") {
        if (d.hangMeta) await new Promise(() => {});
        if (d.metaGate) await d.metaGate;
        const it = items.get(m[1]);
        return it ? json(route, 200, view(it)) : json(route, 404, { error: { code: "itemNotFound" } });
      }
      if ((m = /^\/me\/drive\/items\/([^/]+)\/content$/.exec(p))) { if (d.hangDownload) await d.hangDownload; const it = [...items.values()].find((x) => x.id === m[1]); return route.fulfill({ status: it ? 200 : 404, headers: { "access-control-allow-origin": "*" }, body: it ? Buffer.from(it.bytes) : "" }); }
      if ((m = /^\/me\/drive\/items\/([^/]+)$/.exec(p)) && req.method() === "GET") { const it = [...items.values()].find((x) => x.id === m[1]); return it ? json(route, 200, view(it)) : json(route, 404, {}); }
      return json(route, 404, { error: { code: "unhandled", p } });
    });
  };
  return d;
}
