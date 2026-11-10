// 布局归一化表（backend/format/layout.ts）：过去散在 ora.ts 里的兼容分支，现在一张表、一组测试。
// created 2026-09-29 by Claude Fable 5.1（持久化立宪）
import { describe, it, assert, eq } from "./runner.mjs";
import { normalizeLayout, REFERENCES_MANIFEST, REFERENCES_DIR } from "../src/backend/format/layout.ts";
import { migrate, FormatTooNewError, FORMAT } from "../src/backend/format/migrate.ts";

const enc = new TextEncoder(), dec = new TextDecoder();
const b = (...xs) => new Uint8Array(xs);
const json = (o) => enc.encode(JSON.stringify(o));
const parse = (u8) => JSON.parse(dec.decode(u8));
const keys = (f) => Object.keys(f).sort().join("|");

describe("布局归一化 · 幂等", () => {
  it("当前布局的文件跑一遍：零搬动、表逐键相同", () => {
    const cur = {
      "mimetype": b(1), "stack.xml": b(2), "mergedimage.png": b(3), "data/layer1.png": b(4),
      ".weebpaint/timelapse.mp4": b(5), ".weebpaint/timelapse.json": b(6),
      [REFERENCES_MANIFEST]: json({ version: 1, index: 0, items: [{ kind: "image", src: `${REFERENCES_DIR}/r0.jpg`, vp: null }] }),
      [`${REFERENCES_DIR}/r0.jpg`]: b(7),
      ".weebpaint/editor-state.json": json({ version: 1, refPanel: { enabled: true } }),
      "Thumbnails/thumbnail.png": b(8),
    };
    const r = normalizeLayout(cur);
    eq(r.migrated.length, 0, r.migrated.join("; "));
    eq(keys(r.files), keys(cur));
    for (const k of Object.keys(cur)) assert(r.files[k] === cur[k], `${k} 字节对象应当原样`);
  });
  it("归一化两次 = 归一化一次", () => {
    const legacy = { "stack.xml": b(1), ".webpaint/editor-state.json": json({ refPanel: { viewport: { tx: 1, ty: 0, scale: 1, rot: 0 } } }), "weebpaint/reference.png": b(9), "timelapse.mp4": b(3) };
    const once = normalizeLayout(legacy);
    const twice = normalizeLayout(once.files);
    eq(twice.migrated.length, 0); eq(keys(twice.files), keys(once.files));
  });
});

describe("布局归一化 · 旧路径 → 新路径", () => {
  it(".webpaint/ 点目录改名成 .weebpaint/（新名已存在时不覆盖）", () => {
    const r = normalizeLayout({ ".webpaint/editor-state.json": b(1), ".webpaint/timelapse.json": b(2), ".weebpaint/timelapse.json": b(3) });
    assert(r.files[".weebpaint/editor-state.json"] && !r.files[".webpaint/editor-state.json"]);
    eq(r.files[".weebpaint/timelapse.json"][0], 3, "已有的新名赢");
    assert(r.files[".webpaint/timelapse.json"], "输了的旧名原样留着（写端不会写它）");
  });
  it("根目录 timelapse.mp4 搬进 .weebpaint/", () => {
    const r = normalizeLayout({ "timelapse.mp4": b(7) });
    eq(r.files[".weebpaint/timelapse.mp4"][0], 7); assert(!("timelapse.mp4" in r.files));
    eq(r.migrated.join(), "timelapse.mp4 → .weebpaint/timelapse.mp4");
  });
  it("format 2：desk 里的 refPanels 独立成 manifest.json，desk 里那个键消失，清单原文不动", () => {
    const refPanels = { index: 1, items: [{ kind: "image", src: `${REFERENCES_DIR}/r0.jpg`, vp: { tx: 1, ty: 2, scale: 3, rot: 0 } }, { kind: "live", vp: null }] };
    const r = normalizeLayout({ ".weebpaint/editor-state.json": json({ refPanel: { enabled: true }, refPanels, other: 5 }), [`${REFERENCES_DIR}/r0.jpg`]: b(1) });
    eq(dec.decode(r.files[REFERENCES_MANIFEST]), JSON.stringify(refPanels), "清单逐字节 = 原 refPanels");
    const d = parse(r.files[".weebpaint/editor-state.json"]);
    eq(d.refPanels, undefined); eq(d.other, 5); eq(d.refPanel.enabled, true);
  });
  it("format 2 但 refPanels 是空的（从没加过参考）→ 不造空清单，只把键清掉", () => {
    const r = normalizeLayout({ ".weebpaint/editor-state.json": json({ refPanels: { index: 0, items: [] } }) });
    assert(!(REFERENCES_MANIFEST in r.files)); eq(parse(r.files[".weebpaint/editor-state.json"]).refPanels, undefined);
  });
  it("已经有 manifest.json 时不再从 desk 搬（新的赢）", () => {
    const r = normalizeLayout({ [REFERENCES_MANIFEST]: json({ index: 0, items: [{ kind: "live" }] }), ".weebpaint/editor-state.json": json({ refPanels: { index: 0, items: [{ kind: "image", src: "x" }] } }) });
    eq(parse(r.files[REFERENCES_MANIFEST]).items[0].kind, "live");
  });
  it("format ≤1 单张 weebpaint/reference.png → r0.png + 一张卡的清单；老 desk 的视口带上", () => {
    const r = normalizeLayout({ "weebpaint/reference.png": b(9, 9), ".weebpaint/editor-state.json": json({ refPanel: { viewport: { tx: 7, ty: 8, scale: 2, rot: 0 } } }) });
    eq(r.files[`${REFERENCES_DIR}/r0.png`][0], 9); assert(!("weebpaint/reference.png" in r.files));
    const m = parse(r.files[REFERENCES_MANIFEST]);
    eq(m.index, 0); eq(m.items[0].kind, "image"); eq(m.items[0].src, `${REFERENCES_DIR}/r0.png`); eq(m.items[0].vp.scale, 2);
  });
  it("单张 + 老 desk 视口是默认值（从没动过）→ vp 留空让窗口自适应；更老的 webpaint/reference.png 同理", () => {
    const r = normalizeLayout({ "webpaint/reference.png": b(5), ".webpaint/editor-state.json": json({ refPanel: { viewport: { tx: 0, ty: 0, scale: 1, rot: 0 } } }) });
    const m = parse(r.files[REFERENCES_MANIFEST]);
    eq(m.items[0].vp, null); eq(r.files[`${REFERENCES_DIR}/r0.png`][0], 5);
    assert(r.migrated.some((x) => x.startsWith("webpaint/reference.png")), r.migrated.join("; "));
  });
  it("旧轨 webpaint/state.json 原样留着（只读不搬）", () => {
    const r = normalizeLayout({ "webpaint/state.json": b(1) });
    assert(r.files["webpaint/state.json"]); eq(r.migrated.length, 0);
  });
});

describe("子结构拍子（细节见 format-migrate.test.mjs）", () => {
  it("desk 缺 version 当 1；当前版原样通过；major 比 app 新 → FormatTooNewError 带两份拍子", () => {
    eq(migrate("desk", { a: 1 }).json.a, 1);
    eq(migrate("desk", { version: FORMAT.desk.major, a: 2 }).json.a, 2);
    let err = null;
    try { migrate("desk", { version: FORMAT.desk.major + 1 }); } catch (e) { err = e; }
    assert(err instanceof FormatTooNewError, String(err));
    eq(err.component, "desk"); eq(err.fileStamp.major, FORMAT.desk.major + 1); eq(err.appStamp.major, FORMAT.desk.major);
  });
  it("不是对象的输入原样返回（壳层按缺失处理）", () => {
    eq(migrate("desk", undefined).json, undefined); eq(migrate("desk", null).json, null);
  });
});
