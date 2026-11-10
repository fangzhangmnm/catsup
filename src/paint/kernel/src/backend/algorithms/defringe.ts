// 导出期 defringe（贴图防黑边，v0.9.13；user 2026-08-19 拍板：走导出选项，不进 lockAlpha）。
// 把 α=0 像素的 RGB 回填为最近（BFS 层序）不透明像素的颜色；α 一个字节不动。
//
// why：游戏/3D 引擎对贴图做 bilinear/mipmap 采样时会把透明 texel 的 RGB 混进边缘——
//   透明区 RGB 是黑/白就渗出黑边/白边。authoring 管线不保 α=0 处的 RGB（GL merge 按 ao 归一
//   会把它规范化成 0，见 blend-glsl 外层合成），所以防黑边只能在**导出字节**上一次性重建：
//   透明区颜色 = 就近延拓边缘色，采样时混进来的就是边缘自己的颜色。
// 纯字节进出（家规：不走 canvas）；O(N) 多源 BFS、4 邻；全透明/全不透明 = no-op。
export function defringeAlphaZero(data: Uint8ClampedArray, w: number, h: number): void {
  const total = w * h;
  const state = new Uint8Array(total);   // 1 = 已有颜色（源或已回填）
  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  for (let p = 0; p < total; p++) if (data[p * 4 + 3] > 0) { state[p] = 1; queue[tail++] = p; }
  if (tail === 0 || tail === total) return;
  const adopt = (q: number, i: number) => {
    const j = q * 4;
    data[j] = data[i]; data[j + 1] = data[i + 1]; data[j + 2] = data[i + 2];   // α 不写
    state[q] = 1; queue[tail++] = q;
  };
  while (head < tail) {
    const p = queue[head++];
    const px = p % w, py = (p - px) / w, i = p * 4;
    if (px > 0 && !state[p - 1]) adopt(p - 1, i);
    if (px < w - 1 && !state[p + 1]) adopt(p + 1, i);
    if (py > 0 && !state[p - w]) adopt(p - w, i);
    if (py < h - 1 && !state[p + w]) adopt(p + w, i);
  }
}
