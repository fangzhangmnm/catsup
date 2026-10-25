# 物体尺寸梯子（仓鼠交货的快照，生成物勿手改）

- 出处：`~/jupyter/20260813 MyLlamaReborn/20261024 物体尺寸梯子/export/catsup/`（独立 git；v3 在 74a2d09 发布）。
- 取货：`node scripts/pull-size-ladder.mjs`（核 sha256 再拷；钉在脚本里）。
- `ladder-v3.json`：schema size-ladder/4，516 个概念、845 个值，数据一律存米；选单项带 inherits（继承）+ reminders（新手提醒 id），概念带 replaces（删掉父类）。
- 参考实现 `ladder-query.mjs` 拷在 `src/vendor/size-ladder/`（打进包）。
- 要改数据：在 CatsUp 总账记一条，或者告诉 user 让仓鼠改；不在这里改。
- 新手提醒（`reminders[]`，CatsUp 界面上也叫「新手提醒」，user 2026-10-25 定）按选单项给（`menu[].reminders`），要让用户看得到；DnD 的值来自 SRD 5.1（第五版 2014 规则），CatsUp 另写一行 CC BY 4.0 署名。
