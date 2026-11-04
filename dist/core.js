// @bun
// src/core/image.ts
function standaloneImage(source) {
  const match = /^!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))\)\s*$/.exec(source.trim());
  if (!match)
    return;
  return { alt: match[1] ?? "", href: match[2] ?? match[3] ?? "" };
}
// src/core/frame.ts
import stringWidth from "string-width";
var frameAligns = ["left", "center", "right"];
function isFrameAlign(value) {
  return typeof value === "string" && frameAligns.includes(value);
}
var frameStyles = ["box", "ascii", "rounded", "heavy", "double"];
function isFrameStyle(value) {
  return typeof value === "string" && frameStyles.includes(value);
}
var borderWidth = 1;
var noInsets = { left: 0, right: 0, top: 0, bottom: 0 };
function whole(value, fallback) {
  if (value === undefined)
    return fallback;
  if (!Number.isFinite(value))
    return fallback;
  return Math.max(0, Math.floor(value));
}
function alignOffset(align, available, width) {
  if (align === "right")
    return Math.max(0, available - width);
  if (align === "center")
    return Math.max(0, Math.floor((available - width) / 2));
  return 0;
}
function fitTitle(title, columns) {
  if (!title || columns <= 0)
    return;
  let result = "";
  for (const character of title) {
    if (stringWidth(result + character) > columns)
      break;
    result += character;
  }
  return result || undefined;
}
function resolveFrame(viewport, config) {
  const available = Math.max(1, Math.floor(viewport) || 1);
  const align = config?.align ?? "left";
  const style = config?.style ?? "box";
  const titleAlign = config?.titleAlign ?? "left";
  const enabled = config?.enabled ?? false;
  if (!enabled) {
    return {
      enabled: false,
      contentWidth: available,
      width: available,
      offsetX: 0,
      insets: noInsets,
      align,
      style,
      paddingX: 0,
      paddingY: 0,
      title: undefined,
      titleAlign
    };
  }
  const paddingX = whole(config?.paddingX, 1);
  const paddingY = whole(config?.paddingY, 0);
  const insets = {
    left: borderWidth + paddingX,
    right: borderWidth + paddingX,
    top: borderWidth + paddingY,
    bottom: borderWidth + paddingY
  };
  const minWidth = insets.left + insets.right + 1;
  const width = config?.width === undefined ? available : Math.max(minWidth, Math.min(available, Math.floor(config.width)));
  const contentWidth = Math.max(1, width - insets.left - insets.right);
  return {
    enabled: true,
    contentWidth,
    width,
    offsetX: alignOffset(align, available, width),
    insets,
    align,
    style,
    paddingX,
    paddingY,
    title: fitTitle(config?.title, Math.max(0, width - borderWidth * 2 - 2)),
    titleAlign
  };
}
// src/core/tables.ts
var tableWidthModes = ["content", "full"];
function isTableWidthMode(value) {
  return typeof value === "string" && tableWidthModes.includes(value);
}
var tableOverflows = ["scroll", "wrap"];
function isTableOverflow(value) {
  return typeof value === "string" && tableOverflows.includes(value);
}
var tableColumnFitters = ["proportional", "balanced"];
function isTableColumnFitter(value) {
  return typeof value === "string" && tableColumnFitters.includes(value);
}
function resolveTableOptions(config) {
  const widthMode = config?.widthMode ?? "content";
  const overflow = config?.overflow ?? "scroll";
  return {
    widthMode,
    overflow,
    columnFitter: config?.columnFitter ?? "balanced",
    cellPaddingX: config?.cellPaddingX ?? 1,
    wrapMode: overflow === "scroll" && widthMode === "content" ? "none" : "word"
  };
}

// src/core/layout.ts
function createDocumentLayout(input) {
  const frame = resolveFrame(input.viewport, input.frame);
  return {
    frame,
    contentWidth: frame.contentWidth,
    tables: resolveTableOptions(input.tables)
  };
}
// src/core/document.ts
function assertNever(value) {
  throw new Error(`Unexpected document node: ${String(value)}`);
}
// src/core/parse.ts
import { Marked } from "marked";

// src/core/math.ts
function isEscaped(src, index) {
  let backslashes = 0;
  let i = index - 1;
  while (i >= 0 && src[i] === "\\") {
    backslashes++;
    i--;
  }
  return backslashes % 2 === 1;
}
function closing(src, delimiter, start, singleLine) {
  for (let index = start;index < src.length; index++) {
    if (singleLine && src[index] === `
`)
      break;
    if (src.startsWith(delimiter, index) && !isEscaped(src, index))
      return index;
  }
  return -1;
}
function createMathInlineExtension() {
  return {
    name: "mathInline",
    level: "inline",
    start(src) {
      let i = 0;
      while (i < src.length) {
        const ch = src[i];
        if (ch === "\\") {
          if (src[i + 1] === "(") {
            if (!isEscaped(src, i))
              return i;
          }
          i += 2;
          continue;
        }
        if (ch === "$") {
          if (src[i + 1] === "$") {
            i += 2;
            continue;
          }
          if (!isEscaped(src, i))
            return i;
        }
        i++;
      }
      return;
    },
    tokenizer(src) {
      if (src.startsWith("\\(")) {
        const end = closing(src, "\\)", 2, true);
        if (end > 2 && src.slice(2, end).indexOf(`
`) === -1) {
          const content = src.slice(2, end);
          const raw = src.slice(0, end + 2);
          return {
            type: "mathInline",
            raw,
            text: content,
            content,
            open: "\\(",
            close: "\\)"
          };
        }
      }
      if (src[0] === "$" && src[1] !== "$") {
        let j = 1;
        while (j < src.length) {
          if (src[j] === `
`)
            break;
          if (src[j] === "$" && !isEscaped(src, j)) {
            if (j === 1)
              break;
            const content = src.slice(1, j);
            const raw = src.slice(0, j + 1);
            return {
              type: "mathInline",
              raw,
              text: content,
              content,
              open: "$",
              close: "$"
            };
          }
          j++;
        }
      }
      return;
    }
  };
}
function createMathDisplayExtension() {
  return {
    name: "mathDisplay",
    level: "inline",
    start(src) {
      let i = 0;
      while (i < src.length) {
        const ch = src[i];
        if (ch === "\\") {
          if (src[i + 1] === "[") {
            if (!isEscaped(src, i))
              return i;
          }
          i += 2;
          continue;
        }
        if (ch === "$") {
          if (src[i + 1] === "$" && !isEscaped(src, i))
            return i;
        }
        i++;
      }
      return;
    },
    tokenizer(src) {
      if (src.startsWith("$$")) {
        const end = closing(src, "$$", 2, false);
        if (end > 2) {
          const content = src.slice(2, end);
          const raw = src.slice(0, end + 2);
          return {
            type: "mathDisplay",
            raw,
            text: content,
            content,
            open: "$$",
            close: "$$"
          };
        }
      }
      if (src.startsWith("\\[")) {
        const end = closing(src, "\\]", 2, false);
        if (end > 2) {
          const content = src.slice(2, end);
          const raw = src.slice(0, end + 2);
          return {
            type: "mathDisplay",
            raw,
            text: content,
            content,
            open: "\\[",
            close: "\\]"
          };
        }
      }
      return;
    }
  };
}

// src/core/parse.ts
var parser = new Marked({
  gfm: true,
  breaks: false,
  async: false,
  extensions: [createMathDisplayExtension(), createMathInlineExtension()]
});
function isDisplay(token) {
  return token.type === "mathDisplay";
}
function isInlineMath(token) {
  return token.type === "mathInline";
}
function childrenOf(token) {
  return "tokens" in token && Array.isArray(token.tokens) ? token.tokens : [];
}
function inlineToken(token) {
  if (isInlineMath(token)) {
    return [{ type: "math", content: token.content, raw: token.raw, open: token.open, close: token.close }];
  }
  if (isDisplay(token))
    return [{ type: "text", text: token.raw }];
  switch (token.type) {
    case "text":
      return childrenOf(token).length ? convertInline(childrenOf(token)) : [{ type: "text", text: token.text }];
    case "escape":
      return [{ type: "text", text: token.text }];
    case "codespan":
      return [{ type: "code", text: token.text }];
    case "strong":
    case "em":
    case "del":
      return [{ type: token.type, children: convertInline(token.tokens ?? []) }];
    case "link":
      return [{ type: "link", href: token.href, title: token.title ?? null, children: convertInline(token.tokens ?? []) }];
    case "image":
      return [{ type: "inline-image", href: token.href, title: token.title ?? null, alt: token.text }];
    case "br":
      return [{ type: "break", hard: true }];
    case "checkbox":
      return [];
    default:
      return token.raw ? [{ type: "text", text: token.raw }] : [];
  }
}
function convertInline(tokens) {
  return tokens.flatMap(inlineToken);
}
function directInline(tokens) {
  return tokens.flatMap((token) => token.type === "text" && childrenOf(token).length ? childrenOf(token) : [token]);
}
function convertParagraph(token, source) {
  const tokens = directInline(childrenOf(token));
  const visible = convertInline(tokens).filter((node) => node.type !== "text" || node.text.trim().length > 0);
  if (visible.length === 1 && visible[0].type === "inline-image") {
    const image = visible[0];
    return [{ type: "image", href: image.href, alt: image.alt, title: image.title, raw: token.raw, source }];
  }
  if (!tokens.some(isDisplay))
    return [{ type: "paragraph", children: convertInline(tokens), raw: token.raw, source }];
  const blocks = [];
  let pending = [];
  let offset = source?.start ?? 0;
  let aligned = source !== null;
  let pendingStart = offset;
  const flush = () => {
    if (!pending.length)
      return;
    const raw = pending.map((child) => child.raw).join("");
    const children = convertInline(pending);
    if (children.length)
      blocks.push({ type: "paragraph", raw, source: aligned ? { start: pendingStart, end: offset } : null, children });
    pending = [];
    pendingStart = offset;
  };
  for (const child of tokens) {
    if (aligned && token.raw.slice(offset - source.start, offset - source.start + child.raw.length) !== child.raw)
      aligned = false;
    if (isDisplay(child)) {
      flush();
      offset += child.raw.length;
      blocks.push({
        type: "display-math",
        content: child.content,
        open: child.open,
        close: child.close,
        raw: child.raw,
        source: aligned ? { start: offset - child.raw.length, end: offset } : null
      });
      pendingStart = offset;
    } else {
      pending.push(child);
      offset += child.raw.length;
    }
  }
  flush();
  return blocks;
}
function convertBlocks(tokens, source, start = 0) {
  const blocks = [];
  let cursor = start;
  for (const token of tokens) {
    const range = source !== null && source.slice(cursor, cursor + token.raw.length) === token.raw ? { start: cursor, end: cursor + token.raw.length } : null;
    cursor += token.raw.length;
    if (token.type === "space" || token.type === "def" || token.type === "checkbox")
      continue;
    if (isDisplay(token)) {
      blocks.push({ type: "display-math", content: token.content, open: token.open, close: token.close, raw: token.raw, source: range });
      continue;
    }
    switch (token.type) {
      case "paragraph":
      case "text":
        blocks.push(...convertParagraph(token, range));
        break;
      case "heading":
        blocks.push({ type: "heading", level: token.depth, children: convertInline(childrenOf(token)), raw: token.raw, source: range });
        break;
      case "blockquote":
        blocks.push({ type: "quote", blocks: convertBlocks(childrenOf(token), null), raw: token.raw, source: range });
        break;
      case "list": {
        const list = token;
        let cursor = 0;
        const items = list.items.map((item) => {
          let itemSource = null;
          if (range !== null && list.raw.slice(cursor, cursor + item.raw.length) === item.raw) {
            itemSource = { start: range.start + cursor, end: range.start + cursor + item.raw.length };
          }
          cursor += item.raw.length;
          return {
            task: item.task,
            checked: item.task ? item.checked ?? false : null,
            loose: item.loose,
            blocks: convertBlocks(item.tokens, null),
            source: itemSource
          };
        });
        blocks.push({
          type: "list",
          raw: list.raw,
          source: range,
          ordered: list.ordered,
          start: list.start === "" ? 1 : list.start,
          loose: list.loose,
          items
        });
        break;
      }
      case "table": {
        const table = token;
        const convertCell = (cell, header, align) => ({
          children: cell ? convertInline(cell.tokens) : [],
          header,
          align
        });
        const align = table.align;
        const header = table.header.map((cell, i) => convertCell(cell, true, align[i] ?? null));
        const rows = table.rows.map((row) => header.map((_, i) => convertCell(row[i], false, align[i] ?? null)));
        blocks.push({ type: "table", align, header, rows, raw: table.raw, source: range });
        break;
      }
      case "code": {
        const language = token.lang ?? null;
        if (language?.trim().split(/\s+/)[0]?.toLowerCase() === "mermaid") {
          blocks.push({ type: "mermaid", content: token.text, language: "mermaid", raw: token.raw, source: range });
        } else {
          blocks.push({ type: "code", content: token.text, language, fenced: /^ {0,3}(?:`{3,}|~{3,})/.test(token.raw), raw: token.raw, source: range });
        }
        break;
      }
      case "hr":
        blocks.push({ type: "rule", raw: token.raw, source: range });
        break;
      default:
        if (token.raw)
          blocks.push({ type: "literal", text: token.raw, raw: token.raw, source: range });
    }
  }
  return blocks;
}
function parseDocument(source) {
  const normalized = source.replace(/\r\n?/g, `
`);
  const blocks = convertBlocks(parser.lexer(normalized), normalized);
  if (normalized === source)
    return { source, blocks };
  const offsets = [0];
  for (let index = 0;index < source.length; index++) {
    if (source[index] === "\r" && source[index + 1] === `
`)
      index++;
    offsets.push(index + 1);
  }
  const originalRange = (range) => range === null ? null : { start: offsets[range.start], end: offsets[range.end] };
  const originalBlock = (block) => {
    if (block.type === "list")
      return {
        ...block,
        source: originalRange(block.source),
        items: block.items.map((item) => ({ ...item, source: originalRange(item.source) }))
      };
    return { ...block, source: originalRange(block.source) };
  };
  return { source, blocks: blocks.map(originalBlock) };
}
export {
  assertNever,
  createDocumentLayout,
  frameAligns,
  frameStyles,
  isFrameAlign,
  isFrameStyle,
  isTableColumnFitter,
  isTableOverflow,
  isTableWidthMode,
  parseDocument,
  resolveFrame,
  resolveTableOptions,
  standaloneImage,
  tableColumnFitters,
  tableOverflows,
  tableWidthModes
};
