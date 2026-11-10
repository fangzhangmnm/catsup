// 极简 XML parser polyfill（node 无 DOMParser；C7 从 ora-tree.test.mjs 抽出共享——
// weebpaint-backend round-trip 也要走 decodeOraToPainting → parseStackXml）。
// recursive descent；只够解析我们自己 emit 的 well-formed XML：元素 / 属性 / 自闭合 / 嵌套 stack。
function decodeEntities(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function makeEl(tagName) {
  return { tagName, _attrs: {}, children: [], getAttribute(n) { return n in this._attrs ? this._attrs[n] : null; } };
}
export function parseXml(text) {
  text = text.replace(/<\?[\s\S]*?\?>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  let i = 0; const n = text.length;
  const isWs = (c) => c === " " || c === "\t" || c === "\n" || c === "\r";
  function parseElement() {
    i++;                                            // skip '<'
    let name = "";
    while (i < n && !isWs(text[i]) && text[i] !== "/" && text[i] !== ">") name += text[i++];
    const el = makeEl(name);
    while (i < n) {
      while (i < n && isWs(text[i])) i++;
      if (text[i] === "/") { while (i < n && text[i] !== ">") i++; i++; return el; }   // self-closing
      if (text[i] === ">") { i++; break; }          // open tag done → children
      let an = "";
      while (i < n && !isWs(text[i]) && text[i] !== "=" && text[i] !== ">") an += text[i++];
      while (i < n && isWs(text[i])) i++;
      if (text[i] === "=") {
        i++; while (i < n && isWs(text[i])) i++;
        const q = text[i++]; let av = "";
        while (i < n && text[i] !== q) av += text[i++];
        i++; el._attrs[an] = decodeEntities(av);
      } else if (an) { el._attrs[an] = ""; }
    }
    while (i < n) {                                  // children until </name>
      if (text[i] === "<") {
        if (text[i + 1] === "/") { i += 2; while (i < n && text[i] !== ">") i++; i++; return el; }
        el.children.push(parseElement());
      } else i++;
    }
    return el;
  }
  while (i < n && text[i] !== "<") i++;
  return parseElement();
}
export class FakeDOMParser {
  parseFromString(text) {
    const root = parseXml(text);
    return {
      querySelector(sel) {
        if (sel === "parsererror") return null;
        if (sel === "image") return (root.tagName || "").toLowerCase() === "image" ? root : null;
        return null;
      },
    };
  }
}
/** 装全局（幂等；装完不还原——runner 先收集后执行，call-time 要在）。 */
export function installDomParserShim() { globalThis.DOMParser = FakeDOMParser; }
