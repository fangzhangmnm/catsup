// 图库的家：搬家、放回图库（家族 ai-docs/20261103-library-needs-a-home.md；工单 F-152 / F-153 / C5）。真库 + 假云盘。created 2026-11-04 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { createStore } from "@internal/store";
import { createMockEncryption, createMockLocal, createMockProvider } from "@internal/store/testing";
import { moveToHome, sameBytes, writeNewVerified, type HomeMovePorts } from "../src/app/home-move.ts";
import { identifierForFile, putBack, type PutBackPorts } from "../src/app/put-back.ts";
import { hasHome, homeState } from "../src/app/gallery-home.ts";

const { readFileSync, readdirSync, statSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };
const KINDS = [{ kind: "glb", suffix: ".catsup", container: "raw" as const }];
const kvRaw = () => { const m = new Map<string, string>(); return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => { m.set(k, String(v)); }, remove: (k: string) => { m.delete(k); }, keys: () => [...m.keys()] }; };
const UI = { busy: <T,>(_l: string, fn: () => Promise<T>) => fn(), resolveConflict: async () => "cancel" as const, reportError: () => {} };
const STORE = { docKinds: KINDS, reconcilePolicy: "app-driven", persistence: "none", ui: UI, validateAdopt: () => true, skipMigration: true };
const blob = (s: string): Blob => new Blob([s]);
const text = (b: Blob | null): Promise<string | null> => (b ? b.text() : Promise.resolve(null));

function stores(opts: { destPushes?: boolean } = {}) {
  const enc = createMockEncryption();
  const mk = (appId: string, signedIn: () => boolean, provider: unknown) => createStore({ ...STORE, encryption: enc, appId, provider, signedIn, isOnline: () => signedIn(), local: createMockLocal(), kv: kvRaw() } as never);
  const srcProvider = createMockProvider(), destProvider = createMockProvider();
  const src = mk("src", () => false, srcProvider), dest = mk("dest", () => opts.destPushes ?? true, destProvider);
  const ports = (over: Partial<HomeMovePorts> = {}): HomeMovePorts => ({
    read: async (id) => { const f = src.file(id, { mode: "existing" }); return ((await f.getEncryptedBlob()) as Blob | null) ?? f.open(); },
    writeNew: async (id, b) => { const w = await dest.file(id, { mode: "new" }).save(b, { tryPush: true }); if (!w.pushed) throw new Error("没写进新家"); },
    readBack: async (id) => { const it = (await destProvider.getItemByPath(`${id}.zip`)) ?? (await destProvider.getItemByPath(id)); return it ? destProvider.download(it.ref) : null; },
    discard: async (id) => { await dest.file(id, { mode: "existing" }).trash(); },
    renamed: (id, n) => id.replace(".catsup", ` (${n}).catsup`),
    removeFromSource: async (id) => { const t = await src.file(id, { mode: "existing" }).trash(); if (t.status === "cancelled" || t.status === "noop") throw new Error(t.status); },
    ...over,
  });
  return { src, dest, destProvider, enc, ports };
}
const dirtyOf = (s: { files: { dirty: { count(): Promise<number> } } }): Promise<number> => s.files.dirty.count();

describe("homeState（有没有家只判这一处）", () => {
  const f = { folder: false, signedIn: false, accountExpected: false, browserOnlyModels: 0 };
  it("文件夹", () => { eq(homeState({ ...f, folder: true, browserOnlyModels: 3 }), "folder"); assert(hasHome("folder")); });
  it("登录了 / 账号过期（东西在网盘上）都算网盘", () => { eq(homeState({ ...f, signedIn: true }), "cloud"); eq(homeState({ ...f, accountExpected: true }), "cloud"); assert(hasHome("cloud")); });
  it("还有只在浏览器里的：入口不收，但不算有家", () => { eq(homeState({ ...f, browserOnlyModels: 1 }), "browser-only"); assert(!hasHome("browser-only")); });
  it("什么都没有：没有家", () => { eq(homeState(f), "none"); assert(!hasHome("none")); });
});

describe("sameBytes", () => {
  it("大小不同 / 内容不同 / 一样", async () => {
    assert(!(await sameBytes(blob("a"), blob("ab")))); assert(!(await sameBytes(blob("ab"), blob("ac")))); assert(await sameBytes(blob("ab"), blob("ab")));
  });
});

describe("搬家：读 → 写新家 → 读回比 → 才从旧库移走", () => {
  it("3 份（含 1 份加密）：新家 3 份字节相等，旧库空", async () => {
    const { src, dest, destProvider, enc, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    await src.file("夹/b.catsup", { mode: "new" }).save(blob("BBB"), { tryPush: false });
    const container = await enc.packContainer({ dataBytes: new TextEncoder().encode("SECRET"), fileName: "c", ext: "catsup", peek: null, password: "pw" });
    await src.file("c.catsup", { mode: "new" }).save(container, { tryPush: false });
    eq(await dirtyOf(src), 3, "前提：只在浏览器里");
    const r = await moveToHome(["a.catsup", "夹/b.catsup", "c.catsup"], ports());
    eq(r.moved.length, 3); eq(r.failed.length, 0); eq(r.leftInSource.length, 0);
    eq(await text(await destProvider.download((await destProvider.getItemByPath("a.catsup"))!.ref)), "AAA");
    eq(await text(await destProvider.download((await destProvider.getItemByPath("夹/b.catsup"))!.ref)), "BBB");
    assert(await sameBytes((await destProvider.download((await destProvider.getItemByPath("c.catsup.zip"))!.ref)) as Blob, container), "加密件：容器字节原样，云端名带 .zip");
    assert(await dest.file("c.catsup", { mode: "existing" }).isEncrypted(), "新家认得是加密的");
    eq(await dirtyOf(src), 0, "旧库不再有欠账");
    eq(await src.file("a.catsup", { mode: "existing" }).open(), null, "旧库移走了");
    eq((await src.files.listTrash()).length, 3, "旧库回收站里还有 3 份（不硬删）");
  });
  it("撞名：新家那份不动，这份加编号", async () => {
    const { src, destProvider, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("MINE"), { tryPush: false });
    destProvider._seed("a.catsup", "THEIRS");
    const r = await moveToHome(["a.catsup"], ports());
    eq(r.failed.length, 0); eq(r.moved[0]!.to, "a (2).catsup");
    eq(await text(await destProvider.download((await destProvider.getItemByPath("a.catsup"))!.ref)), "THEIRS", "新家原来那份没被盖");
    eq(await text(await destProvider.download((await destProvider.getItemByPath("a (2).catsup"))!.ref)), "MINE");
  });
  it("写不进新家（权限掉了）：旧库一个字节不动，名字进失败名单", async () => {
    const { src, ports } = stores({ destPushes: false });
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    const r = await moveToHome(["a.catsup"], ports());
    eq(r.moved.length, 0); eq(r.failed[0]!.identifier, "a.catsup");
    eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA");
  });
  it("读回的字节不对：新家那份收走，旧库不动", async () => {
    const { src, dest, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    const r = await moveToHome(["a.catsup"], ports({ readBack: async () => blob("AAB") }));
    eq(r.moved.length, 0); assert(/differ/.test(r.failed[0]!.reason));
    eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA", "旧库不动");
    eq(await dest.file("a.catsup", { mode: "existing" }).open(), null, "新家不留坏的");
  });
  it("读回不到：一样不移走", async () => {
    const { src, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    const r = await moveToHome(["a.catsup"], ports({ readBack: async () => null }));
    eq(r.moved.length, 0); eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA");
  });
  it("移走失败：算搬成了但如实记着旧库还有（不丢）", async () => {
    const { src, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    const r = await moveToHome(["a.catsup"], ports({ removeFromSource: async () => { throw new Error("nope"); } }));
    eq(r.moved.length, 1); eq(r.leftInSource.join(), "a.catsup");
    eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA");
  });
  it("一份失败不挡别的", async () => {
    const { src, ports } = stores();
    await src.file("b.catsup", { mode: "new" }).save(blob("B"), { tryPush: false });
    const r = await moveToHome(["不存在.catsup", "b.catsup"], ports());
    eq(r.failed.length, 1); eq(r.moved.length, 1);
  });
  it("writeNewVerified：不是撞名的错直接抛，不乱换名字", async () => {
    let tried = 0;
    let err: unknown = null;
    try { await writeNewVerified("a.catsup", blob("x"), { writeNew: async () => { tried++; throw new Error("disk"); }, readBack: async () => null, discard: async () => {}, renamed: (i) => i }); } catch (e) { err = e; }
    eq(tried, 1); assert(err);
  });
});

describe("放回图库（还是加密的）", () => {
  function rig() {
    const { src: store, destProvider, enc, ports } = stores();
    const live = createStore({ ...STORE, encryption: enc, appId: "live", provider: destProvider, signedIn: () => true, isOnline: () => true, local: createMockLocal(), kv: kvRaw() } as never);
    const p = (pw: string | null, over: Partial<PutBackPorts> = {}): PutBackPorts => ({
      isContainer: (b) => enc.looksEncryptedContainer(b),
      unlock: async (b) => { if (pw == null) return null; const u = await enc.unpackContainer(b, pw).catch(() => null); return u ? { pw, plain: u.dataBlob } : null; },
      isModel: async () => true,
      writeNew: async (id, b) => { await live.file(id, { mode: "new" }).save(b, { tryPush: true }); },
      readBack: async (id) => (await live.file(id, { mode: "existing" }).getEncryptedBlob()) as Blob | null,
      discard: async (id) => { await live.file(id, { mode: "existing" }).trash(); },
      renamed: (id, n) => id.replace(".catsup", ` (${n}).catsup`),
      ...over,
    });
    return { store, live, enc, p, ports };
  }
  const pack = (enc: ReturnType<typeof createMockEncryption>) => enc.packContainer({ dataBytes: new TextEncoder().encode("MODEL"), fileName: "猫", ext: "catsup", peek: null, password: "pw" });
  it("口令对：图库里的字节 == 导出的容器字节（不重新封、没有明文）", async () => {
    const { live, enc, p } = rig();
    const c = await pack(enc);
    const r = await putBack(c, "猫.catsup", p("pw"));
    eq(r.status, "placed");
    assert(await sameBytes((await live.file("猫.catsup", { mode: "existing" }).getEncryptedBlob()) as Blob, c));
    assert(await live.file("猫.catsup", { mode: "existing" }).isEncrypted());
  });
  it("口令错 / 取消：不放进去", async () => {
    const { live, enc, p } = rig();
    eq((await putBack(await pack(enc), "猫.catsup", p(null))).status, "cancelled");
    eq(await live.file("猫.catsup", { mode: "existing" }).getEncryptedBlob(), null);
  });
  it("不是加密文件 / 里面不是 CatsUp 工程：不放进去", async () => {
    const { live, enc, p } = rig();
    eq((await putBack(blob("plain"), "x.catsup", p("pw"))).status, "not-container");
    eq((await putBack(await pack(enc), "猫.catsup", p("pw", { isModel: async () => false }))).status, "not-a-model");
    eq(await live.file("猫.catsup", { mode: "existing" }).getEncryptedBlob(), null);
  });
  it("撞名：加编号，原来那份不动", async () => {
    const { live, enc, p } = rig();
    await live.file("猫.catsup", { mode: "new" }).save(blob("原来的"), { tryPush: true });
    const r = await putBack(await pack(enc), "猫.catsup", p("pw"));
    eq(r.status, "placed"); eq(r.status === "placed" && r.identifier, "猫 (2).catsup");
    eq(await text(await live.file("猫.catsup", { mode: "existing" }).open()), "原来的");
  });
  it("文件名 → 身份", () => {
    eq(identifierForFile("模型.catsup.zip", "", ".catsup"), "模型.catsup");
    eq(identifierForFile("模型.glb.zip", "夹", ".catsup"), "夹/模型.catsup");
    eq(identifierForFile("模型.zip", "", ".catsup"), "模型.catsup");
  });
});

describe("守卫：图库必须有家（规则书第 13 条）", () => {
  function* walk(dir: string): Generator<string> { for (const f of readdirSync(dir)) { const p = `${dir}/${f}`; if (statSync(p).isDirectory()) yield* walk(p); else if (/\.ts$/.test(f)) yield p; } }
  const strip = (x: string): string => x.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
  const main = readFileSync("src/app/main.ts", "utf8");
  it("createStore 全仓一处，provider 必填", () => {
    const hits: string[] = [];
    for (const p of walk("src")) { const n = strip(readFileSync(p, "utf8")).split("createStore(").length - 1; if (n) hits.push(`${p}:${n}`); }
    eq(hits.join(" "), "src/app-store.ts:1");
    assert(/function buildStore\(o: \{ provider: /.test(readFileSync("src/app-store.ts", "utf8")));
  });
  it("用户点图库走 openGalleryFromUi；没有家先选家，不建库", () => {
    assert(/case "gallery": hideCanvasTip\(\); void openGalleryFromUi\(\); break;/.test(main));
    const fn = main.slice(main.indexOf("async function openGalleryFromUi"), main.indexOf("async function chooseHome"));
    assert(/currentHomeState\(\) === "none"\) \{ await chooseHome\(\); return; \}/.test(fn));
    assert(fn.indexOf("chooseHome") < fn.indexOf("galleryHost.open()"));
  });
  it("「有没有家」只在 currentHomeState 组装一处", () => {
    eq(main.split("homeState({").length - 1, 1);
  });
  it("选文件夹在点击的同步栈里起跳；搬完才记到名册、才刷新", () => {
    assert(/value: "folder" as const, onPick: \(\) => \{ picked = pickFolderEntry\(\); \}/.test(main));
    assert(/void settleIntoFolder\(pickFolderEntry\(\)\)/.test(main));
    const fn = main.slice(main.indexOf("async function settleIntoFolder"), main.indexOf("/** 「搬进 X"));
    const seq = ["session.leaveGate()", "session.flushLocal()", "offerMove(", "rememberFolderHome(", "location.reload()"].map((x) => fn.indexOf(x));
    assert(seq.every((v, i) => v > 0 && (i === 0 || v > seq[i - 1]!)), seq.join());
  });
  it("文件夹家：不走闸门、不走登录路", () => {
    assert(/attached: \(\) => hasStore\(\) && !isFolderHome\(\) && auth\.isAuthConfigured\(\)/.test(main));
    assert(/if \(isFolderHome\(\)\) return Promise\.resolve\(\);/.test(main));
  });
  it("开机不弹权限（只查）；重新授权才弹，在点击里", () => {
    assert(/ensureFolderPermission\(folderEntry, \{ request: false \}\)/.test(main));
    assert(/label: "授权", primary: true, onClick: \(\) => \{\s*\n\s*void ensureFolderPermission\(entry, \{ request: true \}\)/.test(main));
  });
  it("OneDrive scope 没动（硬规则 #6）", () => { assert(!/Files\.ReadWrite["'`]|Files\.Read["'`]/.test(strip(readFileSync("src/config.ts", "utf8")))); });
});
