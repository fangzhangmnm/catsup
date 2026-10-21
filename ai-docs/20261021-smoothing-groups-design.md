# 平滑组设计（0.8 纪元，2026-10-21）

> created 20261021 · as-of v0.8.0 / 2026-10-21 · created by Claude Fable 5.1
> user 2026-10-21：「然后圆的平滑组」「平滑组是一个很重要的概念，好好设计一下」「平滑 offset follow me是0.8」。
> 代码：`src/kernel/layers.ts`（层登记处 + 推拉策略表）、`src/editor/render3.ts smoothNormals`、`src/format/bake.ts smoothNormalsOf`、编辑器 `softenEdges / softenByAngle / softenSelection`。

## 1. 本体：两个独立的边层，不是一个开关

| 层 | 意思 | 渲染 | bake |
|---|---|---|---|
| `soft` | 这条边不是「棱」：线稿不画它（SU Soft） | 线稿跳过 | LINES 不含 |
| `smooth` | 两侧膜的法向跨边插值（SU Smooth） | 平滑组法向 | NORMAL 逐角 |
| `curve` | 圆 / 弧的多边形近似边成员（画线；整条是一个「曲线」实体——选取 / 推拉按整条来，0.8 后续） | 正常画 | LINES 含 |

**平滑组 = 被 `smooth` 边连通的膜的连通分量。** 组内每个 (膜, 顶点) 的法向 = 组里含该顶点的膜的平面法向按**内角加权**平均（Thürmer–Wüthrich 权重，圆柱 / 球面分段近似下最接近真法向）；膜无朝向（契约 §5.2）所以按本膜一侧校正符号。组外的膜用平面法向（硬边）。

为什么不做 3ds Max 式的「平滑组位掩码」：SU 的心智模型是**边**的属性（软化边工具按夹角阈值作用在边上），位掩码是面的属性，两者等价但边模型和我们的像表结算机（边有切割血缘、面有事件血缘）天然对齐；而且 glTF / Blender 侧也是「sharp edge」语义。

## 2. 谁给边打层

- **推拉**（`EDGE_LAYER_POLICY`）：原边带 soft / curve / smooth 任一 → 它扫出的两条侧棱 = **soft + smooth**；帽边继承原边的全部层（圆柱顶圈仍是 curve = 画黑边）。这就是「画圆 → 推拉 = 光滑圆柱」。
- **软化工具**：橡皮 + Ctrl 刮 = 软化（soft + smooth），橡皮 + Shift 刮 = 硬化（SU 同款修饰）；菜单「软化所有 ≤ 20° 的边」（SU Soften Edges 对话框的默认角）；选区菜单「软化 / 硬化选区」。只碰恰好两膜之间的边。
- **跟随 / 继承**（层登记处四条规则）：切割按父传子、删边出集、新段落边入集、溶解时两边都有才并出的边有。
- 文件：`CATSUP_brep.attributes.edge.{soft,smooth,curve}` 各一条 u8 流（契约早有名字）。

## 3. 渲染与 bake 的一致性

两处同一算法（render3 对世界视图、bake 对快照），bake 把平滑法向写进 glTF `NORMAL`（每材质 primitive 逐角顶点——默认材质也走逐角，共享顶点的 TRIANGLES 退役；LINES 仍用共享 POSITION）。三方（Blender / three）看到的圆柱 = 光滑侧面 + 顶底圈黑边，与 app 内一致。

## 4. 没做 / 后续

- `hidden` 层（SU Hide：线不画、面也不画）——名字在表里，工具没接。
- 曲线当实体：选中一段 = 整条圆弧、推拉圆柱侧面整体（SU 的 Curve / ArcCurve）。
- 按角度自动平滑（Blender auto-smooth）不做：SU 模型是显式边属性。
- 软化影响吸附吗？不：软边照常是推断目标（SU 同款）。
