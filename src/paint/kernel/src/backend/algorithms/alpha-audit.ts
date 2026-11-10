// created 2026-08-28 by Claude Opus 5 (subagent)
// 导出期 alpha 直方图护栏（#7，user 2026-08-23 原话：「已经是第三次事故了：不小心软橡皮擦了一下，
//   或者喷枪喷外面了。白背景上面看不出来，发到 discord 的黑背景上面发现皮肤黑了一块，或者喷枪白喷
//   外面了。我的建议是导出的时候做一个护栏，alpha 直方图看一下。不知道 threshold 怎么设置。或者你
//   有更好的方法？」）。
//
// 纯字节进出（家规：像素统计不走 canvas），只读 α 通道，**不改一个字节**。护栏 = 提示不是拦截：
//   命中只让 UI 多说一句「黑底看一眼」，导出照常。
//
// ============ 判据（为什么不是「直方图占比落某个区间」） ============
// 光看直方图占比会误报：正常插画的抗锯齿边本身就贡献 1%~3% 的半透明像素（周长 × 1-2px），
//   和「误擦一块」的量级重叠 → 每次导出都报 = 报警疲劳 = 护栏死掉。
// 所以判据加一维**空间**信息（仍是 O(N) 纯字节，两趟 chamfer 距离变换，不是 canvas 也不是 GL）：
//
//   三分类（阈值容 8-bit 合成舍入）：clear = α≤2 / opaque = α≥250 / partial = 其余
//   suspicious（可疑）= partial 像素中，**离最近 clear 和离最近 opaque 都 > R 像素**的那些
//                       （R = SOFT_CORE_RADIUS，4 邻曼哈顿距离；等价于「宽度 > 2R 的软区的芯」）
//
// 这一条同时排掉两类正常物、逮住两类事故：
//   ✗ 抗锯齿边 / 软笔边：贴着「实心↔透明」的分界线，离两边都 ≤R → 不算
//   ✗ 细软笔触（发梢、飞白）：再长也处处贴着透明，离 clear ≤R → 不算
//   ✓ 软橡皮误擦：实心身体中间一块凹陷，附近**根本没有** clear（白底上完全看不出来的那种），
//      凹陷芯离 opaque 也 >R → 算
//   ✓ 喷枪喷出界：透明区里一片淡雾，离 opaque 远；雾芯离 clear 也远（是「面」不是「线」）→ 算
// 换句话说：可疑 = 既不是过渡带、也不是细笔触的**软面芯**。
//
// 再加两道量级门（user 描述的场景 = 「大面积近乎不透明的画面上少量半透明像素」）：
//   ① 硬边主体门：opaque ≥ 墨迹面积 × HARD_EDGED_MIN_RATIO。
//      整张软画（喷枪渐变作品、单独导出一张软阴影层）不是这个场景，作者自己知道，不打扰。
//      —— 这道门取代了「占比上限」式的判据：上限会留下「事故太大反而不报」的洞。
//   ② 少而可见门：suspicious ≥ MIN_SUSPICIOUS_PX 且 ≥ 墨迹面积 × MIN_SUSPICIOUS_RATIO。
//      挡单像素尘埃与超大画布上的零星软点（绝对 + 相对双底，大画布上按比例抬高门槛）。
//
// 阈值全是**可疑度门槛**不是正确性判定：宁可漏报一次小误擦，也不要每次导出都喊狼来了。
// 夹具（正常 5 类 / 事故 2 类）见 test/alpha-audit.test.mjs——改阈值先去那儿加一条夹具。

/** α ≤ 此值算「全透明」（容合成舍入噪声）。 */
export const ALPHA_CLEAR_MAX = 2;
/** α ≥ 此值算「实心」（容 8-bit 合成把 255 磨成 254）。 */
export const ALPHA_OPAQUE_MIN = 250;
/** 过渡带半径（4 邻曼哈顿 px）：宽度 ≤ 2R 的软边 / 粗细 ≤ 2R 的软笔触算正常，不进可疑。 */
export const SOFT_CORE_RADIUS = 4;
/** 可疑像素绝对下限（约 8×8 一小块；软面**芯**有这么大，实际软斑远大于它）。 */
export const MIN_SUSPICIOUS_PX = 64;
/** 可疑像素占墨迹面积下限（大画布按比例抬门槛）。 */
export const MIN_SUSPICIOUS_RATIO = 0.0002;
/** 「大面积近乎不透明」门：实心像素至少占墨迹面积这么多，才谈得上误擦/喷出界。 */
export const HARD_EDGED_MIN_RATIO = 0.5;

export interface AlphaAudit {
  /** 像素总数 = w*h。 */
  total: number;
  /** α ≤ ALPHA_CLEAR_MAX。 */
  clear: number;
  /** 半透明（clear 与 opaque 之间）。 */
  partial: number;
  /** α ≥ ALPHA_OPAQUE_MIN。 */
  opaque: number;
  /** 墨迹面积 = partial + opaque（占比的分母：空白区不参与，画得小不该被稀释）。 */
  ink: number;
  /** 可疑软面芯像素数（判据见文件头）。 */
  suspicious: number;
  /** suspicious / ink（ink=0 → 0）。 */
  suspiciousRatio: number;
  /** 是否「大面积近乎不透明」（门 ①）。 */
  hardEdged: boolean;
  /** 是否该提示用户去黑底看一眼。 */
  flagged: boolean;
  /** α 直方图 256 桶（user 原话「alpha 直方图看一下」；判据之外供排错/调阈值）。 */
  histogram: Uint32Array;
}

/**
 * 对导出像素（straight RGBA，非预乘）做 α 审计。只读，不改 data。
 * 已铺底（α 全 255）的导出天然 partial=0 → 早退，调用方不必自己判。
 */
export function auditExportAlpha(data: Uint8ClampedArray, w: number, h: number): AlphaAudit {
  const total = w * h;
  const histogram = new Uint32Array(256);
  const cls = new Uint8Array(total);   // 0=clear 1=partial 2=opaque
  let clear = 0, partial = 0, opaque = 0;
  for (let p = 0; p < total; p++) {
    const a = data[p * 4 + 3];
    histogram[a]++;
    if (a <= ALPHA_CLEAR_MAX) clear++;
    else if (a >= ALPHA_OPAQUE_MIN) { cls[p] = 2; opaque++; }
    else { cls[p] = 1; partial++; }
  }
  const ink = partial + opaque;
  const hardEdged = ink > 0 && opaque >= ink * HARD_EDGED_MIN_RATIO;
  // 早退：没有半透明像素（纯硬边/已铺底），或整张软画（不是本护栏管的场景）——两张距离图都不用建。
  if (partial === 0 || !hardEdged) {
    return { total, clear, partial, opaque, ink, suspicious: 0, suspiciousRatio: 0, hardEdged, flagged: false, histogram };
  }
  // 两张距离图**不同时存活**：先算「离 opaque 多远」，把过关的候选就地折进 cls（3=待定），
  //   再算「离 clear 多远」。峰值 = 2 × Uint8Array(w*h)（4096² 约 33MB），不是 3 张。
  const far = SOFT_CORE_RADIUS;
  {
    const dOpaque = distWithin(cls, 2, w, h, SOFT_CORE_RADIUS);
    for (let p = 0; p < total; p++) if (cls[p] === 1 && dOpaque[p] > far) cls[p] = 3;
  }
  const dClear = distWithin(cls, 0, w, h, SOFT_CORE_RADIUS);   // 种子是 cls===0，不受上面 1→3 影响
  let suspicious = 0;
  for (let p = 0; p < total; p++) {
    if (cls[p] === 3 && dClear[p] > far) suspicious++;
  }
  const suspiciousRatio = suspicious / ink;
  const flagged = suspicious >= MIN_SUSPICIOUS_PX && suspiciousRatio >= MIN_SUSPICIOUS_RATIO;
  return { total, clear, partial, opaque, ink, suspicious, suspiciousRatio, hardEdged, flagged, histogram };
}

/** 到 cls===target 集合的 4 邻曼哈顿距离，封顶 R+1（两趟 chamfer，O(N)、只吃一个 Uint8Array）。 */
function distWithin(cls: Uint8Array, target: number, w: number, h: number, R: number): Uint8Array {
  const cap = R + 1;
  const d = new Uint8Array(cls.length);
  for (let p = 0; p < cls.length; p++) d[p] = cls[p] === target ? 0 : cap;
  for (let y = 0; y < h; y++) {          // 正向：左邻 + 上邻
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const p = row + x;
      if (d[p] === 0) continue;
      let v = d[p];
      if (x > 0 && d[p - 1] + 1 < v) v = d[p - 1] + 1;
      if (y > 0 && d[p - w] + 1 < v) v = d[p - w] + 1;
      d[p] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {     // 反向：右邻 + 下邻
    const row = y * w;
    for (let x = w - 1; x >= 0; x--) {
      const p = row + x;
      if (d[p] === 0) continue;
      let v = d[p];
      if (x < w - 1 && d[p + 1] + 1 < v) v = d[p + 1] + 1;
      if (y < h - 1 && d[p + w] + 1 < v) v = d[p + w] + 1;
      d[p] = v;
    }
  }
  return d;
}
