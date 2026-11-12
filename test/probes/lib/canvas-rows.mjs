// test/probes/lib/canvas-rows.mjs —— 「开始画」面板里点画布大小那一行（只认「新开一张画」的大小行）。created 2026-11-12 by Claude Opus 5.5
// 起因（11-12 整跑）：`.sheet-row:has-text("256 × 256")` 同时认得出「加进已有的画」那几行（「一格 5.0 mm 画布 256 × 256 …」），那几行在了就两个都对上 → 严格模式报错（probe-paint-workbench 偶发红）。
// 大小行的标签以「n × n」开头，加进已有的画那几行以「一格」开头。
/** 大小那一行（标签以「w × h」开头）。 */
export const sizeRow = (page, size) => page.locator("#sheetChoices .sheet-row").filter({ has: page.locator(".sheet-row-label", { hasText: new RegExp(`^${size}`) }) });
