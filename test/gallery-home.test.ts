// 图库必须有家：一处判定 + 接线守卫（家族规则书 §1 第 13 条；ai-docs/20261103-library-needs-a-home.md §5；工单 F-152 / F-153）。created 2026-11-04 by Claude Opus 5.5
//   结构守卫（grep，不跑行为）；搬家 / 放回图库的行为在 test/home-move.test.ts，真 FSA 在 test/probes/probe-folder-home.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { hasHome, homeState } from "../src/app/gallery-home.ts";

const { readFileSync, readdirSync, statSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };
const ROOT = decodeURIComponent(new URL("..", import.meta.url).pathname);
const read = (rel: string): string => readFileSync(ROOT + rel, "utf8");
function* walk(dir: string): Generator<string> { for (const f of readdirSync(ROOT + dir)) { const p = `${dir}/${f}`; if (statSync(ROOT + p).isDirectory()) yield* walk(p); else if (/\.ts$/.test(f)) yield p; } }
const strip = (x: string): string => x.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
const fnBody = (src: string, head: string): string => { const i = src.indexOf(head); assert(i >= 0, `找不到 ${head}`); const j = src.indexOf("\n}\n", i); return src.slice(i, j); };

describe("homeState（有没有家只判这一处）", () => {
  const f = { folder: false, signedIn: false, accountExpected: false, browserOnlyModels: 0 };
  it("文件夹", () => { eq(homeState({ ...f, folder: true, browserOnlyModels: 3 }), "folder"); assert(hasHome("folder")); });
  it("登录了 / 账号过期（东西在网盘上）都算网盘", () => { eq(homeState({ ...f, signedIn: true }), "cloud"); eq(homeState({ ...f, accountExpected: true }), "cloud"); assert(hasHome("cloud")); });
  it("还有只在浏览器里的：入口不收，但不算有家", () => { eq(homeState({ ...f, browserOnlyModels: 1 }), "browser-only"); assert(!hasHome("browser-only")); });
  it("什么都没有：没有家", () => { eq(homeState(f), "none"); assert(!hasHome("none")); });
});

describe("守卫：图库必须有家（规则书第 13 条）", () => {
  const main = read("src/app/main.ts"), store = read("src/app-store.ts");
  it("createStore 全仓一处，provider 必填", () => {
    const hits: string[] = [];
    for (const p of walk("src")) { const n = strip(read(p)).split("createStore(").length - 1; if (n) hits.push(`${p}:${n}`); }
    eq(hits.join(" "), "src/app-store.ts:1");
    assert(/function buildStore\(o: \{ provider: /.test(store));
    assert(!/provider:\s*null/.test(strip(store)), "不许 provider: null 建库");
  });
  it("用户点图库走 openGalleryFromUi；没有家先选家，不建库", () => {
    assert(/case "gallery": hideCanvasTip\(\); void openGalleryFromUi\(\); break;/.test(main));
    const fn = fnBody(main, "async function openGalleryFromUi");
    assert(/currentHomeState\(\) === "none"\) \{ await chooseHome\(\); return; \}/.test(fn));
    assert(fn.indexOf("chooseHome") < fn.indexOf("galleryHost.open()"));
    eq(strip(main).split("galleryHost.open()").length - 1, 2, "galleryHost.open() 只在 openGalleryFromUi 和开机恢复（有库才走）两处");
  });
  it("「有没有家」只在 currentHomeState 组装一处；放回图库也问它", () => {
    eq(main.split("homeState({").length - 1, 1);
    assert(/if \(!hasHome\(currentHomeState\(\)\)\)/.test(fnBody(main, '$("galleryPutBack").addEventListener')));
  });
  it("选文件夹在点击的同步栈里起跳（每个 pickFolderEntry() 都在 onPick / click 里）；搬完才记到名册、才刷新", () => {
    const calls = strip(main).split("\n").filter((l) => l.includes("pickFolderEntry()"));
    assert(calls.length >= 3, String(calls.length));
    for (const l of calls) assert(/onPick: \(\) => \{ picked = pickFolderEntry\(\); \}|void settleIntoFolder\(pickFolderEntry\(\), "move"\)/.test(l), l.trim());
    const fn = fnBody(main, "async function settleIntoFolder");
    const seq = ["session.leaveGate()", "session.flushLocal()", "runMove(", "rememberFolderHome(", "location.reload()"].map((x) => fn.indexOf(x));
    assert(seq.every((v, i) => v > 0 && (i === 0 || v > seq[i - 1]!)), seq.join());
  });
  it("文件夹家：不走闸门、不走登录路、存不问登录", () => {
    assert(/attached: \(\) => hasStore\(\) && !isFolderHome\(\) && auth\.isAuthConfigured\(\)/.test(main));
    assert(/if \(isFolderHome\(\)\) return Promise\.resolve\(\);/.test(main));
    assert(/session\.home\.kind !== "gallery" \|\| isFolderHome\(\) \|\|/.test(fnBody(main, "function smartSave")));
  });
  it("开机不弹权限（只查）；重新授权只在点击里", () => {
    assert(/ensureFolderPermission\(folderEntry, \{ request: false \}\)/.test(main));
    eq(strip(main).split("{ request: true }").length - 1, 2, "两处：刚选完夹（还在那一下点击的余韵里）+ requestFolderPermission");
    for (const l of strip(main).split("\n").filter((x) => /regrantFolder\(\)/.test(x) && !/function regrantFolder/.test(x))) assert(/onClick: \(\) => \{ regrantFolder\(\); \}|addEventListener\("click", \(\) => regrantFolder\(\)\)|onPick: \(id\) =>/.test(l), l.trim());
  });
  it("文件夹 store：本地即在线，权限 = isOnline；搬家的来源实例永远离线（不会把删除排上云）", () => {
    assert(/signedIn: \(\) => true, isOnline: \(\) => _folder\?\.online \?\? false, databaseId: entry\.dbId/.test(store));
    assert(/buildStore\(\{ provider: od\.provider, signedIn: \(\) => false, isOnline: \(\) => false \}\)/.test(fnBody(store, "export function legacyStore")));
  });
  it("搬家：只有 move 类才从旧库移走，而且在读回比过之后", () => {
    const mv = read("src/app/home-move.ts");
    const fn = fnBody(mv, "export async function moveToHome");
    assert(fn.indexOf("writeNewVerified(") < fn.indexOf('it.kind === "copy"') && fn.indexOf('it.kind === "copy"') < fn.indexOf("removeFromSource("));
    const w = fnBody(mv, "export async function writeNewVerified");
    assert(w.lastIndexOf("p.readBack(name)") > w.indexOf("p.writeNew(name, bytes)") && /sameBytes\(bytes, back\)/.test(w));
  });
  it("OneDrive scope 没动（硬规则 #6）", () => { assert(!/Files\.ReadWrite["'`]|Files\.Read["'`]/.test(strip(read("src/config.ts")))); });
});
