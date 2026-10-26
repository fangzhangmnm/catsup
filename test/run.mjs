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
import "./curves.test.ts";   // 曲线实体（0.10，2026-10-24）
import "./guides.test.ts";   // 参考几何 + 上下文帧（0.11 尺规纪元，2026-10-24）
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
