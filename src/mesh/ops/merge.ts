// mesh/ops/merge.ts —— 合：一组顶点并成一个（到中心 / 到第一个 / 先挪到给定点再并到它）。created 2026-10-27 by Claude Fable 5.1
// 2026-11-13 属性地基轮第二步（Claude Opus 5.5）：改成调内核的合并点原子 MeshKernel.mergePoints（规程第七¾节第二稿）。以前这里手搓：挤成的角挑一个照抄、
//   重叠的面按点集认、几条边并成一条时标记悄悄丢、蝴蝶结按第一次出现去重——都换成原子里的规矩（一伙角一起走、同一圈点才算重叠、标记按小表并、
//   环上重复的点剪成几圈），塌掉 / 重叠被删的面进报告「没了的面」。
// 原子不收任意位置：给了点 = 先把第一个点挪过去，再「合并到第一个点」（镜像落到中缝那条路；和以前最后把幸存点放到给定点一样）。
import type { Pt3 } from "../../kernel/geom.ts";
import type { MeshKernel } from "../mesh-kernel.ts";

export function mergeVerts(k: MeshKernel, ids: readonly number[], target: "center" | "first" | Pt3 = "center"): number {
  const set = [...new Set(ids)].filter((v) => k.hasV(v));
  if (set.length < 2) throw new Error("mergeVerts: need ≥ 2 distinct alive vertices");
  if (typeof target === "object") { k.setPos(set[0], target); return k.mergePoints([{ verts: set, to: "first" }])[0]; }
  return k.mergePoints([{ verts: set, to: target === "first" ? "first" : { weights: set.map(() => 1) } }])[0];
}
