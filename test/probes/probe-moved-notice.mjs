// 真 bundle：旧地址有搬家一行、按钮开新地址（开发版到 /dev/），新地址没有。无头。created 2026-11-03 by Claude Opus 5.5
// 用法：node test/probes/probe-moved-notice.mjs [截图目录]。页面字节从本仓磁盘供，两个域名都走 page.route，不碰网络。
import { createRequire } from "node:module";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHOT = process.argv.slice(2).find((a) => !/^https?:/.test(a));   // 截图目录；整跑脚本按惯例传网址（这个探针不用网址，页面从磁盘供），网址不当目录（11-11 整跑在仓里建出过 http:/ 文件夹）
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/json", ".wasm": "application/wasm" };
let bad = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) bad++; };

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
async function open(url, prefix, viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ serviceWorkers: "block", viewport });
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (!u.href.startsWith(`https://${new URL(url).host}${prefix}`)) return route.fulfill({ status: 404, body: "" });
    let p = decodeURIComponent(u.pathname.slice(prefix.length)); if (p === "" || p.endsWith("/")) p += "index.html";
    const f = join(ROOT, p);
    if (!existsSync(f) || statSync(f).isDirectory()) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, contentType: MIME[extname(f)] ?? "application/octet-stream", body: readFileSync(f) });
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  return { ctx, page };
}
const notice = (page) => page.locator("#noticeStack .toast", { hasText: "新地址是" });

for (const [url, prefix, want] of [
  ["https://fangzhangmnm.github.io/catsup/dev/", "/catsup/dev/", "https://catsup.weebpaint.com/dev/"],
  ["https://fangzhangmnm.github.io/catsup/", "/catsup/", "https://catsup.weebpaint.com/"],
]) {
  const { ctx, page } = await open(url, prefix);
  await notice(page).first().waitFor({ timeout: 20000 }).catch(() => {});
  ok(await notice(page).count() === 1, `${url}：有搬家一行`);
  const opened = ctx.waitForEvent("page", { timeout: 5000 }).catch(() => null);
  await notice(page).first().getByRole("button", { name: "打开新地址" }).click({ timeout: 5000 }).catch(() => {});
  const pop = await opened;
  ok(pop?.url() === want, `按钮开 ${want}（实际 ${pop?.url()}），旧页还在 ${page.url() === url}`);
  await ctx.close();
}
{
  const { ctx, page } = await open("https://catsup.weebpaint.com/dev/", "/dev/");
  await page.waitForFunction(() => !!document.querySelector("#noticeStack") || document.readyState === "complete", null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(3000);
  ok(await notice(page).count() === 0, "新地址：没有搬家一行");
  await ctx.close();
}
if (SHOT) for (const [name, vp] of [["desktop", { width: 1280, height: 800 }], ["phone", { width: 390, height: 844 }]]) {
  const { ctx, page } = await open("https://fangzhangmnm.github.io/catsup/dev/", "/catsup/dev/", vp);
  await notice(page).first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOT, `moved-${name}.png`) });
  await ctx.close();
}
await browser.close();
console.log(bad ? `✗ ${bad} 条没过` : "全过");
process.exit(bad ? 1 : 0);
