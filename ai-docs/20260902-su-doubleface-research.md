# SU double-face 考据（opus 子代理调研，2026-09-02）

> created by Claude Fable 5（代理执笔 opus）· user 问题：「SU 里没有 double face 对吧？每面顶多定义方向，
> 不会有两个相反的面共用一个环」——**前半确凿成立，后半不成立（但对 CatsUp 有利）**。

## 结论

1. **面=单实体双面（确凿）**：`Sketchup::Face`＝双侧多边形，`material`/`back_material` 两槽、
   `reverse!` 翻朝向、单一 `normal`；`Loop→Face` 结构 1:1。正背是属性不是两个对象。
2. **「同环最多一面」不是结构不变量（确凿）**：1:1 强制在 loop→face，不在边环→face
   （EdgeUse.partners 允许一边多面）。同 context 重复面现实存在：官方 api-issue-tracker #266
   （4 次 add_face 出 5 面）、DXF 导入+「面共面/边共面容差口径不一致」（Colin）、切面随机叠
   「五个以上」；CleanUp³（Trimble 员工 thomthom）专设 Erase Duplicate Faces，判据=
   **outer_loop 顶点集相等（不看法线）**。
3. **SU 策略=引擎习惯而非结构保证**：交互路径每次重跑面派生/合并；绕过引擎（Ruby API/导入/
   EntitiesBuilder「minimal validation」/transform 不合并）即留脏；官方态度=不阻止+外部清理。
   专利 US6628279 只把 face 写成边环派生皮，无双面措辞。
4. **z-fighting 两类要分**：跨 group 重叠=设计行为（context 永不互并）；同 context 叠面=脏几何。

## 对 CatsUp 的含义

- 「一 region 至多一膜」在我们是**结构不变量**（覆盖认领+dedup 代数）——SU 靠插件收拾的地方
  我们 by construction 不发生。立宪不需要改。
- 贴图纪元 blueprint：**单膜双侧**——正背=膜的方向位+两材质槽，永不需要 double-face 实体。

## 来源（全部核过）

Ruby API：Face / Loop / EdgeUse / Entities / EntitiesBuilder（ruby.sketchup.com）；
api-issue-tracker #266；thomthom/cleanup 源码（github）；SketchUp 论坛：52571 / 165911 / 29852 /
163279 / 114802 / 294157 / 342386；SketchUcation：127140 / 120061 / 152666；
专利 US6628279B1（patents.google.com）；Collada 双面导出 234760；官方 help「Orienting Faces」。
