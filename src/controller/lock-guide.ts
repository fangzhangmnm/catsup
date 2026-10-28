// controller/lock-guide.ts —— 锁看得见：锁着轴 = 画一根那根轴的线、锁着面 = 画面里的两根（Blender 式）。created 2026-10-28 by Claude Opus 5.5
// user 10-28 晚「轴锁的时候能不能看到小轴线，blender就是这么做的，视觉告诉你，不然其实用户不知道是不是还是viewport aligned」
// 「然后这个是深模块吧就是所有的轴锁都这样，你好好想一下轴放哪里」。
//
// 所有的锁（方向键 / X Y Z / Shift+… / 芯片 / 先锁好下一下生效）都落在编辑器同一份锁状态上，所以这里一个纯函数 + 渲染一个口子 = 所有工具都这样，工具不用各画各的。
// 轴放哪里（这个文件的全部判断）：
//   · 方向 = 上下文的坐标架（最外层 = 绘图轴、组 / 组件里 = 它自己的轴）——和锁真正约束的方向是同一个（editor.axisLockDir / lockToAxis 都读 contextFrame），
//     所以进了转过的组件里，线跟着组件的轴歪，一眼看得出「锁的是物体自己的 Z，不是屏幕」。颜色 = 红 X / 绿 Y / 蓝 Z（家族坐标约定）。
//   · 过哪一点 = 被约束的那一点：手势进行中 = 工具的锚点（移动的按下点 / 画线的起点 / 挤出的抓点——那一点就沿着这根线走，画线时这根线就是正在画的线）；
//     没在手势里（先锁好、下一下生效）= 下一下要动的东西的变换中心（这把工具对选区做事、而且有选区）；都没有 = 不画（芯片上那枚亮着已经说了锁着）。
//   · 面锁 = 面里的两根轴（锁 XY = 画 X 和 Y 两根）；锁「按下那张面」= 那张面里两根互相垂直的线，中性色。
// 纯数据：零 DOM / three / 内核（controller 文件夹的规矩，守卫 test/stance.test.ts）；渲染器只管把线画长、画在最上面（render3.ts lockLines）。

export interface V3 { readonly x: number; readonly y: number; readonly z: number }
export type LockAxisId = "x" | "y" | "z";
/** 编辑器现在的锁（同一时刻只有一种：轴锁和面锁互斥）。planeN = 面锁的法向（世界、单位长）。 */
export interface LockNow { readonly axis: LockAxisId | null; readonly plane: LockAxisId | "face" | null; readonly planeN: V3 | null }
/** 上下文坐标架的三根轴（世界；可能带缩放，这里归一）。 */
export interface LockFrame { readonly x: V3; readonly y: V3; readonly z: V3 }
/** 一根线：过 through、沿 dir（单位长，两头都画）；color = 哪根轴的颜色（n = 中性：锁的是一张斜面）。 */
export interface LockLine { readonly through: V3; readonly dir: V3; readonly color: LockAxisId | "n" }

const norm = (v: V3): V3 => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/** 线过哪一点：手势进行中 = 锚点（没有锚点的工具退到变换中心）；没在手势里 = 变换中心（调用方只在「这把工具对选区做事且有选区」时给）；都没有 = null（不画）。 */
export function lockThrough(gesture: boolean, anchor: V3 | null, pivot: V3 | null): V3 | null {
  return gesture ? anchor ?? pivot : pivot;
}

/** 锁着什么 → 画哪几根线（没锁 / 没有过的点 = []）。 */
export function lockLines(lock: LockNow, frame: LockFrame, through: V3 | null): LockLine[] {
  if (!through) return [];
  if (lock.axis) return [{ through, dir: norm(frame[lock.axis]), color: lock.axis }];
  if (lock.plane && lock.plane !== "face") {
    const others = (["x", "y", "z"] as const).filter((a) => a !== lock.plane);
    return others.map((a) => ({ through, dir: norm(frame[a]), color: a }));
  }
  if (lock.plane === "face" && lock.planeN) {
    const n = norm(lock.planeN), ref = Math.abs(n.z) < 0.9 ? frame.z : frame.x, u = norm(cross(n, ref)), v = norm(cross(n, u));
    return [{ through, dir: u, color: "n" }, { through, dir: v, color: "n" }];
  }
  return [];
}
