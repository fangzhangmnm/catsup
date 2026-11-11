// 宿主登记的程序（2026-11-11 贴图主线 1-4b；施工单 CatsUp ai-docs/20261111-paint-workorders-11.md）：内核以外的着色器在同一处交 GLSL 和软件显卡里的 JavaScript 版。
// 登记挂在接口实例上（别的实例里找不到）；撞内核程序的名字 / 登记两次 = 抛；没登记的照旧抛 SHADER_NO_CPU_EQUIV；内核自己的程序不受影响。created 2026-11-11 by Claude Opus 5.5
// 内核自己的测试：只 import 内核和测试工具。
import { describe, it, assert, eq } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";

const throws = (fn, re) => { try { fn(); } catch (e) { return re.test(String(e?.message ?? e)); } return false; };
/** 一个宿主程序：每个像素填 uniform 给的颜色（软件显卡版）。 */
const FILL = { vert: "#version 300 es\nvoid main(){}", frag: "#version 300 es\nvoid main(){}", cpu: (ctx) => { const c = ctx.uniforms.u_color; ctx.forEachPixel((_x, _y, out) => { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; out[3] = c[3]; return true; }); } };

describe("宿主登记的程序", () => {
  it("登记一个、画一下：结果对（只填 scissor 里那一块）", () => {
    const port = new SoftGl2Port();
    port.registerProgram("host-fill", FILL);
    port.program("host-fill");
    const f = port.borrowFBO(4, 4, "u8");
    port.draw({ program: "host-fill", target: f, clear: [0, 0, 0, 0], scissor: { x: 1, y: 1, w: 2, h: 2 }, uniforms: { u_color: [1, 0.2, 0, 1] } });
    const px = port.readPixels(f, 0, 0, 4, 4);
    let inside = 0, outside = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const o = (y * 4 + x) * 4, inS = x >= 1 && x < 3 && y >= 1 && y < 3; if (inS && px[o] === 255 && px[o + 1] === 51 && px[o + 2] === 0 && px[o + 3] === 255) inside++; if (!inS && px[o + 3] === 0) outside++; }
    eq(inside, 4, "scissor 里四个像素是那个颜色"); eq(outside, 12, "外面没动");
    port.returnFBO(f);
  });
  it("撞内核程序的名字 = 抛；同一个名字登记两次 = 抛；JavaScript 版不是函数 = 抛", () => {
    const port = new SoftGl2Port();
    assert(throws(() => port.registerProgram("stamp-accum", FILL), /PROGRAM_NAME_IS_KERNEL:stamp-accum/), "撞内核");
    assert(throws(() => port.registerProgram("present-affine", FILL), /PROGRAM_NAME_IS_KERNEL/), "撞内核登记成 GPU-only 的");
    port.registerProgram("host-fill", FILL);
    assert(throws(() => port.registerProgram("host-fill", FILL), /PROGRAM_ALREADY_REGISTERED:host-fill/), "登记两次");
    assert(throws(() => port.registerProgram("host-x", { vert: "", frag: "", cpu: null }), /PROGRAM_NO_CPU:host-x/), "没有 JavaScript 版");
  });
  it("规矩不放松：没登记的照旧 SHADER_NO_CPU_EQUIV；登记只在那个实例里找得到；内核自己的程序照常", () => {
    const a = new SoftGl2Port(), b = new SoftGl2Port();
    assert(throws(() => a.program("host-fill"), /SHADER_NO_CPU_EQUIV:host-fill/), "没登记");
    a.registerProgram("host-fill", FILL); a.program("host-fill");
    assert(throws(() => b.program("host-fill"), /SHADER_NO_CPU_EQUIV:host-fill/), "别的实例找不到");
    a.program("stamp-accum"); b.program("stamp-accum");   // 内核的照常
  });
});
