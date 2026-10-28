// 测试入口：node test/run.mjs（node 24 strip-types 直跑导入的 .ts）。
// 加新测试文件：在下面 import 一行即可。
import "./smoke.test.ts";
import "./page-title.test.ts";   // 网页标题只是 CatsUp（user 2026-10-14）
import "./subdivide.test.ts";
import "./subdivide-nearmiss.test.ts";
import "./xr-pointer-frame.test.ts";
import "./kernel-fuzz.test.ts";
import "./tau-flatten.test.ts";   // EGC 期 3b：τ 带投影一致性（2026-10-24）
import "./units.test.ts";   // 单位深模块（2026-10-24 Opus）
import "./no-native-select.test.ts";   // 下拉标准件守卫（2026-10-24 Opus）
import "./page-ids.test.ts";   // 页面不许重复 id（2026-10-25：手册面板与图标撞名）
import "./scale-ref.test.ts";   // B43 尺度参考适配层（2026-10-25 Opus）
import "./tap-train.test.ts";   // 点按族：笔双击三击偏向点（2026-10-25 Opus）
import "./format-stamps.test.ts";   // 三级拍子 + 直通顺序（F-69，2026-10-25 Fable）
import "./desk.test.ts";   // CATSUP_desk 桌面态：☰ 停在哪页跟文件走、太新不拒开（2026-10-25 Fable）
import "./snap-default.test.ts";   // 新文件默认开吸附（user 2026-10-25「新文件一定要默认开吸附」）
import "./snap-center.test.ts";   // DT15 圆心 + 选中组件轴原点透视吸附（2026-10-25 Opus）
import "./copy-preview.test.ts";   // DT14 移动复制预演：副本槽（2026-10-25 Opus）
import "./mirror.test.ts";   // DT23 镜像指令（2026-10-25 Opus）
import "./instance-ids.test.ts";   // 读文件实例 id 有空缺不再重复（2026-10-25 Opus）
import "./param-panel.test.ts";   // 参数小窗马后炮会话（2026-10-25 Opus）
import "./scale-handle.test.ts";   // 缩放柄透视拾、叠在一起近的赢（2026-10-25 Opus）
import "./isolate.test.ts";   // DT44 只看这个（2026-10-25 Opus）
import "./hide.test.ts";   // DT49 隐藏 / 全部显示（2026-10-25 Opus）
import "./references.test.ts";
import "./reference-guard.test.ts";   // 参考窗单一接缝 + 图标（2026-10-25 Opus）   // CATSUP_references 参考窗牌组 + desk refPanel（2026-10-25 Opus）
import "./facefind-hole-probe.test.ts";   // 挂洞探针不许用壳环顶点（2026-10-24，800 件场景第 379 步）
import "./kernel-rev.test.ts";
import "./settle-differential.test.ts";
import "./autofold.test.ts";   // 自动折面 rev2（K3，2026-10-27 Fable）
import "./cdt.test.ts";   // 约束 Delaunay 翻边（2026-10-27 Fable）
import "./erase-differential.test.ts";   // 擦边局部化差分 oracle（T2，2026-10-27 Fable）
import "./self-check.test.ts";   // 公理自检（FM83，2026-10-27 Fable）
import "./loaded-differential.test.ts";   // 从装载态起步的差分（K4，2026-10-27 Fable）
import "./soft-flat-merge.test.ts";   // 软边两侧变 180° 自动并（FM80，2026-10-27 Fable）
import "./no-self-snap.test.ts";   // 拖着的东西不吸自己：对齐引擎层性质（A5 / F-89，2026-10-27 Fable）
import "./mesh-kernel.test.ts";
import "./mesh-view.test.ts";
import "./mesh-format.test.ts";   // CATSUP_mesh 1.0.0 多边形载荷（2026-10-27 Fable M3）
import "./object-commands.test.ts";
import "./id-table.test.ts";   // 内核表的数组制度 IdMap / IdSet（2026-10-27 Fable O3）
import "./preview-rewind.test.ts";   // 拖动预演「拷一次 + 每帧退回」差分（2026-10-27 Fable O1）   // 物体族：转成网格体 / 转回 SU 体 + 导入直接成网格体（2026-10-27 Fable）   // mesh 显示视图 + 场景 / 渲染缓存接网格体（2026-10-27 Fable M2）   // mesh 内核 M1：不变量 + 算子 + 随机串（2026-10-27 Fable）
import "./registry-seams.test.ts";   // (接缝)
import "./mesh-extrude.test.ts";   // 拉：边 / 点挤出 + meshExtrude op + 撤销（2026-10-27 Opus）   // 注册表两道接缝：三种单位 + 路由型动作「挪」+ meshMove 撤销记录（2026-10-27 Fable）
import "./kernel-delta.test.ts";   // 内核差量：提交 = 影子换真身、applyDelta 自反（2026-10-27 Fable A3）
import "./draw-frame.test.ts";   // DT86 坐标架 / 组件原点拆开（2026-10-26 Opus）
import "./fold.test.ts";   // DT87 折线底子（2026-10-26 Opus）
import "./change-log.test.ts";   // DT96 内核改动日志：变了的都记、没变的不记（2026-10-26 Opus）
import "./pool-mesh.test.ts";   // DT96 池网格：增量同步 = 全量重建（原件 / 预演副本 / 撤销快照三种族谱）（2026-10-26 Opus）
import "./snap-grid.test.ts";   // T8 / DT4 吸到格点：验收 ③ 挪 1 mm 吸回邻居不动、圆整条平移、斜坐标架、零破面（2026-10-26 Opus）
import "./segment-ref.test.ts";   // DT95 段数参考：弦高 ↔ 段数、数据文件、说明行（2026-10-26 Opus）
import "./import-glb.test.ts";   // T11 导入外来 glb + 三角 → 膜 + 多级空间网格（2026-10-26 Opus）
import "./two-sides.test.ts";   // DT8 两个表面 + 按侧灌（2026-10-26 Opus，周二 Fable 审）
import "./smooth-normals.test.ts";   // DT11 平滑边法向（2026-10-26 Opus）
import "./profile-edges.test.ts";   // F-87 轮廓线判定（2026-10-26 Opus）
import "./retrace-harden.test.ts";   // 画线描过软边 = 变硬（2026-10-26 Opus）
import "./curves.test.ts";   // 曲线实体（0.10，2026-10-24）
import "./guides.test.ts";   // 参考几何 + 上下文帧（0.11 尺规纪元，2026-10-24）
import "./guide-curves.test.ts";   // 参考圆 / 参考球（圆规 / 球规 DT50，2026-10-26）
import "./tape.test.ts";     // 卷尺（0.11 尺规纪元 ③）
import "./axes.test.ts";     // 轴工具（0.11 尺规纪元 ④）
import "./protractor.test.ts";   // 量角器（0.11 尺规纪元 ⑥）
import "./grid.test.ts";         // 绝对网格 + 整数长度 + 轴向咬合（0.11 尺规纪元 ⑤）
import "./repro-box.test.ts";    // 复现包黑匣子
import "./pp-stops.test.ts";     // 推拉停靠集（退役清单④）
import "./tier.test.ts";         // #30 层级档加权
import "./weld.test.ts";         // B19 焊接（边链 → 曲线）
import "./erasers.test.ts";      // 橡皮家族：溶解 / 断口 / 焊边 / 软边 / batch（v0.13.16）
import "./shapes.test.ts";       // 形状批：旋转矩形 / 四种弧 / 矩形从中心 / VCB（v0.13.17）
import "./exact-geometry.test.ts";   // EGC 期 1：精确谓词 + snap rounding（2026-10-24）
import "./object-model.test.ts";    // 0.14 物体模型契约守卫（2026-10-24）
import "./lock.test.ts";         // A27 锁定（对象层属性；0.13）
import "./body-kind.test.ts";    // 门 1：definition 身体 brep | card（0.13 刀 ①）
import "./final.test.ts";        // 定稿：内容指纹 + 记录往返（ai-docs/20261024-finalize.md）
import "./tool-targets.test.ts"; // 工具自带目标（B22：正方形 / 黄金分割 / 半圆）   // 局部性定理差分 oracle：局部结算 = 全局结算（#26，2026-10-23）    // 池版本号：每个改写动词 +1（#22 池级局部性缓存键）
import "./move-inference.test.ts";
import "./facefind.test.ts";
import "./face-lifecycle.test.ts";
import "./golden.test.ts";
import "./golden3d.test.ts";
import "./tools.test.ts";
import "./pick.test.ts";
import "./preview.test.ts";
import "./lab-presets.test.ts";
import "./move-spec.test.ts";
import "./history.test.ts";
import "./scene-ops.test.ts";
import "./offset.test.ts";   // offset 几何（0.8，2026-10-21）
import "./followme.test.ts";   // follow-me 扫掠 + 像表 XOR（0.8，2026-10-21）
import "./tool-config.test.ts";   // 工具配置深模块（0.9，2026-10-21）
import "./paint-modes.test.ts";   // 油漆桶模式面集（0.9，2026-10-21）
import "./flood.test.ts";   // 灌的纯函数模块（T5，2026-10-26）
import "./planar.test.ts";   // 拍平（T9，2026-10-26）
import "./hierarchy.test.ts";   // 恢复层级（DT99，2026-10-26）
import "./repairs-modular.test.ts";   // 修复指令可整个扔（2026-10-26）
import "./fill-holes.test.ts";   // 补洞（DT103，2026-10-26）
import "./cleanup.test.ts";   // 清理碎渣（DT102，2026-10-26）
import "./resegment.test.ts";   // 改段数（回转体，DT94，2026-10-26）
import "./intent.test.ts";   // 意图门：反方向的吸附不合法（0.9，2026-10-21）
import "./vcb.test.ts";   // 数值小窗解析 + 阵列（0.9 #11，2026-10-21）
import "./snap-align.test.ts";
import "./solver.test.ts";
import "./pushpull.test.ts";
import "./settle-images.test.ts";   // 像表结算机 golden（2026-10-21）：09-23 两案 + 规则
import "./camera-persp.test.ts";
import "./obj-io.test.ts";
import "./eps-scale.test.ts";
import "./plane-second-point.test.ts";
import "./on-face.test.ts";
import "./player.test.ts";
import "./collision-world.test.ts";
import "./xr-frames.test.ts";
import "./format-binary.test.ts";
import "./kernel-brep.test.ts";
import "./format.test.ts";
import "./format-jpeg.test.ts";
import "./crash-store.test.ts";
import "./debug-lines.test.ts";   // 黑匣子文本行（实验台 sunset → 调试日志，2026-09-20）
import { run } from "./runner.mjs";

await run();
