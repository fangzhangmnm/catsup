/**
 * 按下时抓哪个柄：屏距 d 在 1.5 × 捕获半径内、最近的；屏上叠在一起（屏距差 ≤ ¼ 捕获半径，如正对着看时前后两个面心柄）= 离相机近（z 小）的赢。
 * 没有 → −1。
 */
export declare function pickHandle(cands: readonly {
    d: number;
    z: number;
}[], hit: number): number;
