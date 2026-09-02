// 测试入口：node test/run.mjs（node 24 strip-types 直跑导入的 .ts）。
// 加新测试文件：在下面 import 一行即可。
import "./smoke.test.ts";
import "./subdivide.test.ts";
import "./facefind.test.ts";
import "./face-lifecycle.test.ts";
import "./golden.test.ts";
import "./golden3d.test.ts";
import "./tools.test.ts";
import "./pick.test.ts";
import "./preview.test.ts";
import "./lab-presets.test.ts";
import "./move-spec.test.ts";
import "./lab-journal.test.ts";
import "./snap-align.test.ts";
import "./solver.test.ts";
import { run } from "./runner.mjs";

await run();
