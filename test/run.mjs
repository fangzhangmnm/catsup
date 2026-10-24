// 测试入口：node test/run.mjs（node 24 strip-types 直跑导入的 .ts）。
// 加新测试文件：在下面 import 一行即可。
import "./smoke.test.ts";
import "./page-title.test.ts";   // 网页标题只是 CatsUp（user 2026-10-14）
import "./subdivide.test.ts";
import "./subdivide-nearmiss.test.ts";
import "./xr-pointer-frame.test.ts";
import "./kernel-fuzz.test.ts";
import "./kernel-rev.test.ts";
import "./settle-differential.test.ts";
import "./curves.test.ts";   // 曲线实体（0.10，2026-10-24）
import "./guides.test.ts";   // 参考几何 + 上下文帧（0.11 尺规纪元，2026-10-24）
import "./tape.test.ts";     // 卷尺（0.11 尺规纪元 ③）
import "./axes.test.ts";     // 轴工具（0.11 尺规纪元 ④）
import "./protractor.test.ts";   // 量角器（0.11 尺规纪元 ⑥）
import "./grid.test.ts";         // 绝对网格 + 整数长度 + 轴向咬合（0.11 尺规纪元 ⑤）
import "./repro-box.test.ts";    // 复现包黑匣子   // 局部性定理差分 oracle：局部结算 = 全局结算（#26，2026-10-23）    // 池版本号：每个改写动词 +1（#22 池级局部性缓存键）
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
