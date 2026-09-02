# CatsUp（家族总规则见上级 CLAUDE.md）

SketchUp 开源 PWA 平替。**MVP = SketchUp clone；proposal「我会加的东西」整节全是花，不可本末倒置**（`journals/20260627 CatsUp proposal.md` L80 用户原话）。

- 当前状态：**Phase 0 无壳内核库**——纯 TS kernel + golden tests + canvas playground；无 store / SW / save-load / hierarchy（用户 2026-07-28 拍板）。
- **当前阶段（2026-09-01 重启，edited by Claude Fable 5）**：主轴 = **人类研究 SketchUp、形成建模心智模型**；AI = 文献综述（入 ai-docs）+ 陪聊/稻草人 drill + lab 仪器维护。写码默认冻结（lab 仪器级改动除外）。**move 已按 sticky geometry 协议重写落地**（2026-09-01 user 口述 spec + grill 拍板；spec=`ai-docs/20260901-move-spec.md`，验尸=`ai-docs/20260901-move-postmortem.md`；rotate/duplicate/scale 未来同走此协议）；**snap 体系 parked**（lab 只留脚手架三件：endpoint/on-edge/轴锁，明确非 spec）。
- **坐标约定（2026-09-01 立，edited by Claude Fable 5）**：**右手系，+Z 上（SU 蓝轴），+X 红，+Y 绿=北**；X×Y=+Z。渲染适配层不得引入 Y-up（three 只在 render3.ts，相机全由 camera.ts 纯数学喂）；SU 同款 RGB=XYZ 配色是家族契约。
- **lab 入口 = `src/lab/index.html`**（2D 顶视 drill 仪器：场景预置一键摆、事件日志 C 位）；`src/playground/` = 3D 观察窗（博物馆态，里面的 move 是未立项发明——别在上面继续长）。
- **开工前必读：`ai-docs/20260728-phase0-kickoff-handoff.md`**（里程碑、仓库纪律、验收标准都在那）。
- 几何 spec 本体 = `journals/20260627 SketchUp drill.md`（五公理 / face-finding 管线 / 膜生命周期事件表）。`journals/` 是纯人类区：AI 永不写、不删、不整理。
