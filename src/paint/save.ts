// paint/save.ts —— 画存进文件：钉点和编码（贴图主线 1-8b，施工单 ai-docs/20261111-paint-workorders-13.md 施工细则一 / 二 / 四 / 五）。created 2026-11-11 by Claude Opus 5.5
// 照画画仓（家族根 ai-docs/20261109-editor-session-serialize.md）：编码的同步那一段就是钉点。freeze() 同步一口气把每张画这一次的来源定死
//   （有画板 = 内核 exportData 冻结拷贝 + 当场合成读回；冷的 = 贴图行里原来的字节；没画过的 = 空白的），finish() 异步只碰钉下来的那些拷贝：
//   编码期间用户接着画、接着切，存出去的仍然是钉的那一刻。
// 每张画的来源（freeze 时定）：
//   1. 有画板（热的，含歇着的）、提交版本 = 缓存里那份 → 缓存的分层字节 + 合成图（底色变了只重做合成图）；
//   2. 有画板、版本不同 → 当场 exportData() + 当场合成读回；画板比那一套坐标高、多出来的行全空白 → 按坐标的高（分层和合成图一起裁）；
//   3. 没有画板、贴图行里有字节（冷的）→ 原样（文件里的字节不重编：没动过再存一遍逐字节相同）；
//   4. 没有画板、没有字节（新建了还没画过）→ 一份空白的分层字节（按宽高缓存），不存合成图（照底色显示，统筹 11-11）。
// 缓存住这里、不住场景（场景里的贴图行被撤销快照共用，往里写字节撤销历史就带上别的时刻的字节；统筹 11-11 同意）。
// 崩溃快照（mode = "snapshot"）不现编：用缓存里最近一次的；画板比缓存新 = stale（恢复时说「画可能少了最后几笔」）。新建没画过的空白那份照编（小、按大小只编一次）。
// 合成图 = 合成在材质的底色上、不透明、PNG；没有内容的画板不存合成图。记号 = 照哪份分层字节做的（长度 + 校验和）+ 底色（format/document.ts compositeFits）。
import { encodeDocToOra, paintingDataToEncodeDoc } from "./kernel/src/backend/ora.ts";
import { encodePngFromBytes } from "./kernel/src/backend/png-codec.ts";
import type { PaintingData } from "./kernel/src/backend/workpiece/painting-workpiece.ts";
import type { PaintBoard } from "./board.ts";
import { paintBytesSum, type CatsupDocument, type PaintComposite, type TextureDoc } from "../format/document.ts";
import { paintPlaceOf } from "../scene/paint.ts";
import type { Scene } from "../scene/scene.ts";
import type { Guid } from "../format/guid.ts";

/** 存盘要的那一点画板登记处（boards.ts PaintBoards 结构上满足）。 */
export interface PaintBoardSource { get(texture: Guid): PaintBoard | undefined }

interface Cached { readonly board: PaintBoard; readonly version: number; readonly ora: Uint8Array; readonly composite: PaintComposite | null }
/** 一张画这一次钉下来的东西。 */
type Pin =
  | { readonly kind: "ready"; readonly ora: Uint8Array; readonly composite: PaintComposite | null }   // 1 / 3：字节现成
  | { readonly kind: "encode"; readonly board: PaintBoard; readonly version: number; readonly data: PaintingData; readonly px: Uint8ClampedArray | null; readonly base: readonly [number, number, number]; readonly reuseOra: Uint8Array | null }   // 2（或 1 但底色变了：reuseOra = 缓存的分层字节，只重做合成图）
  | { readonly kind: "blank"; readonly width: number; readonly height: number };   // 4
export interface PaintFrozen {
  /** 有画板的画比缓存新、这份没带上最后几笔（只在 snapshot 那种会是 true）。 */
  readonly stale: boolean;
  /** 编完、填好的那份文档（贴图行是新对象；冻结那份文档本身不改）。编码出错 = 抛（说是哪张画）。 */
  finish(): Promise<CatsupDocument>;
}

const toBytes = async (x: Blob | Uint8Array): Promise<Uint8Array> => (x instanceof Uint8Array ? x : new Uint8Array(await x.arrayBuffer()));
const sameBase = (a: readonly number[], b: readonly number[]): boolean => a.length === 3 && b.length === 3 && a.every((v, i) => v === b[i]);

/** 这一次有画要编码，但 zip.js 没加载上（页面没加载完整）。不带画 / 画全是现成字节的存盘不会碰到它。 */
export class ZipMissingError extends Error {
  constructor() { super("zip.js is not loaded, so the paintings changed in this save cannot be encoded (the page did not finish loading); saves without paintings to encode are unaffected"); this.name = "ZipMissingError"; }
}

export class PaintSaver {
  private readonly boards: PaintBoardSource;
  private readonly wroteWith: string;
  private readonly cache = new Map<Guid, Cached>();
  private readonly blanks = new Map<string, Promise<Uint8Array>>();
  /** 分层字节的编码器（缺省 = 内核；探针 / 测试换成会抛的，验「编码中途出错 = 这一轮整个没成」）。 */
  encodeOra: (data: PaintingData, wroteWith: string) => Promise<Uint8Array> = async (data, wroteWith) => toBytes(await encodeDocToOra(paintingDataToEncodeDoc(data), { wroteWith }));
  constructor(o: { readonly boards: PaintBoardSource; readonly wroteWith: string }) { this.boards = o.boards; this.wroteWith = o.wroteWith; }

  /** 缓存的版本签名（崩溃快照「这一版拍过了」的键里带上它：缓存一新快照就重拍）。 */
  cacheKey(): string { return [...this.cache].map(([g, c]) => `${g}:${c.version}`).sort().join(";"); }
  /** 换文件：缓存清掉（画板全扔了，旧的缓存指着扔掉的画板）。 */
  clear(): void { this.cache.clear(); }
  /** 这张画最近一次编好（存盘 / 快照）的字节有多大：画布小窗底下那行（施工单十六）。贴图行里的字节只在读文件时进来，热的画存过之后得问这里。缓存里没有 = null。 */
  lastSizes(texture: Guid): { readonly ora: number; readonly png: number } | null { const c = this.cache.get(texture); return c ? { ora: c.ora.byteLength, png: c.composite?.png.byteLength ?? 0 } : null; }

  /**
   * 钉点（同步，中间不 await）。doc = 刚冻结的那份文档；scene = 现在的场景（找坐标的宽高、材质的底色）。
   * mode = "save"：版本变了的当场拷出来、finish 里编；"snapshot"：不现编，用缓存（没有缓存 = 贴图行里的 / 空白的），画板比缓存新 = stale。
   */
  freeze(doc: CatsupDocument, scene: Scene, mode: "save" | "snapshot"): PaintFrozen {
    const pins = new Map<Guid, Pin>();
    let stale = false;
    for (const t of doc.textures) {
      if (t.content.kind !== "layered") continue;
      const place = paintPlaceOf(scene, t.guid), board = this.boards.get(t.guid);
      if (board) {
        const version = board.wp.commitVersion, hit = this.cache.get(t.guid), fresh = hit && hit.board === board && hit.version === version ? hit : null;
        const base: readonly [number, number, number] = place ? [place.material.color[0], place.material.color[1], place.material.color[2]] : board.background;
        if (fresh && (!fresh.composite || sameBase(fresh.composite.base, base))) { pins.set(t.guid, { kind: "ready", ora: fresh.ora, composite: fresh.composite }); continue; }
        if (mode === "snapshot") {
          const old = hit && hit.board === board ? hit : null;
          if (!fresh) stale = true;
          if (old) { pins.set(t.guid, { kind: "ready", ora: old.ora, composite: old.composite && sameBase(old.composite.base, base) ? old.composite : null }); continue; }
          if (t.content.ora) { pins.set(t.guid, { kind: "ready", ora: t.content.ora, composite: t.composite ?? null }); continue; }
          pins.set(t.guid, { kind: "blank", width: place?.uvSet.width ?? board.width, height: place?.uvSet.height ?? board.height }); continue;
        }
        // 当场拷：分层（内核的冻结拷贝）+ 合成图（垫现在的底色）；裁高
        //   规矩（1-4d 第 6 条，统筹 11-11）：存盘用的合成图永远整张重新合（composeBytes：作废整棵、不带薄层、整张合），不用显示用的那张——
        //   那张是增量合出来的（只重合薄层报过的格），宿主漏报一格它就会留着旧像素，那种错只许留在显示上、绝不许跟着进文件。测试 paint-board「存盘的合成图永远整张」
        board.setBackground(base);
        const cb = board.contentBounds(), hasContent = cb !== null;
        const rows = place && board.height > place.uvSet.height && (!cb || cb.y + cb.h <= place.uvSet.height) ? place.uvSet.height : board.height;
        const data = fresh ? null : board.wp.exportData();
        pins.set(t.guid, {
          kind: "encode", board, version, base,
          data: data ? { ...data, height: rows } : ({} as PaintingData),
          px: hasContent ? board.composeBytes(rows) : null,
          reuseOra: fresh ? fresh.ora : null,
        });
        continue;
      }
      if (t.content.ora) { pins.set(t.guid, { kind: "ready", ora: t.content.ora, composite: t.composite ?? null }); continue; }   // 冷的：原样
      pins.set(t.guid, { kind: "blank", width: place?.uvSet.width ?? 1, height: place?.uvSet.height ?? 1 });   // 新建没画过（没有坐标的孤儿行：1 × 1，变热时当尺寸不对）
    }
    // 内核编分层字节靠全局的 zip（index.html 的 classic 脚本）：只有这一次确实要编（当场拷的 / 空白的）才查；没有画、或者画全是现成字节的，和以前一模一样（统筹 11-11 审查：为画画加的东西不许挡住建模的存盘）。
    if ([...pins.values()].some((p) => (p.kind === "encode" && !p.reuseOra) || p.kind === "blank") && !(globalThis as { zip?: unknown }).zip) throw new ZipMissingError();
    return {
      stale,
      finish: async () => {
        const rows: TextureDoc[] = [];
        for (const t of doc.textures) {
          const pin = pins.get(t.guid);
          if (!pin) { rows.push(t); continue; }
          try {
            const got = await this.realize(t.guid, pin);
            const { composite: _drop, ...rest } = t; void _drop;
            rows.push({ ...rest, content: { kind: "layered", ora: got.ora }, ...(got.composite ? { composite: got.composite } : {}) });
          } catch (e) { throw new Error(`painting "${t.name}" (${t.guid}) could not be encoded: ${e instanceof Error ? e.message : String(e)}`); }
        }
        return { ...doc, textures: rows };
      },
    };
  }

  /** 有画板、比缓存新的那几张先编进缓存（崩溃快照之前、切后台时；跟自动保存同一个节奏，不单开定时器——统筹 11-11）。都是新的 = 什么都不做。 */
  async refresh(scene: Scene): Promise<void> {
    const rows = [...scene.textures.values()].filter((t) => { if (t.content.kind !== "layered") return false; const b = this.boards.get(t.guid), c = this.cache.get(t.guid); return !!b && !(c && c.board === b && c.version === b.wp.commitVersion); });
    if (!rows.length) return;
    await this.freeze({ textures: rows } as unknown as CatsupDocument, scene, "save").finish();
  }

  /** 一张画钉下来的东西变成字节；编了的进缓存（只在比缓存里的新时替换）。 */
  private async realize(g: Guid, pin: Pin): Promise<{ ora: Uint8Array; composite: PaintComposite | null }> {
    if (pin.kind === "ready") return { ora: pin.ora, composite: pin.composite };
    if (pin.kind === "blank") return { ora: await this.blank(pin.width, pin.height), composite: null };
    const ora = pin.reuseOra ?? await this.encodeOra(pin.data, this.wroteWith);
    const composite: PaintComposite | null = pin.px
      ? { png: await encodePngFromBytes(pin.px, pin.board.width, pin.px.length / 4 / pin.board.width), of: { bytes: ora.length, sum: paintBytesSum(ora) }, base: pin.base }
      : null;
    const hit = this.cache.get(g);
    if (!hit || hit.board !== pin.board || hit.version <= pin.version) this.cache.set(g, { board: pin.board, version: pin.version, ora, composite });
    return { ora, composite };
  }

  /** 空白的分层字节（一层空的；按宽高只编一次）。 */
  private blank(w: number, h: number): Promise<Uint8Array> {
    const k = `${w}x${h}`;
    let p = this.blanks.get(k);
    if (!p) {
      const data: PaintingData = { width: w, height: h, nodes: [{ name: "Layer 1", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: null }] };
      p = encodeDocToOra(paintingDataToEncodeDoc(data), { wroteWith: this.wroteWith }).then(toBytes);
      p.catch(() => this.blanks.delete(k));
      this.blanks.set(k, p);
    }
    return p;
  }
}
