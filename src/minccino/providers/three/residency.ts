// minccino/providers/three/residency.ts —— 画风专属东西的常驻表（深模块）。created 2026-10-29 by Claude Opus 5.5
// user 10-29「写实切换像素描边之后天空盒错误」→「能系统的整理一下它暴露出来的问题吗」→「要不要做一个深模块专门管理这些代理场景元素？」
// →「然后是每个不同的画风递交给深模块。而不是每次immediate地开关」。
// 暴露的问题（两类同根：没有主人）：① 显示——两份地面靠各条分支记得去藏别人的，漏一个就串台；② 显存——像素的小图、Tron 的辉光整串、写实的环境图、
// 遮蔽图集第一次用到时建、切走以后一直占着，显存估算还只算当前画风的。
// 窄接口：登记（每样只交三个小钩子：亮 / 藏 / 放显存 + 占多少）；每帧画风递交一张名单 submit(要的, 现在) —— 要的亮、不要的藏、
// 不要超过 IDLE_MS 的放显存（对象留着，下次要时由用到它的那遍重建）；bytes() = 实际常驻的字节数。名单本身是画风的声明（residentsOf，纯函数）。
import type { Preset, ScreenPreset } from "../../preset/index.ts";
import { isStyled } from "../../preset/index.ts";

/** 常驻表认识的几样（provider 内部的名字，引擎契约里没有）。 */
export type ResidentId = "paperGround" | "pbrGround" | "pixelScreen" | "bloom" | "envMap" | "aoAtlas";
export interface Resident {
  /** 亮（场景里的东西：visible = true）。显存类的不用。 */
  show?(): void;
  /** 藏。 */
  hide?(): void;
  /** 放显存（对象留着；下次要时重建）。 */
  release?(): void;
  /** 现在占多少显存（字节；没建 / 放掉了 = 0）。 */
  bytes(): number;
}

/** 切走后闲置多久放显存（毫秒）：来回切画风不至于每次重建，放着不用也不会一直占。 */
export const IDLE_MS = 5000;

/** 这个画风这一帧要哪几样（声明；和画法分支同一个来源）。 */
export function residentsOf(p: Preset, screen: ScreenPreset): Set<ResidentId> {
  const out = new Set<ResidentId>(), L = p.light, styled = isStyled(p, screen);
  const pbrPath = !!p.material.pbr && !!L.env;   // 写实 / 铸铜：地面 / 背景归表面那份（环境图 + 太阳 + 遮蔽）
  if (pbrPath) out.add("pbrGround").add("envMap");
  else if (L.ao || L.ground || p.material.shade === "flat") out.add("paperGround");   // 平涂 / 地面 / 遮蔽（剪纸）
  if (L.ao) out.add("aoAtlas");
  if (styled) out.add("pixelScreen");
  if (styled && p.post.bloom) out.add("bloom");
  return out;
}

export class Residency {
  private items = new Map<ResidentId, { r: Resident; wantedAt: number; shown: boolean }>();
  register(id: ResidentId, r: Resident): void { this.items.set(id, { r, wantedAt: 0, shown: false }); }
  /** 这一帧要的名单：要的亮、不要的藏、不要超过 IDLE_MS 的放显存（画任何一遍之前调）。 */
  submit(wanted: ReadonlySet<ResidentId>, now: number): void {
    for (const [id, e] of this.items) {
      if (wanted.has(id)) { e.wantedAt = now; if (!e.shown) { e.r.show?.(); e.shown = true; } }
      else {
        if (e.shown) { e.r.hide?.(); e.shown = false; }
        if (e.wantedAt > 0 && now - e.wantedAt > IDLE_MS) { e.r.release?.(); e.wantedAt = 0; }
      }
    }
  }
  /** 实际常驻的显存（字节；血槽位用——以前只算当前画风的几块）。 */
  bytes(): number { let b = 0; for (const e of this.items.values()) b += e.r.bytes(); return b; }
  /** 探针：现在亮着的几样。 */
  shownIds(): ResidentId[] { return [...this.items].filter(([, e]) => e.shown).map(([id]) => id); }
}
