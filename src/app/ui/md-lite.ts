// md-lite.ts —— 极简 markdown 渲染（手册 / 说明用）。抄自 WeebPaint src/ui/md-lite.ts（Claude Fable 5.1 2026-09-02），进 CatsUp 2026-10-24 by Claude Fable 5.1（user「那个显示markdown的深模块可以搬过来」）。
// 极简 markdown 渲染（in-app 说明书用）。created 2026-09-02 by Claude Fable 5.1.
// 只认：段落（空行分隔）、`- ` 列表、`## ` 小标题、**粗体**、`code`、[文字](http(s)://…) 链接。
// 先整体 HTML 转义再做行内标记 → 文案里的 < > & 不可能变成标签；链接只放行 http/https。
// 不引第三方 md 库（家规：vendor 一切、不为一页说明书拉一个解析器）。

export function renderMdLite(src: string): string {
  const blocks = src.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  let out = "";
  for (const b of blocks) {
    const lines = b.split("\n");
    if (lines.every((l) => /^- /.test(l))) {
      out += "<ul>" + lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("") + "</ul>";
    } else if (/^## /.test(b)) {
      out += `<h4>${inline(b.slice(3))}</h4>`;
    } else {
      out += `<p>${lines.map(inline).join("<br>")}</p>`;
    }
  }
  return out;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function inline(s: string): string {
  let h = escapeHtml(s);
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, text, url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
  return h;
}
