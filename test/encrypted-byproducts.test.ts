// 加密件的副产品只存密文（家族规则书 §1 第 5 条；工单 C2 ①②③）+ 没登录的图库出口（④）。真 7z 容器在 test/probes/probe-password.mjs 里走真 bundle。
// created 2026-11-03 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { createCrashStore, type CrashKV, type CrashRecord } from "../src/app/crash-store.ts";
import { shadowFrame, type SealPorts } from "../src/app/shadow-seal.ts";
import { traceLine, noCoords } from "../src/app/debug-lines.ts";
import { exportAll, exportAllSay, type ExportAllPorts } from "../src/app/export-all.ts";

const { readFileSync, readdirSync } = (await import("node:fs" as string)) as { readFileSync: (p: string, e: string) => string; readdirSync: (p: string) => string[] };

function mapKV(): CrashKV & { m: Map<string, CrashRecord> } {
  const m = new Map<string, CrashRecord>();
  return {
    m,
    async put(r) { m.set(r.tag, r); },
    async get(t) { return m.get(t) ?? null; },
    async take(t) { const r = m.get(t) ?? null; if (r) m.delete(t); return r; },
    async delete(t) { m.delete(t); },
    async list() { return [...m.values()]; },
  };
}
const MODEL = new TextEncoder().encode("明文模型字节");
const CONTAINER_MARK = "PK-容器";
/** 假封口：结果带记号；真 pack 换成坏的（吐明文）时 isContainer 拦下。 */
const ports = (pack?: SealPorts["pack"]): SealPorts & { packed: string[] } => {
  const packed: string[] = [];
  return {
    packed,
    pack: pack ?? (async (_b, pw) => { packed.push(pw); return new Blob([CONTAINER_MARK]); }),
    isContainer: async (b) => (await b.text()) === CONTAINER_MARK,
  };
};

describe("崩溃影子封口（C2 ①）", () => {
  it("普通模型：原字节，不碰口令", async () => {
    const p = ports();
    const f = await shadowFrame(MODEL, null, p);
    eq(await f!.text(), "明文模型字节");
    eq(p.packed.length, 0);
  });
  it("解开的加密件：影子是容器，用的是解开它的那个口令", async () => {
    const p = ports(), kv = mapKV(), cs = createCrashStore(kv);
    const f = await shadowFrame(MODEL, { pw: "本地口令" }, p);
    assert(f, "有口令就该有一帧");
    await cs.put("t", f!, { state: "crash", name: "房子", at: 1, homeKind: "transient" });
    eq(p.packed.join(), "本地口令");
    const stored = await kv.m.get("t")!.bytes.text();
    eq(stored, CONTAINER_MARK);
    assert(!stored.includes("明文"), "库里不许有明文");
  });
  it("口令被忘掉：这一拍不写，也不降级明文", async () => {
    const p = ports();
    eq(await shadowFrame(MODEL, { pw: null }, p), null);
    eq(p.packed.length, 0);
  });
  it("打包吐出来的不是容器：当做不到，不写", async () => {
    eq(await shadowFrame(MODEL, { pw: "x" }, ports(async (b) => new Blob([b as BlobPart]))), null);
  });
  it("结构守卫：session 只有一个 crashStore.put，吃的是 shadowFrame 的结果", () => {
    const src = readFileSync("src/app/session.ts", "utf8");
    eq(src.split("crashStore.put(").length - 1, 1, "session 里 crashStore.put 只许一处");
    assert(/const frame = await shadowFrame\(/.test(src) && /crashStore\.put\(tag, frame,/.test(src), "put 的必须是 shadowFrame 的结果");
    assert(/hasStore\(\) && !seal/.test(src), "封口帧恢复不许进图库（`<名>-恢复` 会是明文）");
    const rec = readFileSync("src/app/crash-recovery.ts", "utf8");
    eq(rec.split("crashStore.put(").length - 1, 1, "恢复路只有 putBack（放回原字节）");
  });
});

describe("黑匣子不记坐标（C2 ②）", () => {
  const P = { x: 12.3456, y: -7.5, z: 1e-3 };
  it("失败行只有形状：动词 + 条数 + 大致字节数", () => {
    const line = traceLine({ kind: "fail", where: "commit", op: { op: "addEdges", segs: [[P, P]] }, message: "boom" });
    assert(line.startsWith("FAIL commit: boom op=addEdges segs=1 ~"), line);
    assert(!line.includes("12.3456") && !line.includes("{"), line);
  });
  it("失败行里出错文案带的坐标也抹掉", () => {
    const line = traceLine({ kind: "fail", where: "commit", op: null, message: "bad vertex at 12.346,-7.500,0.001" });
    eq(line, "FAIL commit: bad vertex at … op=-");
  });
  it("op 行：describeOp 的样本坐标（move 的 Δ）不进黑匣子", () => {
    const line = traceLine({ kind: "op", op: { op: "move", moves: [{ from: { x: 0, y: 0, z: 0 }, to: P }] }, events: 1, ms: 1, position: 2 });
    assert(!line.includes("12.346"), line);
    assert(line.startsWith("move verts=1"), line);
  });
  it("noCoords：三元组和 JSON 坐标都抹，普通文字不动", () => {
    eq(noCoords("op target vanished: face [(1.5,-2,3e-3) (0,0,0)]"), "op target vanished: face [(…) (…)]");
    eq(noCoords('{"x":12.5,"y":-3,"z":0}'), "{…,…,…}");
    eq(noCoords("store 2.2.3 bytes=123"), "store 2.2.3 bytes=123");
  });
  it("坏 op 让摘要炸掉时失败行不许再炸", () => {
    const line = traceLine({ kind: "fail", where: "commit", op: { op: "addEdges" } as never, message: "boom" });
    assert(line.startsWith("FAIL commit: boom op="), line);
  });
  it("写入总闸：record / note 都过 noCoords，不许绕开直接用 diagLog", () => {
    const src = readFileSync("src/app/debug-log.ts", "utf8");
    assert(/record[^\n]*=>\s*diagLog\.record\(level, noCoords\(text\)\)/.test(src), "record 要过 noCoords");
    assert(/note[^\n]*=>\s*diagLog\.note\(tag, noCoords\(msg\)\)/.test(src), "note 要过 noCoords");
    for (const f of readdirSync("src/app")) if (f.endsWith(".ts") && f !== "debug-log.ts") assert(!/\bdiagLog\b/.test(readFileSync(`src/app/${f}`, "utf8")), `${f} 不许直接写 diagLog`);
  });
  it("结构守卫：黑匣子写入路径不序列化 op", () => {
    const op = /JSON\.stringify\(\s*(?:e\.|ev\.|t\.)?op\b/;
    assert(!op.test(readFileSync("src/app/debug-lines.ts", "utf8")), "debug-lines 不许 JSON.stringify(op");
    for (const f of readdirSync("src/app")) if (f.endsWith(".ts")) assert(!op.test(readFileSync(`src/app/${f}`, "utf8")), `${f} 不许 JSON.stringify(op`);
  });
});

describe("加密 / 解除后封面作废（C2 ③）", () => {
  it("结构守卫：session 两个成功点都作废封面；gallery-host 没挂库也不是空操作", () => {
    const src = readFileSync("src/app/session.ts", "utf8");
    assert(/ok = true; this\.encrypted = true;\s*\n\s*await this\.dropThumb\(path\);/.test(src), "加密成功要作废封面");
    assert(/ok = true; this\.encrypted = false;\s*\n\s*await this\.dropThumb\(path\);/.test(src), "解除成功要作废封面");
    const host = readFileSync("src/app/gallery-host.ts", "utf8");
    assert(/invalidateThumb:[^\n]*ensureMounted\(\)\.thumbs\?\.invalidate/.test(host), "invalidateThumb 必须先挂库");
  });
});

describe("这份是不是加密的，以 open 之后为准（F-148）", () => {
  const src = readFileSync("src/app/session.ts", "utf8");
  it("库的 isEncrypted 看本地字节：第二台设备第一次开，open 之前是假的；所以每个换字节的地方都要再看一次", () => {
    assert(/\/\*\* 本地字节是否加密容器。 \*\/\s*\n\s*isEncrypted\(\)/.test(readFileSync("node_modules/@internal/store/dist/create-store.d.ts", "utf8")), "库的语义变了要重审这条");
    const adopts = src.split("\n").filter((l) => /this\.adopt\(new Uint8Array\(await \w+\.arrayBuffer\(\)\)\)/.test(l));
    assert(adopts.length >= 4, `从库拿字节的地方：${adopts.length}`);
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!/this\.adopt\(new Uint8Array\(await \w+\.arrayBuffer\(\)\)\)/.test(lines[i]!) || /r\.plain/.test(lines[i]!)) continue;
      const window = lines.slice(i, i + 4).join("\n");
      assert(/this\.noteEncryption\(/.test(window), `换字节之后没有再看一次：${lines[i]!.trim().slice(0, 80)}`);
    }
  });
  it("openFromGallery：不许把开之前的判断直接写进 this.encrypted", () => {
    const body = src.slice(src.indexOf("async openFromGallery"), src.indexOf("private async noteEncryption"));
    assert(!/this\.encrypted = (enc|before)/.test(body), "开之前问的不算数");
    assert(/await this\.noteEncryption\(path, before\)/.test(body));
  });
  it("全部导出只收这台有字节的（库的 isCached，经接缝）", () => {
    assert(/snap\.items\.filter\(\(i\) => isCached\(i\.syncState\)\)/.test(readFileSync("src/app/main.ts", "utf8")));
  });
});

describe("全部导出（C2 ④）", () => {
  const lib: Record<string, { identifiers: string[]; folders: string[] }> = {
    "": { identifiers: ["a.catsup", "secret.catsup"], folders: ["房子"] },
    "房子": { identifiers: ["房子/b.catsup"], folders: [] },
  };
  const P = (over: Partial<ExportAllPorts> = {}): ExportAllPorts & { packed: { path: string; data: Uint8Array }[]; opened: string[] } => {
    const packed: { path: string; data: Uint8Array }[] = [], opened: string[] = [];
    return {
      packed, opened,
      listFolder: async (f) => lib[f]!,
      encryptedBytes: async (id) => (id === "secret.catsup" ? new Blob(["容器字节"]) : null),
      plainBytes: async (id) => { opened.push(id); return new Blob([`明文:${id}`]); },
      pack: async (e) => { packed.push(...e); return new Blob(["zip"]); },
      ...over,
    };
  };
  it("走遍子文件夹；加密件搬密文、不解开", async () => {
    const p = P();
    const r = await exportAll(p);
    eq(r.plain, 2); eq(r.encrypted, 1); eq(r.failed.length, 0);
    eq(p.packed.map((e) => e.path).sort().join(), ["a.catsup", "secret.catsup.zip", "房子/b.catsup"].sort().join());
    assert(!p.opened.includes("secret.catsup"), "加密件不许走 open（那是明文）");
    eq(new TextDecoder().decode(p.packed.find((e) => e.path === "secret.catsup.zip")!.data), "容器字节");
  });
  it("拿不到的进名单，不谎报全部成功", async () => {
    const r = await exportAll(P({ plainBytes: async (id) => (id === "a.catsup" ? null : new Blob(["x"])) }));
    eq(r.failed.join(), "a.catsup");
    const said = exportAllSay(r, "x.zip");
    assert(said.bad && said.text.includes("a.catsup") && said.text.includes("只导出了"), said.text);
  });
  it("空图库：不打包，说清楚", async () => {
    const p = P({ listFolder: async () => ({ identifiers: [], folders: [] }) });
    const r = await exportAll(p);
    eq(r.zip, null);
    eq(exportAllSay(r, "x.zip").text, "图库里还没有模型");
  });
  it("结果里说明加密的还是加密的", () => {
    const t = exportAllSay({ zip: new Blob(["z"]), plain: 1, encrypted: 2, failed: [] }, "x.zip").text;
    assert(t.includes("3 份") && t.includes("2 份是加密的"), t);
  });
});

describe("加密作品出门（规则书 §1 第 5 条；user 11-03；工单 C4）", () => {
  const src = readFileSync("src/app/session.ts", "utf8"), main = readFileSync("src/app/main.ts", "utf8");
  const bodyOf = (head: string): string => { const i = src.indexOf(head); assert(i >= 0, head); return src.slice(i, src.indexOf("\n  }\n", i)); };
  it("导出工程文件 / 另存到磁盘：加密作品先问形式，默认（primary）是容器，明文选项上写着那句话", () => {
    const form = bodyOf("private chooseExitForm(");
    assert(/label: "加密文件（原口令才能打开）", value: "container" as const, primary: true/.test(form), "默认容器");
    assert(/label: `明文文件（\$\{PLAIN_NOTE\}）`, value: "plain" as const/.test(form), "明文选项写明");
    assert(!/value: "plain"[^\n]*primary/.test(form), "明文不是默认");
    eq(/const PLAIN_NOTE = "这份是明文、没有加密";/.test(src), true);
    assert(/if \(this\.encrypted \|\| this\.seal\) \{\s*\n\s*const form = await this\.chooseExitForm\("导出工程文件"\);/.test(bodyOf("async exportProject()")), "导出工程");
    assert(/if \(seal\) \{[^\n]*\n\s*const form = await this\.chooseExitForm\("另存到磁盘"\);/.test(bodyOf("async settleToFile()")), "另存");
  });
  it("容器字节：图库家搬 at-rest 的容器（不是解开再封），解开的本地件同一口令封，都不走 encode 明文直出", () => {
    const c = bodyOf("private async containerNow()");
    assert(/docFile\(path\)\.getEncryptedBlob\(\)/.test(c), "搬容器");
    assert(/shadowFrame\(await this\.encodeNow\(\), this\.seal, this\.sealPorts\(\)\)/.test(c), "同一口令封");   // 1-8b 起编码是异步的（钉点 + 编码）
  });
  it("加密文件家写回只写容器；口令忘掉就不写", () => {
    const s = src.slice(src.indexOf('if (home.kind === "file") {'), src.indexOf("// 图库家。implicit（自动保存"));
    assert(/if \(this\.sealFile\) \{[\s\S]*?const c = await shadowFrame\(bytes, this\.seal, this\.sealPorts\(\)\);\s*\n\s*if \(!c\)[^\n]*return false; \}/.test(s));
  });
  it("给别的软件的格式：下载前必经那句话（glb / OBJ / 复现包）", () => {
    assert(/if \(!\(await session\.confirmPlainExit\(v\.format === "obj" \? "OBJ" : "glb"\)\)\) return;/.test(main), "模型导出");
    eq((main.match(/session\.confirmPlainExit\("复现包"\)\.then\(\(go\) => \{ if \(go\) void reproExport\(/g) ?? []).length, 2, "两个复现包");
    assert(!/onClick: \(\) => \{ void reproExport\(/.test(main), "复现包不许绕过");
  });
  it("session 里每个下载都在这些路上（新加出口要过这条）", () => {
    const n = (src.match(/this\.download\(/g) ?? []).length;
    eq(n, 5, "文件家无句柄 + 另存下载 + 导出容器 + 导出明文 + glb");
  });
});

describe("重新登录走点击的同步栈（iOS 红线；工单 C4）", () => {
  const main = readFileSync("src/app/main.ts", "utf8");
  it("闸门按钮 onPick 直接调 h.signIn；Promise 续体里不再调", () => {
    const m = /showBlocked: \(reason, h\) => showGateCover\(([\s\S]*?)\n    \}\),/.exec(main); assert(m, "showBlocked");
    assert(/value: "signin", primary: true, onPick: \(\) => h\.signIn\(\)/.test(m![1]), "同步栈");
    eq((m![1].match(/h\.signIn\(\)/g) ?? []).length, 1, "只这一处");
  });
  it("signIn 调用前不许有 await：cloudSignIn 没有要落影子的改动时同步起跳", () => {
    const i = main.indexOf("function cloudSignIn(): void {"); assert(i > 0);
    const body = main.slice(i, main.indexOf("\nasync function cloudSignOut", i));
    assert(!/\bawait\b/.test(body), "cloudSignIn 里不许 await");
    assert(/\} else go\(\);/.test(body), "无影子要留 = 同步栈里 go");
    assert(/onPick\?\.\(\); finish\(e, a\.value\);/.test(readFileSync("src/app/ui/gate-stack.ts", "utf8")), "pick 先 onPick 再 resolve");
  });
});

describe("更新重载不打断开着的面（工单 C4，照 MoonSinger H2）", () => {
  it("面开着不计时；关了再给 ≤ 5 s；开过又关了重新算", () => {
    const src = readFileSync("src/app/session.ts", "utf8");
    const i = src.indexOf("async flushBeforeReload()"); const body = src.slice(i, src.indexOf("\n  }\n", i));
    assert(/if \(isAnyFaceUp\(\)\) await whenFacesClosed\(\);/.test(body), "开始前有面：等");
    assert(/if \(isAnyFaceUp\(\)\) \{ await whenFacesClosed\(\); seen = faceGeneration\(\); waitMs = RELOAD_PUSH_WAIT_MS; continue; \}/.test(body), "等的时候开了面");
    assert(/if \(faceGeneration\(\) !== seen\) \{ seen = faceGeneration\(\); waitMs = RELOAD_PUSH_WAIT_MS; continue; \}/.test(body), "开过又关了");
  });
});
