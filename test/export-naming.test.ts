// 导出 / 下载文件名带导出时间（2026-10-28 Claude Opus 5.5；user「导出的时候应该加一个导出时间，看一下weebpaint的导出命名规范」）。
// = WeebPaint src/naming.ts：`名-YYYYMMDD-HHMM`，本地时间；另存 / 安家不加（那是文档自己的名字）。
import { describe, it, eq } from "./runner.mjs";
import { downloadName, downloadStamp } from "../src/config.ts";

describe("导出文件名（WeebPaint 同款）", () => {
  it("名-YYYYMMDD-HHMM，本地时间、补零", () => {
    const t = new Date(2026, 9, 8, 7, 5, 59);   // 10 月 8 日 07:05（本地）
    eq(downloadStamp(t), "20261008-0705");
    eq(downloadName("20261027-c709", t), "20261027-c709-20261008-0705");
  });
});
