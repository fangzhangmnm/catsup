// Minccino 预设 = 数据（Tron 纪元第 1 步）：每个预设的 pass 声明都排得出一帧；白模走原来那一条；风格的屏幕一刀是整数倍。
// created 2026-10-29 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { PRESETS, PRESET_IDS, SCREENS, isPresetId, isScreenId, isStyled, presetPasses } from "../src/minccino/preset/index.ts";
import { planFrame } from "../src/minccino/graph/frame-graph.ts";
import { ENV_RECIPES, SURFACE_RECIPES } from "../src/minccino/paintshop/index.ts";

describe("minccino 预设 = 数据", () => {
  it("每个预设（开 / 关 X 光）的 pass 声明都规划得出 frame，地面网格 / 辅助几何永远在", () => {
    for (const id of PRESET_IDS) {
      const plan = planFrame(presetPasses(PRESETS[id]), ["frame"]);
      for (const must of ["scene", "grid", "aux"]) assert(plan.order.includes(must), `${id} 少了 ${must}：${plan.order.join(" → ")}`);
    }
  });
  it("白模 = 原来那一条（场景直接写 frame，没有小图 / 放大）；风格 = 场景 → 描边 → 放大", () => {
    assert(!isStyled(PRESETS.white), "白模不该走风格那条路");
    eq(planFrame(presetPasses(PRESETS.white), ["frame"]).order.join(","), "scene,grid,aux");
    assert(isStyled(PRESETS.pixelOutline), "像素描边该走风格那条路");
    eq(planFrame(presetPasses(PRESETS.pixelOutline), ["frame"]).order.join(","), "scene,grid,aux,pixelOutline,upscale");   // 网格跟内容进小图（T101）
    assert(!isStyled(PRESETS.papercut), "剪纸是原生分辨率、没有后处理：不走屏幕那条路");
    eq(planFrame(presetPasses(PRESETS.papercut), ["frame"]).order.join(","), "aoBake,ground,scene,grid,aux");   // 遮蔽先烘、地面先画、模型追加
    assert(isStyled(PRESETS.tron), "CRT Tron 走屏幕那条路（240 行 + CRT）");
    eq(planFrame(presetPasses(PRESETS.tron), ["frame"]).order.join(","), "ground,scene,grid,aux,glow,bloom,composite,upscale");   // 辉光那遍 → 辉光 → 合成 → CRT 放大
    const bronze = planFrame(presetPasses(PRESETS.bronze), ["frame"]).order;
    assert(!isStyled(PRESETS.bronze) && ["aoBake", "envBake", "ground", "scene"].every((x) => bronze.includes(x)) && bronze.indexOf("envBake") < bronze.indexOf("ground") && bronze.indexOf("ground") < bronze.indexOf("scene"), `铸铜 = 遮蔽 / 环境先烘 → 地面 → 模型：${bronze.join(",")}`);
  });
  it("一件一色 / 平涂 / 遮蔽：要平涂的预设一定给了平涂参数；遮蔽的长度都是正的", () => {
    for (const id of PRESET_IDS) {
      const p = PRESETS[id];
      if (p.material.shade === "flat") assert(!!p.material.flat, `${id} 要平涂但没给参数`);
      const ao = p.light.ao; if (ao) assert(ao.radius > 0 && ao.groundRadius > 0 && ao.amount >= 0 && ao.amount <= 1, `${id} 遮蔽参数不对`);
      if (p.material.shade === "pbr") assert(!!p.material.pbr && !!p.light.env && !!p.light.ao, `${id} 有光照的表面要材质参数 + 环境 + 遮蔽（太阳投影在遮蔽图集里）`);
      if (p.material.shade === "tron") assert(!!p.material.tron, `${id} 要 Tron 但没给参数`);
      // 涂装车间（插拔）：风格引用的配方都要在登记表里；表面层只给写实那条路
      if (p.light.env) assert(p.light.env.recipe in ENV_RECIPES, `${id} 的环境配方 ${p.light.env.recipe} 不在涂装车间`);
      for (const l of p.material.surface) assert(l.recipe in SURFACE_RECIPES && p.material.shade === "pbr", `${id} 的表面层 ${l.recipe} 不在涂装车间 / 不是写实那条路`);
    }
  });
  it("每个预设都写了出处和一句话说明；像素化 ≥ 1；id 和键一致", () => {
    for (const id of PRESET_IDS) {
      const p = PRESETS[id];
      eq(p.id, id); assert(p.source.length > 0 && p.note.length > 0, `${id} 缺出处 / 说明`);
      if (id !== "realistic" && p.material.shade === "pbr") assert(p.material.surface.length > 0 || p.material.colorize === "none", `${id}：真实材质 = 写实 + 材料参数 + 涂装车间`);
      assert(isScreenId(p.screen) && SCREENS[p.screen].pixelate >= 1, `${id} 的默认屏不在 SCREENS 里`);
    }
    assert(isPresetId("pixelOutline") && !isPresetId("nope") && !isPresetId("toString"), "isPresetId 认错了");
  });
  it("屏幕和画风分开选（T106）：白模套像素屏 = 进小图再放大；像素描边套原生 = 还是描边那条路", () => {
    eq(planFrame(presetPasses(PRESETS.white, SCREENS.pixel3), ["frame"]).order.join(","), "scene,grid,aux,upscale");
    eq(planFrame(presetPasses(PRESETS.pixelOutline, SCREENS.native), ["frame"]).order.join(","), "scene,grid,aux,pixelOutline,upscale");   // 网格跟内容进小图（T101）
    assert(isStyled(PRESETS.white, SCREENS.pixel3) && !isStyled(PRESETS.white), "isStyled 没按实际套的屏算");
  });
});
