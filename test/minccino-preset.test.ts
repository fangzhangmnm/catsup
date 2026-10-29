// Minccino 预设 = 数据（Tron 纪元第 1 步）：每个预设的 pass 声明都排得出一帧；白模走原来那一条；风格的屏幕一刀是整数倍。
// created 2026-10-29 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { PRESETS, PRESET_IDS, isPresetId, isStyled, presetPasses } from "../src/minccino/preset/index.ts";
import { planFrame } from "../src/minccino/graph/frame-graph.ts";

describe("minccino 预设 = 数据", () => {
  it("每个预设（开 / 关 X 光）的 pass 声明都规划得出 frame，地面网格 / 叠加层永远在", () => {
    for (const id of PRESET_IDS) for (const xray of [false, true]) {
      const plan = planFrame(presetPasses(PRESETS[id], xray), ["frame"]);
      for (const must of ["scene", "grid", "overlay"]) assert(plan.order.includes(must), `${id} 少了 ${must}：${plan.order.join(" → ")}`);
      eq(plan.order.includes("xray"), xray, `${id} xray=${xray}`);
    }
  });
  it("白模 = 原来那一条（场景直接写 frame，没有小图 / 放大）；风格 = 场景 → 描边 → 放大", () => {
    assert(!isStyled(PRESETS.white), "白模不该走风格那条路");
    eq(planFrame(presetPasses(PRESETS.white, false), ["frame"]).order.join(","), "scene,grid,overlay");
    assert(isStyled(PRESETS.pixelOutline), "像素描边该走风格那条路");
    eq(planFrame(presetPasses(PRESETS.pixelOutline, false), ["frame"]).order.join(","), "scene,pixelOutline,upscale,grid,overlay");
    assert(!isStyled(PRESETS.papercut), "剪纸是原生分辨率、没有后处理：不走屏幕那条路");
    eq(planFrame(presetPasses(PRESETS.papercut, false), ["frame"]).order.join(","), "aoBake,ground,scene,grid,overlay");   // 遮蔽先烘、地面先画、模型追加
    assert(isStyled(PRESETS.tron), "CRT Tron 走屏幕那条路（240 行 + CRT）");
    eq(planFrame(presetPasses(PRESETS.tron, false), ["frame"]).order.join(","), "ground,scene,glow,bloom,composite,upscale,grid,overlay");   // 辉光那遍 → 辉光 → 合成 → CRT 放大
    const bronze = planFrame(presetPasses(PRESETS.bronze, false), ["frame"]).order;
    assert(!isStyled(PRESETS.bronze) && ["aoBake", "envBake", "ground", "scene"].every((x) => bronze.includes(x)) && bronze.indexOf("envBake") < bronze.indexOf("ground") && bronze.indexOf("ground") < bronze.indexOf("scene"), `铸铜 = 遮蔽 / 环境先烘 → 地面 → 模型：${bronze.join(",")}`);
  });
  it("一件一色 / 平涂 / 遮蔽：要平涂的预设一定给了平涂参数；遮蔽的长度都是正的", () => {
    for (const id of PRESET_IDS) {
      const p = PRESETS[id];
      if (p.material.shade === "flat") assert(!!p.material.flat, `${id} 要平涂但没给参数`);
      const ao = p.light.ao; if (ao) assert(ao.radius > 0 && ao.groundRadius > 0 && ao.amount >= 0 && ao.amount <= 1, `${id} 遮蔽参数不对`);
      if (p.material.shade === "pbr") assert(!!p.material.pbr && !!p.light.env && !!p.light.ao, `${id} 有光照的表面要材质参数 + 环境 + 遮蔽（太阳投影在遮蔽图集里）`);
      if (p.material.shade === "tron") assert(!!p.material.tron, `${id} 要 Tron 但没给参数`);
    }
  });
  it("每个预设都写了出处和一句话说明；像素化 ≥ 1；id 和键一致", () => {
    for (const id of PRESET_IDS) {
      const p = PRESETS[id];
      eq(p.id, id); assert(p.source.length > 0 && p.note.length > 0, `${id} 缺出处 / 说明`);
      assert(p.screen.pixelate >= 1, `${id} 像素化 < 1`);
    }
    assert(isPresetId("pixelOutline") && !isPresetId("nope") && !isPresetId("toString"), "isPresetId 认错了");
  });
});
