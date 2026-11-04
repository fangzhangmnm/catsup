// 搬家、放回图库（家族 ai-docs/20261103-library-needs-a-home.md；工单 F-152 / F-153 / C5）。真库 + 假云盘。created 2026-11-04 by Claude Opus 5.5
//   「有没有家」的判定和接线守卫在 test/gallery-home.test.ts。真 FSA + 真 store 的那半 = test/probes/probe-folder-home.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { createStore } from "@internal/store";
import { createMockEncryption, createMockLocal, createMockProvider } from "@internal/store/testing";
import { moveFinished, moveKindOf, moveSay, moveToHome, NotLandedError, sameBytes, writeNewVerified, type HomeMovePorts, type ModelToMove } from "../src/app/home-move.ts";
import { identifierForFile, putBack, type PutBackPorts } from "../src/app/put-back.ts";

const KINDS = [{ kind: "glb", suffix: ".catsup", container: "raw" as const }];
const kvRaw = () => { const m = new Map<string, string>(); return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => { m.set(k, String(v)); }, remove: (k: string) => { m.delete(k); }, keys: () => [...m.keys()] }; };
const UI = { busy: <T,>(_l: string, fn: () => Promise<T>) => fn(), resolveConflict: async () => "cancel" as const, reportError: () => {} };
const STORE = { docKinds: KINDS, reconcilePolicy: "app-driven", persistence: "none", ui: UI, validateAdopt: () => true, skipMigration: true };
const blob = (s: string): Blob => new Blob([s]);
const text = (b: Blob | null): Promise<string | null> => (b ? b.text() : Promise.resolve(null));
type MockProvider = ReturnType<typeof createMockProvider> & { injectFault(spec: { op?: string; kind: string; status?: number; times?: number }): unknown; _seed(path: string, bytes: string): void };
const moves = (...ids: string[]): ModelToMove[] => ids.map((identifier) => ({ identifier, kind: "move" as const }));

/** 旧库（没登录 = 不碰网）+ 新家（假云盘当文件夹）。端口照 src/app-store.ts homeMovePorts 的形状写（那边住接缝，这里是同一套语义的假件）。 */
function stores() {
  const enc = createMockEncryption();
  const mk = (appId: string, signedIn: () => boolean, provider: unknown) => createStore({ ...STORE, encryption: enc, appId, provider, signedIn, isOnline: () => signedIn(), local: createMockLocal(), kv: kvRaw() } as never);
  const srcProvider = createMockProvider() as MockProvider, destProvider = createMockProvider() as MockProvider;
  const src = mk("src", () => false, srcProvider), dest = mk("dest", () => true, destProvider);
  const readBack = async (id: string): Promise<Blob | null> => { const it = (await destProvider.getItemByPath(`${id}.zip`)) ?? (await destProvider.getItemByPath(id)); return it ? destProvider.download(it.ref) : null; };
  const ports = (over: Partial<HomeMovePorts> = {}): HomeMovePorts => ({
    read: async (id) => { const f = src.file(id, { mode: "existing" }); return ((await f.getEncryptedBlob()) as Blob | null) ?? f.open(); },
    writeNew: async (id, b) => { const w = await dest.file(id, { mode: "new" }).save(b, { tryPush: true }); if (!w.pushed) throw new NotLandedError(id, w.reason); },
    readBack,
    discard: async (id) => { await dest.file(id, { mode: "existing" }).trash(); },
    renamed: (id, n) => id.replace(".catsup", ` (${n}).catsup`),
    removeFromSource: async (id) => { const t = await src.file(id, { mode: "existing" }).trash(); if (t.status !== "trashed") throw new Error(t.status); },
    ...over,
  });
  return { src, dest, destProvider, enc, ports, readBack };
}
const dirtyOf = (s: { files: { dirty: { count(): Promise<number> } } }): Promise<number> => s.files.dirty.count();
const destText = async (p: MockProvider, path: string): Promise<string | null> => { const it = await p.getItemByPath(path); return it ? text(await p.download(it.ref)) : null; };

describe("sameBytes", () => {
  it("大小不同 / 内容不同 / 一样", async () => {
    assert(!(await sameBytes(blob("a"), blob("ab")))); assert(!(await sameBytes(blob("ab"), blob("ac")))); assert(await sameBytes(blob("ab"), blob("ab")));
  });
});

describe("搬家：读 → 写新家 → 读回比 → 才从旧库移走", () => {
  it("两类：从没同步过 = 搬；连着网盘没传上去的 = 拷（旧的不动）；别的不归搬家管", () => {
    eq(moveKindOf("float"), "move"); eq(moveKindOf("local-only"), "move");
    eq(moveKindOf("unpushed"), "copy"); eq(moveKindOf("conflict"), "copy"); eq(moveKindOf("ghost"), "copy");
    eq(moveKindOf("synced"), null); eq(moveKindOf("cloud-only"), null); eq(moveKindOf("newer-on-cloud"), null); eq(moveKindOf(undefined), null);
  });
  it("3 份（含 1 份加密）：新家 3 份字节相等，旧库空", async () => {
    const { src, dest, destProvider, enc, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    await src.file("夹/b.catsup", { mode: "new" }).save(blob("BBB"), { tryPush: false });
    const container = await enc.packContainer({ dataBytes: new TextEncoder().encode("SECRET"), fileName: "c", ext: "catsup", peek: null, password: "pw" });
    await src.file("c.catsup", { mode: "new" }).save(container, { tryPush: false });
    eq(await dirtyOf(src), 3, "前提：只在浏览器里");
    const r = await moveToHome(moves("a.catsup", "夹/b.catsup", "c.catsup"), ports());
    eq(r.moved.length, 3); eq(r.failed.length, 0); eq(r.stuck.length, 0); assert(moveFinished(r));
    eq(await destText(destProvider, "a.catsup"), "AAA");
    eq(await destText(destProvider, "夹/b.catsup"), "BBB");
    assert(await sameBytes((await destProvider.download((await destProvider.getItemByPath("c.catsup.zip"))!.ref)) as Blob, container), "加密件：容器字节原样，夹里名字带 .zip");
    assert(await dest.file("c.catsup", { mode: "existing" }).isEncrypted(), "新家认得是加密的");
    eq(await dirtyOf(src), 0, "旧库不再有欠账");
    eq(await src.file("a.catsup", { mode: "existing" }).open(), null, "旧库移走了");
    eq((await src.files.listTrash()).length, 3, "旧库回收站里还有 3 份（不硬删）");
  });
  it("copy 类：新家有了，旧库那份一个字节不动、不进回收站", async () => {
    const { src, destProvider, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("EDIT"), { tryPush: false });
    const r = await moveToHome([{ identifier: "a.catsup", kind: "copy" }], ports({ removeFromSource: async () => { throw new Error("copy 不许移走旧的"); } }));
    eq(r.copied.length, 1); eq(r.moved.length, 0); assert(moveFinished(r));
    eq(await destText(destProvider, "a.catsup"), "EDIT");
    eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "EDIT");
    eq((await src.files.listTrash()).length, 0);
  });
  it("撞名：新家那份不动，这份加编号", async () => {
    const { src, destProvider, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("MINE"), { tryPush: false });
    destProvider._seed("a.catsup", "THEIRS");
    const r = await moveToHome(moves("a.catsup"), ports());
    eq(r.failed.length, 0); eq(r.moved[0]!.to, "a (2).catsup");
    eq(await destText(destProvider, "a.catsup"), "THEIRS", "新家原来那份没被盖");
    eq(await destText(destProvider, "a (2).catsup"), "MINE");
  });
  it("已经在了（上次搬到一半 / 拷过）：同名同字节 = 算写好，不重写、不加编号，再移走旧的", async () => {
    const { src, destProvider, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("SAME"), { tryPush: false });
    destProvider._seed("a.catsup", "SAME");
    let wrote = 0;
    const p = ports(); const w = p.writeNew;
    const r = await moveToHome(moves("a.catsup"), { ...p, writeNew: async (id, b) => { wrote++; await w(id, b); } });
    eq(wrote, 0, "没重写"); eq(r.moved[0]!.to, "a.catsup"); eq(await src.file("a.catsup", { mode: "existing" }).open(), null);
  });
  it("写不进新家（权限掉了 = 夹拒绝写）：旧库一个字节不动、新家不留半份，名字进失败名单", async () => {
    const { src, dest, destProvider, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    destProvider.injectFault({ op: "upload", kind: "error", status: 403, times: 99 });
    const r = await moveToHome(moves("a.catsup"), ports());
    eq(r.moved.length, 0); eq(r.failed[0]!.identifier, "a.catsup"); assert(!moveFinished(r));
    eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA");
    eq((await src.files.listTrash()).length, 0, "旧库回收站也没动");
    eq(await dest.file("a.catsup", { mode: "existing" }).open(), null, "新家本机缓存那份收走了（不会等权限回来再推一份重复的）");
  });
  it("读回的字节不对：新家那份收走，旧库不动", async () => {
    const { src, dest, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    let n = 0;
    const r = await moveToHome(moves("a.catsup"), ports({ readBack: async () => (n++ === 0 ? null : blob("AAB")) }));
    eq(r.moved.length, 0); assert(/differ/.test(r.failed[0]!.reason));
    eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA", "旧库不动");
    eq(await dest.file("a.catsup", { mode: "existing" }).open(), null, "新家不留坏的");
  });
  it("写完读回不到：一样不移走", async () => {
    const { src, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    const r = await moveToHome(moves("a.catsup"), ports({ readBack: async () => null }));
    eq(r.moved.length, 0); eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA");
  });
  it("移走失败：新家有了，如实记着旧库还有（不丢、不算搬完）", async () => {
    const { src, ports } = stores();
    await src.file("a.catsup", { mode: "new" }).save(blob("AAA"), { tryPush: false });
    const r = await moveToHome(moves("a.catsup"), ports({ removeFromSource: async () => { throw new Error("nope"); } }));
    eq(r.moved.length, 0); eq(r.stuck.map((x) => x.identifier).join(), "a.catsup"); assert(!moveFinished(r));
    eq(await text(await src.file("a.catsup", { mode: "existing" }).open()), "AAA");
  });
  it("一份失败不挡别的", async () => {
    const { src, ports } = stores();
    await src.file("b.catsup", { mode: "new" }).save(blob("B"), { tryPush: false });
    const r = await moveToHome(moves("不存在.catsup", "b.catsup"), ports());
    eq(r.failed.length, 1); eq(r.moved.length, 1);
  });
  it("writeNewVerified：不是撞名、也不是没落地的错直接抛，不换名字、不碰新家", async () => {
    let tried = 0, discarded = 0;
    let err: unknown = null;
    try { await writeNewVerified("a.catsup", blob("x"), { writeNew: async () => { tried++; throw new Error("disk"); }, readBack: async () => null, discard: async () => { discarded++; }, renamed: (i) => i }); } catch (e) { err = e; }
    eq(tried, 1); eq(discarded, 0); assert(err);
  });
  it("说人话：带名单；没搬成的说「一个字节没动」", () => {
    const said = moveSay({ moved: [{ from: "a.catsup", to: "a (2).catsup" }], copied: [], failed: [{ identifier: "夹/b.catsup", reason: "x" }], stuck: [] }, "我的模型", (id) => id.replace(/^.*\//, "").replace(/\.catsup$/, ""));
    assert(said.bad); assert(/1 份搬进了「我的模型」（1 份撞名，加了编号）/.test(said.text), said.text); assert(/1 份没搬成，还在浏览器里，一个字节没动：b/.test(said.text), said.text);
  });
});

describe("放回图库（还是加密的）", () => {
  function rig() {
    const { destProvider, enc } = stores();
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
    return { live, enc, p };
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
  it("同一个文件放回两次：第二次认出同字节，不多出一份", async () => {
    const { live, enc, p } = rig();
    const c = await pack(enc);
    eq((await putBack(c, "猫.catsup", p("pw"))).status, "placed");
    const r = await putBack(c, "猫.catsup", p("pw"));
    eq(r.status === "placed" && r.identifier, "猫.catsup");
    eq(await live.file("猫 (2).catsup", { mode: "existing" }).getEncryptedBlob(), null);
  });
  it("文件名 → 身份", () => {
    eq(identifierForFile("模型.catsup.zip", "", ".catsup"), "模型.catsup");
    eq(identifierForFile("模型.glb.zip", "夹", ".catsup"), "夹/模型.catsup");
    eq(identifierForFile("模型.zip", "", ".catsup"), "模型.catsup");
  });
});
