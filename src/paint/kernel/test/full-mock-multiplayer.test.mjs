// C8 ⑤ 全量层 · mock multiplayer：**两个 backend 共享同一个 SoftGl2Port**（注入共享 Port 的
// 多租户形——embedding/multiplayer 的第二真租户雏形）。守：
//   ① 租户隔离：交错作画（stroke/filter/undo 互相穿插）后，各租户字节 = 各自 solo 参考跑逐位
//     （共享 Port 的 arena/FBO 池不串台——v0.8.33 多播观察者+所有权戳在栅格域的延伸验收）
//   ② 令牌墙 per-backend：A 开着 stroke 时 B 照画不误（跨租户互斥结构上不存在——接口文件 wire 裁定）；
//     A 自己的 undo 仍被自家墙挡
//   ③ 先 dispose A，B 继续画/导出照常（退租不拖累邻居）
import { describe, it, assert, eq } from "./runner.mjs";

const { WeebPaintBackend } = await import("../src/backend/weebpaint-backend.ts");
const { SoftGl2Port } = await import("../src/backend/soft-gl2-port.ts");

const bytesEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const layerBytes = (be, W, H) => be.wp2.layerTiles.getRegion(be.docInfo().activeId, 0, 0, W, H);

const pts = (n, x0, y0, dx, dy, p = 0.8) => {
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { a[i*4] = x0 + i*dx; a[i*4+1] = y0 + i*dy; a[i*4+2] = p; a[i*4+3] = i * 16; }
  return a;
};
const BRUSH_A = { size: 30, color: "#c04020", opacity: 1, streamline: 0.2, pressureLPF: 30 };
const BRUSH_B = { size: 18, color: "#2060c0", opacity: 0.9, streamline: 0 };
const W = 160, H = 120;

// 租户 A 的完整剧本（对 be 顺序执行；solo 参考跑与共享跑吃同一份）
function scriptA(be) {
  const s1 = be.strokeBegin(1, BRUSH_A);
  be.strokeAppend(s1, pts(10, 20, 20, 12, 9));
  be.strokeEnd(s1);
  const f = be.filterBegin(1, "hsb");
  be.filterSetParams(f, { brightness: 25 });
  be.filterCommit(f);
  const s2 = be.strokeBegin(1, { ...BRUSH_A, mode: "erase", size: 20 });
  be.strokeAppend(s2, pts(5, 40, 40, 15, 8));
  be.strokeEnd(s2);
}
function scriptB(be) {
  const s1 = be.strokeBegin(1, BRUSH_B);
  be.strokeAppend(s1, pts(8, 100, 90, -9, -8));
  be.strokeEnd(s1);
  const s2 = be.strokeBegin(1, { ...BRUSH_B, pixelMode: true, size: 8 });
  be.strokeAppend(s2, pts(6, 30, 90, 14, -6, 1));
  be.strokeEnd(s2);
  be.undo();   // pixel 笔撤回（栈形状也进对拍——undo 后字节与 solo 一致才算隔离）
}

describe("full · mock multiplayer（共享 SoftGl2Port 双租户）", () => {
  it("交错作画字节 = 各自 solo 参考逐位；per-backend 令牌墙；dispose A 不拖累 B", async () => {
    // ── solo 参考（各自独享 Port）──
    const ref1 = WeebPaintBackend.blank({ width: W, height: H }, { gl: new SoftGl2Port() });
    scriptA(ref1);
    const soloA = layerBytes(ref1, W, H);
    ref1.dispose();
    const ref2 = WeebPaintBackend.blank({ width: W, height: H }, { gl: new SoftGl2Port() });
    scriptB(ref2);
    const soloB = layerBytes(ref2, W, H);
    ref2.dispose();

    // ── 共享 Port 交错跑（步级穿插：A begin→B 整笔→A append/end→B filter 期间 A 画……）──
    const port = new SoftGl2Port();
    const A = WeebPaintBackend.blank({ width: W, height: H }, { gl: port });
    const B = WeebPaintBackend.blank({ width: W, height: H }, { gl: port });
    // A 的第一笔拆开，中间塞 B 的整笔（②：A open stroke 期间 B 照画不误 = 跨租户互斥不存在）
    const a1 = A.strokeBegin(1, BRUSH_A);
    A.strokeAppend(a1, pts(4, 20, 20, 12, 9));
    const b1 = B.strokeBegin(1, BRUSH_B);
    B.strokeAppend(b1, pts(8, 100, 90, -9, -8));
    B.strokeEnd(b1);
    // A 自家墙照挡自家 undo
    let walled = false;
    try { A.undo(); } catch { walled = true; }
    assert(walled, "A open stroke → A.undo 被自家令牌墙挡");
    A.strokeAppend(a1, pts(10, 20, 20, 12, 9).slice(16));   // 续 A 第一笔（点序列 = solo 的后 6 点）
    A.strokeEnd(a1);
    // A filter 事务开着时 B 画 pixel 笔 + undo
    const af = A.filterBegin(1, "hsb");
    A.filterSetParams(af, { brightness: 25 });
    const b2 = B.strokeBegin(1, { ...BRUSH_B, pixelMode: true, size: 8 });
    B.strokeAppend(b2, pts(6, 30, 90, 14, -6, 1));
    B.strokeEnd(b2);
    B.undo();
    A.filterCommit(af);
    // A 收尾 erase 笔
    const a2 = A.strokeBegin(1, { ...BRUSH_A, mode: "erase", size: 20 });
    A.strokeAppend(a2, pts(5, 40, 40, 15, 8));
    A.strokeEnd(a2);

    // ── ① 隔离对拍 ──
    assert(bytesEq(layerBytes(A, W, H), soloA), "A 字节 = solo 参考逐位（共享 Port 不串台）");
    assert(bytesEq(layerBytes(B, W, H), soloB), "B 字节 = solo 参考逐位");

    // ── ③ 退租：dispose A，B 继续画+导出；⑥ Port 记账随退租递减 ──
    eq(port.arenaStats.count, 2, "两租户各持一 arena（懒建已发生）");
    const bytesBoth = port.arenaStats.bytes;
    assert(bytesBoth > 0, "记账字节 > 0");
    A.dispose();
    eq(port.arenaStats.count, 1, "A 退租 → Port 记账 -1（真 GPU 语义 = 显存已 free）");
    assert(port.arenaStats.bytes < bytesBoth, "A 的承诺字节已退");
    const b3 = B.strokeBegin(1, BRUSH_B);
    B.strokeAppend(b3, pts(4, 10, 10, 10, 10));
    assert(B.strokeEnd(b3), "A 退租后 B 照画");
    eq(B.canUndo(), true);
    B.dispose();
    eq(port.arenaStats.count, 0, "全员退租 → 记账归零");
    eq(port.arenaStats.bytes, 0);
  });
});
