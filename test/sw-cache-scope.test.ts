// service-worker.js：正式版（/）和开发版（/dev/）的壳缓存互不相删（同一个网址，Cache Storage 共用）。created 2026-11-04 by Claude Opus 5.5
//   vm 载入真 SW 脚本 + 假 self / caches，驱动 install / activate。形状照 WebXiaoHeiWu test/sw-strategy.test.mjs「正式版 / 开发版的壳缓存互不相删」那节。
//   「清缓存只删自己前缀」的 app 侧守卫在 test/redline-guard.test.mjs（src 里 caches.delete 必须先按 SHELL_CACHE_PREFIX 筛）。
import { describe, it, assert, eq } from "./runner.mjs";

const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string };
const vm = (await import("node:vm" as string)) as { createContext(o: object): object; runInContext(code: string, ctx: object): unknown };
const SW_SRC = readFileSync(decodeURIComponent(new URL("../service-worker.js", import.meta.url).pathname), "utf8");
const ORIGIN = "https://catsup.test";
const INDEX = `<script type="module" src="./dist/catsup-abc123def456.mjs"></script>`;

function loadSW(scriptPath: string, cacheNames: string[]) {
  const deleted: string[] = [], opened: string[] = [];
  const handlers: Record<string, (e: unknown) => void> = {};
  const cache = { match: async () => null, put: async () => {} };
  const ctx = {
    self: { location: { pathname: scriptPath, origin: ORIGIN }, addEventListener: (t: string, fn: (e: unknown) => void) => { handlers[t] = fn; }, skipWaiting: async () => {}, clients: { matchAll: async () => [], claim: async () => {} } },
    caches: { open: async (k: string) => { opened.push(k); return cache; }, keys: async () => cacheNames, delete: async (k: string) => { deleted.push(k); return true; } },
    fetch: async (u: string) => ({ ok: true, status: 200, text: async () => (String(u).includes("index.html") ? INDEX : ""), clone() { return this; }, headers: { get: () => null } }),
    Response: class { body: unknown; constructor(body: unknown) { this.body = body; } },
    URL, AbortController, setTimeout, clearTimeout, console: { warn() {}, log() {}, error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(SW_SRC, ctx);
  const run = async (type: string) => { let p: Promise<unknown> | undefined; handlers[type]!({ waitUntil: (x: Promise<unknown>) => { p = x; } }); await p; };
  return { deleted, opened, run };
}
const ALL = ["catsup-aaa111", "catsup-dev-bbb222", "catsup-boot", "pwa-models", "xiaoheiwu-ccc333", "justreadbooks-ddd444"];

describe("service-worker：正式版 / 开发版的壳缓存互不相删", () => {
  it("开发版装新壳：名字带 dev-；activate 只删开发版自己的旧壳，正式版的和兄弟的都留着", async () => {
    const sw = loadSW("/dev/service-worker.js", ALL);
    await sw.run("install");
    eq(sw.opened.at(-1), "catsup-dev-abc123def456");
    await sw.run("activate");
    assert(sw.deleted.includes("catsup-dev-bbb222"), "自己的旧壳要删");
    assert(!sw.deleted.includes("catsup-aaa111"), "不许删正式版的壳");
    assert(!sw.deleted.some((k) => /^(pwa-models|xiaoheiwu-|justreadbooks-)/.test(k)), "不许删别人的");
  });
  it("正式版装新壳：activate 只删正式版自己的旧壳，开发版的和兄弟的都留着", async () => {
    const sw = loadSW("/service-worker.js", ALL);
    await sw.run("install");
    eq(sw.opened.at(-1), "catsup-abc123def456");
    await sw.run("activate");
    assert(sw.deleted.includes("catsup-aaa111"), "自己的旧壳要删");
    assert(!sw.deleted.includes("catsup-dev-bbb222"), "不许删开发版的壳");
    assert(!sw.deleted.some((k) => /^(pwa-models|xiaoheiwu-|justreadbooks-)/.test(k)), "不许删别人的");
  });
  it("SW 被杀重启后找回缓存名：只认自己这一边", () => {
    assert(/\(await caches\.keys\(\)\)\.filter\(isOwnCache\)/.test(SW_SRC));
    assert(/CACHE_NAME = `\$\{OWN_PREFIX\}\$\{bundleHash\}`/.test(SW_SRC), "新壳的名字带范围");
    assert(!/k\.startsWith\("catsup-"\) && k !== CACHE_NAME/.test(SW_SRC), "旧的「前缀一样就删」不许回来");
  });
});
