// paint-undo-kit.ts —— 画进三维撤销栈那两个测试共用的架子（贴图主线 1-8a；测试文件之间不许互相 import，共用的放这里）。created 2026-11-11 by Claude Opus 5.5
// rig()：真的 History、真的画板登记处、画画内核的软件显卡；编辑器做的那几件事照样串起来（每条指令提交之后 follow + 挂记录、一笔 = commitRecords 一步、每次之后 sync）。
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { PaintBoards, PAINT_UNDO_KIND, type PaintRec } from "../src/paint/boards.ts";
import { History, type UndoComponent } from "../src/editor/history.ts";
import { Scene } from "../src/scene/scene.ts";
import type { Op } from "../src/editor/ops.ts";
import { brepToMesh } from "../src/scene/kinds.ts";
import { translation } from "../src/scene/xform.ts";
import { mintGuid } from "../src/format/guid.ts";
import { sceneBox, sceneFingerprint } from "./format-scenes.ts";

export const hash = (u: Uint8Array): string => { let h = 2166136261; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
export const rng = (seed: number) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

export function rig(nMesh = 1, opts: { quota?: number; epoch?: () => number; active?: (on: boolean) => void } = {}) {
  const s0 = new Scene(sceneBox(2, 1.5)), defs: number[] = [];
  for (let i = 0; i < nMesh; i++) { const d = s0.mintDef(`画盒${i}`, sceneBox(1, 1)); d.body = brepToMesh(s0.brep(d.id)); s0.mintInstance(s0.root, null, d.id, translation({ x: 3 + 2 * i, y: 0, z: 0 })); defs.push(d.id); }
  const port = new SoftGl2Port(), resets: string[] = [];
  let h!: History<string>;
  const boards = new PaintBoards({ port: () => port, epoch: opts.epoch ?? (() => 0), ...(opts.active ? { active: opts.active } : {}), undoReset: (tex, why, tell) => { resets.push(`${tex.slice(0, 4)} ${tell ? "说了" : "没说"} ${why}`); h.dropRecords(PAINT_UNDO_KIND, (d) => (d as PaintRec).tex === tex); } });
  h = new History<string>(s0, opts.quota ? { quotaBytes: opts.quota } : undefined);
  h.registerComponent(boards.undoComponent() as unknown as UndoComponent);
  const cur = (): Scene => (h as unknown as { current: Scene }).current;
  const afterCommit = (): void => { boards.follow(cur()); for (const r of boards.takePending()) h.record(PAINT_UNDO_KIND, r); };   // 编辑器 commitIn 的收尾（main.ts paintAfterCommit）
  const commit = (op: Op, join = false): void => { h.commit(cur(), op, join, "b", { title: op.op }); afterCommit(); boards.sync(cur()); };
  const textures: string[] = [], paintMatGuid = new Map<number, string>();
  let plain = -1;
  const startPaint = (def: number, density = 8): string => {
    const tex = mintGuid(), mat = mintGuid();
    commit({ op: "startPaint", def, faces: cur().mesh(def).kernel.faces(), uvSet: mintGuid(), textureGuid: tex, materialGuid: mat, names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.9, 0.85, 0.7], density } as Op);
    textures.push(tex); paintMatGuid.set(def, mat);
    return tex;
  };
  /** 这个物件自己那张画的材质（按身份号找：几个物件的画材质都叫「画」）。 */
  const paintMat = (def: number): number => cur().materials.findIndex((m) => m.guid === paintMatGuid.get(def));
  /** 一笔（可以同时画到几张贴图）：每张一个档口、交一块矩形色块当薄层、落层；攒着的步交给三维的栈当一步（编辑器 commitRecordsStep）。 */
  const stroke = (texs: string[], rnd: () => number, erase = false): void => {
    const ss = texs.map((tex) => {
      const b = boards.ensure(cur(), tex), W = b.width, H = b.height, s = b.openStroke(), layerId = b.wp.layerTree!.view().activeId!;
      const bw = 1 + Math.floor(rnd() * Math.min(24, W - 1)), bh = 1 + Math.floor(rnd() * Math.min(12, H - 1)), bx = Math.floor(rnd() * (W - bw)), by = Math.floor(rnd() * (H - bh));
      const px = new Uint8Array(W * H * 4), c = [Math.floor(rnd() * 255), Math.floor(rnd() * 255), Math.floor(rnd() * 255)], a = 120 + Math.floor(rnd() * 135);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { const o = (y * W + x) * 4; px[o] = (c[0] * a) / 255; px[o + 1] = (c[1] * a) / 255; px[o + 2] = (c[2] * a) / 255; px[o + 3] = a; }
      s.setHostLayers([{ tex: b.wrapLayer({ pixels: px, w: W, h: H, prec: "u8" }), bx, by, bw, bh, layerId, opacity: 1, erase, blendMode: "source-over" }]);
      return s;
    });
    for (const s of ss) s.end();
    h.commitRecords("b", { title: erase ? "擦一笔" : "画一笔" }, boards.takePending().map((data) => ({ kind: PAINT_UNDO_KIND, data })));
    boards.sync(cur());
  };
  const undo = (): void => { boards.cancelOpen(); h.undo(); boards.sync(cur()); };
  const redo = (): void => { boards.cancelOpen(); h.redo(cur()); boards.sync(cur()); };
  /** 模型（含贴图坐标）+ 每张画的大小和像素。 */
  const shot = (): string => {
    const parts = [sceneFingerprint(cur())];
    for (const g of textures) {   // 每张画：大小 + 每层的像素（内核 exportData = 编码器的读口，CPU 那份；不合成，快）
      const b = boards.get(g); if (!b) { parts.push(`${g.slice(0, 4)} 没有画板`); continue; }
      const d = b.wp.exportData(), layers = (d.nodes as { pixels?: { rect: { x: number; y: number; w: number; h: number }; bytes: Uint8ClampedArray } | null }[]).map((n) => (n.pixels ? `${n.pixels.rect.x},${n.pixels.rect.y},${n.pixels.rect.w},${n.pixels.rect.h}:${hash(new Uint8Array(n.pixels.bytes.buffer, n.pixels.bytes.byteOffset, n.pixels.bytes.byteLength))}` : "空"));
      parts.push(`${g.slice(0, 4)} ${b.width}x${b.height} ${layers.join(" | ")}`);
    }
    return parts.join("\n");
  };
  const plainMat = (): number => { if (plain < 0) { commit({ op: "addMaterial", name: "灰", color: [0.5, 0.5, 0.5] } as Op); plain = cur().materials.length - 1; } return plain; };
  const paintRecords = (tex: string): number => { let n = 0; for (const list of (h as unknown as { entries: { kind: string; data: unknown }[][] }).entries) for (const e of list) if (e.kind === PAINT_UNDO_KIND && (e.data as PaintRec).tex === tex) n++; return n; };
  const live = (tex: string): number => (boards as unknown as { entries: Map<string, { steps: { liveCount(): number } }> }).entries.get(tex)?.steps.liveCount() ?? -1;
  return { h, boards, port, defs, cur, commit, startPaint, stroke, undo, redo, shot, plainMat, paintMat, textures, resets, paintRecords, live };
}

