// 画画工作台一笔开不了时提示行说什么（贴图主线 1-7 + 1-4c，2026-11-11 Claude Opus 5.5）：准备没好 / 撞到容量上限 = 它们自己带的人话；别的 = 「这一笔画不了（原文）」。
import { describe, it, eq } from "./runner.mjs";
import { strokeFailedSay } from "../src/app/paint-workbench.ts";
import { PrepPendingError } from "../src/paint/space-prep.ts";
import { PaintLimitError } from "../src/paint/paint-limit.ts";

describe("画画工作台：一笔开不了时说的话", () => {
  it("准备没好（刚撤销改了模型、这一帧还没重建）= 「画布的表还在准备…」", () => {
    eq(strokeFailedSay(new PrepPendingError()), "画布的表还在准备（刚才改了模型），等一下再画");
  });
  it("撞到容量上限 = 那个上限自己带的人话（不显示开发看的英文）", () => {
    eq(strokeFailedSay(new PaintLimitError("SpaceLayer: face 6 has 1025 triangles (> 1024)", "这张面太大了，画不了")), "这张面太大了，画不了");
  });
  it("别的错 = 「这一笔画不了（原文）」", () => {
    eq(strokeFailedSay(new Error("boom")), "这一笔画不了（boom）");
  });
});
