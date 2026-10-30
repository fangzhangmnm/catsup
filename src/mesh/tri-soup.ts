// mesh/tri-soup.ts —— 三角汤 ↔ mesh 内核。文件里 kind:"mesh" 的载荷现在还是三角汤（0.14 定的最小形）：M3 换成多边形载荷 CATSUP_mesh 之前的过渡——
// 三角汤存不住 n 边形（四边形存成两个三角形读回来还是两个三角形）。现在没有任何用户入口能造出 mesh 身体（转换指令 M3 一起来），所以没有用户数据经过这条有损路；
// M3 落地前不许接 UI。外来 glb 导入（user 10-27「导入直接成 mesh」）以后也走 meshFromTriangles。created 2026-10-27 by Claude Fable 5.1
import { F_SHARP, F_SMOOTH, F_SOFT, MeshKernel } from "./mesh-kernel.ts";

export interface TriSoup { positions: Float32Array; indices: Uint32Array; triMaterial?: Uint16Array; }
const NO_MAT = 0xffff;

/** 每个三角形一张面（退化的——两个下标一样 / 越界——跳过并计数，调用方披露）。 */
export function meshFromTriangles(t: TriSoup): { kernel: MeshKernel; skipped: number } {
  const m = new MeshKernel(), n = Math.floor(t.positions.length / 3);
  for (let i = 0; i < n; i++) m.addVertex({ x: t.positions[3 * i], y: t.positions[3 * i + 1], z: t.positions[3 * i + 2] });
  let skipped = 0;
  for (let i = 0; i + 2 < t.indices.length; i += 3) {
    const a = t.indices[i], b = t.indices[i + 1], c = t.indices[i + 2];
    if (a === b || b === c || a === c || a >= n || b >= n || c >= n) { skipped++; continue; }
    const mat = t.triMaterial ? t.triMaterial[i / 3] : NO_MAT;
    m.addFace([a, b, c], mat === NO_MAT ? -1 : mat);
  }
  return { kernel: m, skipped };
}

/** 外来文件的三角：顶点为了法线 / UV 劈开过（同一位置几个下标）；normals 可缺（缺的分量 = NaN）。 */
export interface SplitTriangles { positions: Float32Array; normals?: Float32Array | null; indices: Uint32Array }
export interface SplitCastReport { skipped: number; faces: number; quads: number; soft: number; hard: number; usedNormals: boolean }
/** 两个文件法线算「同一个」（Blender 导出共用的法线是同一组浮点数；留一点余量给别的导出器）。 */
const SAME_NORMAL_COS = 0.9999;
/** 背靠背的两个三角拼回四边形：两侧三角的夹角上限（Blender「三角转四边形」默认 40°，留宽一点）。 */
const QUAD_FOLD_COS = Math.cos((45 * Math.PI) / 180);

/**
 * 外来文件的三角 → 网格体（2026-10-29 Claude Opus 5.5；user 10-29「导入的时候要respect平滑组……软边的话应该是软边，然后应该keep quad。当然我知道gltf没法保quad」
 * 「如果你是一个平滑的模型，导入进来不应该有一堆硬边」）。三步：
 *  ① **焊**：同一位置的顶点并成一个——文件为了法线 / UV 把顶点劈开，不焊 = 网格在接缝处是裂的（裂开的边只挨一张面 = 棱，一拉就撕开）。
 *  ② **拼回四边形**：glTF 只存三角；Blender 导出时一个多边形的三角是连着写的。前后两个三角共用两个**顶点下标**（同法线同 UV 的对角线）、
 *     绕向一致、拼起来是凸的、折得不厉害 → 原来是一个四边形，拼回去。全三角的模型里碰巧连着的一对也会被拼（形状照旧、只是面少了）。
 *  ③ **软硬边看文件的法线**（glTF 的平滑组就是这么存的）：一条边两侧在两个端点用的是同一个法线 = 平滑，劈开了 = 棱。
 *     「默认平滑」取多数（平滑边多 → smooth、把棱手标 sharp；反之 hard、把平滑边手标 smooth），以后在上面新长出来的边跟多数走。
 *     文件没法线（或某条边端点缺法线）→ 那些边按角度（softDeg，和以前一样）。
 */
export function meshFromSplitTriangles(t: SplitTriangles, softDeg: number): { kernel: MeshKernel; report: SplitCastReport } {
  const m = new MeshKernel(), n = Math.floor(t.positions.length / 3), N = t.normals ?? null;
  const report: SplitCastReport = { skipped: 0, faces: 0, quads: 0, soft: 0, hard: 0, usedNormals: false };
  // ① 焊：位置完全相同的下标并成一个顶点
  const weld = new Int32Array(n), seen = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const x = t.positions[3 * i], y = t.positions[3 * i + 1], z = t.positions[3 * i + 2], k = `${x},${y},${z}`;
    let v = seen.get(k);
    if (v === undefined) { v = m.addVertex({ x, y, z }); seen.set(k, v); }
    weld[i] = v;
  }
  const P = (i: number): [number, number, number] => [t.positions[3 * i], t.positions[3 * i + 1], t.positions[3 * i + 2]];
  const triNormal = (a: number, b: number, c: number): [number, number, number] => {
    const [ax, ay, az] = P(a), [bx, by, bz] = P(b), [cx, cy, cz] = P(c);
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  const tri = (k: number): [number, number, number] | null => {
    const a = t.indices[3 * k], b = t.indices[3 * k + 1], c = t.indices[3 * k + 2];
    if (a >= n || b >= n || c >= n || weld[a] === weld[b] || weld[b] === weld[c] || weld[a] === weld[c]) return null;
    return [a, b, c];
  };
  /** 前后两个三角能不能拼成一个四边形：能 = 四个原始下标（环）。 */
  const quadOf = (A: [number, number, number], B: [number, number, number]): number[] | null => {
    for (let r = 0; r < 3; r++) {
      const x = A[r], y = A[(r + 1) % 3], z = A[(r + 2) % 3];   // A = x → y → z，共用边 x → y
      for (let q = 0; q < 3; q++) if (B[q] === y && B[(q + 1) % 3] === x) {   // B 里反着走 = 绕向一致
        const s = B[(q + 2) % 3];
        if (weld[s] === weld[z]) return null;
        const na = triNormal(x, y, z), nb = triNormal(y, x, s);
        if (na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2] < QUAD_FOLD_COS) return null;
        const ring = [x, s, y, z], nx = na[0] + nb[0], ny = na[1] + nb[1], nz = na[2] + nb[2];
        for (let i = 0; i < 4; i++) {   // 凸：每个角的转向都和平均法向同侧
          const [px, py, pz] = P(ring[(i + 3) % 4]), [cx, cy, cz] = P(ring[i]), [qx, qy, qz] = P(ring[(i + 1) % 4]);
          const ux = cx - px, uy = cy - py, uz = cz - pz, vx = qx - cx, vy = qy - cy, vz = qz - cz;
          if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz <= 0) return null;
        }
        return ring;
      }
    }
    return null;
  };
  // ② 面（记下每个角的原始下标，③ 用它查法线）
  const raw = new Map<number, number[]>();
  const tc = Math.floor(t.indices.length / 3);
  for (let k = 0; k < tc; k++) {
    const A = tri(k);
    if (!A) { report.skipped++; continue; }
    const B = k + 1 < tc ? tri(k + 1) : null, ring = B ? quadOf(A, B) : null;
    const corners = ring ?? A;
    raw.set(m.addFace(corners.map((i) => weld[i])), corners);
    report.faces++;
    if (ring) { report.quads++; k++; }
  }
  // ③ 软硬边
  const nrm = (i: number): [number, number, number] | null => {
    if (!N) return null;
    const x = N[3 * i], y = N[3 * i + 1], z = N[3 * i + 2];
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? [x, y, z] : null;
  };
  const cornerAt = (f: number, v: number): number => { const vs = m.faceVerts(f), rs = raw.get(f)!; return rs[vs.indexOf(v)]; };
  const verdict: { e: number; smooth: boolean }[] = [];
  for (const e of m.edges()) {
    const fs = m.eFaces(e);
    if (fs.length !== 2 || fs[0] === fs[1]) continue;   // 边界 / 非流形 = 棱（edge-smooth 的定义），不用标
    let smooth: boolean | null = true;
    for (const v of [m.edgeA[e], m.edgeB[e]]) {
      const a = nrm(cornerAt(fs[0], v)), b = nrm(cornerAt(fs[1], v));
      if (!a || !b) { smooth = null; break; }
      if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < SAME_NORMAL_COS) smooth = false;
    }
    if (smooth === null) continue;
    verdict.push({ e, smooth });
    if (smooth) report.soft++; else report.hard++;
  }
  report.usedNormals = verdict.length > 0;
  if (!report.usedNormals) { m.setSmoothDefault({ mode: "angle", deg: softDeg }); return { kernel: m, report }; }
  const majoritySmooth = report.soft >= report.hard;
  // 端点缺法线的边先按角度定下来（默认换成多数之后它们不能跟着变）
  const cosDeg = Math.cos((softDeg * Math.PI) / 180);
  for (const e of m.edges()) {
    const fs = m.eFaces(e);
    if (fs.length !== 2 || fs[0] === fs[1] || verdict.some((x) => x.e === e)) continue;
    const a = m.faceNormal(fs[0]), b = m.faceNormal(fs[1]), la = Math.hypot(a.x, a.y, a.z) || 1, lb = Math.hypot(b.x, b.y, b.z) || 1;
    verdict.push({ e, smooth: Math.abs((a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb)) >= cosDeg - 1e-12 });
  }
  m.setSmoothDefault(majoritySmooth ? { mode: "smooth", deg: softDeg } : { mode: "hard", deg: softDeg });
  for (const { e, smooth } of verdict) {
    if (smooth === majoritySmooth) continue;
    m.setEdgeFlags(e, (m.edgeFlags[e] & ~(F_SHARP | F_SMOOTH | F_SOFT)) | (smooth ? F_SOFT | F_SMOOTH : F_SHARP));
  }
  return { kernel: m, report };
}

/** 内核 → 三角汤（顶点紧凑重编；每三角记面的材质槽）。 */
export function meshToTriangles(m: MeshKernel): TriSoup {
  const alive = m.verts(), map = new Map<number, number>();
  const positions = new Float32Array(alive.length * 3);
  alive.forEach((v, i) => { map.set(v, i); positions[3 * i] = m.pos[3 * v]; positions[3 * i + 1] = m.pos[3 * v + 1]; positions[3 * i + 2] = m.pos[3 * v + 2]; });
  const { tris, faceOfTri } = m.triangles();
  const indices = new Uint32Array(tris.length), triMaterial = new Uint16Array(faceOfTri.length);
  for (let i = 0; i < tris.length; i++) indices[i] = map.get(tris[i])!;
  for (let i = 0; i < faceOfTri.length; i++) { const s = m.faceMat[faceOfTri[i]]; triMaterial[i] = s >= 0 ? s : NO_MAT; }
  return { positions, indices, triMaterial };
}
