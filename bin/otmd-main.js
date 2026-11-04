// @bun
// bin/otmd-main.tsx
import { createComponent as _$createComponent9 } from "@opentui/solid";
import { memo as _$memo7 } from "@opentui/solid";
import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import path5 from "path";

// src/app.tsx
import { effect as _$effect7 } from "@opentui/solid";
import { insert as _$insert7 } from "@opentui/solid";
import { createComponent as _$createComponent6 } from "@opentui/solid";
import { setProp as _$setProp9 } from "@opentui/solid";
import { createElement as _$createElement9 } from "@opentui/solid";
import { createEffect as createEffect4, createMemo as createMemo6, createSignal as createSignal5, onCleanup as onCleanup4 } from "solid-js";

// src/graphics.ts
import { createMemo, createSignal, onCleanup } from "solid-js";
function resolveGraphicsProtocol(capabilities, hasResolution) {
  const configured = capabilities?.image_protocol;
  if (configured && configured !== "auto")
    return configured === "sixel" && !hasResolution ? "blocks" : configured;
  if (!capabilities || capabilities.multiplexer === "tmux")
    return "blocks";
  if (capabilities.kitty_graphics)
    return "kitty";
  if (capabilities.sixel && hasResolution)
    return "sixel";
  return "blocks";
}
var mosaicScale = (protocol) => protocol === "blocks" ? 2 : 1;
function useCanvasGraphics(renderer) {
  const [queried, setQueried] = createSignal(0);
  const onCapabilities = () => setQueried((value) => value + 1);
  renderer.on("capabilities", onCapabilities);
  let refresh;
  const onResize = () => {
    if (refresh)
      clearTimeout(refresh);
    refresh = setTimeout(() => {
      refresh = undefined;
      setQueried((value) => value + 1);
    }, 250);
  };
  renderer.on("resize", onResize);
  const probe = setInterval(() => {
    if (!renderer.resolution)
      return;
    clearInterval(probe);
    setQueried((value) => value + 1);
  }, 50);
  const stopProbe = setTimeout(() => clearInterval(probe), 1000);
  onCleanup(() => {
    renderer.off("capabilities", onCapabilities);
    renderer.off("resize", onResize);
    clearInterval(probe);
    clearTimeout(stopProbe);
    if (refresh)
      clearTimeout(refresh);
  });
  const resolution = createMemo(() => {
    queried();
    const value = renderer.resolution;
    return value && value.width > 0 && value.height > 0 ? value : null;
  });
  const cell = createMemo(() => {
    const value = resolution();
    const width = renderer.terminalWidth;
    const height = renderer.terminalHeight;
    if (!value || width <= 0 || height <= 0)
      return null;
    const cellWidth = value.width / width;
    const cellHeight = value.height / height;
    if (cellWidth <= 0 || cellHeight <= 0)
      return null;
    return { width: Math.max(1, Math.round(cellWidth)), height: Math.max(1, Math.round(cellHeight)) };
  });
  const protocol = createMemo(() => {
    queried();
    return resolveGraphicsProtocol(renderer.capabilities, resolution() !== null);
  });
  const hyperlinks = createMemo(() => {
    queried();
    return renderer.capabilities?.hyperlinks === true;
  });
  return { cell, protocol, hyperlinks };
}

// src/headings.ts
import { TextAttributes } from "@opentui/core";
var headingLevels = [1, 2, 3, 4, 5, 6];
var defaultHeadingStyles = {
  1: { bold: true, italic: false, underline: true, dim: false, uppercase: false, marginTop: 2, marginBottom: 1 },
  2: { bold: true, italic: false, underline: false, dim: false, uppercase: false, marginTop: 1, marginBottom: 0 },
  3: { bold: true, italic: false, underline: false, dim: false, uppercase: false, marginTop: 1, marginBottom: 0 },
  4: { bold: false, italic: true, underline: false, dim: false, uppercase: false, marginTop: 1, marginBottom: 0 },
  5: { bold: false, italic: true, underline: false, dim: true, uppercase: false, marginTop: 1, marginBottom: 0 },
  6: { bold: false, italic: false, underline: false, dim: true, uppercase: false, marginTop: 1, marginBottom: 0 }
};
function mergeHeadingStyle(base, override) {
  if (!override)
    return base;
  return {
    bold: override.bold ?? base.bold,
    italic: override.italic ?? base.italic,
    underline: override.underline ?? base.underline,
    dim: override.dim ?? base.dim,
    uppercase: override.uppercase ?? base.uppercase,
    marginTop: override.marginTop ?? base.marginTop,
    marginBottom: override.marginBottom ?? base.marginBottom
  };
}
function resolveHeadingStyles(config) {
  const styles = {};
  for (const level of headingLevels) {
    styles[level] = mergeHeadingStyle(defaultHeadingStyles[level], config?.levels?.[`${level}`]);
  }
  return styles;
}
function headingAttributes(style) {
  let attributes = TextAttributes.NONE;
  if (style.bold)
    attributes |= TextAttributes.BOLD;
  if (style.italic)
    attributes |= TextAttributes.ITALIC;
  if (style.underline)
    attributes |= TextAttributes.UNDERLINE;
  if (style.dim)
    attributes |= TextAttributes.DIM;
  return attributes;
}
function headingColor(theme, level) {
  return theme.markdown.headingLevels?.[level - 1] ?? theme.markdown.heading;
}

// src/math/index.ts
import { createHash } from "crypto";

// src/math/native.ts
import path from "path";
import { createRequire } from "module";

class NativeMathUnavailableError extends Error {
  attempts;
  constructor(attempts) {
    super(`Unable to load native math addon. Tried ${attempts.map((attempt) => attempt.file).join(", ")}`);
    this.attempts = attempts;
    this.name = "NativeMathUnavailableError";
  }
}
var loaded;
function loadNativeMath() {
  loaded ??= importNativeMath();
  return loaded;
}
async function importNativeMath() {
  if (process.platform !== "linux" || process.arch !== "x64")
    return;
  const relative = path.join("prebuilds", "linux-x64-gnu", "opentui_markdown_render.node");
  const require2 = createRequire(import.meta.url);
  const candidates = [
    path.join(import.meta.dir, "..", "..", relative),
    path.join(import.meta.dir, "..", relative),
    path.join(import.meta.dir, relative),
    path.join(import.meta.dir, "node_modules", "opentui-markdown-render", relative)
  ];
  try {
    const entry = require2.resolve("opentui-markdown-render");
    candidates.unshift(path.resolve(path.dirname(entry), "..", relative));
  } catch {}
  const attempts = [];
  for (const file of new Set(candidates)) {
    try {
      return require2(file);
    } catch (error) {
      attempts.push({ file, error: error instanceof Error ? error.message : String(error) });
    }
  }
  throw new NativeMathUnavailableError(attempts);
}

// src/math/renderer.ts
var limit = 128;
var cache = new Map;
function renderMath(request) {
  if (request.enabled === false)
    return Promise.resolve(undefined);
  const scale = request.scale ?? 2;
  const display = request.display ?? false;
  const cellWidth = request.cellWidth ?? 8;
  const cellHeight = request.cellHeight ?? 16;
  const compact = request.compact ?? false;
  const standard = request.standard ?? false;
  const key = JSON.stringify({
    latex: request.latex,
    scale,
    foreground: request.foreground,
    background: request.background,
    display,
    cellWidth,
    cellHeight,
    compact,
    standard
  });
  const cached = cache.get(key);
  if (cached)
    return cached;
  const result = loadNativeMath().then(async (native) => {
    if (!native)
      return;
    const image = await native.renderLatex({
      latex: request.latex,
      scale,
      foreground: request.foreground,
      background: request.background,
      display,
      cellWidth,
      cellHeight,
      compact,
      standard
    });
    return {
      png: image.png,
      pixelWidth: image.pixelWidth,
      pixelHeight: image.pixelHeight,
      baseline: image.baseline,
      clamped: image.clamped
    };
  }).catch((error) => {
    if (error instanceof NativeMathUnavailableError)
      throw error;
    return;
  });
  cache.set(key, result);
  if (cache.size > limit)
    cache.delete(cache.keys().next().value);
  return result;
}

// src/math/validate.ts
function isRenderableLatex(content) {
  let depth = 0;
  let left = 0;
  let right = 0;
  for (let index = 0;index < content.length; index++) {
    const character = content[index];
    if (character === "\\") {
      if (content[index + 1] === undefined)
        return false;
      if (!/[A-Za-z]/.test(content[index + 1])) {
        index++;
        continue;
      }
      let cursor = index + 1;
      while (cursor < content.length && /[A-Za-z]/.test(content[cursor]))
        cursor++;
      const name = content.slice(index, cursor);
      if (name === "\\left")
        left++;
      else if (name === "\\right")
        right++;
      index = cursor - 1;
      continue;
    }
    if (character === "{") {
      depth++;
      continue;
    }
    if (character === "}") {
      if (depth === 0)
        return false;
      depth--;
    }
  }
  return depth === 0 && left === right;
}

// src/math/index.ts
function rgbaToHex(color) {
  const channel = (value) => Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, "0");
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}
function mathImageID(content, display, color, cell, scale = 1, compact = false, standard = false) {
  return createHash("sha256").update(JSON.stringify({ content, display, color, cell, scale, compact, standard, renderer: "mitex-typst-png-v2" })).digest("hex");
}
var fontSizePoints = 12;
async function renderMathImage(content, display, color, background, cell, scale = 1, compact = false, standard = false) {
  const latex = content.trim();
  if (!isRenderableLatex(latex))
    return;
  const cellWidth = cell?.width ?? 8;
  const cellHeight = cell?.height ?? 16;
  const base = cellHeight / fontSizePoints;
  const rendered = await renderMath({
    latex,
    foreground: color,
    background,
    scale: base * scale,
    display,
    cellWidth,
    cellHeight,
    compact,
    standard
  });
  if (!rendered)
    return;
  const columns = Math.max(1, Math.round(rendered.pixelWidth / cellWidth));
  const rows = Math.max(1, Math.round(rendered.pixelHeight / cellHeight));
  const baseline = rendered.baseline / cellHeight;
  return { png: rendered.png, columns, rows, baseline, clamped: rendered.clamped };
}

// src/config/load.ts
import { existsSync, readFileSync, statSync } from "fs";
import os from "os";
import path2 from "path";

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

// src/config/types.ts
var statusLineStyles = ["plain", "bar"];
function isStatusLineStyle(value) {
  return typeof value === "string" && statusLineStyles.includes(value);
}
var headingLevelKeys = ["1", "2", "3", "4", "5", "6"];
function isHeadingLevelKey(value) {
  return headingLevelKeys.includes(value);
}
var statusLineFields = [
  "title",
  "mode",
  "protocol",
  "cell",
  "mathScale",
  "position",
  "hint",
  "text"
];
function isStatusLineField(value) {
  return typeof value === "string" && statusLineFields.includes(value);
}

// src/config/theme.ts
var colorNames = new Set([
  "transparent",
  "black",
  "white",
  "red",
  "green",
  "blue",
  "yellow",
  "cyan",
  "magenta",
  "silver",
  "gray",
  "grey",
  "maroon",
  "olive",
  "lime",
  "aqua",
  "teal",
  "navy",
  "fuchsia",
  "purple",
  "orange",
  "brightblack",
  "brightred",
  "brightgreen",
  "brightblue",
  "brightyellow",
  "brightcyan",
  "brightmagenta",
  "brightwhite"
]);
var colors = (keys) => Object.fromEntries(keys.map((key) => [key, "color"]));
var themeFileFields = {
  mode: "mode",
  palette: "colors",
  accent: "color",
  categorical: "colors",
  text: {
    base: "color",
    muted: "color",
    feedback: colors(["error", "warning", "success", "info"]),
    action: { primary: { focused: "color" } }
  },
  background: { base: "color" },
  border: { base: "color" },
  frame: colors(["border", "title"]),
  statusline: colors(["background", "foreground", "title", "muted", "border"]),
  markdown: colors([
    "text",
    "heading",
    "heading1",
    "heading2",
    "heading3",
    "heading4",
    "heading5",
    "heading6",
    "link",
    "linkText",
    "code",
    "blockQuote",
    "emphasis",
    "strong",
    "horizontalRule",
    "listItem",
    "listEnumeration",
    "image",
    "imageText",
    "codeBlock"
  ]),
  syntax: colors(["comment", "keyword", "function", "variable", "string", "number", "type", "operator", "punctuation"]),
  diff: {
    text: colors(["added", "removed", "context"]),
    background: colors(["added", "removed", "context"])
  }
};
function isColor(value) {
  return typeof value === "string" && (/^#?(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) || colorNames.has(value.toLowerCase()));
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateTheme(value, file, report) {
  const warn = (message) => {
    if (report)
      report(message);
    else
      console.warn(`[opentui-markdown-render] ${message}`);
  };
  const validate = (source, fields, prefix) => {
    const result = Object.create(null);
    for (const [key, entry] of Object.entries(source)) {
      const field = Object.hasOwn(fields, key) ? fields[key] : undefined;
      const location = `${prefix}.${key}`;
      if (field === undefined) {
        warn(`Unknown theme option "${location}" in ${file}`);
        continue;
      }
      if (field === "color" && isColor(entry))
        result[key] = entry;
      else if (field === "mode" && (entry === "light" || entry === "dark" || entry === "solarized-light" || entry === "solarized-dark"))
        result[key] = entry;
      else if (field === "colors" && Array.isArray(entry)) {
        result[key] = entry.filter((color, index) => {
          if (isColor(color))
            return true;
          warn(`Invalid theme option "${location}[${index}]" in ${file}`);
          return false;
        });
      } else if (typeof field === "object" && isRecord(entry)) {
        result[key] = validate(entry, field, location);
      } else {
        warn(`Invalid theme option "${location}" in ${file}`);
      }
    }
    return result;
  };
  return validate(value, themeFileFields, "theme");
}
function validateThemeConfig(value, file, report) {
  const warn = (message) => {
    if (report)
      report(message);
    else
      console.warn(`[opentui-markdown-render] ${message}`);
  };
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key !== "name") {
      warn(`Unknown theme option "theme.${key}" in ${file}`);
      continue;
    }
    if (typeof entry !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(entry)) {
      warn(`Invalid theme option "theme.name" in ${file}`);
      continue;
    }
    result.name = entry;
  }
  return result;
}

// src/config/load.ts
var configFilenames = ["opentui-markdown-render.jsonc", "opentui-markdown-render.json"];
var xdgConfigFilenames = ["config.jsonc", "config.json"];
var xdgConfigDirectory = "otmd";
function warn(report, message) {
  if (report)
    report(message);
  else
    console.warn(`[opentui-markdown-render] ${message}`);
}
function loadConfig(explicitPath, cwd, report) {
  const file = explicitPath ?? discoverConfig(cwd ?? process.cwd());
  if (!file)
    return {};
  if (!existsSync(file)) {
    if (explicitPath)
      throw new Error(`Config not found: ${file}`);
    return {};
  }
  return parseConfig(readFileSync(file, "utf8"), file, report);
}
function loadRendererConfig(configPath, cwd, options = {}) {
  if (options.discover === false && !configPath)
    return {};
  try {
    return loadConfig(configPath, cwd, options.report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warn(options.report, message);
    return {};
  }
}
function discoverConfig(start, environment = { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, HOME: process.env.HOME }) {
  let directory = path2.resolve(start);
  while (true) {
    for (const name of configFilenames) {
      const candidate = path2.join(directory, name);
      if (existsSync(candidate) && statSync(candidate).isFile())
        return candidate;
    }
    const parent = path2.dirname(directory);
    if (parent === directory)
      break;
    directory = parent;
  }
  return discoverXdgConfig(environment);
}
function discoverXdgConfig(environment) {
  const configured = environment.XDG_CONFIG_HOME;
  const configHome = configured && path2.isAbsolute(configured) ? configured : path2.join(environment.HOME || os.homedir(), ".config");
  const directory = path2.join(configHome, xdgConfigDirectory);
  for (const name of xdgConfigFilenames) {
    const candidate = path2.join(directory, name);
    if (existsSync(candidate) && statSync(candidate).isFile())
      return candidate;
  }
  return;
}
function parseConfig(source, file = "config", report) {
  const parsed = parseJsonc(source, file);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid config ${file}: expected a JSON object`);
  }
  return validateConfig(parsed, file, report);
}
function parseJsonc(source, file = "config") {
  try {
    return JSON.parse(stripJsonComments(source));
  } catch (error) {
    throw new Error(`Invalid config ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
var sections = ["theme", "statusline", "images", "mermaid", "headings", "frame", "tables"];
function validateConfig(value, file, report) {
  for (const key of Object.keys(value)) {
    if (key === "$schema")
      continue;
    if (!sections.includes(key)) {
      warn(report, `Unknown config section "${key}" in ${file}`);
    }
  }
  return {
    theme: isRecord2(value.theme) ? validateThemeConfig(value.theme, file, report) : undefined,
    statusline: isRecord2(value.statusline) ? validateStatusLine(value.statusline, file, report) : undefined,
    images: isRecord2(value.images) ? validateImages(value.images) : undefined,
    mermaid: isRecord2(value.mermaid) ? validateMermaid(value.mermaid, file, report) : undefined,
    headings: isRecord2(value.headings) ? validateHeadings(value.headings, file, report) : undefined,
    frame: isRecord2(value.frame) ? validateFrame(value.frame, file, report) : undefined,
    tables: isRecord2(value.tables) ? validateTables(value.tables, file, report) : undefined
  };
}
function validateStatusLine(value, file, report) {
  const fields = [];
  if (Array.isArray(value.fields)) {
    for (const entry of value.fields) {
      if (isStatusLineField(entry))
        fields.push(entry);
      else
        warn(report, `Unknown status line field "${String(entry)}" in ${file}`);
    }
  }
  if (value.style !== undefined && !isStatusLineStyle(value.style)) {
    warn(report, `Unknown status line style "${String(value.style)}" in ${file}`);
  }
  if (value.highlight !== undefined && !isStatusLineField(value.highlight)) {
    warn(report, `Unknown status line field "${String(value.highlight)}" in ${file}`);
  }
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
    fields: fields.length ? fields : undefined,
    separator: typeof value.separator === "string" ? value.separator : undefined,
    border: value.border === "none" || value.border === "top" || value.border === "bottom" ? value.border : undefined,
    style: isStatusLineStyle(value.style) ? value.style : undefined,
    highlight: isStatusLineField(value.highlight) ? value.highlight : undefined
  };
}
function validateImages(value) {
  return {
    maxColumns: positiveInteger(value.maxColumns),
    maxRows: positiveInteger(value.maxRows)
  };
}
function validateMermaid(value, file, report) {
  if (value.classLayout !== undefined && value.classLayout !== "builtin" && value.classLayout !== "dagre") {
    warn(report, `Unknown Mermaid class layout "${String(value.classLayout)}" in ${file}`);
  }
  return {
    compact: typeof value.compact === "boolean" ? value.compact : undefined,
    layoutMaxWidth: positiveInteger(value.layoutMaxWidth),
    classLayout: value.classLayout === "dagre" || value.classLayout === "builtin" ? value.classLayout : undefined
  };
}
function validateFrame(value, file, report) {
  const option = (name, check) => {
    const entry = value[name];
    if (entry === undefined)
      return;
    if (check(entry))
      return entry;
    warn(report, `Invalid frame option "${name}" in ${file}`);
    return;
  };
  const padding = (name) => {
    const entry = value[name];
    if (entry === undefined)
      return;
    if (isNonNegativeInteger(entry))
      return entry;
    warn(report, `Invalid frame option "${name}" in ${file}`);
    return;
  };
  const boolean = (name) => {
    const entry = value[name];
    if (entry === undefined)
      return;
    if (typeof entry === "boolean")
      return entry;
    warn(report, `Invalid frame option "${name}" in ${file}`);
    return;
  };
  const width = (() => {
    const entry = value.width;
    if (entry === undefined)
      return;
    if (typeof entry === "number" && Number.isInteger(entry) && entry > 0)
      return entry;
    warn(report, `Invalid frame option "width" in ${file}`);
    return;
  })();
  const title = value.title;
  if (title !== undefined && typeof title !== "string") {
    warn(report, `Invalid frame option "title" in ${file}`);
  }
  return {
    enabled: boolean("enabled"),
    width,
    align: option("align", isFrameAlign),
    style: option("style", isFrameStyle),
    paddingX: padding("paddingX"),
    paddingY: padding("paddingY"),
    title: typeof title === "string" ? title : undefined,
    titleAlign: option("titleAlign", isFrameAlign)
  };
}
function validateTables(value, file, report) {
  const option = (name, check) => {
    const entry = value[name];
    if (entry === undefined)
      return;
    if (check(entry))
      return entry;
    warn(report, `Invalid tables option "${name}" in ${file}`);
    return;
  };
  const padding = value.cellPaddingX;
  if (padding !== undefined && !isNonNegativeInteger(padding)) {
    warn(report, `Invalid tables option "cellPaddingX" in ${file}`);
  }
  return {
    widthMode: option("widthMode", isTableWidthMode),
    overflow: option("overflow", isTableOverflow),
    columnFitter: option("columnFitter", isTableColumnFitter),
    cellPaddingX: isNonNegativeInteger(padding) ? padding : undefined
  };
}
function validateHeadings(value, file, report) {
  if (value.levels !== undefined && !isRecord2(value.levels)) {
    warn(report, `Invalid heading levels in ${file}`);
    return;
  }
  const levels = {};
  for (const [key, entry] of Object.entries(value.levels ?? {})) {
    if (!isHeadingLevelKey(key)) {
      warn(report, `Unknown heading level "${key}" in ${file}`);
      continue;
    }
    if (!isRecord2(entry)) {
      warn(report, `Invalid heading level "${key}" in ${file}`);
      continue;
    }
    levels[key] = validateHeadingLevel(key, entry, file, report);
  }
  return Object.keys(levels).length ? { levels } : undefined;
}
function validateHeadingLevel(key, value, file, report) {
  const style = {};
  for (const [name, entry] of Object.entries(value)) {
    switch (name) {
      case "bold":
      case "italic":
      case "underline":
      case "dim":
      case "uppercase":
        if (typeof entry !== "boolean") {
          warn(report, `Invalid heading option "${name}" for level ${key} in ${file}`);
          continue;
        }
        style[name] = entry;
        break;
      case "marginTop":
      case "marginBottom":
        if (!isNonNegativeInteger(entry)) {
          warn(report, `Invalid heading option "${name}" for level ${key} in ${file}`);
          continue;
        }
        style[name] = entry;
        break;
      default:
        warn(report, `Unknown heading option "${name}" for level ${key} in ${file}`);
    }
  }
  return style;
}
function isNonNegativeInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
function positiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stripJsonComments(source) {
  let result = "";
  let index = 0;
  let inString = false;
  let quote = "";
  while (index < source.length) {
    const character = source[index];
    if (inString) {
      result += character;
      if (character === "\\") {
        result += source[index + 1] ?? "";
        index += 2;
        continue;
      }
      if (character === quote)
        inString = false;
      index++;
      continue;
    }
    if (character === '"' || character === "'") {
      inString = true;
      quote = character;
      result += character;
      index++;
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== `
`)
        index++;
      continue;
    }
    if (character === "/" && source[index + 1] === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/"))
        index++;
      index += 2;
      continue;
    }
    result += character;
    index++;
  }
  return result.replace(/,(\s*[}\]])/g, "$1");
}
// src/theme/resolve.ts
import { parseColor } from "@opentui/core";

// src/theme/defaults.ts
import { RGBA } from "@opentui/core";
var h = (hex) => RGBA.fromHex(hex);
var solarizedPalette = [
  "#002b36",
  "#073642",
  "#586e75",
  "#657b83",
  "#839496",
  "#93a1a1",
  "#eee8d5",
  "#fdf6e3",
  "#b58900",
  "#cb4b16",
  "#dc322f",
  "#d33682",
  "#6c71c4",
  "#268bd2",
  "#2aa198",
  "#859900"
].map(h);
var light = {
  mode: "light",
  accent: h("#0969da"),
  categorical: [h("#0969da"), h("#8250df"), h("#1a7f37"), h("#9a6700"), h("#cf222e"), h("#bc4c00")],
  text: {
    base: h("#1f2328"),
    muted: h("#59636e"),
    feedback: {
      error: h("#cf222e"),
      warning: h("#9a6700"),
      success: h("#1a7f37"),
      info: h("#0969da")
    },
    action: { primary: { focused: h("#0969da") } }
  },
  background: { base: h("#ffffff") },
  border: { base: h("#8c959f") },
  frame: { border: h("#8c959f"), title: h("#59636e") },
  markdown: {
    text: h("#1f2328"),
    heading: h("#8250df"),
    headingLevels: [h("#0969da"), h("#8250df"), h("#8250df"), h("#6f42c1"), h("#3d444d"), h("#3d444d")],
    link: h("#0969da"),
    linkText: h("#0969da"),
    code: h("#953800"),
    blockQuote: h("#59636e"),
    emphasis: h("#1f2328"),
    strong: h("#1f2328"),
    horizontalRule: h("#d1d9e0"),
    listItem: h("#1f2328"),
    listEnumeration: h("#1f2328"),
    image: h("#0969da"),
    imageText: h("#0969da"),
    codeBlock: h("#1f2328")
  },
  syntax: {
    comment: h("#59636e"),
    keyword: h("#cf222e"),
    function: h("#8250df"),
    variable: h("#1f2328"),
    string: h("#0a3069"),
    number: h("#0550ae"),
    type: h("#0550ae"),
    operator: h("#0550ae"),
    punctuation: h("#1f2328")
  },
  diff: {
    text: { added: h("#1a7f37"), removed: h("#cf222e"), context: h("#59636e") },
    background: { added: h("#dafbe1"), removed: h("#ffebe9"), context: h("#f6f8fa") }
  }
};
var dark = {
  mode: "dark",
  accent: h("#58a6ff"),
  categorical: [h("#58a6ff"), h("#d2a8ff"), h("#3fb950"), h("#d29922"), h("#f85149"), h("#ffa657")],
  text: {
    base: h("#e6edf3"),
    muted: h("#8b949e"),
    feedback: {
      error: h("#f85149"),
      warning: h("#d29922"),
      success: h("#3fb950"),
      info: h("#58a6ff")
    },
    action: { primary: { focused: h("#58a6ff") } }
  },
  background: { base: h("#0d1117") },
  border: { base: h("#30363d") },
  frame: { border: h("#30363d"), title: h("#8b949e") },
  markdown: {
    text: h("#e6edf3"),
    heading: h("#d2a8ff"),
    headingLevels: [h("#58a6ff"), h("#d2a8ff"), h("#d2a8ff"), h("#8b949e"), h("#8b949e"), h("#8b949e")],
    link: h("#58a6ff"),
    linkText: h("#58a6ff"),
    code: h("#ffa657"),
    blockQuote: h("#8b949e"),
    emphasis: h("#e6edf3"),
    strong: h("#e6edf3"),
    horizontalRule: h("#30363d"),
    listItem: h("#e6edf3"),
    listEnumeration: h("#e6edf3"),
    image: h("#58a6ff"),
    imageText: h("#58a6ff"),
    codeBlock: h("#e6edf3")
  },
  syntax: {
    comment: h("#8b949e"),
    keyword: h("#ff7b72"),
    function: h("#d2a8ff"),
    variable: h("#ffa657"),
    string: h("#a5d6ff"),
    number: h("#79c0ff"),
    type: h("#ffa657"),
    operator: h("#ff7b72"),
    punctuation: h("#c9d1d9")
  },
  diff: {
    text: { added: h("#3fb950"), removed: h("#f85149"), context: h("#8b949e") },
    background: { added: h("#12261e"), removed: h("#25171c"), context: h("#161b22") }
  }
};
var solarizedLight = {
  mode: "light",
  palette: solarizedPalette,
  accent: h("#268bd2"),
  categorical: [h("#268bd2"), h("#6c71c4"), h("#859900"), h("#b58900"), h("#dc322f"), h("#cb4b16")],
  text: {
    base: h("#586e75"),
    muted: h("#657b83"),
    feedback: { error: h("#dc322f"), warning: h("#b58900"), success: h("#859900"), info: h("#268bd2") },
    action: { primary: { focused: h("#268bd2") } }
  },
  background: { base: h("#fdf6e3") },
  border: { base: h("#657b83") },
  frame: { border: h("#657b83"), title: h("#586e75") },
  markdown: {
    text: h("#586e75"),
    heading: h("#268bd2"),
    headingLevels: [h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2")],
    link: h("#268bd2"),
    linkText: h("#268bd2"),
    code: h("#cb4b16"),
    blockQuote: h("#657b83"),
    emphasis: h("#586e75"),
    strong: h("#586e75"),
    horizontalRule: h("#657b83"),
    listItem: h("#586e75"),
    listEnumeration: h("#586e75"),
    image: h("#268bd2"),
    imageText: h("#268bd2"),
    codeBlock: h("#586e75")
  },
  syntax: {
    comment: h("#657b83"),
    keyword: h("#dc322f"),
    function: h("#6c71c4"),
    variable: h("#586e75"),
    string: h("#2aa198"),
    number: h("#d33682"),
    type: h("#b58900"),
    operator: h("#268bd2"),
    punctuation: h("#586e75")
  },
  diff: {
    text: { added: h("#859900"), removed: h("#dc322f"), context: h("#657b83") },
    background: { added: h("#eee8d5"), removed: h("#eee8d5"), context: h("#eee8d5") }
  }
};
var solarizedDark = {
  mode: "dark",
  palette: solarizedPalette,
  accent: h("#268bd2"),
  categorical: [h("#268bd2"), h("#6c71c4"), h("#859900"), h("#b58900"), h("#dc322f"), h("#cb4b16")],
  text: {
    base: h("#93a1a1"),
    muted: h("#839496"),
    feedback: { error: h("#dc322f"), warning: h("#b58900"), success: h("#859900"), info: h("#268bd2") },
    action: { primary: { focused: h("#268bd2") } }
  },
  background: { base: h("#002b36") },
  border: { base: h("#586e75") },
  frame: { border: h("#586e75"), title: h("#93a1a1") },
  markdown: {
    text: h("#93a1a1"),
    heading: h("#268bd2"),
    headingLevels: [h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2"), h("#268bd2")],
    link: h("#268bd2"),
    linkText: h("#268bd2"),
    code: h("#cb4b16"),
    blockQuote: h("#839496"),
    emphasis: h("#93a1a1"),
    strong: h("#93a1a1"),
    horizontalRule: h("#586e75"),
    listItem: h("#93a1a1"),
    listEnumeration: h("#93a1a1"),
    image: h("#268bd2"),
    imageText: h("#268bd2"),
    codeBlock: h("#93a1a1")
  },
  syntax: {
    comment: h("#839496"),
    keyword: h("#dc322f"),
    function: h("#6c71c4"),
    variable: h("#93a1a1"),
    string: h("#2aa198"),
    number: h("#d33682"),
    type: h("#b58900"),
    operator: h("#268bd2"),
    punctuation: h("#93a1a1")
  },
  diff: {
    text: { added: h("#859900"), removed: h("#dc322f"), context: h("#839496") },
    background: { added: h("#073642"), removed: h("#073642"), context: h("#073642") }
  }
};
function defaultTheme(preset) {
  switch (preset) {
    case "light":
      return light;
    case "dark":
      return dark;
    case "solarized-light":
      return solarizedLight;
    case "solarized-dark":
      return solarizedDark;
  }
}

// src/theme/colors.ts
import { RGBA as RGBA2 } from "@opentui/core";
function mixColors(over, base, ratio) {
  const weight = Math.min(Math.max(ratio, 0), 1);
  const [overR, overG, overB] = over.toInts();
  const [baseR, baseG, baseB] = base.toInts();
  const channel = (from, to) => Math.round(to + (from - to) * weight);
  return RGBA2.fromInts(channel(overR, baseR), channel(overG, baseG), channel(overB, baseB), 255);
}

// src/theme/resolve.ts
function resolveTheme(options) {
  const override = options.override;
  const mode = override?.mode ?? options.mode ?? "light";
  return mergeTheme(defaultTheme(mode), override);
}
function deriveStatusLineTheme(theme) {
  const ratio = theme.mode === "light" ? 0.12 : 0.14;
  return {
    background: theme.palette?.[theme.mode === "light" ? 6 : 1] ?? mixColors(theme.accent, theme.background.base, ratio),
    foreground: theme.text.base,
    title: theme.accent,
    muted: theme.text.muted,
    border: theme.accent
  };
}
function mergeTheme(base, override) {
  if (!override)
    return base;
  const color = (value, fallback) => value === undefined ? fallback : parseColor(value);
  const accent = color(override.accent, base.accent);
  const palette = override.palette ? override.palette.map((entry) => parseColor(entry)) : base.palette;
  const background = { base: color(override.background?.base, base.background.base) };
  const text = {
    base: color(override.text?.base, base.text.base),
    muted: color(override.text?.muted, base.text.muted)
  };
  const border = { base: color(override.border?.base, base.border.base) };
  const frame = {
    border: color(override.frame?.border, override.border?.base !== undefined ? border.base : base.frame?.border ?? border.base),
    title: color(override.frame?.title, override.text?.muted !== undefined ? text.muted : base.frame?.title ?? text.muted)
  };
  const mode = override.mode ? override.mode.endsWith("light") ? "light" : "dark" : base.mode;
  const derived = deriveStatusLineTheme({ mode, accent, background, text, palette });
  return {
    mode,
    palette,
    accent,
    categorical: override.categorical ? override.categorical.map((entry) => parseColor(entry)) : base.categorical,
    text: {
      base: text.base,
      muted: text.muted,
      feedback: {
        error: color(override.text?.feedback?.error, base.text.feedback.error),
        warning: color(override.text?.feedback?.warning, base.text.feedback.warning),
        success: color(override.text?.feedback?.success, base.text.feedback.success),
        info: color(override.text?.feedback?.info, base.text.feedback.info)
      },
      action: {
        primary: { focused: color(override.text?.action?.primary?.focused, base.text.action.primary.focused) }
      }
    },
    background,
    border,
    frame,
    statusline: mergeStatusLineTheme(derived, base.statusline, override.statusline),
    markdown: mergeMarkdownTheme(base.markdown, override.markdown),
    syntax: mergeColors(base.syntax, override.syntax),
    diff: {
      text: {
        added: color(override.diff?.text?.added, base.diff.text.added),
        removed: color(override.diff?.text?.removed, base.diff.text.removed),
        context: color(override.diff?.text?.context, base.diff.text.context)
      },
      background: {
        added: color(override.diff?.background?.added, base.diff.background.added),
        removed: color(override.diff?.background?.removed, base.diff.background.removed),
        context: color(override.diff?.background?.context, base.diff.background.context)
      }
    }
  };
}
function mergeStatusLineTheme(derived, base, override) {
  const color = (value, fallback) => value === undefined ? fallback : parseColor(value);
  const pick = (key) => color(override?.[key], base?.[key] ?? derived[key]);
  return {
    background: pick("background"),
    foreground: pick("foreground"),
    title: pick("title"),
    muted: pick("muted"),
    border: pick("border")
  };
}
function mergeColors(base, override) {
  if (!override)
    return base;
  const merged = { ...base };
  for (const key of Object.keys(base)) {
    const value = override[key];
    if (value !== undefined)
      merged[key] = parseColor(value);
  }
  return merged;
}
function mergeMarkdownTheme(base, override) {
  const levels = override ?? {};
  const pick = (level, fallback) => {
    const color = levels[`heading${level}`];
    if (color !== undefined)
      return parseColor(color);
    if (levels.heading !== undefined)
      return parseColor(levels.heading);
    return fallback;
  };
  const [one, two, three, four, five, six] = base.headingLevels ?? [
    base.heading,
    base.heading,
    base.heading,
    base.heading,
    base.heading,
    base.heading
  ];
  const headingLevels = [
    pick(1, one),
    pick(2, two),
    pick(3, three),
    pick(4, four),
    pick(5, five),
    pick(6, six)
  ];
  const { headingLevels: _levels, ...colors } = base;
  const merged = mergeColors(colors, override);
  return { ...merged, headingLevels };
}

// src/theme/load.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, statSync as statSync2 } from "fs";
import os2 from "os";
import path3 from "path";
var themeFileNames = [".jsonc", ".json"];
function loadTheme(name, environment = { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME, HOME: process.env.HOME }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name))
    return;
  const configured = environment.XDG_CONFIG_HOME;
  const configHome = configured && path3.isAbsolute(configured) ? configured : path3.join(environment.HOME || os2.homedir(), ".config");
  const directories = [
    path3.join(configHome, "otmd", "themes"),
    path3.resolve(import.meta.dir, "..", "..", "themes")
  ];
  for (const directory of directories) {
    for (const suffix of themeFileNames) {
      const file = path3.join(directory, `${name}${suffix}`);
      if (!existsSync2(file) || !statSync2(file).isFile())
        continue;
      const parsed = parseJsonc(readFileSync2(file, "utf8"), file);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
        return;
      return validateTheme(parsed, file);
    }
  }
  return;
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
function createMathDisplayBlockExtension() {
  return {
    name: "mathDisplayBlock",
    level: "block",
    start(src) {
      const match = /\n(?= {0,3}(?:\$\$|\\\[))/.exec(src);
      if (!match)
        return;
      return match.index + 1;
    },
    tokenizer(src) {
      const match = /^( {0,3})(\$\$|\\\[)/.exec(src);
      if (!match)
        return;
      const open = match[2];
      const close = open === "$$" ? "$$" : "\\]";
      const contentStart = match[0].length;
      const end = closing(src, close, contentStart, false);
      if (end <= contentStart)
        return;
      const content = src.slice(contentStart, end);
      const raw = src.slice(0, end + close.length);
      return {
        type: "mathDisplayBlock",
        raw,
        text: content,
        content,
        open,
        close
      };
    }
  };
}

// src/core/parse.ts
var parser = new Marked({
  gfm: true,
  breaks: false,
  async: false,
  extensions: [createMathDisplayBlockExtension(), createMathDisplayExtension(), createMathInlineExtension()]
});
function isDisplay(token) {
  return token.type === "mathDisplay" || token.type === "mathDisplayBlock";
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
// src/config/resolve.ts
function resolveConfiguredTheme(config, runtime = {}) {
  if (runtime.theme)
    return runtime.theme;
  const explicit = runtime.themeMode ?? undefined;
  const override = loadTheme(explicit ?? config.theme?.name ?? "light");
  const mode = override?.mode ?? "light";
  return resolveTheme({ mode, override });
}
function resolveConfiguredLayout(config, runtime) {
  return createDocumentLayout({
    viewport: runtime.viewport,
    frame: runtime.frame ?? config.frame,
    tables: runtime.tables ?? config.tables
  });
}
// src/view/frame.tsx
import { insert as _$insert } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { spread as _$spread } from "@opentui/solid";
import { mergeProps as _$mergeProps } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
var asciiBorder = {
  topLeft: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomRight: "+",
  horizontal: "-",
  vertical: "|",
  topT: "+",
  bottomT: "+",
  leftT: "+",
  rightT: "+",
  cross: "+"
};
function borderStyle(style) {
  if (style === "rounded" || style === "heavy" || style === "double")
    return style;
  return "single";
}
function alignSelf(align) {
  if (align === "left")
    return "flex-start";
  if (align === "right")
    return "flex-end";
  return "center";
}
function frameBorderColor(theme) {
  return theme.frame?.border ?? theme.border.base;
}
function frameTitleColor(theme) {
  return theme.frame?.title ?? theme.text.muted;
}
function borderProps(frame, theme) {
  if (!frame.enabled)
    return {};
  return {
    border: true,
    borderStyle: borderStyle(frame.style),
    customBorderChars: frame.style === "ascii" ? asciiBorder : undefined,
    borderColor: frameBorderColor(theme),
    title: frame.title,
    titleColor: frameTitleColor(theme),
    titleAlignment: frame.titleAlign
  };
}
function MarkdownFrame(props) {
  return (() => {
    var _el$ = _$createElement("box");
    _$setProp(_el$, "flexDirection", "column");
    _$setProp(_el$, "flexShrink", 0);
    _$spread(_el$, _$mergeProps({
      get width() {
        return props.frame.width;
      },
      get alignSelf() {
        return alignSelf(props.frame.align);
      },
      get backgroundColor() {
        return props.theme.background.base;
      },
      get paddingLeft() {
        return props.frame.paddingX;
      },
      get paddingRight() {
        return props.frame.paddingX;
      },
      get paddingTop() {
        return props.frame.paddingY;
      },
      get paddingBottom() {
        return props.frame.paddingY;
      }
    }, () => borderProps(props.frame, props.theme)), true);
    _$insert(_el$, () => props.children);
    return _el$;
  })();
}

// src/view/document.tsx
import { insertNode as _$insertNode3 } from "@opentui/solid";
import { memo as _$memo5 } from "@opentui/solid";
import { effect as _$effect6 } from "@opentui/solid";
import { insert as _$insert6 } from "@opentui/solid";
import { setProp as _$setProp8 } from "@opentui/solid";
import { createElement as _$createElement8 } from "@opentui/solid";
import { createComponent as _$createComponent5 } from "@opentui/solid";
import { createMemo as createMemo5, For as For2 } from "solid-js";
import stringWidth5 from "string-width";

// src/media.tsx
import { createComponent as _$createComponent } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { insert as _$insert2 } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { setProp as _$setProp2 } from "@opentui/solid";
import { createElement as _$createElement2 } from "@opentui/solid";
import { NativeImage, imageInfo, parseColor as parseColor2 } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import { decompressFrame, parseGIF } from "gifuct-js";
import path4 from "path";
import { createEffect, createResource, createSignal as createSignal2, Match, onCleanup as onCleanup2, Switch } from "solid-js";
var maxRows = 32;
var maxColumns = 80;
var TRANSPARENT_BACKGROUND = "#000000";
function isRgba(value) {
  return typeof value === "object" && value !== null && "r" in value && "g" in value && "b" in value;
}
function resolveBackground(input) {
  if (input === undefined)
    return [0, 0, 0];
  if (isRgba(input)) {
    const channel = (value) => Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 255);
    return [channel(input.r), channel(input.g), channel(input.b)];
  }
  try {
    const color = parseColor2(input);
    const channel = (value) => Math.round(Math.max(0, Math.min(1, value)) * 255);
    return [channel(color.r), channel(color.g), channel(color.b)];
  } catch {
    const color = parseColor2(TRANSPARENT_BACKGROUND);
    return [Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)];
  }
}
function rgbToHex(color) {
  const channel = (value) => Math.round(value).toString(16).padStart(2, "0");
  return `#${channel(color[0])}${channel(color[1])}${channel(color[2])}`;
}
function resolveLocalImage(base, href) {
  if (!base)
    return {
      error: "No asset base is configured"
    };
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//"))
    return {
      error: "Only local image paths are supported"
    };
  const root = path4.resolve(base);
  const target = path4.resolve(root, href);
  if (target !== root && !target.startsWith(`${root}${path4.sep}`))
    return {
      error: "Image path escapes the asset root"
    };
  return {
    path: target
  };
}
function imageBox(width, height, columns, cellAspectRatio, limits) {
  const ratio = width / height;
  const aspect = Number.isFinite(cellAspectRatio) && cellAspectRatio > 0 ? cellAspectRatio : 2;
  const columnLimit = Math.max(1, limits?.maxColumns ?? maxColumns);
  const rowLimit = Math.max(1, limits?.maxRows ?? maxRows);
  const clamped = Math.max(1, Math.min(Math.max(1, columns), columnLimit));
  const naturalRows = Math.max(1, Math.ceil(clamped / (ratio * aspect)));
  if (naturalRows <= rowLimit)
    return {
      columns: clamped,
      rows: naturalRows
    };
  return {
    columns: Math.max(1, Math.round(ratio * rowLimit * aspect)),
    rows: rowLimit
  };
}
function LocalImage(props) {
  const renderer = useRenderer();
  const [failure, setFailure] = createSignal2();
  const [loaded] = createResource(() => JSON.stringify({
    href: props.href,
    base: props.base(),
    columns: props.columns(),
    cell: props.cell() ?? null,
    background: rgbToHex(resolveBackground(props.background())),
    limits: props.limits ?? null
  }), async (key) => {
    const input = JSON.parse(key);
    const resolved = resolveLocalImage(input.base, input.href);
    if (resolved.path === undefined)
      return {
        error: resolved.error ?? "Image path is invalid"
      };
    const file = Bun.file(resolved.path);
    if (!await file.exists())
      return {
        error: `Image does not exist: ${input.href}`
      };
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const info = imageInfo(bytes);
      const box = imageBox(info.width, info.height, Math.max(1, input.columns), input.cell ? input.cell.height / input.cell.width : 2, input.limits ?? undefined);
      const target = {
        width: Math.max(1, Math.round(box.columns * (input.cell?.width ?? 8))),
        height: Math.max(1, Math.round(box.rows * (input.cell?.height ?? 16)))
      };
      const background = resolveBackground(input.background);
      if (info.format === "gif")
        return loadGif(bytes, box, target, background);
      return {
        box,
        image: prepareImage(NativeImage.decode(bytes), target, background)
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  const media = () => {
    const value = loaded();
    return value && !("error" in value) ? value : undefined;
  };
  const error = () => {
    const value = loaded();
    return failure() ?? (value && "error" in value ? value.error : undefined);
  };
  const [frame, setFrame] = createSignal2();
  createEffect(() => {
    const value = media();
    if (!value?.animation) {
      setFrame(value?.image);
      return;
    }
    const animation = value.animation;
    const canvas = new Uint8Array(animation.width * animation.height * 4);
    let index = 0;
    let current;
    let timer;
    const next = () => {
      const decoded = decompressFrame(animation.frames[index], animation.colorTable, true);
      const before = decoded.disposalType === 3 ? canvas.slice() : undefined;
      drawPatch(canvas, animation.width, animation.height, decoded.patch, decoded.dims.left, decoded.dims.top, decoded.dims.width, decoded.dims.height);
      const image = prepareImage(NativeImage.fromRgba(canvas.slice(), animation.width, animation.height), animation.target, animation.background);
      const previous = current;
      current = image;
      setFrame(image);
      if (previous)
        renderer.idle().then(() => previous.dispose());
      if (decoded.disposalType === 2)
        clearPatch(canvas, animation.width, decoded.dims.left, decoded.dims.top, decoded.dims.width, decoded.dims.height);
      if (before)
        canvas.set(before);
      index = (index + 1) % animation.frames.length;
      timer = setTimeout(next, Math.max(50, decoded.delay || 100));
    };
    next();
    onCleanup2(() => {
      if (timer)
        clearTimeout(timer);
      const image = current;
      if (image)
        renderer.idle().then(() => image.dispose());
      setFrame();
    });
  });
  createEffect(() => {
    const value = media();
    onCleanup2(() => void renderer.idle().then(() => disposeMedia(value)));
  });
  return (() => {
    var _el$ = _$createElement2("box");
    _$setProp2(_el$, "width", "100%");
    _$setProp2(_el$, "flexDirection", "column");
    _$setProp2(_el$, "flexShrink", 0);
    _$setProp2(_el$, "overflow", "hidden");
    _$insert2(_el$, _$createComponent(Switch, {
      get children() {
        return [_$createComponent(Match, {
          get when() {
            return loaded.loading;
          },
          get children() {
            var _el$2 = _$createElement2("box"), _el$3 = _$createElement2("text"), _el$5 = _$createElement2("text");
            _$insertNode(_el$2, _el$3);
            _$insertNode(_el$2, _el$5);
            _$setProp2(_el$2, "width", "100%");
            _$setProp2(_el$2, "flexDirection", "row");
            _$insertNode(_el$3, _$createTextNode(`Loading image: `));
            _$setProp2(_el$3, "flexShrink", 0);
            _$setProp2(_el$5, "wrapMode", "word");
            _$setProp2(_el$5, "flexGrow", 1);
            _$insert2(_el$5, () => props.alt || props.href);
            _$effect((_p$) => {
              var _v$ = props.labelColor?.(), _v$2 = props.textColor?.();
              _v$ !== _p$.e && (_p$.e = _$setProp2(_el$3, "fg", _v$, _p$.e));
              _v$2 !== _p$.t && (_p$.t = _$setProp2(_el$5, "fg", _v$2, _p$.t));
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$2;
          }
        }), _$createComponent(Match, {
          get when() {
            return error();
          },
          get children() {
            var _el$6 = _$createElement2("box"), _el$7 = _$createElement2("text"), _el$9 = _$createElement2("text");
            _$insertNode(_el$6, _el$7);
            _$insertNode(_el$6, _el$9);
            _$setProp2(_el$6, "width", "100%");
            _$setProp2(_el$6, "flexDirection", "row");
            _$insertNode(_el$7, _$createTextNode(`Could not render image `));
            _$setProp2(_el$7, "flexShrink", 0);
            _$setProp2(_el$9, "wrapMode", "word");
            _$setProp2(_el$9, "flexGrow", 1);
            _$insert2(_el$9, () => `${props.alt || props.href}: ${error()}`);
            _$effect((_p$) => {
              var _v$3 = props.labelColor?.(), _v$4 = props.textColor?.();
              _v$3 !== _p$.e && (_p$.e = _$setProp2(_el$7, "fg", _v$3, _p$.e));
              _v$4 !== _p$.t && (_p$.t = _$setProp2(_el$9, "fg", _v$4, _p$.t));
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$6;
          }
        }), _$createComponent(Match, {
          get when() {
            return _$memo(() => !!media())() && frame();
          },
          get children() {
            var _el$0 = _$createElement2("image");
            _$setProp2(_el$0, "fit", "fit");
            _$setProp2(_el$0, "protocol", "auto");
            _$setProp2(_el$0, "alignSelf", "center");
            _$setProp2(_el$0, "onError", (error) => setFailure(error instanceof Error ? error.message : String(error)));
            _$effect((_p$) => {
              var _v$5 = `opentui-markdown-image-${props.href}`, _v$6 = frame(), _v$7 = media().box.columns, _v$8 = media().box.rows;
              _v$5 !== _p$.e && (_p$.e = _$setProp2(_el$0, "id", _v$5, _p$.e));
              _v$6 !== _p$.t && (_p$.t = _$setProp2(_el$0, "source", _v$6, _p$.t));
              _v$7 !== _p$.a && (_p$.a = _$setProp2(_el$0, "width", _v$7, _p$.a));
              _v$8 !== _p$.o && (_p$.o = _$setProp2(_el$0, "height", _v$8, _p$.o));
              return _p$;
            }, {
              e: undefined,
              t: undefined,
              a: undefined,
              o: undefined
            });
            return _el$0;
          }
        }), " "];
      }
    }));
    return _el$;
  })();
}
function loadGif(bytes, box, target, background) {
  const gif = parseGIF(bytes.slice().buffer);
  const width = gif.lsd.width;
  const height = gif.lsd.height;
  const frames = gif.frames.filter((frame) => ("image" in frame));
  if (!frames.length)
    throw new Error("GIF contains no frames");
  return {
    box,
    animation: {
      width,
      height,
      frames,
      colorTable: gif.gct,
      target,
      background
    }
  };
}
function drawPatch(canvas, width, height, patch, left, top, patchWidth, patchHeight) {
  for (let y = 0;y < patchHeight; y++) {
    if (top + y < 0 || top + y >= height)
      continue;
    for (let x = 0;x < patchWidth; x++) {
      if (left + x < 0 || left + x >= width)
        continue;
      const source = (y * patchWidth + x) * 4;
      const target = ((top + y) * width + left + x) * 4;
      const alpha = patch[source + 3] / 255;
      const inverse = 1 - alpha;
      canvas[target] = Math.round(patch[source] * alpha + canvas[target] * inverse);
      canvas[target + 1] = Math.round(patch[source + 1] * alpha + canvas[target + 1] * inverse);
      canvas[target + 2] = Math.round(patch[source + 2] * alpha + canvas[target + 2] * inverse);
      canvas[target + 3] = Math.round((alpha + canvas[target + 3] / 255 * inverse) * 255);
    }
  }
}
function clearPatch(canvas, width, left, top, patchWidth, patchHeight) {
  for (let y = 0;y < patchHeight; y++) {
    for (let x = 0;x < patchWidth; x++)
      canvas.fill(0, ((top + y) * width + left + x) * 4, ((top + y) * width + left + x + 1) * 4);
  }
}
function prepareImage(image, target, background) {
  const targetWidth = Math.max(1, Math.round(target.width));
  const targetHeight = Math.max(1, Math.round(target.height));
  const scale = Math.min(targetWidth / image.width, targetHeight / image.height);
  const newWidth = Math.max(1, Math.round(image.width * scale));
  const newHeight = Math.max(1, Math.round(image.height * scale));
  const resized = scale !== 1 ? image.resize({
    width: newWidth,
    height: newHeight
  }) : image;
  if (resized !== image)
    image.dispose();
  if (!resized.info().hasAlpha)
    return resized;
  const raw = resized.raw();
  const pixels = new Uint8Array(raw.width * raw.height * 4);
  const color = background;
  for (let index = 0;index < pixels.length; index += 4) {
    const alpha = raw.data[index + 3] / 255;
    pixels[index] = Math.round(raw.data[index] * alpha + color[0] * (1 - alpha));
    pixels[index + 1] = Math.round(raw.data[index + 1] * alpha + color[1] * (1 - alpha));
    pixels[index + 2] = Math.round(raw.data[index + 2] * alpha + color[2] * (1 - alpha));
    pixels[index + 3] = 255;
  }
  const composited = NativeImage.fromRgba(pixels, raw.width, raw.height);
  resized.dispose();
  return composited;
}
function disposeMedia(media) {
  media?.image?.dispose();
}

// src/view/code.tsx
import { effect as _$effect2 } from "@opentui/solid";
import { setProp as _$setProp3 } from "@opentui/solid";
import { createElement as _$createElement3 } from "@opentui/solid";
import { infoStringToFiletype } from "@opentui/core";
import { useRenderer as useRenderer2 } from "@opentui/solid";
import { onCleanup as onCleanup3 } from "solid-js";

// src/theme/syntax.ts
import { SyntaxStyle } from "@opentui/core";
function generateSyntax(theme, headings = defaultHeadingStyles, defaultColor = theme.text.base, owner) {
  const { markdown, syntax, text } = theme;
  const feedback = text.feedback;
  const headingStyle = (level) => {
    const style = headings[level];
    return {
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      dim: style.dim
    };
  };
  const headingRules = headingLevels.map((level) => rule([`markup.heading.${level}`], headingColor(theme, level), headingStyle(level)));
  const rules = [
    rule(["default"], defaultColor),
    rule(["prompt"], theme.accent),
    rule(["comment", "comment.documentation"], syntax.comment, { italic: true }),
    rule(["string", "symbol", "character.special", "character"], syntax.string),
    rule(["number", "boolean", "constant", "float"], syntax.number),
    rule(["keyword.return", "keyword.conditional", "keyword.repeat", "keyword.coroutine"], syntax.keyword, {
      italic: true
    }),
    rule(["keyword.type"], syntax.type, { bold: true, italic: true }),
    rule(["keyword.function", "function.method"], syntax.function),
    rule(["keyword"], syntax.keyword, { italic: true }),
    rule(["keyword.import", "string.escape", "string.regexp", "tag.attribute", "keyword.export"], syntax.keyword),
    rule(["operator", "keyword.operator", "punctuation.delimiter", "keyword.conditional.ternary"], syntax.operator),
    rule(["variable", "variable.parameter", "function.method.call", "function.call", "property", "parameter", "field"], syntax.variable),
    rule(["variable.member", "function", "constructor"], syntax.function),
    rule(["type", "module", "class", "namespace"], syntax.type),
    rule(["type.definition"], syntax.type, { bold: true }),
    rule(["punctuation", "punctuation.bracket"], syntax.punctuation),
    rule(["variable.builtin", "type.builtin", "function.builtin", "module.builtin", "constant.builtin", "variable.super"], feedback.error),
    rule(["keyword.directive", "keyword.modifier", "keyword.exception"], syntax.keyword, { italic: true }),
    rule(["punctuation.special", "tag.delimiter"], syntax.operator),
    rule(["markup.heading"], headingColor(theme, 1), headingStyle(1)),
    ...headingRules,
    rule(["markup.bold", "markup.strong"], markdown.strong, { bold: true }),
    rule(["markup.italic"], markdown.emphasis, { italic: true }),
    rule(["markup.list"], markdown.listItem),
    rule(["markup.list.enumeration"], markdown.listEnumeration),
    rule(["markup.quote"], markdown.blockQuote, { italic: true }),
    rule(["markup.raw"], markdown.code),
    rule(["markup.raw.block"], markdown.codeBlock),
    rule(["markup.raw.inline"], markdown.code, { background: theme.background.base }),
    rule(["markup.link", "markup.link.url", "string.special", "string.special.url"], markdown.link, {
      underline: true
    }),
    rule(["markup.link.label"], markdown.linkText, { underline: true }),
    rule(["label"], markdown.linkText),
    rule(["markup.underline"], text.base, { underline: true }),
    rule(["markup.strikethrough", "markup.list.unchecked", "debug"], text.muted),
    rule(["markup.list.checked"], feedback.success),
    rule(["comment.error"], feedback.error, { italic: true, bold: true }),
    rule(["comment.warning"], feedback.warning, { italic: true, bold: true }),
    rule(["comment.todo", "comment.note"], feedback.info, { italic: true, bold: true }),
    rule(["attribute", "annotation"], feedback.warning),
    rule(["tag"], feedback.error),
    rule(["diff.plus"], theme.diff.text.added, { background: theme.diff.background.added }),
    rule(["diff.minus"], theme.diff.text.removed, { background: theme.diff.background.removed }),
    rule(["diff.delta"], theme.diff.text.context, { background: theme.diff.background.context }),
    rule(["error"], feedback.error, { bold: true }),
    rule(["warning"], feedback.warning, { bold: true }),
    rule(["info"], feedback.info)
  ];
  const fromTheme = SyntaxStyle.fromTheme;
  return fromTheme(rules, owner);
}
function rule(scope, foreground, style = {}) {
  return { scope, style: { foreground, ...style } };
}

// src/view/code.tsx
function resolveCodeFiletype(language) {
  const token = language?.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  return token === "jsonc" ? "json" : infoStringToFiletype(language ?? "");
}
function CodeBlock(props) {
  const renderer = useRenderer2();
  const nativeScene = renderer.nativeScene;
  const owned = props.syntaxStyle ? undefined : generateSyntax(props.theme, props.headings, props.theme.markdown.codeBlock, nativeScene);
  onCleanup3(() => {
    if (owned)
      renderer.idle().then(() => owned.destroy());
  });
  return (() => {
    var _el$ = _$createElement3("code");
    _$setProp3(_el$, "conceal", false);
    _$setProp3(_el$, "drawUnstyledText", true);
    _$setProp3(_el$, "streaming", false);
    _$setProp3(_el$, "width", "100%");
    _$effect2((_p$) => {
      var _v$ = props.content, _v$2 = resolveCodeFiletype(props.language), _v$3 = props.syntaxStyle ?? owned, _v$4 = props.theme.markdown.codeBlock, _v$5 = props.theme.background.base;
      _v$ !== _p$.e && (_p$.e = _$setProp3(_el$, "content", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp3(_el$, "filetype", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp3(_el$, "syntaxStyle", _v$3, _p$.a));
      _v$4 !== _p$.o && (_p$.o = _$setProp3(_el$, "fg", _v$4, _p$.o));
      _v$5 !== _p$.i && (_p$.i = _$setProp3(_el$, "bg", _v$5, _p$.i));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined,
      i: undefined
    });
    return _el$;
  })();
}

// src/view/document-slots.ts
import { createSignal as createSignal3 } from "solid-js";
function sameKind(old, next) {
  if (old.type !== next.type)
    return false;
  return old.type !== "mermaid" || next.type === "mermaid" && old.language === next.language;
}
function sameValue(a, b) {
  if (Object.is(a, b))
    return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null)
    return false;
  if (Array.isArray(a) !== Array.isArray(b))
    return false;
  if (Array.isArray(a)) {
    const other = b;
    return a.length === other.length && a.every((value, index) => sameValue(value, other[index]));
  }
  const left = a;
  const right = b;
  const keys = Object.keys(left);
  const otherKeys = Object.keys(right);
  return keys.filter((key) => key !== "source").length === otherKeys.filter((key) => key !== "source").length && keys.every((key) => key === "source" || Object.prototype.hasOwnProperty.call(right, key) && sameValue(left[key], right[key]));
}
function sameBlock(old, next) {
  return sameValue(old, next);
}
function sameRange(old, next) {
  return old?.start === next?.start && old?.end === next?.end;
}
function sameUnitRanges(old, next) {
  if (!sameRange(old.source, next.source))
    return false;
  if (old.type !== "list" || next.type !== "list")
    return true;
  return old.items.length === next.items.length && old.items.every((item, index) => sameRange(item.source, next.items[index]?.source));
}
function refresh(slot, next) {
  const changed = !sameBlock(slot.block(), next);
  if (changed)
    slot.update(next);
  if (changed || !sameUnitRanges(slot.latest(), next))
    slot.updateLatest(next);
}
function createSlot(block) {
  const [get, set] = createSignal3(block);
  const [latest, updateLatest] = createSignal3(block);
  return { kind: block.type, block: get, update: set, latest, updateLatest };
}
function reconcileSlots(prev, next) {
  if (prev.length === 0) {
    return next.map(createSlot);
  }
  let prefix = 0;
  while (prefix < prev.length && prefix < next.length) {
    const old = prev[prefix].block();
    const incoming = next[prefix];
    if (!sameKind(old, incoming) || old.raw !== incoming.raw)
      break;
    refresh(prev[prefix], incoming);
    prefix++;
  }
  let suffix = 0;
  while (suffix < prev.length - prefix && suffix < next.length - prefix) {
    const old = prev[prev.length - 1 - suffix].block();
    const incoming = next[next.length - 1 - suffix];
    if (!sameKind(old, incoming) || old.raw !== incoming.raw)
      break;
    refresh(prev[prev.length - 1 - suffix], incoming);
    suffix++;
  }
  const result = [];
  for (let i = 0;i < prefix; i++)
    result.push(prev[i]);
  if (prev.length - prefix - suffix === 1 && next.length - prefix - suffix === 1) {
    const slot = prev[prefix];
    const incoming = next[prefix];
    if (sameKind(slot.block(), incoming)) {
      refresh(slot, incoming);
      result.push(slot);
    } else {
      result.push(createSlot(incoming));
    }
  } else {
    for (let i = prefix;i < next.length - suffix; i++) {
      const b = next[i];
      result.push(createSlot(b));
    }
  }
  for (let i = prev.length - suffix;i < prev.length; i++)
    result.push(prev[i]);
  return result;
}

// src/view/document-table.tsx
import { setProp as _$setProp4 } from "@opentui/solid";
import { effect as _$effect3 } from "@opentui/solid";
import { createElement as _$createElement4 } from "@opentui/solid";
import { parseColor as parseColor3, TextAttributes as TextAttributes3, TextTableRenderable as TextTableRenderable2 } from "@opentui/core";
import { extend } from "@opentui/solid";

// src/view/table.ts
import {
  BoxRenderable
} from "@opentui/core";
function tableWidth(table) {
  const layout = table.computeLayout?.(undefined);
  const width = layout?.tableWidth;
  if (typeof width === "number" && Number.isFinite(width) && width > 0)
    return Math.round(width);
  return Number.isFinite(table.width) ? Math.round(table.width) : 0;
}

class ScrollableTableRenderable extends BoxRenderable {
  table;
  offset = 0;
  panEnabled = true;
  dragX;
  constructor(ctx, table) {
    super(ctx, {
      width: "100%",
      flexDirection: "row",
      flexShrink: 0,
      overflow: "hidden"
    });
    this.table = table;
    table.flexShrink = 0;
    this.add(table);
    this.onMouseDown = (event) => {
      if (event.button !== 0)
        return;
      this.dragX = event.x;
    };
    this.onMouseDrag = (event) => {
      if (this.dragX === undefined || !this.panEnabled)
        return;
      const dx = event.x - this.dragX;
      this.dragX = event.x;
      if (!dx || !this.overflows())
        return;
      event.preventDefault();
      event.stopPropagation();
      this.scrollBy(-dx);
    };
    this.onMouseDragEnd = () => {
      this.dragX = undefined;
    };
    this.onMouseUp = () => {
      this.dragX = undefined;
    };
    this.onMouseScroll = (event) => {
      const direction = event.scroll?.direction;
      if (!this.panEnabled || direction !== "left" && direction !== "right")
        return;
      if (!this.overflows())
        return;
      event.preventDefault();
      event.stopPropagation();
      this.scrollBy(direction === "left" ? -2 : 2);
    };
  }
  onResize(width, _height) {
    super.onResize(width, _height);
    this.syncOverflowState(width);
  }
  syncOverflowState(width = this.width) {
    if (!Number.isFinite(width) || width <= 0)
      return;
    const viewport = Math.round(width);
    const max = Math.max(0, tableWidth(this.table) - viewport);
    this.offset = this.panEnabled ? Math.min(this.offset, max) : 0;
    this.table.marginLeft = -this.offset;
    this.table.selectable = !this.panEnabled || max === 0;
  }
  overflows(width = this.width) {
    const viewportWidth = Number.isFinite(width) ? Math.round(width) : 0;
    return tableWidth(this.table) > viewportWidth;
  }
  scrollBy(delta) {
    const viewportWidth = Number.isFinite(this.width) ? Math.round(this.width) : 0;
    const max = Math.max(0, tableWidth(this.table) - viewportWidth);
    this.offset = Math.max(0, Math.min(max, this.offset + delta));
    this.table.marginLeft = -this.offset;
  }
}

// src/view/inline-style.ts
import { TextAttributes as TextAttributes2 } from "@opentui/core";
function flattenInline(inlines, ctx) {
  const out = [];
  const baseAttr = (ctx.attributes ?? 0) | (ctx.heading ? headingAttributes(ctx.headings[ctx.heading.level]) : 0) | (ctx.quote ? TextAttributes2.ITALIC : 0);
  const quote = !!ctx.quote;
  const linkCtx = ctx.link;
  function walk(list, attr, link) {
    for (const node of list) {
      if (node.type === "text") {
        let fg = ctx.theme.markdown.text;
        if (quote && !link && !ctx.heading)
          fg = ctx.theme.markdown.blockQuote;
        if (ctx.heading)
          fg = headingColor(ctx.theme, ctx.heading.level);
        if (link)
          fg = ctx.theme.markdown.linkText;
        else if (attr & TextAttributes2.BOLD && !ctx.heading)
          fg = ctx.theme.markdown.strong;
        else if (attr & TextAttributes2.ITALIC && !ctx.heading && !quote)
          fg = ctx.theme.markdown.emphasis;
        if (node.text)
          out.push({ type: "text", text: node.text, fg, attributes: baseAttr | attr | (link ? TextAttributes2.UNDERLINE : 0), href: link?.href });
        continue;
      }
      if (node.type === "code") {
        const fg = ctx.theme.markdown.code;
        out.push({ type: "text", text: node.text, fg, attributes: TextAttributes2.NONE, href: link?.href });
        continue;
      }
      if (node.type === "math") {
        out.push({ type: "math", content: node.content, raw: node.raw, open: node.open, close: node.close });
        continue;
      }
      if (node.type === "break") {
        out.push({ type: "break", hard: true });
        continue;
      }
      if (node.type === "strong") {
        walk(node.children, attr | TextAttributes2.BOLD, link);
        continue;
      }
      if (node.type === "em") {
        walk(node.children, attr | TextAttributes2.ITALIC, link);
        continue;
      }
      if (node.type === "del") {
        walk(node.children, attr | TextAttributes2.STRIKETHROUGH, link);
        continue;
      }
      if (node.type === "link") {
        const l = { href: node.href, title: node.title };
        walk(node.children, attr, l);
        const label = node.children.map((child) => child.type === "text" || child.type === "code" ? child.text : "").join("");
        if (ctx.hyperlinks === false && label !== node.href) {
          out.push({ type: "text", text: ` (${node.href})`, fg: ctx.theme.markdown.link, attributes: baseAttr, href: node.href });
        }
        continue;
      }
      if (node.type === "inline-image") {
        const l = link;
        out.push({ type: "text", text: node.alt || node.href || "image", fg: ctx.theme.markdown.linkText, attributes: baseAttr | attr, href: l?.href || node.href });
        continue;
      }
    }
  }
  walk(inlines, baseAttr, linkCtx);
  return out;
}
function toTableChunks(inlines, theme, headings, hyperlinks = true) {
  const chunks = [];
  for (const atom of flattenInline(inlines, { theme, headings, hyperlinks })) {
    if (atom.type === "text") {
      chunks.push({
        __isChunk: true,
        text: atom.text,
        fg: atom.fg,
        attributes: atom.attributes,
        ...atom.href ? { link: { url: atom.href } } : {}
      });
    } else if (atom.type === "math") {
      chunks.push({ __isChunk: true, text: atom.raw, fg: theme.markdown.text });
    } else {
      chunks.push({ __isChunk: true, text: `
`, fg: theme.markdown.text });
    }
  }
  return chunks.length ? chunks : [{ __isChunk: true, text: " ", fg: theme.markdown.text }];
}

// src/view/document-table.tsx
class MarkdownTableRenderable extends ScrollableTableRenderable {
  constructor(ctx, _options) {
    const defaults = resolveTableOptions();
    const table = new TextTableRenderable2(ctx, {
      content: [],
      columnWidthMode: defaults.widthMode,
      columnFitter: defaults.columnFitter,
      cellPaddingX: defaults.cellPaddingX,
      wrapMode: defaults.wrapMode,
      showBorders: true,
      border: true,
      outerBorder: true,
      borderStyle: "single",
      selectable: true
    });
    super(ctx, table);
  }
  get tableData() {
    return this.table.content;
  }
  set tableData(value) {
    this.table.content = value;
    this.syncOverflowState();
  }
  get resolved() {
    return {
      widthMode: this.table.columnWidthMode,
      columnFitter: this.table.columnFitter,
      cellPaddingX: this.table.cellPaddingX,
      wrapMode: this.table.wrapMode === "none" ? "none" : "word",
      overflow: this.panEnabled ? "scroll" : "wrap"
    };
  }
  set resolved(value) {
    this.table.columnWidthMode = value.widthMode;
    this.table.columnFitter = value.columnFitter;
    this.table.cellPaddingX = value.cellPaddingX;
    this.table.wrapMode = value.wrapMode;
    this.panEnabled = value.widthMode === "content" && value.overflow === "scroll";
    this.syncOverflowState();
  }
  get foreground() {
    return this.table.fg;
  }
  set foreground(value) {
    this.table.fg = value;
    this.syncOverflowState();
  }
  get tableBorderColor() {
    return this.table.borderColor;
  }
  set tableBorderColor(value) {
    this.table.borderColor = value;
  }
  get background() {
    return this.backgroundColor;
  }
  set background(value) {
    this.backgroundColor = value;
    this.syncOverflowState();
  }
}
extend({
  md_text_table: MarkdownTableRenderable
});
function TableBlock(props) {
  const cell = (inlines, header) => {
    const chunks = toTableChunks(inlines, props.theme, props.headings, props.hyperlinks);
    if (!header)
      return chunks;
    return chunks.map((chunk) => ({
      ...chunk,
      fg: props.theme.markdown.heading,
      attributes: TextAttributes3.BOLD
    }));
  };
  const content = () => [props.block.header.map((value) => cell(value.children, true)), ...props.block.rows.map((row) => row.map((value) => cell(value.children, false)))];
  return (() => {
    var _el$ = _$createElement4("md_text_table");
    _$effect3((_p$) => {
      var _v$ = content(), _v$2 = props.options, _v$3 = props.theme.markdown.text, _v$4 = props.surface ? parseColor3(props.surface()) : props.theme.background.base, _v$5 = props.theme.border.base;
      _v$ !== _p$.e && (_p$.e = _$setProp4(_el$, "tableData", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp4(_el$, "resolved", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp4(_el$, "foreground", _v$3, _p$.a));
      _v$4 !== _p$.o && (_p$.o = _$setProp4(_el$, "background", _v$4, _p$.o));
      _v$5 !== _p$.i && (_p$.i = _$setProp4(_el$, "tableBorderColor", _v$5, _p$.i));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined,
      i: undefined
    });
    return _el$;
  })();
}

// src/view/inline-flow.tsx
import { memo as _$memo2 } from "@opentui/solid";
import { insert as _$insert3 } from "@opentui/solid";
import { createComponent as _$createComponent2 } from "@opentui/solid";
import { effect as _$effect4 } from "@opentui/solid";
import { setProp as _$setProp5 } from "@opentui/solid";
import { use as _$use } from "@opentui/solid";
import { createElement as _$createElement5 } from "@opentui/solid";
import { createEffect as createEffect2, createMemo as createMemo3, For, Show } from "solid-js";
import { StyledText } from "@opentui/core";

// src/view/inline-layout.ts
import stringWidth2 from "string-width";
function hardChunks(content, columns) {
  const chunks = [];
  let current = "";
  for (const character of content) {
    if (current && stringWidth2(current + character) > columns) {
      chunks.push(current);
      current = character;
      continue;
    }
    current += character;
  }
  if (current)
    chunks.push(current);
  return chunks;
}
function layoutAtoms(atoms, columns, measureOf, compactOverflow) {
  columns = Math.max(1, columns);
  const lines = [];
  let current = { runs: [], columns: 0, height: 1, textRow: 0 };
  const flush = (force = false) => {
    if (!current.runs.length && !force)
      return;
    lines.push(current);
    current = { runs: [], columns: 0, height: 1, textRow: 0 };
  };
  const place = (run, textRow = 0) => {
    const add = (entry) => {
      current.runs.push(entry);
      current.columns += entry.columns;
      current.height = Math.max(current.height, entry.rows, textRow + 1);
      current.textRow = Math.max(current.textRow, textRow);
    };
    if (current.columns + run.columns <= columns || !current.runs.length) {
      add(run);
      return;
    }
    if (run.atom.type === "text") {
      const text = run.atom.text.trimStart();
      const trimmed = { ...run, atom: { ...run.atom, text }, columns: stringWidth2(text) };
      if (current.columns + trimmed.columns <= columns) {
        add(trimmed);
        return;
      }
      flush();
      add(trimmed);
      return;
    }
    flush();
    add(run);
  };
  for (const atom of atoms) {
    if (atom.type === "break") {
      flush(true);
      continue;
    }
    if (atom.type === "math") {
      const natural = measureOf(atom.content)?.normal;
      const squeezed = natural ? natural.columns > columns : false;
      const entry = natural ? { atom, columns: squeezed ? columns : natural.columns, rows: Math.max(1, Math.round(squeezed ? natural.rows * columns / natural.columns : natural.rows)) } : { atom, columns: Math.min(columns, Math.max(3, atom.raw.length)), rows: 1 };
      place(entry, natural ? Math.max(0, Math.ceil(natural.baseline) - 1) : 0);
      continue;
    }
    const normalized = atom.text.replace(/\r?\n/g, " ");
    const words = normalized.match(/\s*\S+\s*/g) ?? (normalized ? [normalized] : []);
    for (const word of words) {
      if (stringWidth2(word) > columns) {
        for (const chunk of hardChunks(word.trimEnd(), columns)) {
          place({ atom: { ...atom, text: chunk }, columns: stringWidth2(chunk), rows: 1 });
        }
      } else {
        place({ atom: { ...atom, text: word }, columns: stringWidth2(word), rows: 1 });
      }
    }
  }
  flush();
  if (compactOverflow) {
    let changed = true;
    while (changed) {
      changed = false;
      const occupied = lines.flatMap((line, row) => {
        let column = 0;
        return line.runs.map((entry) => {
          const area = {
            entry,
            column,
            row: row + (entry.atom.type === "text" ? line.textRow : 0),
            rows: entry.atom.type === "math" ? entry.rows : 1
          };
          column += entry.columns;
          return area;
        });
      });
      for (const area of occupied) {
        if (area.entry.atom.type !== "math" || area.entry.variant === "compact" || area.rows <= 1)
          continue;
        const collision = occupied.some((other) => other.entry !== area.entry && other.column < area.column + area.entry.columns && area.column < other.column + other.entry.columns && other.row < area.row + area.rows && area.row + 1 < other.row + other.rows);
        if (!collision)
          continue;
        const compact = measureOf(area.entry.atom.content)?.compact;
        if (!compact)
          continue;
        area.entry.variant = "compact";
        area.entry.columns = compact.columns;
        area.entry.rows = compact.rows;
        changed = true;
      }
    }
  }
  for (const line of lines) {
    const entry = line.runs.at(-1);
    if (!entry || entry.atom.type !== "math" || entry.variant === "compact")
      continue;
    const standard = measureOf(entry.atom.content)?.standard;
    if (!standard || line.columns - entry.columns + standard.columns > columns)
      continue;
    entry.variant = "standard";
    entry.columns = standard.columns;
    entry.rows = standard.rows;
  }
  for (const line of lines) {
    line.columns = line.runs.reduce((total, entry) => total + entry.columns, 0);
    line.textRow = Math.max(0, ...line.runs.flatMap((entry) => {
      if (entry.atom.type !== "math")
        return [];
      const measured = measureOf(entry.atom.content);
      return measured ? [Math.max(0, Math.ceil(measured[entry.variant ?? "normal"].baseline) - 1)] : [];
    }));
    line.height = Math.max(1, line.textRow + 1, ...line.runs.map((entry) => entry.rows));
  }
  return lines;
}

// src/view/inline-math.ts
import { createMemo as createMemo2, createResource as createResource2 } from "solid-js";
function useInlineMathImages(contents, foreground, background, cell) {
  const [rendered] = createResource2(() => JSON.stringify({ contents: contents(), color: foreground(), surface: background(), cell: cell() }), async (key) => {
    const input = JSON.parse(key);
    return Promise.all(input.contents.map(async (content) => {
      try {
        const normal = await renderMathImage(content, false, input.color, input.surface, input.cell);
        if (!normal)
          return;
        const compact = normal.rows > 1 ? await renderMathImage(content, false, input.color, input.surface, input.cell, 1, true) : normal;
        const standard = normal.clamped ? await renderMathImage(content, false, input.color, input.surface, input.cell, 1, false, true) : normal;
        return { normal, compact: compact ?? normal, standard: standard ?? normal };
      } catch {
        return;
      }
    }));
  });
  return createMemo2(() => {
    const values = rendered();
    if (!values)
      return new Map;
    return new Map(contents().flatMap((content, index) => {
      const image = values[index];
      return image ? [[content, image]] : [];
    }));
  });
}

// src/view/inline-flow.tsx
function PrefixSegment(props) {
  let ref;
  const update = () => {
    const content = new StyledText(props.chunks());
    if (ref)
      ref.content = content;
    return content;
  };
  createEffect2(update);
  return (() => {
    var _el$ = _$createElement5("text");
    _$use((renderable) => {
      ref = renderable;
      renderable.content = update();
    }, _el$);
    _$setProp5(_el$, "wrapMode", "none");
    _$setProp5(_el$, "flexShrink", 0);
    _$effect4((_$p) => _$setProp5(_el$, "width", props.width, _$p));
    return _el$;
  })();
}
function StyledSegment(props) {
  let ref;
  const update = () => {
    const atom = props.entry.atom;
    const content = atom.type === "text" ? new StyledText([{
      __isChunk: true,
      text: atom.text,
      fg: atom.fg,
      attributes: atom.attributes,
      ...atom.href ? {
        link: {
          url: atom.href
        }
      } : {}
    }]) : new StyledText([]);
    if (ref)
      ref.content = content;
    return content;
  };
  createEffect2(update);
  return (() => {
    var _el$2 = _$createElement5("text");
    _$use((renderable) => {
      ref = renderable;
      renderable.content = update();
    }, _el$2);
    _$setProp5(_el$2, "flexShrink", 0);
    _$setProp5(_el$2, "wrapMode", "none");
    _$effect4((_p$) => {
      var _v$ = props.entry.columns, _v$2 = props.textRow;
      _v$ !== _p$.e && (_p$.e = _$setProp5(_el$2, "width", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp5(_el$2, "marginTop", _v$2, _p$.t));
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    return _el$2;
  })();
}
function InlineFlow(props) {
  const atoms = createMemo3(() => {
    const ctx = {
      theme: props.theme,
      headings: props.headings,
      quote: props.quote,
      heading: props.heading,
      hyperlinks: props.graphics.hyperlinks?.() ?? true
    };
    return flattenInline(props.inlines, ctx);
  });
  const contents = createMemo3(() => [...new Set(atoms().flatMap((atom) => atom.type === "math" ? [atom.content] : []))]);
  const foreground = () => rgbaToHex(props.heading ? headingColor(props.theme, props.heading.level) : props.theme.text.base);
  const images = useInlineMathImages(contents, foreground, props.surface, props.graphics.cell);
  const scale = createMemo3(() => mosaicScale(props.graphics.protocol()));
  const prefixWidth = () => props.prefix?.(0).length ?? 0;
  const columns = () => Math.max(1, props.columns - prefixWidth());
  const lines = createMemo3(() => layoutAtoms(atoms(), columns(), (content) => {
    const image = images().get(content);
    if (!image)
      return;
    return {
      normal: {
        columns: Math.max(1, Math.round(image.normal.columns * scale())),
        rows: Math.max(1, Math.round(image.normal.rows * scale())),
        baseline: image.normal.baseline * scale()
      },
      compact: {
        columns: Math.max(1, Math.round(image.compact.columns * scale())),
        rows: image.compact.rows === 1 ? 1 : Math.max(1, Math.round(image.compact.rows * scale())),
        baseline: image.compact.baseline * scale()
      },
      standard: {
        columns: Math.max(1, Math.round(image.standard.columns * scale())),
        rows: Math.max(1, Math.round(image.standard.rows * scale())),
        baseline: image.standard.baseline * scale()
      }
    };
  }, props.graphics.protocol() !== "blocks"));
  return (() => {
    var _el$3 = _$createElement5("box");
    _$setProp5(_el$3, "width", "100%");
    _$setProp5(_el$3, "flexDirection", "column");
    _$setProp5(_el$3, "flexShrink", 0);
    _$insert3(_el$3, _$createComponent2(For, {
      get each() {
        return lines();
      },
      children: (line, index) => (() => {
        var _el$4 = _$createElement5("box");
        _$setProp5(_el$4, "flexDirection", "row");
        _$setProp5(_el$4, "alignItems", "flex-start");
        _$setProp5(_el$4, "width", "100%");
        _$setProp5(_el$4, "flexShrink", 0);
        _$insert3(_el$4, _$createComponent2(Show, {
          get when() {
            return props.prefix;
          },
          get children() {
            return _$createComponent2(Show, {
              get when() {
                return props.prefixChunks;
              },
              get fallback() {
                return (() => {
                  var _el$5 = _$createElement5("text");
                  _$setProp5(_el$5, "wrapMode", "none");
                  _$setProp5(_el$5, "flexShrink", 0);
                  _$insert3(_el$5, () => props.prefix?.(index()) ?? "");
                  _$effect4((_p$) => {
                    var _v$5 = props.prefixColor?.() ?? props.theme.markdown.text, _v$6 = prefixWidth();
                    _v$5 !== _p$.e && (_p$.e = _$setProp5(_el$5, "fg", _v$5, _p$.e));
                    _v$6 !== _p$.t && (_p$.t = _$setProp5(_el$5, "width", _v$6, _p$.t));
                    return _p$;
                  }, {
                    e: undefined,
                    t: undefined
                  });
                  return _el$5;
                })();
              },
              children: (chunks) => _$createComponent2(PrefixSegment, {
                chunks: () => chunks()(index()),
                get width() {
                  return prefixWidth();
                }
              })
            });
          }
        }), null);
        _$insert3(_el$4, _$createComponent2(For, {
          get each() {
            return line.runs;
          },
          children: (entry, position) => {
            const atom = entry.atom;
            if (atom.type === "text") {
              const visible = position() === line.runs.length - 1 ? atom.text.trimEnd() : atom.text;
              return _$createComponent2(StyledSegment, {
                get entry() {
                  return {
                    ...entry,
                    atom: {
                      ...atom,
                      text: visible
                    }
                  };
                },
                get textRow() {
                  return line.textRow;
                }
              });
            }
            const variant = entry.variant ?? "normal";
            return _$createComponent2(Show, {
              get when() {
                return images().get(atom.content)?.[variant];
              },
              get fallback() {
                return (() => {
                  var _el$6 = _$createElement5("text");
                  _$setProp5(_el$6, "wrapMode", "none");
                  _$setProp5(_el$6, "flexShrink", 0);
                  _$insert3(_el$6, () => atom.raw);
                  _$effect4((_p$) => {
                    var _v$7 = props.theme.text.muted, _v$8 = entry.columns;
                    _v$7 !== _p$.e && (_p$.e = _$setProp5(_el$6, "fg", _v$7, _p$.e));
                    _v$8 !== _p$.t && (_p$.t = _$setProp5(_el$6, "width", _v$8, _p$.t));
                    return _p$;
                  }, {
                    e: undefined,
                    t: undefined
                  });
                  return _el$6;
                })();
              },
              children: (image) => (() => {
                var _el$7 = _$createElement5("image");
                _$setProp5(_el$7, "fit", "fit");
                _$setProp5(_el$7, "protocol", "auto");
                _$setProp5(_el$7, "flexShrink", 0);
                _$effect4((_p$) => {
                  var _v$9 = `opentui-markdown-math-${mathImageID(atom.content, false, foreground(), props.graphics.cell(), 1, variant === "compact", variant === "standard")}-${props.surface()}`, _v$0 = image().png, { columns: _v$1, rows: _v$10 } = entry;
                  _v$9 !== _p$.e && (_p$.e = _$setProp5(_el$7, "id", _v$9, _p$.e));
                  _v$0 !== _p$.t && (_p$.t = _$setProp5(_el$7, "source", _v$0, _p$.t));
                  _v$1 !== _p$.a && (_p$.a = _$setProp5(_el$7, "width", _v$1, _p$.a));
                  _v$10 !== _p$.o && (_p$.o = _$setProp5(_el$7, "height", _v$10, _p$.o));
                  return _p$;
                }, {
                  e: undefined,
                  t: undefined,
                  a: undefined,
                  o: undefined
                });
                return _el$7;
              })()
            });
          }
        }), null);
        _$effect4((_p$) => {
          var _v$3 = line.height, _v$4 = props.surface();
          _v$3 !== _p$.e && (_p$.e = _$setProp5(_el$4, "height", _v$3, _p$.e));
          _v$4 !== _p$.t && (_p$.t = _$setProp5(_el$4, "backgroundColor", _v$4, _p$.t));
          return _p$;
        }, {
          e: undefined,
          t: undefined
        });
        return _el$4;
      })()
    }));
    return _el$3;
  })();
}

// src/view/math.tsx
import { insert as _$insert4 } from "@opentui/solid";
import { memo as _$memo3 } from "@opentui/solid";
import { createComponent as _$createComponent3 } from "@opentui/solid";
import { effect as _$effect5 } from "@opentui/solid";
import { createTextNode as _$createTextNode2 } from "@opentui/solid";
import { insertNode as _$insertNode2 } from "@opentui/solid";
import { setProp as _$setProp6 } from "@opentui/solid";
import { createElement as _$createElement6 } from "@opentui/solid";
import { createResource as createResource3, createSignal as createSignal4, Match as Match2, Switch as Switch2 } from "solid-js";
function DisplayMath(props) {
  const [failed, setFailed] = createSignal4(false);
  const color = () => rgbaToHex(props.theme().text.base);
  const mosaic = () => mosaicScale(props.graphics.protocol());
  const [rendered] = createResource3(() => JSON.stringify({
    content: props.content,
    color: color(),
    background: props.surface(),
    cell: props.graphics.cell(),
    scale: props.scale()
  }), async (key) => {
    const input = JSON.parse(key);
    try {
      const raster = await renderMathImage(input.content, true, input.color, input.background, input.cell, input.scale);
      return raster ? {
        raster
      } : {
        error: "Renderer returned no image"
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  const raster = () => {
    const value = rendered();
    return value && "raster" in value ? value.raster : undefined;
  };
  const error = () => {
    const value = rendered();
    return value && "error" in value ? value.error : undefined;
  };
  const source = () => `${props.open}${props.content}${props.close}`;
  const box = () => {
    const image = raster();
    const columns = (image ? image.columns : Math.min(24, props.maxWidth())) * mosaic();
    const rows = (image ? image.rows : 3) * mosaic();
    const max = props.maxWidth();
    if (columns <= max)
      return {
        columns,
        rows: Math.max(1, rows)
      };
    return {
      columns: max,
      rows: Math.max(1, Math.round(rows * max / columns))
    };
  };
  return (() => {
    var _el$ = _$createElement6("box");
    _$setProp6(_el$, "width", "100%");
    _$setProp6(_el$, "flexShrink", 0);
    _$setProp6(_el$, "flexDirection", "column");
    _$setProp6(_el$, "marginTop", 1);
    _$setProp6(_el$, "marginBottom", 1);
    _$insert4(_el$, _$createComponent3(Switch2, {
      get children() {
        return [_$createComponent3(Match2, {
          get when() {
            return rendered.loading;
          },
          get children() {
            var _el$2 = _$createElement6("text");
            _$insertNode2(_el$2, _$createTextNode2(`Rendering math...`));
            _$setProp6(_el$2, "alignSelf", "center");
            _$effect5((_$p) => _$setProp6(_el$2, "fg", props.theme().text.muted, _$p));
            return _el$2;
          }
        }), _$createComponent3(Match2, {
          get when() {
            return failed() || rendered() && "error" in rendered();
          },
          get children() {
            var _el$4 = _$createElement6("box"), _el$5 = _$createElement6("text"), _el$7 = _$createElement6("text"), _el$8 = _$createElement6("text");
            _$insertNode2(_el$4, _el$5);
            _$insertNode2(_el$4, _el$7);
            _$insertNode2(_el$4, _el$8);
            _$setProp6(_el$4, "flexDirection", "column");
            _$setProp6(_el$4, "border", ["left"]);
            _$setProp6(_el$4, "paddingLeft", 1);
            _$setProp6(_el$4, "alignSelf", "center");
            _$insertNode2(_el$5, _$createTextNode2(`Could not render TeX; showing source`));
            _$setProp6(_el$7, "wrapMode", "word");
            _$insert4(_el$7, error);
            _$setProp6(_el$8, "wrapMode", "word");
            _$insert4(_el$8, source);
            _$effect5((_p$) => {
              var _v$ = props.theme().text.feedback.error, _v$2 = props.theme().text.feedback.error, _v$3 = props.theme().text.muted, _v$4 = props.theme().text.base;
              _v$ !== _p$.e && (_p$.e = _$setProp6(_el$4, "borderColor", _v$, _p$.e));
              _v$2 !== _p$.t && (_p$.t = _$setProp6(_el$5, "fg", _v$2, _p$.t));
              _v$3 !== _p$.a && (_p$.a = _$setProp6(_el$7, "fg", _v$3, _p$.a));
              _v$4 !== _p$.o && (_p$.o = _$setProp6(_el$8, "fg", _v$4, _p$.o));
              return _p$;
            }, {
              e: undefined,
              t: undefined,
              a: undefined,
              o: undefined
            });
            return _el$4;
          }
        }), _$createComponent3(Match2, {
          get when() {
            return raster();
          },
          get children() {
            var _el$9 = _$createElement6("box"), _el$0 = _$createElement6("image");
            _$insertNode2(_el$9, _el$0);
            _$setProp6(_el$9, "width", "100%");
            _$setProp6(_el$9, "flexShrink", 0);
            _$setProp6(_el$9, "alignItems", "center");
            _$setProp6(_el$9, "justifyContent", "center");
            _$setProp6(_el$0, "fit", "fit");
            _$setProp6(_el$0, "protocol", "auto");
            _$setProp6(_el$0, "onError", () => setFailed(true));
            _$effect5((_p$) => {
              var _v$5 = box().rows, _v$6 = `opentui-markdown-math-${mathImageID(props.content, true, color(), props.graphics.cell(), props.scale())}-${props.surface()}`, _v$7 = raster().png, _v$8 = box().columns, _v$9 = box().rows;
              _v$5 !== _p$.e && (_p$.e = _$setProp6(_el$9, "height", _v$5, _p$.e));
              _v$6 !== _p$.t && (_p$.t = _$setProp6(_el$0, "id", _v$6, _p$.t));
              _v$7 !== _p$.a && (_p$.a = _$setProp6(_el$0, "source", _v$7, _p$.a));
              _v$8 !== _p$.o && (_p$.o = _$setProp6(_el$0, "width", _v$8, _p$.o));
              _v$9 !== _p$.i && (_p$.i = _$setProp6(_el$0, "height", _v$9, _p$.i));
              return _p$;
            }, {
              e: undefined,
              t: undefined,
              a: undefined,
              o: undefined,
              i: undefined
            });
            return _el$9;
          }
        })];
      }
    }));
    _$effect5((_$p) => _$setProp6(_el$, "backgroundColor", props.surface(), _$p));
    return _el$;
  })();
}

// src/view/mermaid.tsx
import { memo as _$memo4 } from "@opentui/solid";
import { insert as _$insert5 } from "@opentui/solid";
import { createComponent as _$createComponent4 } from "@opentui/solid";
import { setProp as _$setProp7 } from "@opentui/solid";
import { use as _$use2 } from "@opentui/solid";
import { createElement as _$createElement7 } from "@opentui/solid";
import { createEffect as createEffect3, createMemo as createMemo4, Show as Show2 } from "solid-js";

// src/merman/diagram.ts
import {
  parseColor as parseColor4,
  StyledText as StyledText3
} from "@opentui/core";

// src/merman/class/drawing.ts
import { BorderChars as BorderChars2 } from "@opentui/core";

// src/merman/core/canvas.ts
import stringWidth4 from "string-width";

// src/merman/core/text.ts
import stringWidth3 from "string-width";

// src/merman/core/text-lines.ts
function parseDiagramTextLines(value) {
  return value.split(/<br\s*\/?>/i).map((line) => {
    const runs = [];
    const source = line.trim();
    const tag = /<\/?(?:i|em)\s*>/gi;
    let italic = false;
    let offset = 0;
    for (const match of source.matchAll(tag)) {
      if (match.index > offset)
        runs.push({ text: source.slice(offset, match.index), italic });
      italic = !match[0].startsWith("</");
      offset = match.index + match[0].length;
    }
    if (offset < source.length)
      runs.push({ text: source.slice(offset), italic });
    return { text: runs.map((run) => run.text).join(""), runs };
  });
}
function splitDiagramLines(value) {
  return parseDiagramTextLines(value).map((line) => line.text);
}

// src/merman/core/text.ts
function diagramTextWidth(value) {
  return stringWidth3(value);
}
var DIAGRAM_LABEL_PADDING_X = 1;
function padDiagramLabelLine(value) {
  const padding = " ".repeat(DIAGRAM_LABEL_PADDING_X);
  return `${padding}${value}${padding}`;
}
function measureDiagramLabelWidth(value, measure = diagramTextWidth) {
  return Math.max(...splitDiagramLines(value).map((line) => measure(line) + DIAGRAM_LABEL_PADDING_X * 2));
}
var graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
function* diagramTextGraphemes(value) {
  for (const { segment } of graphemeSegmenter.segment(value))
    yield segment;
}
function measureDiagramTextBox(value, options = {}) {
  const lines = splitDiagramLines(value);
  const innerWidth = Math.max(...lines.map(diagramTextWidth), options.minInnerWidth ?? 1);
  return {
    width: innerWidth + (options.paddingX ?? 0) * 2,
    height: lines.length + (options.paddingY ?? 0) * 2,
    lines
  };
}

// src/merman/core/canvas.ts
var MAX_DIAGRAM_CELLS = 250000;

class DiagramCanvasSizeError extends Error {
  width;
  height;
  constructor(width, height) {
    const invalid = !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 0 || height < 0;
    super(invalid ? `Diagram canvas dimensions must be non-negative safe integers, received ${width}x${height}` : `Diagram canvas ${width}x${height} exceeds the ${MAX_DIAGRAM_CELLS.toLocaleString()} cell limit`);
    this.width = width;
    this.height = height;
    this.name = "DiagramCanvasSizeError";
  }
}
function createEmptyCell() {
  return { char: " " };
}
function sameKey(left, right) {
  return Boolean(left && left.length === right.length && left.every((value, index) => Object.is(value, right[index])));
}

class DiagramCanvas {
  width;
  height;
  cells;
  measure;
  mergeCell;
  rowEnds;
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 0 || height < 0) {
      throw new DiagramCanvasSizeError(width, height);
    }
    if (width * height > MAX_DIAGRAM_CELLS)
      throw new DiagramCanvasSizeError(width, height);
    this.measure = options.measure ?? stringWidth4;
    this.mergeCell = options.mergeCell;
    this.cells = Array.from({ length: height }, () => Array.from({ length: width }, () => createEmptyCell()));
    this.rowEnds = new Uint32Array(height);
  }
  get rows() {
    return this.cells;
  }
  rowText(row, rowEnd) {
    return row.slice(0, rowEnd).map((cell) => cell.char).join("");
  }
  textRowRange(trimTop, trimBottom) {
    let start = 0;
    let end = this.cells.length;
    if (trimTop)
      while (start < end && this.rowEnds[start] === 0)
        start += 1;
    if (trimBottom)
      while (end > start && this.rowEnds[end - 1] === 0)
        end -= 1;
    return { start, end };
  }
  setCell(x, y, char, style, metadata) {
    this.writeCell(x, y, char, style, metadata, true);
  }
  replaceCell(x, y, char, style, metadata) {
    this.writeCell(x, y, char, style, metadata, false);
  }
  writeCell(x, y, char, style, metadata, merge) {
    if (y < 0 || y >= this.cells.length || x < 0 || x >= this.cells[y].length)
      return;
    const incoming = { char, style, ...metadata };
    const cell = merge ? this.mergeCell?.(this.cells[y][x], incoming) ?? incoming : incoming;
    this.cells[y][x] = cell;
    if (cell.char !== " ") {
      this.rowEnds[y] = Math.max(this.rowEnds[y], x + 1);
    } else if (this.rowEnds[y] === x + 1) {
      let end = x;
      while (end > 0 && this.cells[y][end - 1]?.char === " ")
        end -= 1;
      this.rowEnds[y] = end;
    }
  }
  getCell(x, y) {
    return this.cells[y]?.[x];
  }
  setText(x, y, text, style, metadata) {
    const metadataAt = (cellX) => typeof metadata === "function" ? metadata(cellX, y) : metadata;
    if (this.measure === stringWidth4 && /^[\x20-\x7e]*$/.test(text)) {
      for (let index = 0;index < text.length; index++) {
        this.setCell(x + index, y, text[index], style, metadataAt(x + index));
      }
      return;
    }
    let offset = 0;
    for (const grapheme of diagramTextGraphemes(text)) {
      const width = Math.max(1, this.measure(grapheme));
      if (x + offset < 0 || x + offset + width > this.width) {
        offset += width;
        continue;
      }
      this.setCell(x + offset, y, grapheme, style, metadataAt(x + offset));
      for (let continuation = 1;continuation < width; continuation++) {
        this.setCell(x + offset + continuation, y, "", style, metadataAt(x + offset + continuation));
      }
      offset += width;
    }
  }
  toString(options = {}) {
    const lines = [];
    const rows = this.textRowRange(options.trimTop ?? false, options.trimBottom ?? false);
    for (let rowIndex = rows.start;rowIndex < rows.end; rowIndex++) {
      lines.push(this.rowText(this.cells[rowIndex], this.rowEnds[rowIndex]));
    }
    return lines.join(`
`);
  }
  getTextSize(options = {}) {
    const rows = this.textRowRange(options.trimTop ?? false, options.trimBottom ?? false);
    let width = 0;
    for (let rowIndex = rows.start;rowIndex < rows.end; rowIndex++) {
      const row = this.cells[rowIndex];
      const rowEnd = this.rowEnds[rowIndex];
      if (rowEnd > 0)
        width = Math.max(width, this.measure(this.rowText(row, rowEnd)));
    }
    return { width, height: rows.end - rows.start };
  }
  getTextHeight(options = {}) {
    const rows = this.textRowRange(options.trimTop ?? false, options.trimBottom ?? false);
    return rows.end - rows.start;
  }
  forEachRun(onRun, onLineEnd, options = {}) {
    const key = options.key;
    const rows = this.textRowRange(options.trimTop ?? false, options.trimBottom ?? false);
    for (let rowIndex = rows.start;rowIndex < rows.end; rowIndex++) {
      const row = this.cells[rowIndex];
      let rowEnd = this.rowEnds[rowIndex];
      while (rowEnd < row.length && row[rowEnd]?.style !== undefined)
        rowEnd += 1;
      let currentCell;
      let currentKey;
      let currentText = "";
      const flush = () => {
        if (!currentText || !currentCell)
          return;
        onRun({ text: currentText, style: currentCell.style, cell: currentCell });
        currentText = "";
      };
      for (let x = 0;x < rowEnd; x++) {
        const cell = row[x];
        const nextKey = key?.(cell);
        const sameRun = currentCell && (key ? sameKey(currentKey, nextKey) : currentCell.style === cell.style);
        if (!sameRun) {
          flush();
          currentCell = cell;
          currentKey = nextKey;
        }
        currentText += cell.char;
      }
      flush();
      if (rowIndex < rows.end - 1)
        onLineEnd();
    }
  }
}

// src/merman/core/drawing.ts
import { BorderChars } from "@opentui/core";

// src/merman/core/geometry.ts
var DIRECTION_AXIS = {
  left: "x",
  right: "x",
  up: "y",
  down: "y"
};
var DIRECTION_SIGN = {
  left: -1,
  right: 1,
  up: -1,
  down: 1
};
var DIRECTION_SIDE = {
  left: "left",
  right: "right",
  up: "top",
  down: "bottom"
};
var OPPOSITE_SIDE = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top"
};
function point(x, y) {
  return { x, y };
}
function diagramBoundsFromRect(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    centerX: left + Math.floor(width / 2),
    centerY: top + Math.floor(height / 2)
  };
}
function translateDiagramBounds(bounds, dx, dy) {
  bounds.left += dx;
  bounds.top += dy;
  bounds.centerX += dx;
  bounds.centerY += dy;
}
function diagramBoundsFromBounds(bounds) {
  if (bounds.length === 0)
    return;
  const left = Math.min(...bounds.map((bound) => bound.left));
  const top = Math.min(...bounds.map((bound) => bound.top));
  const right = Math.max(...bounds.map((bound) => bound.left + bound.width));
  const bottom = Math.max(...bounds.map((bound) => bound.top + bound.height));
  return diagramBoundsFromRect(left, top, right - left, bottom - top);
}
function diagramBoundsFromPoints(points) {
  if (points.length === 0)
    return;
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const right = Math.max(...points.map((point) => point.x));
  const bottom = Math.max(...points.map((point) => point.y));
  return diagramBoundsFromRect(left, top, right - left + 1, bottom - top + 1);
}
function coordinate(point, axis) {
  return point[axis];
}
function withCoordinate(point, axis, value) {
  return axis === "x" ? { x: value, y: point.y } : { x: point.x, y: value };
}
function shiftPoint(point, direction, distance = 1) {
  switch (direction) {
    case "left":
      return { x: point.x - distance, y: point.y };
    case "right":
      return { x: point.x + distance, y: point.y };
    case "up":
      return { x: point.x, y: point.y - distance };
    case "down":
      return { x: point.x, y: point.y + distance };
  }
}
function clampPoint(point, min = { x: 0, y: 0 }) {
  return { x: Math.max(min.x, point.x), y: Math.max(min.y, point.y) };
}
function samePoint(left, right) {
  return left.x === right.x && left.y === right.y;
}
function directionAxis(direction) {
  return DIRECTION_AXIS[direction];
}
function directionSign(direction) {
  return DIRECTION_SIGN[direction];
}
function sideForDirection(direction) {
  return DIRECTION_SIDE[direction];
}
function oppositeSide(side) {
  return OPPOSITE_SIDE[side];
}
function directionBetween(from, to) {
  if (from.y === to.y) {
    if (to.x > from.x)
      return "right";
    if (to.x < from.x)
      return "left";
  }
  if (from.x === to.x) {
    if (to.y > from.y)
      return "down";
    if (to.y < from.y)
      return "up";
  }
  return;
}
function boundsCenter(bounds) {
  return point(bounds.centerX, bounds.centerY);
}
function boundsSidePoint(bounds, side, surface = "outside") {
  switch (side) {
    case "left":
      return point(bounds.left - (surface === "outside" ? 1 : 0), bounds.centerY);
    case "right":
      return point(bounds.left + bounds.width - (surface === "outside" ? 0 : 1), bounds.centerY);
    case "top":
      return point(bounds.centerX, bounds.top - (surface === "outside" ? 1 : 0));
    case "bottom":
      return point(bounds.centerX, bounds.top + bounds.height - (surface === "outside" ? 0 : 1));
  }
}
function centerCoordinate(bounds, axis) {
  return axis === "x" ? bounds.centerX : bounds.centerY;
}
function snapCoordinate(source, target, tolerance) {
  return Math.abs(source - target) <= tolerance ? target : source;
}
function pathThrough(points) {
  const path = [];
  for (const next of points) {
    if (!path.length || !samePoint(path[path.length - 1], next))
      path.push(point(next.x, next.y));
  }
  return path;
}
function lane(axis, coordinate) {
  return { axis, coordinate };
}
function pathViaLane(start, routeLane, end) {
  return pathThrough([
    start,
    withCoordinate(start, routeLane.axis, routeLane.coordinate),
    withCoordinate(end, routeLane.axis, routeLane.coordinate),
    end
  ]);
}
function dominantAxis(start, end) {
  return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y) ? "x" : "y";
}
function terminalLane(start, end, axis, terminalClearance) {
  const startCoordinate = coordinate(start, axis);
  const endCoordinate = coordinate(end, axis);
  const delta = endCoordinate - startCoordinate;
  const sign = Math.sign(delta);
  if (sign === 0)
    return endCoordinate;
  return endCoordinate - sign * Math.min(terminalClearance, Math.max(1, Math.abs(delta) - 1));
}
function orthogonalPath(start, end, options = {}) {
  if (start.x === end.x || start.y === end.y)
    return pathThrough([start, end]);
  const laneAxis = options.preferredAxis ?? dominantAxis(start, end);
  return pathViaLane(start, lane(laneAxis, terminalLane(start, end, laneAxis, options.terminalClearance ?? 4)), end);
}
function segmentBetween(from, to) {
  const direction = directionBetween(from, to);
  if (!direction)
    return;
  return {
    from,
    to,
    axis: directionAxis(direction),
    direction,
    length: Math.abs(coordinate(to, directionAxis(direction)) - coordinate(from, directionAxis(direction)))
  };
}
function walkOrthogonalSegment(from, to, includeStart, visit) {
  const direction = directionBetween(from, to);
  if (!direction)
    return;
  const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;
  let cursor = includeStart ? from : point(from.x + dx, from.y + dy);
  while (!samePoint(cursor, to)) {
    if (visit(cursor) === false)
      return;
    cursor = point(cursor.x + dx, cursor.y + dy);
  }
}
function orthogonalPathPoints(points) {
  const path = [];
  for (let index = 1;index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const direction = directionBetween(from, to);
    if (!direction)
      continue;
    const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
    const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;
    let cursor = path.length === 0 ? point(from.x, from.y) : point(from.x + dx, from.y + dy);
    while (true) {
      path.push(cursor);
      if (samePoint(cursor, to))
        break;
      cursor = point(cursor.x + dx, cursor.y + dy);
    }
  }
  return path;
}
function orderedSpan(left, right) {
  return left <= right ? { start: left, end: right } : { start: right, end: left };
}
function segmentSpan(segment) {
  return orderedSpan(coordinate(segment.from, segment.axis), coordinate(segment.to, segment.axis));
}
function pointOnSegment(segment, coordinateValue) {
  return withCoordinate(segment.from, segment.axis, coordinateValue);
}
function insetSpan(span, amount) {
  return { start: span.start + amount, end: span.end - amount };
}
function spanCapacity(span) {
  return Math.max(0, span.end - span.start + 1);
}
function centeredSpanStart(span, width) {
  return span.start + Math.floor((spanCapacity(span) - width) / 2);
}
function midpoint(span) {
  return Math.round((span.start + span.end) / 2);
}
function advanceCoordinate(origin, direction, distance) {
  return origin + directionSign(direction) * distance;
}
function beforeNearestCoordinate(points, axis, direction, clearance) {
  const coordinates = points.map((point) => coordinate(point, axis));
  const nearest = directionSign(direction) > 0 ? Math.min(...coordinates) : Math.max(...coordinates);
  return advanceCoordinate(nearest, direction, -clearance);
}
function afterFarthestCoordinate(points, axis, direction, clearance) {
  const coordinates = points.map((point) => coordinate(point, axis));
  const farthest = directionSign(direction) > 0 ? Math.max(...coordinates) : Math.min(...coordinates);
  return advanceCoordinate(farthest, direction, clearance);
}
function keepBefore(preferred, boundary, direction) {
  return directionSign(direction) > 0 ? Math.min(preferred, boundary) : Math.max(preferred, boundary);
}
function keepAfter(preferred, boundary, direction) {
  return directionSign(direction) > 0 ? Math.max(preferred, boundary) : Math.min(preferred, boundary);
}

// src/merman/core/drawing.ts
var DIAGRAM_ARROW_HEADS = new Set(["\u25B6", "\u25C0", "\u25BC", "\u25B2", "\u2192", "\u2190", "\u2193", "\u2191"]);
var HEAVY_LINE_GLYPHS = new Set(Object.values(BorderChars.heavy));
var DIAGRAM_DIAMOND_CHARS = {
  topLeft: "\u256D",
  topRight: "\u256E",
  upperLeft: "\u256D",
  upperLeftJoin: "\u256F",
  upperRightJoin: "\u2570",
  upperRight: "\u256E",
  vertical: "\u2502",
  lowerLeft: "\u2570",
  lowerLeftJoin: "\u256E",
  lowerRightJoin: "\u256D",
  lowerRight: "\u256F",
  bottomLeft: "\u2570",
  bottomRight: "\u256F",
  horizontal: "\u2500"
};
function diagramDiamondCharactersFromBorder(chars) {
  return {
    topLeft: chars.topLeft,
    topRight: chars.topRight,
    upperLeft: chars.topLeft,
    upperLeftJoin: chars.bottomRight,
    upperRightJoin: chars.bottomLeft,
    upperRight: chars.topRight,
    vertical: chars.vertical,
    lowerLeft: chars.bottomLeft,
    lowerLeftJoin: chars.topRight,
    lowerRightJoin: chars.topLeft,
    lowerRight: chars.bottomRight,
    bottomLeft: chars.bottomLeft,
    bottomRight: chars.bottomRight,
    horizontal: chars.horizontal
  };
}
function lineDirections(char) {
  switch (char) {
    case "\u2500":
      return ["left", "right"];
    case "\u2502":
      return ["up", "down"];
    case "\u2501":
      return ["left", "right"];
    case "\u2503":
      return ["up", "down"];
    case "\u250C":
    case "\u256D":
    case "\u250F":
      return ["right", "down"];
    case "\u2510":
    case "\u256E":
    case "\u2513":
      return ["left", "down"];
    case "\u2514":
    case "\u2570":
    case "\u2517":
      return ["up", "right"];
    case "\u2518":
    case "\u256F":
    case "\u251B":
      return ["up", "left"];
    case "\u251C":
    case "\u2523":
      return ["up", "down", "right"];
    case "\u2524":
    case "\u252B":
      return ["up", "down", "left"];
    case "\u252C":
    case "\u2533":
      return ["left", "right", "down"];
    case "\u2534":
    case "\u253B":
      return ["left", "right", "up"];
    case "\u253C":
    case "\u254B":
      return ["up", "down", "left", "right"];
    default:
      return;
  }
}
function diagramLineGlyph(directions, cornerStyle = "square", lineStyle = "single") {
  const up = directions.has("up");
  const down = directions.has("down");
  const left = directions.has("left");
  const right = directions.has("right");
  if (lineStyle === "heavy") {
    const chars = BorderChars.heavy;
    if (up && down && left && right)
      return chars.cross;
    if (up && down && right)
      return chars.leftT;
    if (up && down && left)
      return chars.rightT;
    if (left && right && down)
      return chars.topT;
    if (left && right && up)
      return chars.bottomT;
    if (up && right)
      return chars.bottomLeft;
    if (up && left)
      return chars.bottomRight;
    if (down && right)
      return chars.topLeft;
    if (down && left)
      return chars.topRight;
    if (up || down)
      return chars.vertical;
    return chars.horizontal;
  }
  if (up && down && left && right)
    return "\u253C";
  if (up && down && right)
    return "\u251C";
  if (up && down && left)
    return "\u2524";
  if (left && right && down)
    return "\u252C";
  if (left && right && up)
    return "\u2534";
  if (up && right)
    return cornerStyle === "rounded" ? "\u2570" : "\u2514";
  if (up && left)
    return cornerStyle === "rounded" ? "\u256F" : "\u2518";
  if (down && right)
    return cornerStyle === "rounded" ? "\u256D" : "\u250C";
  if (down && left)
    return cornerStyle === "rounded" ? "\u256E" : "\u2510";
  if (up || down)
    return "\u2502";
  return "\u2500";
}
function isHeavyLineGlyph(char) {
  return HEAVY_LINE_GLYPHS.has(char);
}
function segmentGlyph(direction, lineStyle) {
  const directions = new Set(direction === "left" || direction === "right" ? ["left", "right"] : ["up", "down"]);
  return diagramLineGlyph(directions, "square", lineStyle === "heavy" ? "heavy" : "single");
}
function mergeDiagramLineGlyph(existing, incoming, cornerStyle = "square") {
  const existingDirections = lineDirections(existing);
  const incomingDirections = lineDirections(incoming);
  if (!existingDirections || !incomingDirections)
    return;
  return diagramLineGlyph(new Set([...existingDirections, ...incomingDirections]), cornerStyle, isHeavyLineGlyph(existing) && isHeavyLineGlyph(incoming) ? "heavy" : "single");
}
function diagramArrowHead(direction, style = "filled") {
  if (style === "line") {
    if (direction === "right")
      return "\u2192";
    if (direction === "left")
      return "\u2190";
    if (direction === "up")
      return "\u2191";
    return "\u2193";
  }
  if (direction === "right")
    return "\u25B6";
  if (direction === "left")
    return "\u25C0";
  if (direction === "up")
    return "\u25B2";
  return "\u25BC";
}
function diagramArrowHeadBetween(from, to, style = "filled") {
  const direction = directionBetween(from, to);
  return direction ? diagramArrowHead(direction, style) : diagramArrowHead("right", style);
}
function drawDiagramFrame(bounds, chars, setCell) {
  setCell(bounds.left, bounds.top, chars.topLeft);
  setCell(bounds.left + bounds.width - 1, bounds.top, chars.topRight);
  setCell(bounds.left, bounds.top + bounds.height - 1, chars.bottomLeft);
  setCell(bounds.left + bounds.width - 1, bounds.top + bounds.height - 1, chars.bottomRight);
  for (let x = bounds.left + 1;x < bounds.left + bounds.width - 1; x++) {
    setCell(x, bounds.top, chars.horizontal);
    setCell(x, bounds.top + bounds.height - 1, chars.horizontal);
  }
  for (let y = bounds.top + 1;y < bounds.top + bounds.height - 1; y++) {
    setCell(bounds.left, y, chars.vertical);
    setCell(bounds.left + bounds.width - 1, y, chars.vertical);
  }
}
function fillDiagramFrameInterior(bounds, setCell) {
  for (let y = bounds.top + 1;y < bounds.top + bounds.height - 1; y++) {
    for (let x = bounds.left + 1;x < bounds.left + bounds.width - 1; x++)
      setCell(x, y);
  }
}
function drawDiagramDiamond(bounds, setCell, chars = DIAGRAM_DIAMOND_CHARS) {
  const left = bounds.left;
  const right = bounds.left + bounds.width - 1;
  const top = bounds.top;
  const bottom = bounds.top + bounds.height - 1;
  const capInset = Math.min(2, Math.max(1, Math.floor((bounds.width - 1) / 2)));
  const capLeft = left + capInset;
  const capRight = right - capInset;
  setCell(capLeft, top, chars.topLeft);
  for (let x = capLeft + 1;x < capRight; x++)
    setCell(x, top, chars.horizontal);
  setCell(capRight, top, chars.topRight);
  setCell(left, top + 1, chars.upperLeft);
  for (let x = left + 1;x < capLeft; x++)
    setCell(x, top + 1, chars.horizontal);
  setCell(capLeft, top + 1, chars.upperLeftJoin);
  setCell(capRight, top + 1, chars.upperRightJoin);
  for (let x = capRight + 1;x < right; x++)
    setCell(x, top + 1, chars.horizontal);
  setCell(right, top + 1, chars.upperRight);
  for (let y = top + 2;y < bottom - 1; y++) {
    setCell(left, y, chars.vertical);
    setCell(right, y, chars.vertical);
  }
  setCell(left, bottom - 1, chars.lowerLeft);
  for (let x = left + 1;x < capLeft; x++)
    setCell(x, bottom - 1, chars.horizontal);
  setCell(capLeft, bottom - 1, chars.lowerLeftJoin);
  setCell(capRight, bottom - 1, chars.lowerRightJoin);
  for (let x = capRight + 1;x < right; x++)
    setCell(x, bottom - 1, chars.horizontal);
  setCell(right, bottom - 1, chars.lowerRight);
  setCell(capLeft, bottom, chars.bottomLeft);
  for (let x = capLeft + 1;x < capRight; x++)
    setCell(x, bottom, chars.horizontal);
  setCell(capRight, bottom, chars.bottomRight);
}
function drawOrthogonalPath(points, setCell, options = {}) {
  for (let index = 1;index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const direction = directionBetween(from, to);
    if (!direction)
      continue;
    const glyph = segmentGlyph(direction, options.lineStyle);
    const horizontal = direction === "left" || direction === "right";
    const dashOn = horizontal ? 2 : 1;
    const dashPeriod = horizontal ? 4 : 2;
    let step = index === 1 ? 0 : 1;
    walkOrthogonalSegment(from, to, index === 1, (point) => {
      if (options.lineStyle !== "dashed" || step % dashPeriod < dashOn)
        setCell(point.x, point.y, glyph);
      step += 1;
    });
  }
  for (let index = 1;index < points.length - 1; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const fromDirection = directionBetween(current, previous);
    const toDirection = directionBetween(current, next);
    const directions = new Set;
    if (fromDirection)
      directions.add(fromDirection);
    if (toDirection)
      directions.add(toDirection);
    setCell(current.x, current.y, diagramLineGlyph(directions, options.cornerStyle, options.lineStyle === "heavy" ? "heavy" : "single"));
  }
}

// src/merman/class/dagre-layout.ts
import { Graph, layout as layout2 } from "@dagrejs/dagre";

// src/merman/class/labels.ts
function classLabelAnchor(path, lineCount, width, vertical) {
  let bestFrom = path[0];
  let bestTo = path[path.length - 1];
  let bestLength = -1;
  const preferredLength = (from, to) => {
    const horizontal = from.y === to.y;
    return horizontal === vertical ? Math.abs(from.x - to.x) + Math.abs(from.y - to.y) : -1;
  };
  for (let index = 1;index < path.length; index++) {
    const from = path[index - 1];
    const to = path[index];
    const length = preferredLength(from, to);
    if (length > bestLength) {
      bestLength = length;
      bestFrom = from;
      bestTo = to;
    }
  }
  if (bestLength < 0) {
    for (let index = 1;index < path.length; index++) {
      const from = path[index - 1];
      const to = path[index];
      const length = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
      if (length > bestLength) {
        bestLength = length;
        bestFrom = from;
        bestTo = to;
      }
    }
  }
  const midX = Math.floor((bestFrom.x + bestTo.x) / 2);
  const midY = Math.floor((bestFrom.y + bestTo.y) / 2);
  if (bestFrom.y === bestTo.y)
    return { x: midX - Math.floor(width / 2), y: bestFrom.y - lineCount };
  if (bestFrom.x === bestTo.x)
    return { x: bestFrom.x + 2, y: midY - Math.floor(lineCount / 2) };
  return { x: midX, y: midY };
}

// src/merman/class/layout.ts
var CLASS_CONTENT_OFFSET_X = 2;
var CONTENT_PADDING = 2;
var NODE_H_GAP = 6;
var NODE_MIN_GAP = 3;
var MARGIN_TOP = 2;
var MARGIN_RIGHT = 4;
var MARGIN_BOTTOM = 2;
function displayClassName(id) {
  let open = true;
  return id.replace(/~/g, () => {
    const glyph = open ? "<" : ">";
    open = !open;
    return glyph;
  });
}
function classBoxSectionLines(definition) {
  return {
    titleLines: [
      ...definition.stereotype ? [`\xAB${definition.stereotype}\xBB`] : [],
      displayClassName(definition.label ?? definition.id)
    ],
    attributeLines: [
      ...definition.members.filter((member) => !member.method).map((member) => member.text),
      ...(definition.notes ?? []).map((note) => `\u24D8 ${note}`)
    ],
    methodLines: definition.members.filter((member) => member.method).map((member) => member.text)
  };
}
function measureClassBox(definition) {
  const { titleLines, attributeLines, methodLines } = classBoxSectionLines(definition);
  const contentWidth = Math.max(1, ...titleLines.map(diagramTextWidth), ...attributeLines.map(diagramTextWidth), ...methodLines.map(diagramTextWidth));
  let height = 2 + titleLines.length;
  if (attributeLines.length)
    height += 1 + attributeLines.length;
  if (methodLines.length)
    height += 1 + methodLines.length;
  return { titleLines, attributeLines, methodLines, contentWidth, width: contentWidth + CONTENT_PADDING * 2, height };
}
function layoutClassDiagram(diagram, direction) {
  const vertical = direction === "TB" || direction === "BT";
  const metrics = new Map(diagram.classes.map((definition) => [definition.id, measureClassBox(definition)]));
  const rank = computeRanks(diagram, direction);
  const byId = new Map(diagram.classes.map((definition) => [definition.id, definition]));
  const groups = new Map;
  for (const definition of diagram.classes) {
    const key = rank.get(definition.id) ?? 0;
    const list = groups.get(key) ?? [];
    list.push(definition);
    groups.set(key, list);
  }
  const rankKeys = [...groups.keys()].sort((left, right) => left - right);
  const records = diagram.relationships.map((relationship) => ({
    relationship,
    from: byId.get(relationship.from),
    to: byId.get(relationship.to),
    fromRank: rank.get(relationship.from) ?? 0,
    toRank: rank.get(relationship.to) ?? 0
  }));
  const spacing = computeSpacing(records, vertical);
  const boxes = [];
  const boxById = new Map;
  const bands = new Map;
  let mainExtent = 0;
  if (vertical) {
    const laneWidths = rankKeys.map((key) => laneWidth(groups.get(key), metrics));
    const totalWidth = Math.max(0, ...laneWidths);
    let y = 0;
    rankKeys.forEach((key, index) => {
      const nodes = groups.get(key);
      const bandHeight = Math.max(0, ...nodes.map((node) => metrics.get(node.id).height));
      let x = Math.floor((totalWidth - laneWidths[index]) / 2);
      for (const definition of nodes) {
        const size = metrics.get(definition.id);
        const box = makeClassBox(definition, x, y, size);
        boxes.push(box);
        boxById.set(definition.id, box);
        x += size.width + NODE_H_GAP;
      }
      bands.set(key, { start: y, end: y + bandHeight - 1 });
      y += bandHeight + spacing.gapFor(key);
    });
    mainExtent = Math.max(0, ...boxes.map((box) => box.bounds.left + box.bounds.width));
  } else {
    const laneHeights = rankKeys.map((key) => laneHeight(groups.get(key), metrics));
    const totalHeight = Math.max(0, ...laneHeights);
    let x = 0;
    rankKeys.forEach((key, index) => {
      const nodes = groups.get(key);
      const bandWidth = Math.max(0, ...nodes.map((node) => metrics.get(node.id).width));
      let y = Math.floor((totalHeight - laneHeights[index]) / 2);
      for (const definition of nodes) {
        const size = metrics.get(definition.id);
        const box = makeClassBox(definition, x, y, size);
        boxes.push(box);
        boxById.set(definition.id, box);
        y += size.height + NODE_MIN_GAP;
      }
      bands.set(key, { start: x, end: x + bandWidth - 1 });
      x += bandWidth + spacing.gapFor(key);
    });
    mainExtent = Math.max(0, ...boxes.map((box) => box.bounds.top + box.bounds.height));
  }
  const corridors = { low: 0, high: 0 };
  const takeCorridor = (side) => {
    const index = corridors[side]++;
    return side === "low" ? -3 - index : mainExtent + 3 + index;
  };
  const bandFor = (rank) => bands.get(rank);
  const edges = records.map((record, edgeIndex) => {
    const from = boxById.get(record.from.id);
    const to = boxById.get(record.to.id);
    const lane = (gap) => bands.get(gap).end + spacing.laneBase + spacing.laneFor(gap, edgeIndex) * spacing.stride;
    const tieBreak = edgeIndex % 2 === 0 ? "low" : "high";
    const path = vertical ? verticalRoute(record, from.bounds, to.bounds, lane, bandFor, mainExtent, tieBreak, takeCorridor) : horizontalRoute(record, from.bounds, to.bounds, lane, bandFor, mainExtent, tieBreak, takeCorridor);
    return {
      relationship: record.relationship,
      fromId: record.from.id,
      toId: record.to.id,
      from: from.bounds,
      to: to.bounds,
      path: dedupePath(path)
    };
  });
  return finalizeClassDiagramLayout(boxes, edges, direction);
}
function makeClassBox(definition, x, y, size) {
  return {
    definition,
    bounds: diagramBoundsFromRect(x, y, size.width, size.height),
    titleLines: size.titleLines,
    attributeLines: size.attributeLines,
    methodLines: size.methodLines,
    contentWidth: size.contentWidth
  };
}
function laneWidth(nodes, metrics) {
  if (nodes.length === 0)
    return 0;
  return nodes.reduce((sum, node) => sum + metrics.get(node.id).width, 0) + (nodes.length - 1) * NODE_H_GAP;
}
function laneHeight(nodes, metrics) {
  if (nodes.length === 0)
    return 0;
  return nodes.reduce((sum, node) => sum + metrics.get(node.id).height, 0) + (nodes.length - 1) * NODE_MIN_GAP;
}
function gapIndices(record) {
  const upper = Math.min(record.fromRank, record.toRank);
  const lower = Math.max(record.fromRank, record.toRank);
  return lower - upper <= 1 ? [upper] : [];
}
function computeSpacing(records, vertical) {
  const groupsByGap = new Map;
  const laneByEdge = new Map;
  const labelWidthByGap = new Map;
  for (const [edgeIndex, record] of records.entries()) {
    const label = record.relationship.label ?? "";
    for (const gap of new Set(gapIndices(record))) {
      const groups = groupsByGap.get(gap) ?? new Map;
      const groupKey = `${record.from.id}\x00${label}`;
      let slot = groups.get(groupKey);
      if (slot === undefined) {
        slot = groups.size;
        groups.set(groupKey, slot);
      }
      groupsByGap.set(gap, groups);
      laneByEdge.set(`${edgeIndex}:${gap}`, slot);
      if (label) {
        const labelWidth = Math.max(...splitDiagramLines(label).map(diagramTextWidth));
        labelWidthByGap.set(gap, Math.max(labelWidthByGap.get(gap) ?? 0, labelWidth));
      }
    }
  }
  const stride = vertical ? 2 : Math.max(2, Math.max(0, ...labelWidthByGap.values()) + 2);
  const laneBase = vertical ? 2 : 1;
  const gapSizes = new Map;
  for (const [gap, groups] of groupsByGap) {
    const gapSize = vertical ? Math.max(NODE_MIN_GAP, laneBase + groups.size * stride) : Math.max(NODE_MIN_GAP, Math.max(0, groups.size - 1) * stride + (labelWidthByGap.get(gap) ?? 0) + 3);
    gapSizes.set(gap, gapSize);
  }
  return {
    stride,
    laneBase,
    gapFor: (gap) => gapSizes.get(gap) ?? NODE_MIN_GAP,
    laneFor: (gap, edgeIndex) => laneByEdge.get(`${edgeIndex}:${gap}`) ?? 0
  };
}
function chooseCorridorSide(from, to, extent, tieBreak) {
  const low = -3;
  const high = extent + 3;
  const lowCost = Math.abs(from - low) + Math.abs(to - low);
  const highCost = Math.abs(from - high) + Math.abs(to - high);
  if (lowCost === highCost)
    return tieBreak;
  return lowCost < highCost ? "low" : "high";
}
function sideInset(size) {
  return Math.max(1, Math.min(2, Math.floor((size - 2) / 2)));
}
function sidePortX(bounds, side) {
  const inset = sideInset(bounds.width);
  return side === "low" ? bounds.left + inset : bounds.left + bounds.width - 1 - inset;
}
function sidePortY(bounds, side) {
  const inset = sideInset(bounds.height);
  return side === "low" ? bounds.top + inset : bounds.top + bounds.height - 1 - inset;
}
function verticalRoute(record, from, to, laneFor, bandFor, mainExtent, tieBreak, takeCorridor) {
  const { fromRank, toRank } = record;
  if (fromRank === toRank) {
    const lane = laneFor(fromRank);
    return [
      point2(from.centerX, from.top + from.height),
      point2(from.centerX, lane),
      point2(to.centerX, lane),
      point2(to.centerX, to.top + to.height)
    ];
  }
  const upper = Math.min(fromRank, toRank);
  const lower = Math.max(fromRank, toRank);
  if (lower - upper === 1) {
    const lane = laneFor(upper);
    return fromRank < toRank ? [
      point2(from.centerX, from.top + from.height),
      point2(from.centerX, lane),
      point2(to.centerX, lane),
      point2(to.centerX, to.top - 1)
    ] : [
      point2(from.centerX, from.top - 1),
      point2(from.centerX, lane),
      point2(to.centerX, lane),
      point2(to.centerX, to.top + to.height)
    ];
  }
  const side = chooseCorridorSide(from.centerX, to.centerX, mainExtent, tieBreak);
  const corridorX = takeCorridor(side);
  const sourceX = sidePortX(from, side);
  const targetX = sidePortX(to, side);
  if (fromRank < toRank) {
    const sourceLane = bandFor(fromRank + 1).start - 1;
    const targetLane = to.top - 2;
    return [
      point2(sourceX, from.top + from.height),
      point2(sourceX, sourceLane),
      point2(corridorX, sourceLane),
      point2(corridorX, targetLane),
      point2(targetX, targetLane),
      point2(targetX, to.top - 1)
    ];
  }
  const sourceLane = bandFor(fromRank).start - 1;
  const targetLane = bandFor(toRank + 1).start - 1;
  return [
    point2(sourceX, from.top - 1),
    point2(sourceX, sourceLane),
    point2(corridorX, sourceLane),
    point2(corridorX, targetLane),
    point2(targetX, targetLane),
    point2(targetX, to.top + to.height)
  ];
}
function horizontalRoute(record, from, to, laneFor, bandFor, mainExtent, tieBreak, takeCorridor) {
  const { fromRank, toRank } = record;
  if (fromRank === toRank) {
    const lane = laneFor(fromRank);
    return [
      point2(from.left + from.width, from.centerY),
      point2(lane, from.centerY),
      point2(lane, to.centerY),
      point2(to.left + to.width, to.centerY)
    ];
  }
  const upper = Math.min(fromRank, toRank);
  const lower = Math.max(fromRank, toRank);
  if (lower - upper === 1) {
    const lane = laneFor(upper);
    return fromRank < toRank ? [
      point2(from.left + from.width, from.centerY),
      point2(lane, from.centerY),
      point2(lane, to.centerY),
      point2(to.left - 1, to.centerY)
    ] : [
      point2(from.left - 1, from.centerY),
      point2(lane, from.centerY),
      point2(lane, to.centerY),
      point2(to.left + to.width, to.centerY)
    ];
  }
  const side = chooseCorridorSide(from.centerY, to.centerY, mainExtent, tieBreak);
  const corridorY = takeCorridor(side);
  const sourceY = sidePortY(from, side);
  const targetY = sidePortY(to, side);
  if (fromRank < toRank) {
    const sourceLane = bandFor(fromRank + 1).start - 1;
    const targetLane = to.left - 2;
    return [
      point2(from.left + from.width, sourceY),
      point2(sourceLane, sourceY),
      point2(sourceLane, corridorY),
      point2(targetLane, corridorY),
      point2(targetLane, targetY),
      point2(to.left - 1, targetY)
    ];
  }
  const sourceLane = bandFor(fromRank).start - 1;
  const targetLane = bandFor(toRank + 1).start - 1;
  return [
    point2(from.left - 1, sourceY),
    point2(sourceLane, sourceY),
    point2(sourceLane, corridorY),
    point2(targetLane, corridorY),
    point2(targetLane, targetY),
    point2(to.left + to.width, targetY)
  ];
}
function point2(x, y) {
  return { x, y };
}
function dedupePath(points) {
  const result = [];
  for (const point of points) {
    const last = result[result.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y)
      result.push(point);
  }
  return result;
}
function computeRanks(diagram, direction) {
  const ids = diagram.classes.map((definition) => definition.id);
  const adjacency = new Map(ids.map((id) => [id, []]));
  const edges = [];
  for (const relationship of diagram.relationships) {
    const key = `${relationship.from}\x00${relationship.to}\x00${edges.length}`;
    edges.push({ from: relationship.from, to: relationship.to, key });
    adjacency.get(relationship.from)?.push({ to: relationship.to, key });
  }
  const state = new Map;
  const back = new Set;
  const visit = (id) => {
    state.set(id, 1);
    for (const { to, key } of adjacency.get(id) ?? []) {
      const seen = state.get(to) ?? 0;
      if (seen === 1)
        back.add(key);
      else if (seen === 0)
        visit(to);
    }
    state.set(id, 2);
  };
  for (const id of ids)
    if ((state.get(id) ?? 0) === 0)
      visit(id);
  const rank = new Map(ids.map((id) => [id, 0]));
  let changed = true;
  let guard = ids.length + 1;
  while (changed && guard-- > 0) {
    changed = false;
    for (const edge of edges) {
      if (back.has(edge.key))
        continue;
      const next = (rank.get(edge.from) ?? 0) + 1;
      if (next > (rank.get(edge.to) ?? 0)) {
        rank.set(edge.to, next);
        changed = true;
      }
    }
  }
  if (direction === "BT" || direction === "RL") {
    const maxRank = Math.max(0, ...rank.values());
    for (const [id, value] of rank)
      rank.set(id, maxRank - value);
  }
  return rank;
}
function finalizeClassDiagramLayout(boxes, edges, direction) {
  const points = [
    ...boxes.flatMap((box) => [
      { x: box.bounds.left, y: box.bounds.top },
      { x: box.bounds.left + box.bounds.width, y: box.bounds.top + box.bounds.height }
    ]),
    ...edges.flatMap((edge) => edge.path)
  ];
  const minX = Math.min(0, ...points.map((p) => p.x));
  const minY = Math.min(0, ...points.map((p) => p.y));
  const dx = -minX;
  const dy = -minY + MARGIN_TOP;
  if (dx !== 0 || dy !== 0) {
    for (const box of boxes)
      translateDiagramBounds(box.bounds, dx, dy);
    for (const edge of edges) {
      for (const p of edge.path) {
        p.x += dx;
        p.y += dy;
      }
    }
  }
  const maxX = Math.max(0, ...boxes.map((box) => box.bounds.left + box.bounds.width), ...edges.flatMap((edge) => edge.path.map((p) => p.x + 1)));
  const maxY = Math.max(0, ...boxes.map((box) => box.bounds.top + box.bounds.height), ...edges.flatMap((edge) => edge.path.map((p) => p.y + 1)));
  return { direction, boxes, edges, width: maxX + MARGIN_RIGHT, height: maxY + MARGIN_BOTTOM };
}

// src/merman/class/dagre-layout.ts
function attachment(box, center, size, point) {
  const sides = [
    ["top", Math.abs(point.y - (center.y - size.height / 2))],
    ["bottom", Math.abs(point.y - (center.y + size.height / 2))],
    ["left", Math.abs(point.x - (center.x - size.width / 2))],
    ["right", Math.abs(point.x - (center.x + size.width / 2))]
  ];
  const side = sides.reduce((best, entry) => entry[1] < best[1] ? entry : best)[0];
  const x = Math.max(box.left + 1, Math.min(box.left + box.width - 2, Math.round(point.x)));
  const y = Math.max(box.top + 1, Math.min(box.top + box.height - 2, Math.round(point.y)));
  if (side === "top")
    return { x, y: box.top - 1 };
  if (side === "bottom")
    return { x, y: box.top + box.height };
  if (side === "left")
    return { x: box.left - 1, y };
  return { x: box.left + box.width, y };
}
function intersectsBox(from, to, box) {
  const right = box.left + box.width - 1;
  const bottom = box.top + box.height - 1;
  if (from.y === to.y)
    return from.y >= box.top && from.y <= bottom && Math.max(from.x, to.x) >= box.left && Math.min(from.x, to.x) <= right;
  return from.x >= box.left && from.x <= right && Math.max(from.y, to.y) >= box.top && Math.min(from.y, to.y) <= bottom;
}
function orthogonalize(points, boxes, vertical) {
  const result = [points[0]];
  for (const to of points.slice(1)) {
    const from = result[result.length - 1];
    if (from.x !== to.x && from.y !== to.y) {
      const candidates = vertical ? [{ x: from.x, y: to.y }, { x: to.x, y: from.y }] : [{ x: to.x, y: from.y }, { x: from.x, y: to.y }];
      const cost = (bend) => boxes.reduce((total, box) => total + Number(intersectsBox(from, bend, box.bounds)) + Number(intersectsBox(bend, to, box.bounds)), 0);
      const bend = cost(candidates[1]) < cost(candidates[0]) ? candidates[1] : candidates[0];
      if (from.x !== bend.x || from.y !== bend.y)
        result.push(bend);
    }
    if (result.at(-1).x !== to.x || result.at(-1).y !== to.y)
      result.push(to);
  }
  return result;
}
function selfLoop(box, vertical, offset, labelWidth) {
  const left = box.left;
  const right = box.left + box.width - 1;
  const top = box.top;
  const bottom = box.top + box.height - 1;
  if (vertical) {
    const portX = right - 1;
    const outsideX = right + Math.max(3, labelWidth + 3) + offset * 2;
    return [
      { x: portX, y: bottom + 1 },
      { x: portX, y: bottom + 3 + offset },
      { x: outsideX, y: bottom + 3 + offset },
      { x: outsideX, y: top - 3 - offset },
      { x: portX, y: top - 3 - offset },
      { x: portX, y: top - 1 }
    ];
  }
  const portY = bottom - 1;
  const outsideY = bottom + 3 + offset * 2;
  return [
    { x: right + 1, y: portY },
    { x: right + 3 + offset, y: portY },
    { x: right + 3 + offset, y: outsideY },
    { x: left - 3 - offset, y: outsideY },
    { x: left - 3 - offset, y: portY },
    { x: left - 1, y: portY }
  ];
}
function layoutDagreClassDiagram(diagram, direction) {
  if (diagram.classes.length === 0)
    return { direction, boxes: [], edges: [], width: 0, height: 0 };
  const graph = new Graph({ multigraph: true });
  graph.setGraph({ rankdir: direction, nodesep: 8, ranksep: 10, edgesep: 4 });
  graph.setDefaultEdgeLabel(() => ({}));
  const metrics = new Map(diagram.classes.map((definition) => [definition.id, measureClassBox(definition)]));
  for (const definition of diagram.classes) {
    const size = metrics.get(definition.id);
    graph.setNode(definition.id, { width: size.width, height: size.height });
  }
  diagram.relationships.forEach((edge, index) => {
    const width = edge.label ? Math.max(...splitDiagramLines(edge.label).map(diagramTextWidth)) + 2 : 0;
    const height = edge.label ? splitDiagramLines(edge.label).length + 1 : 0;
    graph.setEdge(edge.from, edge.to, { width, height, weight: edge.kind === "inheritance" ? 2 : 1 }, String(index));
  });
  layout2(graph);
  const boxes = diagram.classes.map((definition) => {
    const node = graph.node(definition.id);
    const size = metrics.get(definition.id);
    return makeClassBox(definition, Math.round(node.x - size.width / 2), Math.round(node.y - size.height / 2), size);
  });
  const boxById = new Map(boxes.map((box) => [box.definition.id, box]));
  const vertical = direction === "TB" || direction === "BT";
  const loopCounts = new Map;
  const edges = diagram.relationships.map((relationship, index) => {
    const from = boxById.get(relationship.from).bounds;
    const to = boxById.get(relationship.to).bounds;
    if (relationship.from === relationship.to) {
      const offset = loopCounts.get(relationship.from) ?? 0;
      loopCounts.set(relationship.from, offset + 1);
      return {
        relationship,
        fromId: relationship.from,
        toId: relationship.to,
        from,
        to,
        path: selfLoop(from, vertical, offset, relationship.label ? Math.max(...splitDiagramLines(relationship.label).map(diagramTextWidth)) : 0)
      };
    }
    const waypoints = graph.edge({ v: relationship.from, w: relationship.to, name: String(index) })?.points ?? [];
    const source = graph.node(relationship.from);
    const target = graph.node(relationship.to);
    const first = waypoints[0] ?? { x: source.x, y: source.y };
    const last = waypoints.at(-1) ?? { x: target.x, y: target.y };
    const start = attachment(from, { x: source.x, y: source.y }, metrics.get(relationship.from), first);
    const end = attachment(to, { x: target.x, y: target.y }, metrics.get(relationship.to), last);
    const direct = (start.x === end.x || start.y === end.y) && boxes.every((box) => !intersectsBox(start, end, box.bounds));
    const path = direct ? [start, end] : orthogonalize([
      start,
      ...waypoints.slice(1, -1).map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })),
      end
    ], boxes, vertical);
    return { relationship, fromId: relationship.from, toId: relationship.to, from, to, path };
  });
  const result = finalizeClassDiagramLayout(boxes, edges, direction);
  let minX = 0;
  let minY = 0;
  let maxX = result.width;
  let maxY = result.height;
  for (const edge of result.edges) {
    if (!edge.relationship.label)
      continue;
    const lines = splitDiagramLines(edge.relationship.label);
    const width = Math.max(...lines.map(diagramTextWidth));
    const anchor = classLabelAnchor(edge.path, lines.length, width, vertical);
    minX = Math.min(minX, anchor.x - 1);
    minY = Math.min(minY, anchor.y);
    maxX = Math.max(maxX, anchor.x + width + 2);
    maxY = Math.max(maxY, anchor.y + lines.length + 1);
  }
  const dx = -minX;
  const dy = -minY;
  if (dx || dy) {
    for (const box of result.boxes)
      translateDiagramBounds(box.bounds, dx, dy);
    for (const edge of result.edges)
      for (const point of edge.path) {
        point.x += dx;
        point.y += dy;
      }
  }
  result.width = maxX + dx;
  result.height = maxY + dy;
  return result;
}

// src/merman/class/drawing.ts
var HOLLOW_TRIANGLE = { up: "\u25B3", down: "\u25BD", left: "\u25C1", right: "\u25B7" };
var OPEN_ARROW = { up: "\u2191", down: "\u2193", left: "\u2190", right: "\u2192" };
var FILLED_DIAMOND = "\u25C6";
var HOLLOW_DIAMOND = "\u25C7";
function drawClassDiagramGrid(diagram, options = {}) {
  return drawClassDiagramLayout(createClassDiagramLayout(diagram, options));
}
function createClassDiagramLayout(diagram, options = {}) {
  const place = options.classLayout === "dagre" ? layoutDagreClassDiagram : layoutClassDiagram;
  const requested = diagram.direction;
  const maxWidth = options.layoutMaxWidth !== undefined && Number.isFinite(options.layoutMaxWidth) ? Math.max(1, Math.trunc(options.layoutMaxWidth)) : undefined;
  if (maxWidth === undefined || requested !== "LR" && requested !== "RL") {
    return place(diagram, requested);
  }
  const wide = place(diagram, requested);
  if (wide.width <= maxWidth)
    return wide;
  const fallbackDirection = requested === "RL" ? "BT" : "TB";
  const fallback = place(diagram, fallbackDirection);
  return fallback.width < wide.width ? fallback : wide;
}
function drawClassDiagramLayout(layout) {
  if (layout.boxes.length === 0)
    return new DiagramCanvas(0, 0);
  const grid = makeGrid(Math.max(1, layout.width), Math.max(1, layout.height));
  const vertical = layout.direction === "TB" || layout.direction === "BT";
  for (const box of layout.boxes)
    drawBox(grid, box);
  for (const edge of layout.edges)
    drawEdgeLine(grid, edge);
  for (const edge of layout.edges)
    drawEdgeEndpoints(grid, edge);
  bridgeIndependentCrossings(grid, layout.edges);
  for (const edge of layout.edges)
    drawEdgeLabels(grid, edge, vertical);
  return grid;
}
function makeGrid(width, height) {
  return new DiagramCanvas(width, height, {
    mergeCell: (existing, incoming) => ({
      ...incoming,
      char: existing.style === "edge" && incoming.style === "edge" ? mergeDiagramLineGlyph(existing.char, incoming.char) ?? incoming.char : incoming.char
    })
  });
}
function setCell(grid, x, y, char, style) {
  grid.setCell(x, y, char, style);
}
function drawBox(grid, box) {
  const bounds = box.bounds;
  drawDiagramFrame(bounds, BorderChars2.single, (x, y, char) => setCell(grid, x, y, char, "border"));
  let y = bounds.top + 1;
  box.titleLines.forEach((line, index) => {
    const x = bounds.left + CLASS_CONTENT_OFFSET_X + Math.floor((box.contentWidth - diagramTextWidth(line)) / 2);
    setText(grid, x, y + index, line, box.definition.stereotype && index === 0 ? "stereotype" : "title");
  });
  y += box.titleLines.length;
  if (box.attributeLines.length) {
    drawSeparator(grid, bounds, y);
    y += 1;
    box.attributeLines.forEach((line, index) => setText(grid, bounds.left + CLASS_CONTENT_OFFSET_X, y + index, line, "member"));
    y += box.attributeLines.length;
  }
  if (box.methodLines.length) {
    drawSeparator(grid, bounds, y);
    y += 1;
    box.methodLines.forEach((line, index) => setText(grid, bounds.left + CLASS_CONTENT_OFFSET_X, y + index, line, "member"));
  }
}
function drawSeparator(grid, bounds, y) {
  const left = bounds.left;
  const right = bounds.left + bounds.width - 1;
  setCell(grid, left, y, "\u251C", "border");
  for (let x = left + 1;x < right; x++)
    setCell(grid, x, y, "\u2500", "border");
  setCell(grid, right, y, "\u2524", "border");
}
function drawEdgeLine(grid, edge) {
  const { relationship, path } = edge;
  if (path.length < 2)
    return;
  drawOrthogonalPath(path, (x, y, char) => setCell(grid, x, y, char, "edge"), {
    cornerStyle: "square",
    lineStyle: relationship.dashed ? "dashed" : "single"
  });
}
function rememberOwner(owners, owner) {
  if (owners.length < 2 && !owners.includes(owner))
    owners.push(owner);
}
function independent(first, second) {
  return first.length > 0 && second.length > 0 && (first.length > 1 || second.length > 1 || first[0] !== second[0]);
}
function bridgeIndependentCrossings(grid, edges) {
  const cells = new Map;
  const seenPaths = new Set;
  edges.forEach((edge, edgeIndex) => {
    const pathKey = edge.path.map(({ x, y }) => `${x}:${y}`).join(";");
    if (seenPaths.has(pathKey))
      return;
    seenPaths.add(pathKey);
    for (let index = 1;index < edge.path.length; index++) {
      const from = edge.path[index - 1];
      const to = edge.path[index];
      const horizontal = from.y === to.y;
      if (!horizontal && from.x !== to.x)
        continue;
      const start = horizontal ? from.x : from.y;
      const end = horizontal ? to.x : to.y;
      for (let position = Math.min(start, end);position <= Math.max(start, end); position++) {
        const x = horizontal ? position : from.x;
        const y = horizontal ? from.y : position;
        const cellKey = y * grid.width + x;
        const cell = cells.get(cellKey) ?? {
          horizontal: { through: [], ends: [] },
          vertical: { through: [], ends: [] }
        };
        const axis = horizontal ? cell.horizontal : cell.vertical;
        if (position !== start && position !== end)
          rememberOwner(axis.through, edgeIndex);
        else if (position === start && index === 1 || position === end && index === edge.path.length - 1) {
          rememberOwner(axis.ends, edgeIndex);
        }
        cells.set(cellKey, cell);
      }
    }
  });
  for (const [cellKey, cell] of cells) {
    const x = cellKey % grid.width;
    const y = Math.floor(cellKey / grid.width);
    if (grid.getCell(x, y)?.char !== "\u253C")
      continue;
    if (independent(cell.horizontal.through, cell.vertical.through) || independent(cell.horizontal.ends, cell.vertical.through)) {
      grid.replaceCell(x, y, "\u2500", "edge");
    } else if (independent(cell.horizontal.through, cell.vertical.ends)) {
      grid.replaceCell(x, y, "\u2502", "edge");
    }
  }
}
function drawEdgeEndpoints(grid, edge) {
  const { relationship, path } = edge;
  if (path.length < 2)
    return;
  drawStartCell(grid, path, relationship.headAt === "from" ? relationship.kind : undefined);
  drawEndCell(grid, path, relationship.headAt === "to" ? relationship.kind : undefined);
}
function drawStartCell(grid, path, markerKind) {
  const start = path[0];
  const next = path[1];
  const direction = directionBetween(start, next) ?? "right";
  const marker = markerKind ? relationshipMarker(markerKind, opposite(direction)) : undefined;
  if (marker)
    setCell(grid, start.x, start.y, marker, "edge");
  else
    setCell(grid, start.x, start.y, diagramLineGlyph(new Set([direction])), "edge");
}
function drawEndCell(grid, path, markerKind) {
  const end = path[path.length - 1];
  const previous = path[path.length - 2];
  const direction = directionBetween(previous, end) ?? "right";
  const marker = markerKind ? relationshipMarker(markerKind, direction) : undefined;
  if (marker)
    setCell(grid, end.x, end.y, marker, "edge");
  else
    setCell(grid, end.x, end.y, diagramLineGlyph(new Set([direction])), "edge");
}
function relationshipMarker(kind, direction) {
  switch (kind) {
    case "inheritance":
    case "realization":
      return HOLLOW_TRIANGLE[direction];
    case "composition":
      return FILLED_DIAMOND;
    case "aggregation":
      return HOLLOW_DIAMOND;
    case "association":
    case "dependency":
      return OPEN_ARROW[direction];
    case "link":
      return;
  }
}
function opposite(direction) {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}
function drawEdgeLabels(grid, edge, vertical) {
  const { relationship, path } = edge;
  let labelWidth = 0;
  let labelHeight = 0;
  let labelX = 0;
  let labelY = 0;
  if (relationship.label) {
    const lines = splitDiagramLines(relationship.label);
    labelWidth = Math.max(...lines.map(diagramTextWidth));
    labelHeight = lines.length;
    const anchor = classLabelAnchor(path, lines.length, labelWidth, vertical);
    labelX = anchor.x;
    labelY = anchor.y;
    drawTextTag(grid, anchor.x, anchor.y, lines);
  }
  if (relationship.fromCardinality) {
    const width = diagramTextWidth(relationship.fromCardinality);
    const anchor = cardinalityAnchor(path, width, true, labelX, labelY, labelWidth, labelHeight);
    drawTextTag(grid, anchor.x, anchor.y, [relationship.fromCardinality]);
  }
  if (relationship.toCardinality) {
    const width = diagramTextWidth(relationship.toCardinality);
    const anchor = cardinalityAnchor(path, width, false, labelX, labelY, labelWidth, labelHeight);
    drawTextTag(grid, anchor.x, anchor.y, [relationship.toCardinality]);
  }
}
function cardinalityAnchor(path, width, atStart, labelX, labelY, labelWidth, labelHeight) {
  const point = atStart ? path[0] : path[path.length - 1];
  const neighbor = atStart ? path[1] : path[path.length - 2];
  const direction = directionBetween(point, neighbor) ?? "right";
  const horizontal = direction === "left" || direction === "right";
  const baseX = point.x + (horizontal ? direction === "right" ? 1 : -1 : 0);
  const baseY = point.y + (horizontal ? 0 : direction === "down" ? 1 : -1);
  const candidates = horizontal ? [
    { x: baseX, y: baseY - 1 },
    { x: baseX, y: baseY + 1 },
    { x: baseX, y: baseY - 2 },
    { x: baseX, y: baseY + 2 }
  ] : [
    { x: baseX + 1, y: baseY },
    { x: baseX - 1, y: baseY },
    { x: baseX + 1, y: baseY - 1 },
    { x: baseX + 1, y: baseY + 1 },
    { x: baseX - 1, y: baseY - 1 },
    { x: baseX - 1, y: baseY + 1 }
  ];
  for (const candidate of candidates) {
    if (!touchesLabel(candidate.x, width, candidate.y, 1, labelX, labelY, labelWidth, labelHeight))
      return candidate;
  }
  return candidates[0];
}
function touchesLabel(x, width, y, height, labelX, labelY, labelWidth, labelHeight) {
  if (labelWidth <= 0 || labelHeight <= 0)
    return false;
  const rowOverlap = y <= labelY + labelHeight - 1 && y + height - 1 >= labelY;
  if (!rowOverlap)
    return false;
  const clearX = x + width < labelX || x > labelX + labelWidth;
  return !clearX;
}
function drawTextTag(grid, x, y, lines) {
  lines.forEach((line, index) => {
    const row = y + index;
    if (grid.getCell(x - 1, row)?.char === " ")
      setCell(grid, x - 1, row, " ", "label");
    setText(grid, x, row, line, "label");
    const rightX = x + diagramTextWidth(line);
    if (grid.getCell(rightX, row)?.char === " ")
      setCell(grid, rightX, row, " ", "label");
  });
}
function setText(grid, x, y, text, style) {
  grid.setText(x, y, text, style);
}

// src/merman/core/mermaid.ts
import { decodeHTMLStrict } from "entities";
function* numberedMermaidLines(content) {
  const lines = content.split(/\r?\n/);
  for (let index = 0;index < lines.length; index += 1) {
    yield { lineNumber: index + 1, text: lines[index].trim() };
  }
}
function* meaningfulNumberedMermaidLines(content) {
  for (const line of numberedMermaidLines(content)) {
    if (line.text && !line.text.startsWith("%%"))
      yield line;
  }
}
function firstMeaningfulMermaidLine(content) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line && !line.startsWith("%%"))
      return line;
  }
  return;
}
function stripMermaidQuotes(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return decodeMermaidText(trimmed.slice(1, -1));
  }
  return decodeMermaidText(trimmed);
}
function decodeMermaidText(value) {
  return decodeHTMLStrict(value);
}

// src/merman/diagnostics.ts
class MermaidSyntaxError extends Error {
  kind;
  lineNumber;
  sourceLine;
  _tag = "MermaidSyntaxError";
  constructor(kind, lineNumber, sourceLine, reason = "Unsupported syntax") {
    super(`${reason} in ${kind} diagram at line ${lineNumber}: "${sourceLine}"`);
    this.kind = kind;
    this.lineNumber = lineNumber;
    this.sourceLine = sourceLine;
    this.name = "MermaidSyntaxError";
  }
}

// src/merman/class/parser.ts
var HEADER_RE = /^classDiagram(?:\s+(TB|BT|LR|RL))?$/i;
var DIRECTION_RE = /^direction\s+(TB|BT|LR|RL)$/i;
var ACCESSIBILITY_RE = /^acc(?:Title|Descr)(?::|\s|$)/i;
var CLASS_NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.\-~]*$/;
var ANNOTATION_RE = /^<<(.+?)>>\s+(.+)$/;
var STEREOTYPE_ONLY_RE = /^<<(.+?)>>$/;
var CLASS_LABEL_RE = /^([A-Za-z0-9_][A-Za-z0-9_.\-~]*)\s*\[(["'])(.+)\2\]$/;
var CLASS_NOTE_RE = /^note\s+for\s+(\S+)\s+(["'])(.+)\2$/i;
var RELATIONSHIP_OPERATOR_LIST = [
  { token: "<|--", kind: "inheritance", headAt: "from", dashed: false },
  { token: "--|>", kind: "inheritance", headAt: "to", dashed: false },
  { token: "<|..", kind: "realization", headAt: "from", dashed: true },
  { token: "..|>", kind: "realization", headAt: "to", dashed: true },
  { token: "*--", kind: "composition", headAt: "from", dashed: false },
  { token: "--*", kind: "composition", headAt: "to", dashed: false },
  { token: "o--", kind: "aggregation", headAt: "from", dashed: false },
  { token: "--o", kind: "aggregation", headAt: "to", dashed: false },
  { token: "-->", kind: "association", headAt: "to", dashed: false },
  { token: "<--", kind: "association", headAt: "from", dashed: false },
  { token: "..>", kind: "dependency", headAt: "to", dashed: true },
  { token: "<..", kind: "dependency", headAt: "from", dashed: true },
  { token: "--", kind: "link", headAt: "none", dashed: false },
  { token: "..", kind: "link", headAt: "none", dashed: true }
];
var RELATIONSHIP_OPERATORS = [...RELATIONSHIP_OPERATOR_LIST].sort((left, right) => right.token.length - left.token.length);
function isMermaidClassDiagram(content) {
  return HEADER_RE.test(firstMeaningfulMermaidLine(content) ?? "");
}
function parseMermaidClassDiagram(content) {
  const firstLine = firstMeaningfulMermaidLine(content);
  if (!HEADER_RE.test(firstLine ?? ""))
    throw syntaxError(1, firstLine ?? "", "Class diagram header is required");
  const classes = [];
  const byId = new Map;
  const relationships = [];
  let direction = "TB";
  let current;
  let inAccessibilityDescription = false;
  let lastLineNumber = 1;
  let lastLineText = firstLine ?? "";
  const ensureClass = (id) => {
    let definition = byId.get(id);
    if (!definition) {
      definition = { id, members: [] };
      byId.set(id, definition);
      classes.push(definition);
    }
    return definition;
  };
  for (const source of meaningfulNumberedMermaidLines(content)) {
    lastLineNumber = source.lineNumber;
    const line = stripComment(source.text);
    lastLineText = line;
    if (inAccessibilityDescription) {
      if (line === "}")
        inAccessibilityDescription = false;
      continue;
    }
    if (/^accDescr\s*\{$/i.test(line)) {
      inAccessibilityDescription = true;
      continue;
    }
    if (!line || ACCESSIBILITY_RE.test(line))
      continue;
    if (current) {
      if (line === "}") {
        current = undefined;
        continue;
      }
      const stereotype = line.match(STEREOTYPE_ONLY_RE);
      if (stereotype) {
        setStereotype(current, stereotype[1], source.lineNumber, line);
        continue;
      }
      current.members.push(parseMember(line));
      continue;
    }
    const header = line.match(HEADER_RE);
    if (header) {
      direction = header[1]?.toUpperCase() ?? direction;
      continue;
    }
    const directionMatch = line.match(DIRECTION_RE);
    if (directionMatch) {
      direction = directionMatch[1].toUpperCase();
      continue;
    }
    const noteMatch = line.match(CLASS_NOTE_RE);
    if (noteMatch) {
      const id = normalizeClassName(noteMatch[1]);
      if (!id)
        throw syntaxError(source.lineNumber, line, "Class note target is not a valid class name");
      const definition = ensureClass(id);
      definition.notes ??= [];
      definition.notes.push(stripMermaidQuotes(noteMatch[2] + noteMatch[3] + noteMatch[2]));
      continue;
    }
    const annotation = line.match(ANNOTATION_RE);
    if (annotation) {
      const id = normalizeClassName(annotation[2]);
      if (!id)
        throw syntaxError(source.lineNumber, line, "Class annotation target is not a valid class name");
      setStereotype(ensureClass(id), annotation[1], source.lineNumber, line);
      continue;
    }
    const classMatch = line.match(/^class\s+(.+)$/i);
    if (classMatch) {
      let raw = classMatch[1].trim();
      let openBody = false;
      if (raw.endsWith("{")) {
        openBody = true;
        raw = raw.slice(0, -1).trim();
      }
      const labelMatch = raw.match(CLASS_LABEL_RE);
      const id = normalizeClassName(labelMatch?.[1] ?? raw);
      if (!id)
        throw syntaxError(source.lineNumber, line, "Class name is not valid");
      const definition = ensureClass(id);
      if (labelMatch)
        definition.label = stripMermaidQuotes(labelMatch[2] + labelMatch[3] + labelMatch[2]);
      if (openBody)
        current = definition;
      continue;
    }
    const found = findOperator(line);
    if (found) {
      relationships.push(parseRelationship(line, found.operator, found.index, source.lineNumber, ensureClass));
      continue;
    }
    const colon = line.indexOf(":");
    if (colon > 0) {
      const id = normalizeClassName(line.slice(0, colon));
      if (id) {
        const right = line.slice(colon + 1).trim();
        const stereotype = right.match(STEREOTYPE_ONLY_RE);
        if (stereotype)
          setStereotype(ensureClass(id), stereotype[1], source.lineNumber, line);
        else if (right)
          ensureClass(id).members.push(parseMember(right));
        continue;
      }
    }
    throw syntaxError(source.lineNumber, line, unsupportedReason(line));
  }
  if (current)
    throw syntaxError(lastLineNumber, lastLineText, "Unclosed class body");
  return { direction, classes, relationships };
}
function parseMember(text) {
  const value = text.trim();
  return { text: value, method: value.includes("(") && value.includes(")") };
}
function setStereotype(definition, stereotype, lineNumber, line) {
  const value = stereotype.trim();
  if (!value)
    throw syntaxError(lineNumber, line, "Class stereotype cannot be empty");
  definition.stereotype = value;
}
function findOperator(line) {
  let quote;
  for (let index = 0;index < line.length; index++) {
    const char = line[index];
    if (char === '"' || char === "'") {
      if (quote === undefined)
        quote = char;
      else if (quote === char)
        quote = undefined;
      continue;
    }
    if (quote !== undefined)
      continue;
    for (const operator of RELATIONSHIP_OPERATORS) {
      if (line.startsWith(operator.token, index))
        return { operator, index };
    }
  }
  return;
}
function parseRelationship(line, operator, index, lineNumber, ensureClass) {
  const leftRaw = line.slice(0, index).trim();
  const rightRaw = line.slice(index + operator.token.length).trim();
  let targetPart = rightRaw;
  let label;
  const colon = rightRaw.indexOf(":");
  if (colon >= 0) {
    targetPart = rightRaw.slice(0, colon).trim();
    label = stripMermaidQuotes(rightRaw.slice(colon + 1).trim()) || undefined;
  }
  const from = splitSourceCardinality(leftRaw);
  const to = splitTargetCardinality(targetPart);
  if (!from.name)
    throw syntaxError(lineNumber, line, "Relationship source is missing");
  if (!to.name)
    throw syntaxError(lineNumber, line, "Relationship target is missing");
  const fromId = normalizeClassName(from.name);
  const toId = normalizeClassName(to.name);
  if (!fromId)
    throw syntaxError(lineNumber, line, "Relationship source is not a valid class name");
  if (!toId)
    throw syntaxError(lineNumber, line, "Relationship target is not a valid class name");
  ensureClass(fromId);
  ensureClass(toId);
  return {
    from: fromId,
    to: toId,
    kind: operator.kind,
    headAt: operator.headAt,
    dashed: operator.dashed,
    ...label === undefined ? {} : { label },
    ...from.cardinality === undefined ? {} : { fromCardinality: from.cardinality },
    ...to.cardinality === undefined ? {} : { toCardinality: to.cardinality }
  };
}
function splitSourceCardinality(value) {
  const match = value.match(/^(.*?)\s*(?:"([^"]*)"|'([^']*)')$/);
  if (match?.[1]?.trim())
    return { name: match[1].trim(), cardinality: match[2] ?? match[3] };
  return { name: value };
}
function splitTargetCardinality(value) {
  const match = value.match(/^(?:"([^"]*)"|'([^']*)')\s+(.+)$/);
  if (match)
    return { name: match[3].trim(), cardinality: match[1] ?? match[2] };
  return { name: value };
}
function normalizeClassName(raw) {
  const trimmed = raw.trim();
  if (!trimmed)
    return;
  const quoted = trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'");
  if (quoted) {
    const value = trimmed.slice(1, -1).trim();
    return value || undefined;
  }
  return CLASS_NAME_RE.test(trimmed) ? trimmed : undefined;
}
function stripComment(value) {
  let quote;
  for (let index = 0;index < value.length - 1; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && (quote === undefined || quote === char)) {
      quote = quote === char ? undefined : char;
      continue;
    }
    if (quote === undefined && char === "%" && value[index + 1] === "%")
      return value.slice(0, index).trim();
  }
  return value.trim();
}
function unsupportedReason(line) {
  const keyword = line.split(/[\s:{]/, 1)[0]?.toLowerCase() ?? "";
  switch (keyword) {
    case "note":
      return "Standalone class diagram notes are not supported";
    case "namespace":
      return "Class diagram namespaces are not supported";
    case "package":
      return "Class diagram packages are not supported";
    case "click":
    case "link":
    case "callback":
      return "Class diagram hyperlinks are not supported";
    case "style":
    case "classdef":
    case "cssclass":
      return "Class diagram styling is not supported";
    default:
      return "Unsupported class diagram syntax";
  }
}
function syntaxError(lineNumber, sourceLine, reason) {
  return new MermaidSyntaxError("classDiagram", lineNumber, sourceLine, reason);
}

// src/merman/core/render-grid.ts
import { StyledText as StyledText2 } from "@opentui/core";
function renderDiagramGridStyledText(grid, fg, bg, options) {
  const chunks = [];
  grid.forEachRun((run) => {
    chunks.push({
      __isChunk: true,
      text: run.text,
      fg: fg(run),
      bg: bg?.(run),
      attributes: options?.attributes?.(run)
    });
  }, () => {
    chunks.push({ __isChunk: true, text: `
` });
  }, options);
  return new StyledText2(chunks);
}
function renderDiagramGridStyledTextByStyle(grid, foregrounds, backgrounds, options) {
  const background = backgrounds && Object.values(backgrounds).some((value) => value !== undefined) ? (run) => run.style ? backgrounds[run.style] : undefined : undefined;
  return renderDiagramGridStyledText(grid, (run) => run.style ? foregrounds[run.style] : undefined, background, options);
}

// src/merman/class/render-grid.ts
function renderClassGridStyledText(grid, colors) {
  return renderDiagramGridStyledText(grid, (run) => run.style ? colors[run.style] : undefined, undefined, {
    trimTop: true,
    trimBottom: true
  });
}

// src/merman/core/color/style.ts
import { RGBA as RGBA3 } from "@opentui/core";
var DIAGRAM_FADE_STEPS = [1, 2, 3, 4, 5];
function numberedStyleKeys(prefix, steps) {
  return steps.map((step) => `${prefix}${step}`);
}
function rgba(rgb) {
  return RGBA3.fromInts(rgb[0], rgb[1], rgb[2], 255);
}
function blendColor(from, to, amount) {
  if (!from && !to)
    return;
  if (!from)
    return to;
  if (!to)
    return from;
  const [fromR, fromG, fromB, fromA] = from.toInts();
  const [toR, toG, toB, toA] = to.toInts();
  const mix = (left, right) => left + (right - left) * amount;
  return RGBA3.fromInts(mix(fromR, toR), mix(fromG, toG), mix(fromB, toB), mix(fromA, toA));
}
function createColorRampTheme(styles, from, to) {
  return Object.fromEntries(styles.map((style, index) => [style, blendColor(from, to, (index + 1) / (styles.length + 1))]));
}

// src/merman/class/style.ts
var DEFAULT_THEME_RGB = {
  border: [141, 169, 155],
  title: [228, 239, 232],
  stereotype: [154, 184, 169],
  member: [215, 229, 221],
  edge: [134, 225, 200],
  label: [134, 225, 200]
};
function resolveClassStyleColors(colors = {}) {
  return {
    border: colors.border ?? rgba(DEFAULT_THEME_RGB.border),
    title: colors.title ?? rgba(DEFAULT_THEME_RGB.title),
    stereotype: colors.stereotype ?? colors.title ?? rgba(DEFAULT_THEME_RGB.stereotype),
    member: colors.member ?? rgba(DEFAULT_THEME_RGB.member),
    edge: colors.edge ?? rgba(DEFAULT_THEME_RGB.edge),
    label: colors.label ?? colors.edge ?? rgba(DEFAULT_THEME_RGB.label)
  };
}

// src/merman/flowchart/parser.ts
var DEFAULT_DIRECTION = "TD";
var FLOWCHART_HEADER_RE = /^(flowchart|graph)(?:\s+(TB|TD|BT|LR|RL))?$/i;
var ID_RE = "[A-Za-z_][A-Za-z0-9_.-]*";
var SUBGRAPH_RE = /^subgraph\s+(.+)$/i;
var SUBGRAPH_WITH_LABEL_RE = new RegExp(`^(${ID_RE})\\s*\\[(.+)\\]$`);
var SUBGRAPH_DIRECTION_RE = /^direction\s+(TB|TD|BT|LR|RL)$/i;
var IGNORED_PRESENTATION_RE = /^(?:classDef|class|style|linkStyle)\b/i;
var DATABASE_NODE_RE = new RegExp(`^(${ID_RE})\\[\\((.+)\\)\\]$`);
var SUBROUTINE_NODE_RE = new RegExp(`^(${ID_RE})\\[\\[(.+)\\]\\]$`);
var ROUNDED_BRACKET_NODE_RE = new RegExp(`^(${ID_RE})\\(\\[(.+)\\]\\)$`);
var ROUNDED_NODE_RE = new RegExp(`^(${ID_RE})\\((.+)\\)$`);
var HEXAGON_NODE_RE = new RegExp(`^(${ID_RE})\\{\\{(.+)\\}\\}$`);
var PARALLELOGRAM_NODE_RE = new RegExp(`^(${ID_RE})\\[/(.+)/\\]$`);
var DECISION_NODE_RE = new RegExp(`^(${ID_RE})\\{(.+)\\}$`);
var BOX_NODE_RE = new RegExp(`^(${ID_RE})\\[(.+)\\]$`);
var ID_ONLY_RE = new RegExp(`^${ID_RE}$`);
var EXPLICIT_NODE_SHAPE_RE = new RegExp(`^${ID_RE}(?:\\[|\\(|\\{)`);
var CIRCLE_NODE_RE = new RegExp(`^(${ID_RE})\\(\\((.+)\\)\\)$`);
var MAX_FLOWCHART_LINE_LENGTH = 1e4;
var EDGE_OPERATOR_RE = /(-\.(?!->)(.+?)\.(?:->|-))|(--|==|-\.)\s+(.+?)\s+(-->|==>|\.->|-\.->|\.-)|(<-->|-->|==>|-\.->|---|~~~)\s*(?:\|([^|]*)\|\s*)?/dg;
function normalizeDirection(value) {
  const upper = value?.toUpperCase();
  if (upper === "TB" || upper === "TD" || upper === "BT" || upper === "LR" || upper === "RL")
    return upper;
  return DEFAULT_DIRECTION;
}
function normalizeSubgraphId(value, index) {
  const stripped = stripMermaidQuotes(value);
  return ID_ONLY_RE.test(stripped) ? stripped : `subgraph_${index + 1}`;
}
function parseSubgraphToken(token, index) {
  const trimmed = token.trim().replace(/\s*:::.*$/, "").replace(/;$/, "");
  const withLabel = trimmed.match(SUBGRAPH_WITH_LABEL_RE);
  if (withLabel) {
    return { id: withLabel[1], label: stripMermaidQuotes(withLabel[2]) };
  }
  const label = stripMermaidQuotes(trimmed);
  return { id: normalizeSubgraphId(trimmed, index), label };
}
function parseNodeToken(token) {
  const trimmed = token.trim().replace(/;$/, "");
  const database = trimmed.match(DATABASE_NODE_RE);
  if (database)
    return { id: database[1], label: stripMermaidQuotes(database[2]), shape: "database" };
  const subroutine = trimmed.match(SUBROUTINE_NODE_RE);
  if (subroutine)
    return { id: subroutine[1], label: stripMermaidQuotes(subroutine[2]), shape: "subroutine" };
  const roundedBracket = trimmed.match(ROUNDED_BRACKET_NODE_RE);
  if (roundedBracket)
    return { id: roundedBracket[1], label: stripMermaidQuotes(roundedBracket[2]), shape: "rounded" };
  const circle = trimmed.match(CIRCLE_NODE_RE);
  if (circle)
    return { id: circle[1], label: stripMermaidQuotes(circle[2]), shape: "circle" };
  const rounded = trimmed.match(ROUNDED_NODE_RE);
  if (rounded)
    return { id: rounded[1], label: stripMermaidQuotes(rounded[2]), shape: "rounded" };
  const hexagon = trimmed.match(HEXAGON_NODE_RE);
  if (hexagon)
    return { id: hexagon[1], label: stripMermaidQuotes(hexagon[2]), shape: "hexagon" };
  const parallelogram = trimmed.match(PARALLELOGRAM_NODE_RE);
  if (parallelogram)
    return { id: parallelogram[1], label: stripMermaidQuotes(parallelogram[2]), shape: "parallelogram" };
  const decision = trimmed.match(DECISION_NODE_RE);
  if (decision)
    return { id: decision[1], label: stripMermaidQuotes(decision[2]), shape: "decision" };
  const box = trimmed.match(BOX_NODE_RE);
  if (box)
    return { id: box[1], label: stripMermaidQuotes(box[2]), shape: "box" };
  return { id: trimmed, label: trimmed, shape: "box" };
}
function isSupportedNodeToken(token) {
  const trimmed = stripNodeToken(token);
  return ID_ONLY_RE.test(trimmed) || DATABASE_NODE_RE.test(trimmed) || SUBROUTINE_NODE_RE.test(trimmed) || ROUNDED_BRACKET_NODE_RE.test(trimmed) || CIRCLE_NODE_RE.test(trimmed) || ROUNDED_NODE_RE.test(trimmed) || HEXAGON_NODE_RE.test(trimmed) || PARALLELOGRAM_NODE_RE.test(trimmed) || DECISION_NODE_RE.test(trimmed) || BOX_NODE_RE.test(trimmed);
}
function hasExplicitNodeShape(token) {
  return EXPLICIT_NODE_SHAPE_RE.test(token.trim());
}
function ensureNode(nodes, token) {
  const node = parseNodeToken(token);
  const existing = nodes.get(node.id);
  if (!existing) {
    nodes.set(node.id, node);
    return node;
  }
  if (hasExplicitNodeShape(token)) {
    existing.label = node.label;
    existing.shape = node.shape;
  }
  return existing;
}
function addNodeToSubgraph(subgraph, nodeId) {
  if (!subgraph || subgraph.nodeIds.includes(nodeId))
    return;
  subgraph.nodeIds.push(nodeId);
}
function stripNodeToken(token) {
  return token.replace(/\s*:::.*$/, "").replace(/;$/, "").trim();
}
function splitNodeGroup(token) {
  const groups = [];
  const stack = [];
  let quote;
  let start = 0;
  const closes = { "[": "]", "(": ")", "{": "}" };
  for (let index = 0;index < token.length; index++) {
    const character = token[index];
    if (quote) {
      if (character === quote && token[index - 1] !== "\\")
        quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character in closes) {
      stack.push(character);
      continue;
    }
    if (stack.length > 0 && character === closes[stack.at(-1)]) {
      stack.pop();
      continue;
    }
    if (stack.length === 0 && character === "&") {
      groups.push(token.slice(start, index));
      start = index + 1;
    }
  }
  groups.push(token.slice(start));
  return groups;
}
function edgeStyleFromArrow(...arrows) {
  if (arrows.some((arrow) => arrow.includes("==")))
    return "thick";
  if (arrows.some((arrow) => arrow.includes(".")))
    return "dashed";
  return;
}
function createEdge(from, to, label, style, arrowhead, sourceArrowhead) {
  const edge = style ? { from, to, label, style } : { from, to, label };
  if (!arrowhead)
    edge.arrowhead = false;
  if (sourceArrowhead)
    edge.sourceArrowhead = true;
  return edge;
}
function parseEdgeOperators(line) {
  return [...maskNodeLabelOperators(line).matchAll(EDGE_OPERATOR_RE)].map((match) => {
    const inlineDashedArrow = match[1];
    const startArrow = inlineDashedArrow ?? match[3] ?? match[6];
    const endArrow = inlineDashedArrow ?? match[5] ?? match[6];
    const labelGroup = match[2] ? 2 : match[4] ? 4 : match[7] ? 7 : undefined;
    const labelRange = labelGroup === undefined ? undefined : match.indices?.[labelGroup];
    return {
      index: match.index,
      end: match.index + match[0].length,
      label: stripMermaidQuotes(labelRange ? line.slice(labelRange[0], labelRange[1]) : ""),
      style: edgeStyleFromArrow(startArrow, endArrow),
      arrowhead: endArrow === "~~~" || endArrow.endsWith(">"),
      sourceArrowhead: startArrow.startsWith("<"),
      orderOnly: endArrow === "~~~"
    };
  });
}
function maskNodeLabelOperators(line) {
  const characters = line.split("");
  const stack = [];
  let quote;
  const closes = { "[": "]", "(": ")", "{": "}" };
  for (let index = 0;index < characters.length; index++) {
    const character = characters[index];
    if (quote) {
      if (character === quote && characters[index - 1] !== "\\")
        quote = undefined;
      else if (/[<>=.-]/.test(character))
        characters[index] = " ";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character in closes) {
      stack.push(character);
      continue;
    }
    if (stack.length > 0 && character === closes[stack.at(-1)]) {
      stack.pop();
      continue;
    }
    if (stack.length > 0 && /[<>=.-]/.test(character))
      characters[index] = " ";
  }
  return characters.join("");
}
function splitStatements(line) {
  const statements = [];
  const stack = [];
  let quote;
  let edgeLabel = false;
  const closes = { "[": "]", "(": ")", "{": "}" };
  let start = 0;
  for (let index = 0;index < line.length; index++) {
    const character = line[index];
    if (quote) {
      if (character === quote && line[index - 1] !== "\\")
        quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character in closes) {
      stack.push(character);
      continue;
    }
    if (stack.length > 0 && character === closes[stack.at(-1)]) {
      stack.pop();
      continue;
    }
    if (stack.length === 0 && character === "|") {
      edgeLabel = !edgeLabel;
      continue;
    }
    if (character === ";" && stack.length === 0 && !edgeLabel) {
      const statement = line.slice(start, index).trim();
      if (statement)
        statements.push(statement);
      start = index + 1;
    }
  }
  const last = line.slice(start).trim();
  if (last)
    statements.push(last);
  return statements;
}
function stripInlineComment(line) {
  const stack = [];
  let quote;
  let edgeLabel = false;
  const closes = { "[": "]", "(": ")", "{": "}" };
  for (let index = 0;index < line.length - 1; index++) {
    const character = line[index];
    if (quote) {
      if (character === quote && line[index - 1] !== "\\")
        quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character in closes) {
      stack.push(character);
      continue;
    }
    if (stack.length && character === closes[stack.at(-1)]) {
      stack.pop();
      continue;
    }
    if (character === "|" && stack.length === 0) {
      edgeLabel = !edgeLabel;
      continue;
    }
    if (character === "%" && line[index + 1] === "%" && stack.length === 0 && !edgeLabel) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}
function* flowchartStatements(content) {
  for (const source of meaningfulNumberedMermaidLines(content)) {
    if (source.text.length > MAX_FLOWCHART_LINE_LENGTH) {
      throw new MermaidSyntaxError("flowchart", source.lineNumber, source.text, "Flowchart statement is too long");
    }
    for (const text of splitStatements(stripInlineComment(source.text))) {
      if (IGNORED_PRESENTATION_RE.test(text))
        break;
      yield { ...source, text };
    }
  }
}
function isMermaidFlowchartDiagram(content) {
  const first = stripInlineComment(firstMeaningfulMermaidLine(content) ?? "").trim();
  return FLOWCHART_HEADER_RE.test(first) || first.includes(";") && FLOWCHART_HEADER_RE.test(splitStatements(first)[0] ?? "");
}
function parseMermaidFlowchartDiagram(content) {
  const nodes = new Map;
  const edges = [];
  const subgraphs = [];
  const subgraphStack = [];
  let direction = DEFAULT_DIRECTION;
  for (const source of flowchartStatements(content)) {
    const line = source.text;
    const header = line.match(FLOWCHART_HEADER_RE);
    if (header) {
      direction = normalizeDirection(header[2]);
      continue;
    }
    if (IGNORED_PRESENTATION_RE.test(line))
      continue;
    const subgraphMatch = line.match(SUBGRAPH_RE);
    if (subgraphMatch) {
      const parsed = parseSubgraphToken(subgraphMatch[1], subgraphs.length);
      const subgraph = {
        ...parsed,
        nodeIds: [],
        parentId: subgraphStack[subgraphStack.length - 1]?.subgraph.id
      };
      subgraphs.push(subgraph);
      subgraphStack.push({ subgraph, lineNumber: source.lineNumber, sourceLine: line });
      continue;
    }
    if (/^end$/i.test(line)) {
      if (subgraphStack.length === 0) {
        throw new MermaidSyntaxError("flowchart", source.lineNumber, line, 'Unexpected "end" without an open subgraph');
      }
      subgraphStack.pop();
      continue;
    }
    const currentSubgraph = subgraphStack[subgraphStack.length - 1]?.subgraph;
    const subgraphDirection = line.match(SUBGRAPH_DIRECTION_RE);
    if (subgraphDirection) {
      if (!currentSubgraph) {
        throw new MermaidSyntaxError("flowchart", source.lineNumber, line, 'A "direction" statement requires an open subgraph');
      }
      currentSubgraph.direction = normalizeDirection(subgraphDirection[1]);
      continue;
    }
    const edgeOperators = parseEdgeOperators(line);
    if (edgeOperators.length > 0) {
      const nodeGroups = [
        line.slice(0, edgeOperators[0].index),
        ...edgeOperators.map((operator, index) => line.slice(operator.end, edgeOperators[index + 1]?.index ?? line.length))
      ].map((group) => splitNodeGroup(group).map(stripNodeToken));
      if (nodeGroups.every((group) => group.every((token) => token.length > 0))) {
        const unsupportedEndpoint = nodeGroups.find((group, index) => {
          const orderOnlyEndpoint = edgeOperators[index - 1]?.orderOnly || edgeOperators[index]?.orderOnly;
          return group.some((stripped) => !(orderOnlyEndpoint && subgraphs.some((subgraph) => subgraph.id === stripped)) && !isSupportedNodeToken(stripped));
        });
        if (unsupportedEndpoint)
          throw new MermaidSyntaxError("flowchart", source.lineNumber, line);
        const chainNodeIds = nodeGroups.map((group, index) => {
          const orderOnlyEndpoint = edgeOperators[index - 1]?.orderOnly || edgeOperators[index]?.orderOnly;
          return group.map((stripped) => {
            if (orderOnlyEndpoint && subgraphs.some((subgraph) => subgraph.id === stripped))
              return stripped;
            return ensureNode(nodes, stripped).id;
          });
        });
        for (const nodeId of chainNodeIds.flat()) {
          if (nodes.has(nodeId))
            addNodeToSubgraph(currentSubgraph, nodeId);
        }
        for (let index = 0;index < edgeOperators.length; index++) {
          const operator = edgeOperators[index];
          for (const from of chainNodeIds[index]) {
            for (const to of chainNodeIds[index + 1]) {
              const edge = createEdge(from, to, operator.label, operator.style, operator.arrowhead, operator.sourceArrowhead);
              edges.push(operator.orderOnly ? { ...edge, orderOnly: true } : edge);
            }
          }
        }
        continue;
      }
    }
    const nodeGroup = splitNodeGroup(line);
    if (nodeGroup.every(isSupportedNodeToken)) {
      for (const token of nodeGroup)
        addNodeToSubgraph(currentSubgraph, ensureNode(nodes, stripNodeToken(token)).id);
      continue;
    }
    throw new MermaidSyntaxError("flowchart", source.lineNumber, line);
  }
  const unclosedSubgraph = subgraphStack[subgraphStack.length - 1];
  if (unclosedSubgraph) {
    throw new MermaidSyntaxError("flowchart", unclosedSubgraph.lineNumber, unclosedSubgraph.sourceLine, 'Unclosed subgraph; expected "end"');
  }
  return { direction, nodes: [...nodes.values()], edges, subgraphs };
}

// src/merman/gantt/parser.ts
var HEADER_RE2 = /^gantt$/i;
var DIRECTIVE_RE = /^(title|dateFormat|axisFormat|tickInterval|excludes|todayMarker)\s+(.+)$/i;
var SECTION_RE = /^section(?:\s+(.+))?$/i;
var ACCESSIBILITY_RE2 = /^acc(?:Title|Descr)(?::|\s|$)/i;
var TASK_STATES = new Set(["active", "done", "crit", "milestone", "vert"]);
function isMermaidGanttDiagram(content) {
  return HEADER_RE2.test(firstMeaningfulMermaidLine(content) ?? "");
}
function parseMermaidGanttDiagram(content) {
  const tasks = [];
  const entries = [];
  const tasksById = new Map;
  let title;
  let dateFormat = "YYYY-MM-DD";
  let axisFormat = "%Y-%m-%d";
  let explicitAxisFormat = false;
  let tickInterval;
  let section;
  let headerSeen = false;
  let inAccessibilityDescription = false;
  for (const source of meaningfulNumberedMermaidLines(content)) {
    const line = stripComment2(source.text);
    if (inAccessibilityDescription) {
      if (line === "}")
        inAccessibilityDescription = false;
      continue;
    }
    if (/^accDescr\s*\{$/i.test(line)) {
      inAccessibilityDescription = true;
      continue;
    }
    if (ACCESSIBILITY_RE2.test(line))
      continue;
    if (!line)
      continue;
    if (HEADER_RE2.test(line)) {
      if (headerSeen)
        throw syntaxError2(source.lineNumber, line, "Gantt header can only appear once");
      headerSeen = true;
      continue;
    }
    if (!headerSeen)
      throw syntaxError2(source.lineNumber, line, "Gantt header is required");
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      if (!sectionMatch[1])
        throw syntaxError2(source.lineNumber, line, "Gantt section cannot be empty");
      section = { label: stripMermaidQuotes(sectionMatch[1]) };
      entries.push({ type: "section", section });
      continue;
    }
    const directive = line.match(DIRECTIVE_RE);
    if (directive) {
      const name = directive[1].toLowerCase();
      const value = directive[2].trim();
      if (name === "title")
        title = stripMermaidQuotes(value);
      if (name === "dateformat") {
        dateFormat = value;
        if (!explicitAxisFormat && (value === "HH:mm" || value === "HH:mm:ss")) {
          axisFormat = value === "HH:mm" ? "%H:%M" : "%H:%M:%S";
        }
      }
      if (name === "axisformat") {
        axisFormat = value;
        explicitAxisFormat = true;
      }
      if (name === "tickinterval") {
        const duration = value.match(/^(\d+)\s*(ms|s|m|h|d|w|seconds?|minutes?|hours?|days?|weeks?)$/i);
        const units = {
          ms: 1,
          s: 1000,
          m: 60000,
          h: 3600000,
          d: 86400000,
          w: 604800000,
          second: 1000,
          minute: 60000,
          hour: 3600000,
          day: 86400000,
          week: 604800000
        };
        if (!duration || Number(duration[1]) <= 0)
          throw syntaxError2(source.lineNumber, line, `Unsupported tick interval "${value}"`);
        const unit = duration[2].toLowerCase();
        tickInterval = Number(duration[1]) * (units[unit] ?? units[unit.slice(0, -1)]);
        if (!Number.isSafeInteger(tickInterval))
          throw syntaxError2(source.lineNumber, line, `Unsupported tick interval "${value}"`);
      }
      if (!["title", "dateformat", "axisformat", "tickinterval"].includes(name)) {
        throw syntaxError2(source.lineNumber, line, `${directive[1]} is not supported`);
      }
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 1)
      throw syntaxError2(source.lineNumber, line);
    const label = stripMermaidQuotes(line.slice(0, separator));
    const fields = line.slice(separator + 1).split(",").map((field) => field.trim()).filter(Boolean);
    const flags = new Set;
    while (fields[0] && TASK_STATES.has(fields[0].toLowerCase()))
      flags.add(fields.shift().toLowerCase());
    if (fields.length < 2 || fields.length > 3) {
      throw syntaxError2(source.lineNumber, line, "Gantt tasks require a start and end or duration");
    }
    const id = fields.length === 3 ? fields.shift() : undefined;
    if (id && tasksById.has(id))
      throw syntaxError2(source.lineNumber, line, `Duplicate task id "${id}"`);
    const start = parseStart(fields[0], dateFormat, tasksById, source.lineNumber, line);
    const end = parseEnd(fields[1], start, dateFormat, source.lineNumber, line);
    if (end < start)
      throw syntaxError2(source.lineNumber, line, "Gantt task cannot end before it starts");
    const task = {
      label,
      ...id ? { id } : {},
      ...section ? { section } : {},
      start,
      end,
      state: taskState(flags)
    };
    tasks.push(task);
    entries.push({ type: "task", task });
    if (id)
      tasksById.set(id, task);
  }
  if (!headerSeen)
    throw new MermaidSyntaxError("gantt", 1, "", "Gantt header is required");
  return {
    ...title === undefined ? {} : { title },
    dateFormat,
    axisFormat,
    ...tickInterval === undefined ? {} : { tickInterval },
    tasks,
    entries
  };
}
function parseStart(value, format, tasksById, lineNumber, sourceLine) {
  const relative = value.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i);
  if (relative && (format === "HH:mm" || format === "HH:mm:ss")) {
    const units = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    return Date.UTC(1970, 0, 1) + Number(relative[1]) * units[relative[2].toLowerCase()];
  }
  if (!/^after\s+/i.test(value))
    return parseDate(value, format, lineNumber, sourceLine);
  const dependencies = value.replace(/^after\s+/i, "").trim().split(/\s+/);
  const tasks = dependencies.map((id) => tasksById.get(id));
  const missing = dependencies.find((_, index) => !tasks[index]);
  if (missing)
    throw syntaxError2(lineNumber, sourceLine, `Unknown Gantt task id "${missing}"`);
  return Math.max(...tasks.map((task) => task.end));
}
function parseEnd(value, start, format, lineNumber, sourceLine) {
  const duration = value.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i);
  if (!duration)
    return parseDate(value, format, lineNumber, sourceLine);
  const units = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return start + Number(duration[1]) * units[duration[2].toLowerCase()];
}
function parseDate(value, format, lineNumber, sourceLine) {
  const numeric = Number(value);
  if (format === "s" && Number.isFinite(numeric))
    return numeric * 1000;
  if (format === "X" && Number.isFinite(numeric))
    return numeric * 1000;
  if (format === "x" && Number.isFinite(numeric))
    return numeric;
  const clock = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (clock && ["HH:mm", "HH:mm:ss"].includes(format)) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    const seconds = Number(clock[3] ?? 0);
    if (hours < 24 && minutes < 60 && seconds < 60 && format === "HH:mm:ss" === (clock[3] !== undefined)) {
      return Date.UTC(1970, 0, 1, hours, minutes, seconds);
    }
  }
  const calendar = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (calendar && ["YYYY-MM-DD", "YYYY-MM-DD HH:mm", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss"].includes(format)) {
    return Date.UTC(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]), Number(calendar[4] ?? 0), Number(calendar[5] ?? 0), Number(calendar[6] ?? 0));
  }
  throw syntaxError2(lineNumber, sourceLine, `Unsupported date "${value}" for dateFormat ${format}`);
}
function taskState(flags) {
  if (flags.has("milestone"))
    return "milestone";
  if (flags.has("crit"))
    return "critical";
  if (flags.has("done"))
    return "done";
  if (flags.has("active"))
    return "active";
  return "task";
}
function stripComment2(value) {
  const comment = value.indexOf("%%");
  return (comment < 0 ? value : value.slice(0, comment)).trim();
}
function syntaxError2(lineNumber, sourceLine, reason) {
  return new MermaidSyntaxError("gantt", lineNumber, sourceLine, reason);
}

// src/merman/gitgraph/parser.ts
var HEADER_RE3 = /^gitGraph(?:\s+(LR|TB|BT))?\s*:?$/i;
var ACCESSIBILITY_RE3 = /^acc(?:Title|Descr)(?::|\s|$)/i;
function isMermaidGitGraphDiagram(content) {
  return HEADER_RE3.test(firstMeaningfulMermaidLine(content) ?? "");
}
function parseMermaidGitGraphDiagram(content) {
  const firstLine = firstMeaningfulMermaidLine(content);
  if (!HEADER_RE3.test(firstLine ?? ""))
    throw syntaxError3(1, firstLine ?? "", "GitGraph header is required");
  const branches = [{ name: "main", order: 0 }];
  const commits = [];
  const heads = new Map([["main", undefined]]);
  const ids = new Set;
  let direction = "LR";
  let currentBranch = "main";
  let generatedId = 1;
  let inAccessibilityDescription = false;
  let headerSeen = false;
  const nextId = () => {
    while (ids.has(`commit-${generatedId}`))
      generatedId++;
    return `commit-${generatedId++}`;
  };
  for (const source of meaningfulNumberedMermaidLines(content)) {
    const line = stripComment3(source.text);
    if (inAccessibilityDescription) {
      if (line === "}")
        inAccessibilityDescription = false;
      continue;
    }
    if (/^accDescr\s*\{$/i.test(line)) {
      inAccessibilityDescription = true;
      continue;
    }
    if (!line || ACCESSIBILITY_RE3.test(line) || /^title(?:\s|$)/i.test(line))
      continue;
    const header = line.match(HEADER_RE3);
    if (header) {
      if (headerSeen)
        throw syntaxError3(source.lineNumber, line, "GitGraph header can only appear once");
      headerSeen = true;
      direction = header[1]?.toUpperCase() ?? "LR";
      continue;
    }
    const [command = "", ...rest] = tokenize(line);
    const operation = command.toLowerCase();
    if (operation === "commit") {
      const shorthandMessage = rest[0]?.match(/^(["']).*\1$/) ? stripMermaidQuotes(rest.shift()) : undefined;
      const attributes = parseAttributes(rest, source.lineNumber, line, ["id", "msg", "tag", "type"]);
      const id = single(attributes, "id", source.lineNumber, line) ?? nextId();
      if (!id)
        throw syntaxError3(source.lineNumber, line, "GitGraph commit id cannot be empty");
      if (ids.has(id))
        throw syntaxError3(source.lineNumber, line, `Duplicate commit id "${id}"`);
      const type = parseCommitType(single(attributes, "type", source.lineNumber, line), source.lineNumber, line);
      const parent = heads.get(currentBranch);
      const message = single(attributes, "msg", source.lineNumber, line) ?? shorthandMessage;
      const commit = {
        id,
        ...message === undefined ? {} : { message },
        tags: attributes.get("tag") ?? [],
        type,
        branch: currentBranch,
        parents: parent === undefined ? [] : [parent]
      };
      commits.push(commit);
      ids.add(id);
      heads.set(currentBranch, id);
      continue;
    }
    if (operation === "branch") {
      if (rest.length === 0)
        throw syntaxError3(source.lineNumber, line, "GitGraph branch name cannot be empty");
      const name = stripMermaidQuotes(rest[0]);
      if (!name)
        throw syntaxError3(source.lineNumber, line, "GitGraph branch name cannot be empty");
      if (heads.has(name))
        throw syntaxError3(source.lineNumber, line, `Duplicate branch "${name}"`);
      const attributes = parseAttributes(rest.slice(1), source.lineNumber, line, ["order"]);
      const orderValue = single(attributes, "order", source.lineNumber, line);
      const order = orderValue === undefined ? undefined : Number(orderValue);
      if (order !== undefined && (!Number.isInteger(order) || order < 0)) {
        throw syntaxError3(source.lineNumber, line, "GitGraph branch order must be a non-negative integer");
      }
      branches.push({ name, ...order === undefined ? {} : { order } });
      heads.set(name, heads.get(currentBranch));
      currentBranch = name;
      continue;
    }
    if (operation === "checkout" || operation === "switch") {
      if (rest.length !== 1)
        throw syntaxError3(source.lineNumber, line, `GitGraph ${operation} requires one branch`);
      const name = stripMermaidQuotes(rest[0]);
      if (!heads.has(name))
        throw syntaxError3(source.lineNumber, line, `Unknown branch "${name}"`);
      currentBranch = name;
      continue;
    }
    if (operation === "merge") {
      if (rest.length === 0)
        throw syntaxError3(source.lineNumber, line, "GitGraph merge requires a branch");
      const branch = stripMermaidQuotes(rest[0]);
      if (!heads.has(branch))
        throw syntaxError3(source.lineNumber, line, `Unknown branch "${branch}"`);
      if (branch === currentBranch)
        throw syntaxError3(source.lineNumber, line, "GitGraph cannot merge a branch into itself");
      const currentHead = heads.get(currentBranch);
      const mergedHead = heads.get(branch);
      if (currentHead === undefined)
        throw syntaxError3(source.lineNumber, line, `Branch "${currentBranch}" has no commits`);
      if (mergedHead === undefined)
        throw syntaxError3(source.lineNumber, line, `Branch "${branch}" has no commits`);
      if (currentHead === mergedHead)
        throw syntaxError3(source.lineNumber, line, `Branches already share head "${mergedHead}"`);
      const attributes = parseAttributes(rest.slice(1), source.lineNumber, line, ["id", "tag", "type"]);
      const id = single(attributes, "id", source.lineNumber, line) ?? nextId();
      if (ids.has(id))
        throw syntaxError3(source.lineNumber, line, `Duplicate commit id "${id}"`);
      const commit = {
        id,
        tags: attributes.get("tag") ?? [],
        type: parseCommitType(single(attributes, "type", source.lineNumber, line), source.lineNumber, line),
        branch: currentBranch,
        parents: [currentHead, mergedHead]
      };
      commits.push(commit);
      ids.add(id);
      heads.set(currentBranch, id);
      continue;
    }
    if (operation === "cherry-pick") {
      const attributes = parseAttributes(rest, source.lineNumber, line, ["id"]);
      const sourceId = single(attributes, "id", source.lineNumber, line);
      const picked = commits.find((commit) => commit.id === sourceId);
      if (!picked)
        throw syntaxError3(source.lineNumber, line, `Unknown cherry-pick commit "${sourceId ?? ""}"`);
      const parent = heads.get(currentBranch);
      if (!parent)
        throw syntaxError3(source.lineNumber, line, `Branch "${currentBranch}" has no commits`);
      const id = nextId();
      commits.push({
        id,
        message: picked.message ?? `cherry-pick ${picked.id}`,
        tags: [],
        type: "NORMAL",
        branch: currentBranch,
        parents: [parent]
      });
      ids.add(id);
      heads.set(currentBranch, id);
      continue;
    }
    throw syntaxError3(source.lineNumber, line);
  }
  const resolvedBranches = branches.map((branch) => {
    const head = heads.get(branch.name);
    return { ...branch, ...head === undefined ? {} : { head } };
  });
  return { direction, branches: orderBranches(resolvedBranches), commits };
}
function tokenize(line) {
  const tokens = [];
  let token = "";
  let quote;
  for (const char of line) {
    if ((char === '"' || char === "'") && (quote === undefined || quote === char)) {
      quote = quote === char ? undefined : char;
      token += char;
      continue;
    }
    if (/\s/.test(char) && quote === undefined) {
      if (token)
        tokens.push(token);
      token = "";
      continue;
    }
    token += char;
  }
  if (quote !== undefined)
    return [line];
  if (token)
    tokens.push(token);
  return tokens;
}
function parseAttributes(tokens, lineNumber, line, allowed) {
  const result = new Map;
  for (let index = 0;index < tokens.length; index += 1) {
    const keyToken = tokens[index];
    const separator = keyToken.indexOf(":");
    const key = (separator < 0 ? keyToken : keyToken.slice(0, separator)).toLowerCase();
    if (!allowed.includes(key))
      throw syntaxError3(lineNumber, line, `Unsupported GitGraph attribute "${key}"`);
    const inline = separator < 0 ? "" : keyToken.slice(separator + 1);
    const valueToken = inline || tokens[++index];
    if (valueToken === undefined)
      throw syntaxError3(lineNumber, line, `GitGraph attribute "${key}" requires a value`);
    const values = result.get(key) ?? [];
    values.push(stripMermaidQuotes(valueToken));
    result.set(key, values);
  }
  return result;
}
function single(attributes, key, lineNumber, line) {
  const values = attributes.get(key);
  if (values && values.length > 1)
    throw syntaxError3(lineNumber, line, `GitGraph attribute "${key}" cannot repeat`);
  return values?.[0];
}
function parseCommitType(value, lineNumber, line) {
  if (value === undefined)
    return "NORMAL";
  const type = value.toUpperCase();
  if (type === "NORMAL" || type === "REVERSE" || type === "HIGHLIGHT")
    return type;
  throw syntaxError3(lineNumber, line, `Unknown GitGraph commit type "${value}"`);
}
function orderBranches(branches) {
  const main = branches[0];
  const rest = branches.slice(1).map((branch, index) => ({ branch, index }));
  const unordered = rest.filter(({ branch }) => branch.order === undefined);
  const ordered = rest.filter(({ branch }) => branch.order !== undefined).sort((left, right) => left.branch.order - right.branch.order || left.index - right.index);
  return [main, ...unordered.map(({ branch }) => branch), ...ordered.map(({ branch }) => branch)];
}
function stripComment3(value) {
  let quote;
  for (let index = 0;index < value.length - 1; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && (quote === undefined || quote === char)) {
      quote = quote === char ? undefined : char;
      continue;
    }
    if (quote === undefined && char === "%" && value[index + 1] === "%")
      return value.slice(0, index).trim();
  }
  return value.trim();
}
function syntaxError3(lineNumber, sourceLine, reason) {
  return new MermaidSyntaxError("gitGraph", lineNumber, sourceLine, reason);
}

// src/merman/sequence/parser.ts
var MESSAGE_RE = /^(.+?)\s*(-->>|->>|--x|-x|--\)|-\)|-->|->)([+-]?)\s*(.+?)\s*:\s*(.*)$/;
var NOTE_RE = /^note\s+(over|left\s+of|right\s+of)\s+(.+?)\s*:\s*(.*)$/i;
var PARTICIPANT_RE = /^(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/i;
var ACTIVATION_RE = /^(activate|deactivate)\s+(.+)$/i;
var BOX_RE = /^box(?:\s+(.+))?$/i;
var ALT_RE = /^alt\s+(.+)$/i;
var ELSE_RE = /^else(?:\s+(.+))?$/i;
var LOOP_RE = /^loop\s+(.+)$/i;
var FRAGMENT_START_RE = /^(opt|par|critical|break)(?:\s+(.+))?$/i;
var FRAGMENT_BRANCH_RE = /^(and|option)(?:\s+(.+))?$/i;
var AUTONUMBER_RE = /^autonumber(?:\s+(\d+)(?:\s+(\d+))?)?$/i;
var UNSUPPORTED_BIDIRECTIONAL_MESSAGE_RE = /<<-{1,2}>>/;
var MESSAGE_OPERATOR_RE = /-->>|->>|--x|-x|--\)|-\)|-->|->/;
var CSS_COLOR_NAMES = new Set([
  "black",
  "white",
  "red",
  "green",
  "blue",
  "yellow",
  "cyan",
  "magenta",
  "silver",
  "gray",
  "grey",
  "maroon",
  "olive",
  "lime",
  "aqua",
  "teal",
  "navy",
  "fuchsia",
  "purple",
  "orange",
  "brightblack",
  "brightred",
  "brightgreen",
  "brightblue",
  "brightyellow",
  "brightcyan",
  "brightmagenta",
  "brightwhite"
]);
function arrowHeadForSyntax(arrow) {
  if (arrow.endsWith("x"))
    return "cross";
  if (arrow.endsWith(")"))
    return "async";
  if (arrow.endsWith(">") && !arrow.endsWith(">>"))
    return "open";
  return;
}
function isBoxColorToken(value) {
  const lowerValue = value.toLowerCase();
  return lowerValue === "transparent" || CSS_COLOR_NAMES.has(lowerValue) || /^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\(.+\)$/i.test(value);
}
function splitLeadingBoxToken(value) {
  if (/^rgba?\(/i.test(value)) {
    const closeIndex = value.indexOf(")");
    if (closeIndex >= 0) {
      return { token: value.slice(0, closeIndex + 1), rest: value.slice(closeIndex + 1).trim() };
    }
  }
  const firstSpace = value.search(/\s/);
  return firstSpace < 0 ? { token: value, rest: "" } : { token: value.slice(0, firstSpace), rest: value.slice(firstSpace + 1).trim() };
}
function boxLabelText(value) {
  const rawLabel = (value ?? "").trim();
  if (rawLabel.startsWith('"') && rawLabel.endsWith('"') || rawLabel.startsWith("'") && rawLabel.endsWith("'")) {
    return stripMermaidQuotes(rawLabel);
  }
  const label = stripMermaidQuotes(rawLabel);
  if (!label)
    return "";
  const { token, rest } = splitLeadingBoxToken(label);
  return isBoxColorToken(token) ? stripMermaidQuotes(rest) : label;
}
function addParticipantToGroup(group, participantId) {
  if (!group || group.participantIds.includes(participantId))
    return;
  group.participantIds.push(participantId);
}
function ensureParticipant(participants, id, label = id, replaceExistingLabel = false) {
  const existing = participants.find((participant) => participant.id === id);
  if (existing) {
    if (replaceExistingLabel)
      existing.label = label;
    return;
  }
  participants.push({ id, label });
}
function isMermaidSequenceDiagram(content) {
  return firstMeaningfulMermaidLine(content)?.toLowerCase() === "sequencediagram";
}
function parseMermaidSequenceDiagram(content) {
  const participants = [];
  const messages = [];
  const steps = [];
  const groups = [];
  const blockStack = [];
  const groupStack = [];
  let nextMessageNumber;
  let messageNumberIncrement = 1;
  for (const source of meaningfulNumberedMermaidLines(content)) {
    const line = source.text;
    if (line.toLowerCase() === "sequencediagram")
      continue;
    if (UNSUPPORTED_BIDIRECTIONAL_MESSAGE_RE.test(line)) {
      throw new MermaidSyntaxError("sequence", source.lineNumber, line);
    }
    const autonumberMatch = line.match(AUTONUMBER_RE);
    if (autonumberMatch) {
      nextMessageNumber = Number.parseInt(autonumberMatch[1] ?? "1", 10);
      messageNumberIncrement = Number.parseInt(autonumberMatch[2] ?? "1", 10);
      continue;
    }
    const boxMatch = line.match(BOX_RE);
    if (boxMatch) {
      const group = { label: boxLabelText(boxMatch[1]), participantIds: [] };
      groups.push(group);
      groupStack.push(group);
      blockStack.push({ kind: "box", lineNumber: source.lineNumber, sourceLine: line });
      continue;
    }
    const participantMatch = line.match(PARTICIPANT_RE);
    if (participantMatch) {
      const id = stripMermaidQuotes(participantMatch[1]);
      ensureParticipant(participants, id, stripMermaidQuotes(participantMatch[2] ?? id), true);
      addParticipantToGroup(groupStack[groupStack.length - 1], id);
      continue;
    }
    const noteMatch = line.match(NOTE_RE);
    if (noteMatch) {
      const position = noteMatch[1].toLowerCase().replace(/\s+of$/, "");
      const over = noteMatch[2].split(",").map((participant) => stripMermaidQuotes(participant)).filter((participant) => participant.length > 0);
      for (const participant of over)
        ensureParticipant(participants, participant);
      steps.push({
        type: "note",
        note: {
          over,
          label: stripMermaidQuotes(noteMatch[3]),
          ...position === "over" ? {} : { position }
        }
      });
      continue;
    }
    const activationMatch = line.match(ACTIVATION_RE);
    if (activationMatch) {
      const participant = stripMermaidQuotes(activationMatch[2]);
      ensureParticipant(participants, participant);
      steps.push({
        type: "activation",
        activation: { participant, active: activationMatch[1].toLowerCase() === "activate" }
      });
      continue;
    }
    const altMatch = line.match(ALT_RE);
    if (altMatch) {
      blockStack.push({ kind: "alt", lineNumber: source.lineNumber, sourceLine: line });
      steps.push({ type: "fragment", fragment: { kind: "alt", label: stripMermaidQuotes(altMatch[1]) } });
      continue;
    }
    const loopMatch = line.match(LOOP_RE);
    if (loopMatch) {
      blockStack.push({ kind: "loop", lineNumber: source.lineNumber, sourceLine: line });
      steps.push({ type: "fragment", fragment: { kind: "loop", label: stripMermaidQuotes(loopMatch[1]) } });
      continue;
    }
    const fragmentStart = line.match(FRAGMENT_START_RE);
    if (fragmentStart) {
      const kind = fragmentStart[1].toLowerCase();
      blockStack.push({ kind, lineNumber: source.lineNumber, sourceLine: line });
      steps.push({ type: "fragment", fragment: { kind, label: stripMermaidQuotes(fragmentStart[2] ?? "") } });
      continue;
    }
    const branchMatch = line.match(FRAGMENT_BRANCH_RE);
    if (branchMatch) {
      const kind = branchMatch[1].toLowerCase();
      const expected = kind === "and" ? "par" : "critical";
      if (blockStack[blockStack.length - 1]?.kind !== expected) {
        throw new MermaidSyntaxError("sequence", source.lineNumber, line, `Unexpected "${kind}" without an open "${expected}" block`);
      }
      steps.push({ type: "fragment", fragment: { kind, label: stripMermaidQuotes(branchMatch[2] ?? "") } });
      continue;
    }
    const elseMatch = line.match(ELSE_RE);
    if (elseMatch) {
      if (blockStack[blockStack.length - 1]?.kind !== "alt") {
        throw new MermaidSyntaxError("sequence", source.lineNumber, line, 'Unexpected "else" without an open "alt" block');
      }
      steps.push({ type: "fragment", fragment: { kind: "else", label: stripMermaidQuotes(elseMatch[1] ?? "") } });
      continue;
    }
    if (line.toLowerCase() === "end") {
      const block = blockStack.pop();
      if (!block)
        throw new MermaidSyntaxError("sequence", source.lineNumber, line, 'Unexpected "end" without an open block');
      if (block.kind === "box") {
        groupStack.pop();
        continue;
      }
      steps.push({ type: "fragment", fragment: { kind: "end", label: block.kind } });
      continue;
    }
    const messageMatch = line.match(MESSAGE_RE);
    if (messageMatch) {
      const from = stripMermaidQuotes(messageMatch[1]);
      const arrow = messageMatch[2];
      const activationMarker = messageMatch[3];
      const to = stripMermaidQuotes(messageMatch[4]);
      if (MESSAGE_OPERATOR_RE.test(from) || MESSAGE_OPERATOR_RE.test(to)) {
        throw new MermaidSyntaxError("sequence", source.lineNumber, line);
      }
      const message = {
        from,
        to,
        label: stripMermaidQuotes(messageMatch[5]),
        style: arrow.startsWith("--") ? "dashed" : "solid"
      };
      const activeGroup = groupStack[groupStack.length - 1];
      ensureParticipant(participants, from);
      ensureParticipant(participants, to);
      addParticipantToGroup(activeGroup, from);
      addParticipantToGroup(activeGroup, to);
      const head = arrowHeadForSyntax(arrow);
      if (head)
        message.head = head;
      if (nextMessageNumber !== undefined) {
        message.number = nextMessageNumber;
        nextMessageNumber += messageNumberIncrement;
      }
      if (activationMarker === "+")
        message.activate = to;
      else if (activationMarker === "-")
        message.deactivate = from;
      messages.push(message);
      steps.push({ type: "message", message });
      continue;
    }
    throw new MermaidSyntaxError("sequence", source.lineNumber, line);
  }
  const unclosedBlock = blockStack[blockStack.length - 1];
  if (unclosedBlock) {
    throw new MermaidSyntaxError("sequence", unclosedBlock.lineNumber, unclosedBlock.sourceLine, `Unclosed ${unclosedBlock.kind} block; expected "end"`);
  }
  return { participants, messages, steps, groups };
}

// src/merman/state/endpoint.ts
function stateDiagramStartMarkerId(scope) {
  return scope ? `${scope}.__start` : "__start";
}
function stateDiagramEndMarkerId(scope) {
  return scope ? `${scope}.__end` : "__end";
}
function stateDiagramMarkerId(position, scope) {
  return position === "from" ? stateDiagramStartMarkerId(scope) : stateDiagramEndMarkerId(scope);
}
function normalizeStateDiagramEndpoint(value, position, scope) {
  return value === "[*]" ? stateDiagramMarkerId(position, scope) : value;
}

// src/merman/state/parser.ts
var DEFAULT_DIRECTION2 = "LR";
var STATE_RE = /^state\s+"([^"]+)"\s+as\s+(\S+)$/i;
var STATE_DECLARE_RE = /^state\s+([A-Za-z_][A-Za-z0-9_.-]*)$/i;
var STATE_DESCRIPTION_RE = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*(.+)$/;
var COMPOSITE_STATE_RE = /^state\s+(?:"([^"]+)"\s+as\s+)?(\S+)\s*\{$/i;
var CHOICE_STATE_RE = /^state\s+(\S+)\s+<<choice>>$/i;
var PARALLEL_STATE_RE = /^state\s+(\S+)\s+<<(fork|join)>>$/i;
var TRANSITION_RE = /^(\[\*\]|[^\s:]+)\s*-->\s*(\[\*\]|[^\s:]+)(?:\s*:\s*(.*))?$/;
var DIRECTION_RE2 = /^direction\s+(TB|TD|BT|LR|RL)$/i;
var NOTE_INLINE_RE = /^note\s+(left|right)\s+of\s+(\S+)\s*:\s*(.*)$/i;
var NOTE_START_RE = /^note\s+(left|right)\s+of\s+(\S+)\s*$/i;
var NOTE_END_RE = /^end\s+note$/i;
function normalizeDirection2(value) {
  const upper = value?.toUpperCase();
  if (upper === "TB" || upper === "TD" || upper === "BT" || upper === "LR" || upper === "RL")
    return upper;
  return DEFAULT_DIRECTION2;
}
function isMermaidHeader(line) {
  return line.toLowerCase() === "statediagram-v2" || line.toLowerCase() === "statediagram";
}
function ensureState(states, id, label = id, kind = "state", parentId) {
  const existing = states.get(id);
  if (existing) {
    if (existing.label === existing.id && label !== id)
      existing.label = label;
    if (parentId && !existing.parentId)
      existing.parentId = parentId;
    if (kind !== "state") {
      existing.kind = kind;
      existing.label = label;
    }
    return;
  }
  states.set(id, parentId ? { id, label, kind, parentId } : { id, label, kind });
}
function resolveCompositeTransitionEndpoint(id, markerId, compositeIds, states) {
  if (!compositeIds.has(id))
    return id;
  const marker = markerId(id);
  return states.has(marker) ? marker : id;
}
function resolveCompositeTransitions(transitions, compositeIds, states) {
  return transitions.map((transition) => ({
    from: resolveCompositeTransitionEndpoint(transition.from, stateDiagramEndMarkerId, compositeIds, states),
    to: resolveCompositeTransitionEndpoint(transition.to, stateDiagramStartMarkerId, compositeIds, states),
    label: transition.label
  }));
}
function isMermaidStateDiagram(content) {
  return isMermaidHeader(firstMeaningfulMermaidLine(content) ?? "");
}
function parseMermaidStateDiagram(content) {
  const states = new Map;
  const transitions = [];
  const composites = [];
  const notes = [];
  const parentStack = [];
  let pendingNote;
  let direction = DEFAULT_DIRECTION2;
  for (const source of numberedMermaidLines(content)) {
    const line = source.text;
    if (pendingNote) {
      if (NOTE_END_RE.test(line)) {
        notes.push({
          target: pendingNote.target,
          position: pendingNote.position,
          lines: pendingNote.lines.map(decodeMermaidText)
        });
        pendingNote = undefined;
      } else if (line || pendingNote.lines.length > 0) {
        pendingNote.lines.push(line);
      }
      continue;
    }
    if (!line || line.startsWith("%%") || isMermaidHeader(line))
      continue;
    if (line === "}") {
      if (parentStack.length === 0) {
        throw new MermaidSyntaxError("state", source.lineNumber, line, 'Unexpected "}" without an open composite state');
      }
      parentStack.pop();
      continue;
    }
    const parentId = parentStack[parentStack.length - 1]?.id;
    const directionMatch = line.match(DIRECTION_RE2);
    if (directionMatch) {
      if (parentStack.length > 0) {
        throw new MermaidSyntaxError("state", source.lineNumber, line, "Composite-local direction is not supported");
      }
      direction = normalizeDirection2(directionMatch[1]);
      continue;
    }
    const inlineNoteMatch = line.match(NOTE_INLINE_RE);
    if (inlineNoteMatch) {
      notes.push({
        position: inlineNoteMatch[1].toLowerCase(),
        target: inlineNoteMatch[2],
        lines: splitDiagramLines(decodeMermaidText(inlineNoteMatch[3].trim()))
      });
      continue;
    }
    const noteMatch = line.match(NOTE_START_RE);
    if (noteMatch) {
      pendingNote = {
        position: noteMatch[1].toLowerCase(),
        target: noteMatch[2],
        lines: [],
        lineNumber: source.lineNumber,
        sourceLine: line
      };
      continue;
    }
    const compositeMatch = line.match(COMPOSITE_STATE_RE);
    if (compositeMatch) {
      const id = compositeMatch[2];
      composites.push({
        id,
        label: decodeMermaidText(compositeMatch[1] ?? id),
        ...parentId ? { parentId } : {}
      });
      parentStack.push({ id, lineNumber: source.lineNumber, sourceLine: line });
      continue;
    }
    const stateMatch = line.match(STATE_RE);
    if (stateMatch) {
      ensureState(states, stateMatch[2], decodeMermaidText(stateMatch[1]), "state", parentId);
      continue;
    }
    const declaration = line.match(STATE_DECLARE_RE);
    if (declaration) {
      ensureState(states, declaration[1], declaration[1], "state", parentId);
      continue;
    }
    const description = line.match(STATE_DESCRIPTION_RE);
    if (description) {
      ensureState(states, description[1], decodeMermaidText(description[2]), "state", parentId);
      continue;
    }
    const choiceMatch = line.match(CHOICE_STATE_RE);
    if (choiceMatch) {
      ensureState(states, choiceMatch[1], "", "choice", parentId);
      continue;
    }
    const parallelMatch = line.match(PARALLEL_STATE_RE);
    if (parallelMatch) {
      ensureState(states, parallelMatch[1], "", parallelMatch[2].toLowerCase(), parentId);
      continue;
    }
    const transitionMatch = line.match(TRANSITION_RE);
    if (transitionMatch) {
      const rawFrom = transitionMatch[1];
      const rawTo = transitionMatch[2];
      if (rawFrom.includes("-->") || rawTo.includes("-->")) {
        throw new MermaidSyntaxError("state", source.lineNumber, line);
      }
      const from = normalizeStateDiagramEndpoint(rawFrom, "from", parentId);
      const to = normalizeStateDiagramEndpoint(rawTo, "to", parentId);
      ensureState(states, from, rawFrom === "[*]" ? "\u25CF" : from, rawFrom === "[*]" ? "start" : "state", parentId);
      ensureState(states, to, rawTo === "[*]" ? "\u25CE" : to, rawTo === "[*]" ? "end" : "state", parentId);
      transitions.push({ from, to, label: decodeMermaidText(transitionMatch[3]?.trim() ?? "") });
      continue;
    }
    throw new MermaidSyntaxError("state", source.lineNumber, line);
  }
  if (pendingNote) {
    throw new MermaidSyntaxError("state", pendingNote.lineNumber, pendingNote.sourceLine, 'Unclosed note; expected "end note"');
  }
  const unclosedComposite = parentStack[parentStack.length - 1];
  if (unclosedComposite) {
    throw new MermaidSyntaxError("state", unclosedComposite.lineNumber, unclosedComposite.sourceLine, 'Unclosed composite state; expected "}"');
  }
  if (composites.length === 0) {
    return { direction, states: [...states.values()], transitions, composites, notes };
  }
  const compositeIds = new Set(composites.map((composite) => composite.id));
  return {
    direction,
    states: [...states.values()].filter((state) => !compositeIds.has(state.id)),
    transitions: resolveCompositeTransitions(transitions, compositeIds, states),
    composites,
    notes
  };
}

// src/merman/timeline/parser.ts
var HEADER_RE4 = /^timeline(?:\s+(TD|LR))?$/i;
var TITLE_RE = /^title(?:\s+(.+))?$/i;
var SECTION_RE2 = /^section(?:\s+(.+))?$/i;
var ACCESSIBILITY_RE4 = /^acc(?:Title|Descr)(?::|\s|$)/i;
function isMermaidTimelineDiagram(content) {
  return HEADER_RE4.test(firstMeaningfulMermaidLine(content) ?? "");
}
function parseMermaidTimelineDiagram(content) {
  const sections = [];
  const periods = [];
  const entries = [];
  let direction = "LR";
  let title;
  let currentPeriod;
  let inAccessibilityDescription = false;
  for (const source of meaningfulNumberedMermaidLines(content)) {
    const line = stripTimelineComment(source.text);
    if (inAccessibilityDescription) {
      if (line === "}")
        inAccessibilityDescription = false;
      continue;
    }
    if (/^accDescr\s*\{$/i.test(line)) {
      inAccessibilityDescription = true;
      continue;
    }
    if (!line || line.startsWith("#") || ACCESSIBILITY_RE4.test(line))
      continue;
    const header = line.match(HEADER_RE4);
    if (header) {
      direction = header[1]?.toUpperCase() ?? "LR";
      continue;
    }
    const titleMatch = line.match(TITLE_RE);
    if (titleMatch) {
      if (!titleMatch[1])
        throw syntaxError4(source.lineNumber, line, "Timeline title cannot be empty");
      title = stripMermaidQuotes(titleMatch[1]);
      continue;
    }
    const sectionMatch = line.match(SECTION_RE2);
    if (sectionMatch) {
      if (!sectionMatch[1])
        throw syntaxError4(source.lineNumber, line, "Timeline section cannot be empty");
      const section = { label: stripMermaidQuotes(sectionMatch[1]) };
      sections.push(section);
      entries.push({ type: "section", section });
      currentPeriod = undefined;
      continue;
    }
    if (line.startsWith(":")) {
      if (!currentPeriod) {
        throw syntaxError4(source.lineNumber, line, "Timeline continuation requires a preceding period");
      }
      currentPeriod.events.push(...parseEvents(line.slice(1), source.lineNumber, line));
      continue;
    }
    const fields = splitEventFields(line);
    const periodLabel = stripMermaidQuotes(fields.shift());
    if (!periodLabel)
      throw syntaxError4(source.lineNumber, line, "Timeline period cannot be empty");
    const period = {
      period: periodLabel,
      events: fields.length === 0 ? [] : parseEventFields(fields, source.lineNumber, line)
    };
    periods.push(period);
    entries.push({ type: "period", period });
    currentPeriod = period;
  }
  return { direction, ...title === undefined ? {} : { title }, sections, periods, entries };
}
function parseEvents(value, lineNumber, sourceLine) {
  return parseEventFields(splitEventFields(value), lineNumber, sourceLine);
}
function parseEventFields(fields, lineNumber, sourceLine) {
  const events = fields.map(stripMermaidQuotes);
  if (events.length === 0 || events.some((event) => event.length === 0)) {
    throw syntaxError4(lineNumber, sourceLine, "Timeline event cannot be empty");
  }
  return events;
}
function splitEventFields(value) {
  const fields = [];
  let quote;
  let start = 0;
  for (let index = 0;index < value.length; index++) {
    const char = value[index];
    if (char === '"' || char === "'") {
      if (quote === char)
        quote = undefined;
      else if (quote === undefined && value.slice(start, index).trim() === "")
        quote = char;
      continue;
    }
    const next = value[index + 1];
    if (char !== ":" || quote !== undefined || next !== undefined && !/\s/.test(next))
      continue;
    fields.push(value.slice(start, index));
    start = index + 1;
  }
  fields.push(value.slice(start));
  return fields;
}
function stripTimelineComment(value) {
  const comment = value.indexOf("%%");
  return (comment < 0 ? value : value.slice(0, comment)).trim();
}
function syntaxError4(lineNumber, sourceLine, reason) {
  return new MermaidSyntaxError("timeline", lineNumber, sourceLine, reason);
}

// src/merman/detect.ts
function detectMermaidDiagram(content) {
  if (isMermaidClassDiagram(content))
    return "classDiagram";
  if (isMermaidFlowchartDiagram(content))
    return "flowchart";
  if (isMermaidGanttDiagram(content))
    return "gantt";
  if (isMermaidGitGraphDiagram(content))
    return "gitGraph";
  if (isMermaidSequenceDiagram(content))
    return "sequence";
  if (isMermaidStateDiagram(content))
    return "state";
  if (isMermaidTimelineDiagram(content))
    return "timeline";
  return;
}

// src/merman/flowchart/drawing.ts
import { BorderChars as BorderChars3, TextAttributes as TextAttributes4 } from "@opentui/core";

// src/merman/flowchart/labels.ts
var LABEL_BUS_CLEARANCE = 3;
var LABEL_NODE_CLEARANCE = 2;
var LABEL_LINE_CLEARANCE = 2;
var LABEL_TERMINAL_CLEARANCE = 1;
function flowchartLabelText(label) {
  return padDiagramLabelLine(label);
}
function flowchartLabelWidth(label, measure) {
  return measureDiagramLabelWidth(label, measure);
}
function minimumInlineLabelLength(labelWidth) {
  return labelWidth + LABEL_LINE_CLEARANCE * 2 - 1;
}
function flowchartHorizontalLabelRankGap(labelWidth) {
  return minimumInlineLabelLength(labelWidth) + LABEL_BUS_CLEARANCE + 1;
}
function flowchartVerticalBranchLabelGap(labelWidth) {
  return minimumInlineLabelLength(labelWidth) + LABEL_BUS_CLEARANCE + LABEL_NODE_CLEARANCE;
}
function inlineLabelSlot(segment, labelWidth) {
  const slot = insetSpan(segmentSpan(segment), LABEL_LINE_CLEARANCE);
  return { x: centeredSpanStart(slot, labelWidth), fits: spanCapacity(slot) >= labelWidth };
}
function segmentLabelPoint(segment, labelWidth, labelHeight) {
  if (segment.axis === "x") {
    const slot = inlineLabelSlot(segment, labelWidth);
    if (labelHeight === 1 && slot.fits)
      return point(slot.x, segment.from.y);
    if (labelHeight > 1) {
      return shiftPoint(point(slot.x, segment.from.y), "up", labelHeight);
    }
    return clampPoint(shiftPoint(shiftPoint(segment.from, segment.direction, LABEL_LINE_CLEARANCE), "up", labelHeight));
  }
  const slot = insetSpan(segmentSpan(segment), LABEL_TERMINAL_CLEARANCE);
  if (spanCapacity(slot) >= labelHeight) {
    return clampPoint(point(segment.from.x + 1, centeredSpanStart(slot, labelHeight)));
  }
  const center = shiftPoint(pointOnSegment(segment, midpoint(segmentSpan(segment))), "right");
  return clampPoint(shiftPoint(center, "up", Math.floor((labelHeight - 1) / 2)));
}
function bestLabelSegment(points, labelWidth, preferredAxis, preferredSegment) {
  const segments = points.slice(1).flatMap((to, index) => {
    const segment = segmentBetween(points[index], to);
    return segment ? [segment] : [];
  });
  if (preferredSegment !== undefined && segments[preferredSegment])
    return segments[preferredSegment];
  const preferred = preferredAxis ? segments.find((segment) => segment.axis === preferredAxis) : undefined;
  if (preferred)
    return preferred;
  let roomyHorizontal;
  let verticalBus;
  let longest;
  for (const segment of segments) {
    if (!roomyHorizontal && segment.axis === "x" && inlineLabelSlot(segment, labelWidth).fits)
      roomyHorizontal = segment;
    if (!verticalBus && segment.axis === "y")
      verticalBus = segment;
    if (!longest || segment.length > longest.length)
      longest = segment;
  }
  return roomyHorizontal ?? verticalBus ?? longest;
}
function flowchartLabelPoint(points, labelWidth, labelHeight, preferredAxis, preferredSegment) {
  const segment = bestLabelSegment(points, labelWidth, preferredAxis, preferredSegment);
  return segment ? segmentLabelPoint(segment, labelWidth, labelHeight) : points[0] ?? point(0, 0);
}
function flowchartEdgeLabelLayout(points, label, measure, preferredAxis, preferredSegment) {
  const lines = splitDiagramLines(label).map(flowchartLabelText);
  const width = flowchartLabelWidth(label, measure);
  const height = lines.length;
  return {
    lines,
    point: flowchartLabelPoint(points, width, height, preferredAxis, preferredSegment),
    width,
    height
  };
}
function flowchartRouteLabelLayout(route, measure) {
  const lines = splitDiagramLines(route.edge.label).map(flowchartLabelText);
  const width = flowchartLabelWidth(route.edge.label, measure);
  const height = lines.length;
  return {
    lines,
    point: route.labelPoint ?? flowchartLabelPoint(route.points, width, height, route.labelAxis),
    width,
    height
  };
}

// src/merman/flowchart/routing.ts
var BUS_CLEARANCE = 3;
var NODE_CLEARANCE = 2;
var ROUTING_CANDIDATE_BUDGET = 1024;
function isVerticalDirection(direction) {
  return direction === "TB" || direction === "TD" || direction === "BT";
}
function verticalTravel(from, to) {
  return centerCoordinate(to, "y") >= centerCoordinate(from, "y") ? "down" : "up";
}
function isVerticalBackEdge(from, to, direction) {
  return direction === "BT" ? centerCoordinate(to, "y") > centerCoordinate(from, "y") : centerCoordinate(to, "y") < centerCoordinate(from, "y");
}
function isHorizontalBackEdge(from, to, direction) {
  return direction === "RL" ? centerCoordinate(to, "x") > centerCoordinate(from, "x") : centerCoordinate(to, "x") < centerCoordinate(from, "x");
}
function horizontalTravel(from, to, direction) {
  const targetIsRight = centerCoordinate(to, "x") > centerCoordinate(from, "x");
  const targetIsSameOrRight = centerCoordinate(to, "x") >= centerCoordinate(from, "x");
  return direction === "RL" ? targetIsRight ? "right" : "left" : targetIsSameOrRight ? "right" : "left";
}
function verticalBackEdgePath(from, to, leftBoundary) {
  const start = boundsSidePoint(from, "left");
  const end = boundsSidePoint(to, "left");
  const busX = Math.min(afterFarthestCoordinate([start, end], "x", "left", BUS_CLEARANCE), leftBoundary === undefined ? Number.POSITIVE_INFINITY : leftBoundary - BUS_CLEARANCE * 2);
  return pathViaLane(start, lane("x", busX), end);
}
function verticalForwardEdgePath(from, to) {
  const travel = verticalTravel(from, to);
  const startSide = sideForDirection(travel);
  const endSide = oppositeSide(startSide);
  const sourceCenter = boundsCenter(from);
  const targetCenter = boundsCenter(to);
  const start = withCoordinate(boundsSidePoint(from, startSide), "x", snapCoordinate(sourceCenter.x, targetCenter.x, 1));
  const end = boundsSidePoint(to, endSide);
  return orthogonalPath(start, end, { preferredAxis: "y" });
}
function horizontalBackEdgePath(from, to) {
  const start = boundsSidePoint(from, "top");
  const end = boundsSidePoint(to, "top");
  const busY = afterFarthestCoordinate([start, end], "y", "up", BUS_CLEARANCE);
  return pathViaLane(start, lane("y", busY), end);
}
function horizontalEdgePath(from, to, direction) {
  const overlapsHorizontally = from.left < to.left + to.width && to.left < from.left + from.width;
  if (overlapsHorizontally)
    return verticalForwardEdgePath(from, to);
  if (isHorizontalBackEdge(from, to, direction))
    return horizontalBackEdgePath(from, to);
  const travel = horizontalTravel(from, to, direction);
  const startSide = sideForDirection(travel);
  return orthogonalPath(boundsSidePoint(from, startSide), boundsSidePoint(to, oppositeSide(startSide)), {
    preferredAxis: "x"
  });
}
function selfEdgePath(bounds, laneOffset = 0) {
  const start = boundsSidePoint(bounds, "right");
  const end = boundsSidePoint(bounds, "bottom");
  const rightLaneX = bounds.left + bounds.width + BUS_CLEARANCE + laneOffset;
  const bottomLaneY = bounds.top + bounds.height + 1 + laneOffset;
  return [start, { x: rightLaneX, y: start.y }, { x: rightLaneX, y: bottomLaneY }, { x: end.x, y: bottomLaneY }, end];
}
function parallelEdgePath(from, to, axis, laneCoordinate) {
  if (axis === "y") {
    const start = boundsSidePoint(from, "bottom");
    const end = boundsSidePoint(to, "bottom");
    return pathViaLane(start, lane("y", laneCoordinate), end);
  }
  const start = boundsSidePoint(from, "right");
  const end = boundsSidePoint(to, "right");
  return pathViaLane(start, lane("x", laneCoordinate), end);
}
function labelHeight(edge) {
  return edge.label ? splitDiagramLines(edge.label).length : 0;
}
function rightRenderExtent(route) {
  let right = Math.max(...route.points.map((point) => point.x));
  if (route.edge.label) {
    const label = flowchartRouteLabelLayout(route, diagramTextWidth);
    right = Math.max(right, label.point.x + label.width - 1);
  }
  return right;
}
function parallelLaneAxis(from, to) {
  return Math.abs(to.centerX - from.centerX) >= Math.abs(to.centerY - from.centerY) ? "y" : "x";
}
function edgePath(from, to, direction, leftBoundary) {
  if (from.id === to.id)
    return selfEdgePath(from);
  if (!isVerticalDirection(direction))
    return horizontalEdgePath(from, to, direction);
  const overlapsVertically = from.top < to.top + to.height && to.top < from.top + from.height;
  if (overlapsVertically) {
    const travel = centerCoordinate(to, "x") >= centerCoordinate(from, "x") ? "right" : "left";
    return orthogonalPath(boundsSidePoint(from, sideForDirection(travel)), boundsSidePoint(to, oppositeSide(sideForDirection(travel))));
  }
  return isVerticalBackEdge(from, to, direction) ? verticalBackEdgePath(from, to, leftBoundary) : verticalForwardEdgePath(from, to);
}
function sourceFanOutLane(sourcePort, targetPorts, axis, travel) {
  const sourceCoordinate = coordinate(sourcePort, axis);
  const unclamped = keepBefore(advanceCoordinate(coordinate(sourcePort, axis), travel, BUS_CLEARANCE), beforeNearestCoordinate(targetPorts, axis, travel, NODE_CLEARANCE), travel);
  return keepAfter(unclamped, sourceCoordinate, travel);
}
function reserveFanOutLane(sourcePort, targetPorts, axis, travel, reserved) {
  const preferred = sourceFanOutLane(sourcePort, targetPorts, axis, travel);
  const boundary = beforeNearestCoordinate(targetPorts, axis, travel, NODE_CLEARANCE);
  const source = coordinate(sourcePort, axis);
  const available = (() => {
    let checked = 0;
    for (let offset = 0;offset <= Math.abs(boundary - preferred) && checked < ROUTING_CANDIDATE_BUDGET; offset++) {
      checked++;
      const candidate = advanceCoordinate(preferred, travel, offset);
      if (keepBefore(candidate, boundary, travel) === candidate && keepAfter(candidate, source, travel) === candidate && !reserved.has(candidate)) {
        return candidate;
      }
    }
    for (let offset = 1;offset <= Math.abs(preferred - source) && checked < ROUTING_CANDIDATE_BUDGET; offset++) {
      checked++;
      const candidate = advanceCoordinate(preferred, travel, -offset);
      if (keepBefore(candidate, boundary, travel) === candidate && keepAfter(candidate, source, travel) === candidate && !reserved.has(candidate)) {
        return candidate;
      }
    }
  })();
  const routeLane = available ?? preferred;
  reserved.add(routeLane);
  return routeLane;
}
function targetFanInLane(sourcePorts, targetPort, axis, travel) {
  const targetCoordinate = coordinate(targetPort, axis);
  const unclamped = keepAfter(advanceCoordinate(coordinate(targetPort, axis), travel, -BUS_CLEARANCE), afterFarthestCoordinate(sourcePorts, axis, travel, NODE_CLEARANCE), travel);
  return keepBefore(unclamped, advanceCoordinate(targetCoordinate, travel, -1), travel);
}
function portForTravel(bounds, travel, role) {
  const side = role === "source" ? sideForDirection(travel) : oppositeSide(sideForDirection(travel));
  return boundsSidePoint(bounds, side);
}
function horizontalForwardRecords(edges, bounds, direction) {
  const travel = direction === "RL" ? "left" : "right";
  const records = [];
  for (const edge of edges) {
    const source = bounds.get(edge.from);
    const target = bounds.get(edge.to);
    if (!source || !target)
      continue;
    const forward = direction === "RL" ? centerCoordinate(target, "x") < centerCoordinate(source, "x") : centerCoordinate(target, "x") > centerCoordinate(source, "x");
    if (!forward)
      continue;
    records.push({
      edge,
      sourcePort: portForTravel(source, travel, "source"),
      targetPort: portForTravel(target, travel, "target")
    });
  }
  return records;
}
function verticalForwardRecords(edges, bounds, direction) {
  const travel = direction === "BT" ? "up" : "down";
  const records = [];
  for (const edge of edges) {
    const source = bounds.get(edge.from);
    const target = bounds.get(edge.to);
    if (!source || !target)
      continue;
    const forward = direction === "BT" ? centerCoordinate(target, "y") < centerCoordinate(source, "y") : centerCoordinate(target, "y") > centerCoordinate(source, "y");
    if (!forward)
      continue;
    records.push({
      edge,
      sourcePort: portForTravel(source, travel, "source"),
      targetPort: portForTravel(target, travel, "target")
    });
  }
  return records;
}
function horizontalExitSubgraph(diagram, edge) {
  for (const subgraph of [...diagram.subgraphs ?? []].reverse()) {
    if (subgraph.direction !== "LR" && subgraph.direction !== "RL")
      continue;
    if (subgraph.nodeIds.includes(edge.from) && !subgraph.nodeIds.includes(edge.to))
      return subgraph;
  }
  return;
}
function horizontalEntrySubgraph(diagram, edge) {
  for (const subgraph of [...diagram.subgraphs ?? []].reverse()) {
    if (subgraph.direction !== "LR" && subgraph.direction !== "RL")
      continue;
    if (subgraph.nodeIds.includes(edge.to) && !subgraph.nodeIds.includes(edge.from))
      return subgraph;
  }
  return;
}
function horizontalSubgraphEntryTravel(subgraph) {
  return subgraph.direction === "RL" ? "left" : "right";
}
function horizontalSubgraphEntryLane(subgraph, subgraphBound) {
  return subgraph.direction === "RL" ? subgraphBound.left + subgraphBound.width + BUS_CLEARANCE : subgraphBound.left - BUS_CLEARANCE;
}
function horizontalSubgraphJoinY(from, targetSubgraphBound) {
  if (from.centerY <= targetSubgraphBound.centerY) {
    const start = from.top + from.height;
    const end = targetSubgraphBound.top - 1;
    return start <= end ? Math.floor((start + end) / 2) : start;
  }
  const start = targetSubgraphBound.top + targetSubgraphBound.height;
  const end = from.top - 1;
  return start <= end ? Math.floor((start + end) / 2) : end;
}
function horizontalSubgraphExitJoinY(from, targetPort, targetBelow) {
  if (targetBelow) {
    const outside = from.top + from.height;
    const beforeTarget = targetPort.y - 1;
    const preferred = targetPort.y - BUS_CLEARANCE;
    return outside <= beforeTarget ? Math.min(Math.max(outside, preferred), beforeTarget) : beforeTarget;
  }
  const outside = from.top - 1;
  const afterTarget = targetPort.y + 1;
  const preferred = targetPort.y + BUS_CLEARANCE;
  return afterTarget <= outside ? Math.max(Math.min(outside, preferred), afterTarget) : afterTarget;
}
function groupRecords(records, key) {
  const groups = new Map;
  for (const record of records) {
    const groupKey = key(record);
    const group = groups.get(groupKey) ?? [];
    group.push(record);
    groups.set(groupKey, group);
  }
  return groups;
}
function fanRoute(edge, sourcePort, targetPort, routeLane) {
  return { edge, points: pathViaLane(sourcePort, routeLane, targetPort) };
}
function alignClusteredVerticalSources(records) {
  const xs = records.map((record) => record.sourcePort.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  if (maxX - minX > 1)
    return [...records];
  const x = Math.round(xs.reduce((total, value) => total + value, 0) / xs.length);
  return records.map((record) => ({ ...record, sourcePort: { ...record.sourcePort, x } }));
}
function routeHorizontalFanOut(records, bounds, direction, handled, routes) {
  const reservedBusLanes = new Set;
  const targetOwners = new Map;
  for (const [sourceId, sourceRecords] of groupRecords(records, (record) => record.edge.from)) {
    if (sourceRecords.length < 2)
      continue;
    const travel = direction === "RL" ? "left" : "right";
    const sourcePort = sourceRecords[0].sourcePort;
    const targetPorts = sourceRecords.map((record) => record.targetPort);
    const busX = reserveFanOutLane(sourcePort, targetPorts, "x", travel, reservedBusLanes);
    for (const record of sourceRecords) {
      const targetOwner = targetOwners.get(record.edge.to);
      targetOwners.set(record.edge.to, targetOwner ?? sourceId);
      const target = bounds.get(record.edge.to);
      if (!targetOwner || targetOwner === sourceId || !target) {
        routes.push(fanRoute(record.edge, sourcePort, record.targetPort, lane("x", busX)));
        handled.add(record.edge);
        continue;
      }
      const targetSide = sourcePort.y < record.targetPort.y ? "top" : "bottom";
      const targetPoint = boundsSidePoint(target, targetSide);
      const approach = shiftPoint(targetPoint, targetSide === "top" ? "up" : "down");
      routes.push({
        edge: record.edge,
        points: pathThrough([
          sourcePort,
          { x: busX, y: sourcePort.y },
          { x: busX, y: approach.y },
          approach,
          targetPoint
        ])
      });
      handled.add(record.edge);
    }
  }
}
function routeHorizontalFanIn(records, direction, handled, routes) {
  const unhandledRecords = records.filter((record) => !handled.has(record.edge));
  for (const targetRecords of groupRecords(unhandledRecords, (record) => record.edge.to).values()) {
    if (targetRecords.length < 2)
      continue;
    const travel = direction === "RL" ? "left" : "right";
    const targetPort = targetRecords[0].targetPort;
    const sourcePorts = targetRecords.map((record) => record.sourcePort);
    const busX = targetFanInLane(sourcePorts, targetPort, "x", travel);
    for (const record of targetRecords) {
      routes.push(fanRoute(record.edge, record.sourcePort, targetPort, lane("x", busX)));
      handled.add(record.edge);
    }
  }
}
function routeVerticalFanOut(records, direction, handled, routes) {
  for (const sourceRecords of groupRecords(records, (record) => record.edge.from).values()) {
    if (sourceRecords.length < 2)
      continue;
    const travel = direction === "BT" ? "up" : "down";
    const sourcePort = sourceRecords[0].sourcePort;
    const targetPorts = sourceRecords.map((record) => record.targetPort);
    const busY = sourceFanOutLane(sourcePort, targetPorts, "y", travel);
    for (const record of sourceRecords) {
      routes.push(fanRoute(record.edge, sourcePort, record.targetPort, lane("y", busY)));
      handled.add(record.edge);
    }
  }
}
function routeVerticalFanIn(records, direction, handled, routes) {
  const unhandledRecords = records.filter((record) => !handled.has(record.edge));
  for (const unalignedTargetRecords of groupRecords(unhandledRecords, (record) => record.edge.to).values()) {
    const targetRecords = alignClusteredVerticalSources(unalignedTargetRecords);
    if (targetRecords.length < 2)
      continue;
    const travel = direction === "BT" ? "up" : "down";
    const targetPort = targetRecords[0].targetPort;
    const sourcePorts = targetRecords.map((record) => record.sourcePort);
    const busY = targetFanInLane(sourcePorts, targetPort, "y", travel);
    for (const record of targetRecords) {
      routes.push(fanRoute(record.edge, record.sourcePort, targetPort, lane("y", busY)));
      handled.add(record.edge);
    }
  }
}
function routeParallelEdges(diagram, bounds, directionForEdge, directionAligned, handled, routes) {
  const groups = groupRecords(diagram.edges, (edge) => `${edge.from}:${edge.to}`);
  for (const edges of groups.values()) {
    if (edges.length < 2)
      continue;
    const from = bounds.get(edges[0].from);
    const to = bounds.get(edges[0].to);
    if (!from || !to)
      continue;
    if (from.id === to.id) {
      let laneOffset = 0;
      for (const edge of edges) {
        routes.push({ edge, points: selfEdgePath(from, laneOffset) });
        handled.add(edge);
        laneOffset++;
      }
      continue;
    }
    const parallelAxis = directionAligned && isVerticalDirection(directionForEdge(edges[0])) ? "x" : parallelLaneAxis(from, to);
    let previousRoute;
    for (const edge of edges) {
      const height = labelHeight(edge);
      const laneCoordinate = parallelAxis === "x" ? previousRoute ? rightRenderExtent(previousRoute) + NODE_CLEARANCE : Math.max(boundsSidePoint(from, "right").x, boundsSidePoint(to, "right").x) + (directionAligned ? 1 : 0) : previousRoute ? Math.max(...previousRoute.points.map((point) => point.y)) + (height > 1 ? height + 1 : 1) : Math.max(boundsSidePoint(from, "bottom").y, boundsSidePoint(to, "bottom").y) + (height > 1 ? height : 0);
      const route = {
        edge,
        points: parallelEdgePath(from, to, parallelAxis, laneCoordinate),
        labelAxis: parallelAxis === "x" ? "y" : "x"
      };
      routes.push(route);
      handled.add(edge);
      previousRoute = route;
    }
  }
}
function routeHorizontalSubgraphExitFanIn(diagram, bounds, subgraphBounds, handled, routes) {
  if (!subgraphBounds)
    return;
  const groups = new Map;
  for (const edge of diagram.edges) {
    if (handled.has(edge))
      continue;
    const subgraph = horizontalExitSubgraph(diagram, edge);
    const source = bounds.get(edge.from);
    const target = bounds.get(edge.to);
    if (!subgraph || !source || !target)
      continue;
    const key = `${subgraph.id}:${edge.to}`;
    const group = groups.get(key) ?? [];
    group.push({ edge, subgraph, source });
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const subgraph = group[0].subgraph;
    const subgraphBound = subgraphBounds.get(subgraph.id);
    const target = bounds.get(group[0].edge.to);
    if (!subgraphBound || !target)
      continue;
    const travel = subgraph.direction === "RL" ? "left" : "right";
    const busX = subgraph.direction === "RL" ? subgraphBound.left - BUS_CLEARANCE : subgraphBound.left + subgraphBound.width + BUS_CLEARANCE;
    const targetSubgraph = horizontalEntrySubgraph(diagram, group[0].edge);
    const targetSubgraphBound = targetSubgraph ? subgraphBounds.get(targetSubgraph.id) : undefined;
    const targetBelow = target.centerY >= subgraphBound.centerY;
    const targetPort = targetSubgraph ? portForTravel(target, horizontalSubgraphEntryTravel(targetSubgraph), "target") : boundsSidePoint(target, targetBelow ? "top" : "bottom");
    const joinY = targetSubgraphBound ? horizontalSubgraphJoinY(subgraphBound, targetSubgraphBound) : horizontalSubgraphExitJoinY(subgraphBound, targetPort, targetBelow);
    const entryX = targetSubgraph && targetSubgraphBound ? horizontalSubgraphEntryLane(targetSubgraph, targetSubgraphBound) : targetPort.x;
    for (const record of group) {
      const sourcePort = portForTravel(record.source, travel, "source");
      routes.push({
        edge: record.edge,
        points: pathThrough([
          sourcePort,
          { x: busX, y: sourcePort.y },
          { x: busX, y: joinY },
          { x: entryX, y: joinY },
          { x: entryX, y: targetPort.y },
          targetPort
        ])
      });
      handled.add(record.edge);
    }
  }
}
function routeHorizontalSubgraphEntries(diagram, bounds, subgraphBounds, handled, routes) {
  if (!subgraphBounds)
    return;
  for (const edge of diagram.edges) {
    if (handled.has(edge))
      continue;
    const subgraph = horizontalEntrySubgraph(diagram, edge);
    const subgraphBound = subgraph ? subgraphBounds.get(subgraph.id) : undefined;
    const from = bounds.get(edge.from);
    const to = bounds.get(edge.to);
    if (!subgraph || !subgraphBound || !from || !to)
      continue;
    const targetPort = portForTravel(to, horizontalSubgraphEntryTravel(subgraph), "target");
    const entryX = horizontalSubgraphEntryLane(subgraph, subgraphBound);
    const travel = verticalTravel(from, to);
    const sourcePort = portForTravel(from, travel, "source");
    routes.push({
      edge,
      points: pathThrough([sourcePort, { x: entryX, y: sourcePort.y }, { x: entryX, y: targetPort.y }, targetPort])
    });
    handled.add(edge);
  }
}
function pathIntersectsBounds(points, bounds, allowedContact = undefined) {
  const right = bounds.left + bounds.width - 1;
  const bottom = bounds.top + bounds.height - 1;
  for (let index = 1;index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    if (from.x === to.x) {
      if (from.x < bounds.left || from.x > right)
        continue;
      const overlapTop = Math.max(Math.min(from.y, to.y), bounds.top);
      const overlapBottom = Math.min(Math.max(from.y, to.y), bottom);
      if (overlapTop > overlapBottom)
        continue;
      const sourceContact = (allowedContact === "source" || allowedContact === "both") && index === 1 && overlapTop === overlapBottom && from.x === points[0].x && overlapTop === points[0].y;
      const targetContact = (allowedContact === "target" || allowedContact === "both") && index === points.length - 1 && overlapTop === overlapBottom && to.x === points.at(-1).x && overlapTop === points.at(-1).y;
      if (!sourceContact && !targetContact)
        return true;
      continue;
    }
    if (from.y < bounds.top || from.y > bottom)
      continue;
    const overlapLeft = Math.max(Math.min(from.x, to.x), bounds.left);
    const overlapRight = Math.min(Math.max(from.x, to.x), right);
    if (overlapLeft > overlapRight)
      continue;
    const sourceContact = (allowedContact === "source" || allowedContact === "both") && index === 1 && overlapLeft === overlapRight && overlapLeft === points[0].x && from.y === points[0].y;
    const targetContact = (allowedContact === "target" || allowedContact === "both") && index === points.length - 1 && overlapLeft === overlapRight && overlapLeft === points.at(-1).x && to.y === points.at(-1).y;
    if (!sourceContact && !targetContact)
      return true;
  }
  return false;
}
function labelIntersectsBounds(label, bounds) {
  if (!label)
    return false;
  return label.point.x <= bounds.left + bounds.width - 1 && label.point.x + label.width - 1 >= bounds.left && label.point.y <= bounds.top + bounds.height - 1 && label.point.y + label.height - 1 >= bounds.top;
}
function labelIntersectsSubgraphFrame(label, bounds) {
  if (!label)
    return false;
  const labelRight = label.point.x + label.width - 1;
  const labelBottom = label.point.y + label.height - 1;
  const right = bounds.left + bounds.width - 1;
  const bottom = bounds.top + bounds.height - 1;
  return label.point.x <= right && labelRight >= bounds.left && (label.point.y <= bounds.top && labelBottom >= bounds.top || label.point.y <= bottom && labelBottom >= bottom) || label.point.y <= bottom && labelBottom >= bounds.top && (label.point.x <= bounds.left && labelRight >= bounds.left || label.point.x <= right && labelRight >= right);
}
function routeLength(route) {
  let length = 0;
  for (let index = 1;index < route.points.length; index++) {
    const from = route.points[index - 1];
    const to = route.points[index];
    length += Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  }
  return length;
}
function labelIntersectsLabels(label, otherLabels) {
  if (!label)
    return false;
  return otherLabels.some((otherLabel) => labelIntersectsBounds(label, {
    left: otherLabel.point.x,
    top: otherLabel.point.y,
    width: otherLabel.width,
    height: otherLabel.height
  }));
}
function labelIntersectsRoutePaths(label, routes) {
  if (!label)
    return false;
  return label.lines.some((line, lineIndex) => {
    const width = diagramTextWidth(line) - 2;
    if (width <= 0)
      return false;
    return routes.some((route) => pathIntersectsBounds(route.points, {
      left: label.point.x + 1,
      top: label.point.y + lineIndex,
      width,
      height: 1
    }));
  });
}
function routeIntersectsLabels(route, labels) {
  return labels.some((label) => label.lines.some((line, lineIndex) => {
    const width = diagramTextWidth(line) - 2;
    return width > 0 && pathIntersectsBounds(route.points, {
      left: label.point.x + 1,
      top: label.point.y + lineIndex,
      width,
      height: 1
    });
  }));
}
function pathsIntersect(left, right) {
  const occupied = new Set(orthogonalPathPoints(left).map((point) => `${point.x}:${point.y}`));
  return orthogonalPathPoints(right).some((point) => occupied.has(`${point.x}:${point.y}`));
}
function endpointDisjoint(left, right) {
  return left.from !== right.from && left.from !== right.to && left.to !== right.from && left.to !== right.to;
}
function endpointConflictsWithRoutes(route, otherRoutes) {
  const source = route.points[0];
  const target = route.points.at(-1);
  if (!source || !target)
    return false;
  return otherRoutes.some((other) => {
    const otherSource = other.points[0];
    const otherTarget = other.points.at(-1);
    return otherSource && target.x === otherSource.x && target.y === otherSource.y || otherTarget && source.x === otherTarget.x && source.y === otherTarget.y;
  });
}
function pathRunsAlongFrame(points, bounds) {
  const right = bounds.left + bounds.width - 1;
  const bottom = bounds.top + bounds.height - 1;
  for (let index = 1;index < points.length; index++) {
    const segment = segmentBetween(points[index - 1], points[index]);
    if (!segment)
      continue;
    const span = segmentSpan(segment);
    if (segment.axis === "x" && (segment.from.y === bounds.top || segment.from.y === bottom) && Math.min(span.end, right) > Math.max(span.start, bounds.left)) {
      return true;
    }
    if (segment.axis === "y" && (segment.from.x === bounds.left || segment.from.x === right) && Math.min(span.end, bottom) > Math.max(span.start, bounds.top)) {
      return true;
    }
  }
  return false;
}
function subgraphTitleBounds(bounds) {
  const lines = splitDiagramLines(bounds.label);
  return {
    left: bounds.left + 2,
    top: bounds.labelSide === "top" ? bounds.top : bounds.top + bounds.height - lines.length,
    width: Math.max(...lines.map((line) => diagramTextWidth(` ${line} `))),
    height: lines.length
  };
}
function avoidNodeObstacles(route, routes, bounds, subgraphBounds, routeIndex, diagram) {
  const allNodeBounds = [...bounds.values()];
  const allSubgraphBounds = [...subgraphBounds?.values() ?? []];
  const subgraphs = diagram.subgraphs ?? [];
  const contains = (subgraph, nodeId) => subgraph.nodeIds.includes(nodeId) || subgraphs.some((child) => child.parentId === subgraph.id && contains(child, nodeId));
  const owner = [...subgraphs].reverse().find((subgraph) => {
    if (!contains(subgraph, route.edge.from) || !contains(subgraph, route.edge.to))
      return false;
    const children = subgraphs.filter((child) => child.parentId === subgraph.id);
    return children.some((child) => contains(child, route.edge.from)) && children.some((child) => contains(child, route.edge.to)) && !children.some((child) => contains(child, route.edge.from) && contains(child, route.edge.to));
  });
  const ownerBounds = owner ? subgraphBounds?.get(owner.id) : undefined;
  const leavesOwner = (candidate) => Boolean(ownerBounds && candidate.points.some((point) => point.x <= ownerBounds.left || point.x >= ownerBounds.left + ownerBounds.width - 1 || point.y <= ownerBounds.top || point.y >= ownerBounds.top + ownerBounds.height - 1));
  const otherRoutes = routes.filter((_, index) => index !== routeIndex);
  const otherLabels = otherRoutes.flatMap((otherRoute) => otherRoute.edge.label ? [flowchartRouteLabelLayout(otherRoute, diagramTextWidth)] : []);
  const intersectsNode = (candidate) => allNodeBounds.some((bound) => {
    const isSource = bound.id === route.edge.from;
    const isTarget = bound.id === route.edge.to;
    const allowedContact = isSource && isTarget ? "both" : isSource ? "source" : isTarget ? "target" : undefined;
    return pathIntersectsBounds(candidate.points, bound, allowedContact);
  });
  const intersectsStructuralObstacle = (candidate) => intersectsNode(candidate) || allSubgraphBounds.some((bound) => pathRunsAlongFrame(candidate.points, bound) || bound.label.length > 0 && pathIntersectsBounds(candidate.points, subgraphTitleBounds(bound)));
  const intersectsRoutingObstacle = (candidate) => intersectsStructuralObstacle(candidate) || endpointConflictsWithRoutes(candidate, otherRoutes) || otherRoutes.some((other) => endpointDisjoint(candidate.edge, other.edge) && pathsIntersect(candidate.points, other.points));
  const intersectsObstacle = (candidate) => {
    const label = candidate.edge.label ? flowchartRouteLabelLayout(candidate, diagramTextWidth) : undefined;
    return leavesOwner(candidate) || intersectsRoutingObstacle(candidate) || allNodeBounds.some((bound) => labelIntersectsBounds(label, bound)) || allSubgraphBounds.some((bound) => labelIntersectsSubgraphFrame(label, bound)) || labelIntersectsLabels(label, otherLabels) || labelIntersectsRoutePaths(label, otherRoutes) || routeIntersectsLabels(candidate, otherLabels);
  };
  if (!intersectsObstacle(route))
    return route;
  const from = bounds.get(route.edge.from);
  const to = bounds.get(route.edge.to);
  if (!from || !to)
    return route;
  const routingBounds = [...allNodeBounds, ...allSubgraphBounds];
  const rightBusX = Math.max(...routingBounds.map((bound) => bound.left + bound.width - 1)) + BUS_CLEARANCE;
  const leftBusX = Math.min(...routingBounds.map((bound) => bound.left)) - BUS_CLEARANCE;
  const topBusY = Math.min(...routingBounds.map((bound) => bound.top)) - BUS_CLEARANCE;
  const bottomBusY = Math.max(...routingBounds.map((bound) => bound.top + bound.height - 1)) + BUS_CLEARANCE;
  const rightBusXs = [
    ...new Set([
      rightBusX,
      ...ownerBounds ? [ownerBounds.left + ownerBounds.width - 2] : [],
      ...otherLabels.map((label) => Math.max(rightBusX, label.point.x + label.width - 1 + NODE_CLEARANCE))
    ])
  ].sort((left, right) => left - right);
  const leftBusXs = [
    ...new Set([
      leftBusX,
      ...ownerBounds ? [ownerBounds.left + 1] : [],
      ...otherLabels.map((label) => Math.min(leftBusX, label.point.x - NODE_CLEARANCE))
    ])
  ].sort((left, right) => right - left);
  const topBusYs = [
    ...new Set([
      topBusY,
      ...ownerBounds ? [ownerBounds.top + 1] : [],
      ...otherLabels.map((label) => Math.min(topBusY, label.point.y - NODE_CLEARANCE))
    ])
  ].sort((left, right) => right - left);
  const bottomBusYs = [
    ...new Set([
      bottomBusY,
      ...ownerBounds ? [ownerBounds.top + ownerBounds.height - 2] : [],
      ...otherLabels.map((label) => Math.max(bottomBusY, label.point.y + label.height - 1 + NODE_CLEARANCE))
    ])
  ].sort((left, right) => left - right);
  const busLimit = Math.max(1, Math.floor(Math.sqrt(ROUTING_CANDIDATE_BUDGET / 4)));
  const candidateLeftBusXs = leftBusXs.length > busLimit ? leftBusXs.slice(0, busLimit) : leftBusXs;
  const candidateRightBusXs = rightBusXs.length > busLimit ? rightBusXs.slice(0, busLimit) : rightBusXs;
  const candidateTopBusYs = topBusYs.length > busLimit ? topBusYs.slice(0, busLimit) : topBusYs;
  const candidateBottomBusYs = bottomBusYs.length > busLimit ? bottomBusYs.slice(0, busLimit) : bottomBusYs;
  const buses = [
    ...candidateLeftBusXs.map((coordinate) => lane("x", coordinate)),
    ...candidateRightBusXs.map((coordinate) => lane("x", coordinate)),
    ...candidateTopBusYs.map((coordinate) => lane("y", coordinate)),
    ...candidateBottomBusYs.map((coordinate) => lane("y", coordinate))
  ];
  const routeViaBus = (start, targetSide, bus) => {
    const end = boundsSidePoint(to, targetSide);
    const approach = shiftPoint(end, targetSide === "left" ? "left" : targetSide === "right" ? "right" : targetSide === "top" ? "up" : "down");
    return {
      ...route,
      labelAxis: route.labelAxis === undefined ? undefined : bus.axis === "x" ? "y" : "x",
      points: bus.axis === "x" ? pathThrough([start, { x: bus.coordinate, y: start.y }, { x: bus.coordinate, y: approach.y }, approach, end]) : pathThrough([
        start,
        { x: start.x, y: bus.coordinate },
        { x: approach.x, y: bus.coordinate },
        approach,
        end
      ])
    };
  };
  const selfLoops = from.id !== to.id ? [] : [
    ...candidateRightBusXs.flatMap((busX) => candidateBottomBusYs.map((busY) => ({
      ...route,
      points: pathThrough([
        boundsSidePoint(from, "right"),
        { x: busX, y: from.centerY },
        { x: busX, y: busY },
        { x: from.centerX, y: busY },
        boundsSidePoint(from, "bottom")
      ])
    }))),
    ...candidateBottomBusYs.flatMap((busY) => candidateLeftBusXs.map((busX) => ({
      ...route,
      points: pathThrough([
        boundsSidePoint(from, "bottom"),
        { x: from.centerX, y: busY },
        { x: busX, y: busY },
        { x: busX, y: from.centerY },
        boundsSidePoint(from, "left")
      ])
    }))),
    ...candidateLeftBusXs.flatMap((busX) => candidateTopBusYs.map((busY) => ({
      ...route,
      points: pathThrough([
        boundsSidePoint(from, "left"),
        { x: busX, y: from.centerY },
        { x: busX, y: busY },
        { x: from.centerX, y: busY },
        boundsSidePoint(from, "top")
      ])
    }))),
    ...candidateTopBusYs.flatMap((busY) => candidateRightBusXs.map((busX) => ({
      ...route,
      points: pathThrough([
        boundsSidePoint(from, "top"),
        { x: from.centerX, y: busY },
        { x: busX, y: busY },
        { x: busX, y: from.centerY },
        boundsSidePoint(from, "right")
      ])
    })))
  ];
  const targetSides = ["left", "right", "top", "bottom"];
  const shortest = (candidates, accept) => candidates.filter(accept).sort((left, right) => routeLength(left) - routeLength(right))[0];
  if (from.id === to.id)
    return shortest(selfLoops, (candidate) => !intersectsObstacle(candidate)) ?? shortest(selfLoops, (candidate) => !intersectsStructuralObstacle(candidate)) ?? route;
  const currentTargetSide = sideForOutsidePoint(to, route.points.at(-1));
  const preservedTargets = buses.map((bus) => routeViaBus(route.points[0], currentTargetSide, bus));
  const sameSides = [
    ...candidateRightBusXs.map((busX) => ({
      ...route,
      labelAxis: route.labelAxis === undefined ? undefined : "y",
      points: pathViaLane(boundsSidePoint(from, "right"), lane("x", busX), boundsSidePoint(to, "right"))
    })),
    ...candidateLeftBusXs.map((busX) => ({
      ...route,
      labelAxis: route.labelAxis === undefined ? undefined : "y",
      points: pathViaLane(boundsSidePoint(from, "left"), lane("x", busX), boundsSidePoint(to, "left"))
    })),
    ...candidateTopBusYs.map((busY) => ({
      ...route,
      labelAxis: route.labelAxis === undefined ? undefined : "x",
      points: pathViaLane(boundsSidePoint(from, "top"), lane("y", busY), boundsSidePoint(to, "top"))
    })),
    ...candidateBottomBusYs.map((busY) => ({
      ...route,
      labelAxis: route.labelAxis === undefined ? undefined : "x",
      points: pathViaLane(boundsSidePoint(from, "bottom"), lane("y", busY), boundsSidePoint(to, "bottom"))
    }))
  ];
  const preservedSources = targetSides.flatMap((targetSide) => buses.map((bus) => routeViaBus(route.points[0], targetSide, bus)));
  const attachments = targetSides.flatMap((sourceSide) => targetSides.flatMap((targetSide) => buses.map((bus) => routeViaBus(boundsSidePoint(from, sourceSide), targetSide, bus))));
  if (subgraphBounds) {
    return shortest(preservedTargets, (candidate) => !intersectsObstacle(candidate)) ?? shortest(sameSides, (candidate) => !intersectsObstacle(candidate)) ?? shortest(preservedSources, (candidate) => !intersectsObstacle(candidate)) ?? shortest(attachments, (candidate) => !intersectsObstacle(candidate)) ?? shortest(preservedSources, (candidate) => !intersectsStructuralObstacle(candidate)) ?? shortest(attachments, (candidate) => !intersectsStructuralObstacle(candidate)) ?? route;
  }
  return sameSides.find((candidate) => !intersectsObstacle(candidate)) ?? shortest(preservedTargets, (candidate) => !intersectsObstacle(candidate)) ?? attachments.find((candidate) => !intersectsObstacle(candidate)) ?? shortest(preservedSources, (candidate) => !intersectsObstacle(candidate)) ?? shortest(attachments, (candidate) => !intersectsStructuralObstacle(candidate)) ?? shortest(preservedSources, (candidate) => !intersectsStructuralObstacle(candidate)) ?? route;
}
function avoidLabelOverlap(route, otherRoutes, bounds, subgraphBounds, targetWidth, includeLabelWidth = true) {
  if (!route.edge.label)
    return route;
  const nodeBounds = [...bounds.values()];
  const frameBounds = [...subgraphBounds?.values() ?? []];
  const otherLabels = otherRoutes.flatMap((other) => other.edge.label ? [flowchartRouteLabelLayout(other, diagramTextWidth)] : []);
  const otherConnectorBounds = otherRoutes.flatMap((other) => {
    const source = bounds.get(other.edge.from);
    const sourcePoint = other.points[0];
    if (!source || !sourcePoint)
      return [];
    const connector = flowchartSourceConnector(source, sourcePoint);
    return [
      { left: connector.x, top: connector.y, width: 1, height: 1 },
      { left: sourcePoint.x, top: sourcePoint.y, width: 1, height: 1 }
    ];
  });
  const hasParallelRoute = otherRoutes.some((other) => other.edge.from === route.edge.from && other.edge.to === route.edge.to);
  const intersectsObstacle = (label) => targetWidth !== undefined && (hasParallelRoute || !includeLabelWidth ? label.point.x > targetWidth : label.point.x + label.width > targetWidth) || nodeBounds.some((bound) => labelIntersectsBounds(label, bound)) || frameBounds.some((bound) => labelIntersectsSubgraphFrame(label, bound)) || labelIntersectsLabels(label, otherLabels) || labelIntersectsRoutePaths(label, otherRoutes) || otherConnectorBounds.some((bound) => labelIntersectsBounds(label, bound));
  const current = flowchartRouteLabelLayout(route, diagramTextWidth);
  if (!intersectsObstacle(current))
    return route;
  const seen = new Set;
  let remaining = ROUTING_CANDIDATE_BUDGET;
  const available = (candidate) => {
    remaining--;
    const key = `${candidate.x}:${candidate.y}`;
    if (seen.has(key))
      return false;
    seen.add(key);
    return !intersectsObstacle({ ...current, point: candidate });
  };
  for (let index = 1;index < route.points.length && remaining > 0; index++) {
    const segment = segmentBetween(route.points[index - 1], route.points[index]);
    if (!segment)
      continue;
    const label = flowchartEdgeLabelLayout(route.points, route.edge.label, diagramTextWidth, route.labelAxis, index - 1);
    const fixed = segment.axis === "y" ? [label.point, { x: segment.from.x - label.width, y: label.point.y }] : [
      label.point,
      { x: label.point.x, y: segment.from.y - label.height },
      { x: label.point.x, y: segment.from.y + 1 }
    ];
    for (const candidate of fixed) {
      if (remaining <= 0)
        return route;
      if (available(candidate))
        return { ...route, labelPoint: candidate };
    }
    if (segment.axis === "y") {
      const bottom = Math.max(segment.from.y, segment.to.y) - label.height + 1;
      for (let y = Math.min(segment.from.y, segment.to.y);y <= bottom && remaining > 0; y++) {
        for (const x of [segment.from.x + 1, segment.from.x - label.width]) {
          const candidate = { x, y };
          if (available(candidate))
            return { ...route, labelPoint: candidate };
          if (remaining <= 0)
            return route;
        }
      }
      continue;
    }
    const right = Math.max(segment.from.x, segment.to.x) - label.width + 1;
    for (let x = Math.min(segment.from.x, segment.to.x);x <= right && remaining > 0; x++) {
      for (const y of [segment.from.y, segment.from.y - label.height, segment.from.y + 1]) {
        const candidate = { x, y };
        if (available(candidate))
          return { ...route, labelPoint: candidate };
        if (remaining <= 0)
          return route;
      }
    }
  }
  if (targetWidth !== undefined && includeLabelWidth && current.point.x + current.width > targetWidth) {
    const x = Math.max(0, targetWidth - current.width);
    for (let distance = 0;distance < 100; distance++) {
      for (const y of distance === 0 ? [current.point.y] : [current.point.y - distance, current.point.y + distance]) {
        if (y < 0 || intersectsObstacle({ ...current, point: { x, y } }))
          continue;
        return { ...route, labelPoint: { x, y } };
      }
    }
  }
  return route;
}
function routeFlowchartEdges(diagram, bounds, directionForEdge = () => diagram.direction, subgraphBounds, targetWidth, directionAligned = false) {
  const routedDiagram = { ...diagram, edges: diagram.edges.filter((edge) => !edge.orderOnly) };
  const handled = new Set;
  const routes = [];
  const leftBoundary = subgraphBounds ? Math.min(...[...bounds.values(), ...subgraphBounds.values()].map((bound) => bound.left)) : undefined;
  routeParallelEdges(routedDiagram, bounds, directionForEdge, directionAligned, handled, routes);
  for (const direction of ["LR", "RL"]) {
    const horizontalEdges = routedDiagram.edges.filter((edge) => !handled.has(edge) && directionForEdge(edge) === direction);
    if (horizontalEdges.length === 0)
      continue;
    const records = horizontalForwardRecords(horizontalEdges, bounds, direction);
    routeHorizontalFanOut(records, bounds, direction, handled, routes);
    routeHorizontalFanIn(records, direction, handled, routes);
  }
  routeHorizontalSubgraphExitFanIn(routedDiagram, bounds, subgraphBounds, handled, routes);
  routeHorizontalSubgraphEntries(routedDiagram, bounds, subgraphBounds, handled, routes);
  for (const direction of ["TD", "TB", "BT"]) {
    const verticalEdges = routedDiagram.edges.filter((edge) => !handled.has(edge) && directionForEdge(edge) === direction);
    if (verticalEdges.length === 0)
      continue;
    const records = verticalForwardRecords(verticalEdges, bounds, direction);
    routeVerticalFanOut(records, direction, handled, routes);
    routeVerticalFanIn(records, direction, handled, routes);
  }
  for (const edge of routedDiagram.edges) {
    if (handled.has(edge))
      continue;
    const from = bounds.get(edge.from);
    const to = bounds.get(edge.to);
    if (!from || !to)
      continue;
    routes.push({ edge, points: edgePath(from, to, directionForEdge(edge), leftBoundary) });
  }
  for (let index = routes.length - 1;index >= 0; index--) {
    routes[index] = avoidNodeObstacles(routes[index], routes, bounds, subgraphBounds, index, routedDiagram);
  }
  const subgraphs = diagram.subgraphs ?? [];
  const subgraphById = new Map(subgraphs.map((subgraph) => [subgraph.id, subgraph]));
  const containers = (id) => {
    const ids = new Set;
    let current = subgraphs.find((subgraph) => subgraph.nodeIds.includes(id));
    while (current) {
      ids.add(current.id);
      current = current.parentId ? subgraphById.get(current.parentId) : undefined;
    }
    return ids;
  };
  const groupedLabelEdge = (edge) => {
    const fromContainers = containers(edge.from);
    if (![...containers(edge.to)].some((id) => fromContainers.has(id)))
      return false;
    const targets = new Set(routedDiagram.edges.filter((candidate) => candidate.label && candidate.from === edge.from).map((candidate) => candidate.to));
    const sources = new Set(routedDiagram.edges.filter((candidate) => candidate.label && candidate.to === edge.to).map((candidate) => candidate.from));
    return targets.size > 1 || sources.size > 1;
  };
  return routes.reduce((resolved, route, index) => {
    const grouped = groupedLabelEdge(route.edge);
    return [
      ...resolved,
      avoidLabelOverlap(route, [...resolved, ...routes.slice(index + 1)], bounds, subgraphBounds, targetWidth !== undefined && subgraphs.length > 0 && grouped ? Math.max(1, targetWidth - 5) : targetWidth, subgraphs.length === 0 || grouped)
    ];
  }, []);
}
function avoidFlowchartFrameBorders(routes, bounds, subgraphBounds) {
  const inside = (node, frame) => node.left >= frame.left && node.top >= frame.top && node.left + node.width <= frame.left + frame.width && node.top + node.height <= frame.top + frame.height;
  for (const route of routes) {
    const source = bounds.get(route.edge.from);
    const target = bounds.get(route.edge.to);
    for (const frame of subgraphBounds.values()) {
      const inward = Boolean(source && target && inside(source, frame) && inside(target, frame));
      const right = frame.left + frame.width - 1;
      const bottom = frame.top + frame.height - 1;
      const points = [route.points[0]];
      for (let index = 1;index < route.points.length; index++) {
        const from = route.points[index - 1];
        const to = route.points[index];
        const segment = segmentBetween(from, to);
        if (!segment)
          continue;
        const span = segmentSpan(segment);
        const horizontalSide = segment.axis === "x" && Math.min(span.end, right) > Math.max(span.start, frame.left) ? segment.from.y === frame.top ? "top" : segment.from.y === bottom ? "bottom" : undefined : undefined;
        const verticalSide = segment.axis === "y" && Math.min(span.end, bottom) > Math.max(span.start, frame.top) ? segment.from.x === frame.left ? "left" : segment.from.x === right ? "right" : undefined : undefined;
        if (!horizontalSide && !verticalSide) {
          points.push(to);
          continue;
        }
        const offset = horizontalSide ? horizontalSide === "top" ? frame.top + (inward ? 1 : -1) : bottom + (inward ? -1 : 1) : verticalSide === "left" ? frame.left + (inward ? 1 : -1) : right + (inward ? -1 : 1);
        if (horizontalSide)
          points.push({ x: from.x, y: offset }, { x: to.x, y: offset }, to);
        else
          points.push({ x: offset, y: from.y }, { x: offset, y: to.y }, to);
      }
      route.points = pathThrough(points);
    }
  }
}
function sideForOutsidePoint(bounds, sourcePoint) {
  if (sourcePoint.x < bounds.left)
    return "left";
  if (sourcePoint.x >= bounds.left + bounds.width)
    return "right";
  if (sourcePoint.y < bounds.top)
    return "top";
  return "bottom";
}
function connectorChar(side) {
  switch (side) {
    case "left":
      return "\u2524";
    case "right":
      return "\u251C";
    case "top":
      return "\u2534";
    case "bottom":
      return "\u252C";
  }
}
function flowchartSourceConnector(from, sourcePoint) {
  const side = sideForOutsidePoint(from, sourcePoint);
  const connector = boundsSidePoint(from, side, "border");
  return {
    x: side === "top" || side === "bottom" ? sourcePoint.x : connector.x,
    y: side === "left" || side === "right" ? sourcePoint.y : connector.y,
    char: connectorChar(side)
  };
}

// src/merman/flowchart/layout.ts
var DEFAULT_MIN_NODE_GAP = 5;
var DEFAULT_MIN_BRANCH_LABEL_GAP = 12;
var DEFAULT_MAX_UNLABELED_RANK_WIDTH = 120;
var DEFAULT_MIN_RANK_GAP = 7;
var DEFAULT_MIN_VERTICAL_RANK_GAP = 4;
var COMPACT_MIN_RANK_GAP = 4;
var COMPACT_MIN_VERTICAL_RANK_GAP = 2;
var SUBGRAPH_PADDING_X = 2;
var SUBGRAPH_PADDING_TOP = 1;
var SUBGRAPH_PADDING_BOTTOM = 1;
function horizontalRankGaps(diagram, normalizedRanks, rankKeys, fallback) {
  const gaps = Array.from({ length: Math.max(0, rankKeys.length - 1) }, () => fallback);
  const rankIndexes = new Map(rankKeys.map((rank, index) => [rank, index]));
  for (const edge of diagram.edges) {
    if (!edge.label)
      continue;
    const fromIndex = rankIndexes.get(normalizedRanks.get(edge.from) ?? -1);
    const toIndex = rankIndexes.get(normalizedRanks.get(edge.to) ?? -1);
    if (fromIndex === undefined || toIndex === undefined || fromIndex === toIndex)
      continue;
    const labelGap = flowchartHorizontalLabelRankGap(flowchartLabelWidth(edge.label, visualLength));
    for (let index = Math.min(fromIndex, toIndex);index < Math.max(fromIndex, toIndex); index++) {
      gaps[index] = Math.max(gaps[index], labelGap);
    }
  }
  return gaps;
}
function verticalRankGaps(diagram, normalizedRanks, rankKeys, fallback) {
  const gaps = Array.from({ length: Math.max(0, rankKeys.length - 1) }, () => fallback);
  const rankIndexes = new Map(rankKeys.map((rank, index) => [rank, index]));
  for (const edge of diagram.edges) {
    if (!edge.label)
      continue;
    const fromIndex = rankIndexes.get(normalizedRanks.get(edge.from) ?? -1);
    const toIndex = rankIndexes.get(normalizedRanks.get(edge.to) ?? -1);
    if (fromIndex === undefined || toIndex === undefined || fromIndex === toIndex)
      continue;
    const labelHeight = splitDiagramLines(edge.label).length;
    for (let index = Math.min(fromIndex, toIndex);index < Math.max(fromIndex, toIndex); index++) {
      gaps[index] = Math.max(gaps[index], labelHeight + 2);
    }
  }
  return gaps;
}
function isHorizontalDirection(direction) {
  return direction === "LR" || direction === "RL";
}
function visualLength(value) {
  return diagramTextWidth(value);
}
function normalizePositiveInt(value, fallback) {
  if (value === undefined || !Number.isFinite(value))
    return fallback;
  return Math.max(1, Math.trunc(value));
}
function nodeSize(node) {
  const { lines, width } = measureDiagramTextBox(node.label, { paddingX: 2 });
  const innerWidth = width - 4;
  if (node.shape === "decision") {
    const width = innerWidth + 6;
    return {
      width: width % 2 === 0 ? width + 1 : width,
      height: Math.max(5, lines.length + 4),
      lines
    };
  }
  if (node.shape === "circle")
    return { width: Math.max(9, innerWidth + 6), height: Math.max(5, lines.length + 4), lines };
  if (node.shape === "hexagon")
    return { width: Math.max(9, innerWidth + 6), height: Math.max(5, lines.length + 4), lines };
  if (node.shape === "parallelogram")
    return { width: innerWidth + 6, height: lines.length + 2, lines };
  if (node.shape === "database")
    return { width: innerWidth + 4, height: lines.length + 4, lines };
  if (node.shape === "subroutine")
    return { width: innerWidth + 6, height: lines.length + 2, lines };
  return { width: innerWidth + 4, height: lines.length + 2, lines };
}
function rankNodes(diagram) {
  const ranks = new Map;
  const outgoing = new Map;
  const incoming = new Set;
  const incomingCounts = new Map(diagram.nodes.map((node) => [node.id, 0]));
  const nodeIds = new Set(diagram.nodes.map((node) => node.id));
  const rankEdges = diagram.edges.flatMap((edge) => {
    if (!edge.orderOnly)
      return [edge];
    const fromIds = nodeIds.has(edge.from) ? [edge.from] : [...collectSubgraphNodeIds(diagram, edge.from)];
    const toIds = nodeIds.has(edge.to) ? [edge.to] : [...collectSubgraphNodeIds(diagram, edge.to)];
    return fromIds.flatMap((from) => toIds.map((to) => ({ ...edge, from, to })));
  });
  for (const edge of rankEdges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
    incoming.add(edge.to);
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) ?? 0) + 1);
  }
  const starts = diagram.nodes.filter((node) => !incoming.has(node.id));
  if (starts.length === 0 && diagram.nodes[0])
    starts.push(diagram.nodes[0]);
  const queue = starts.map((node) => node.id);
  for (const node of starts)
    ranks.set(node.id, 0);
  for (let index = 0;index < queue.length; index++) {
    const id = queue[index];
    const rank = ranks.get(id) ?? 0;
    for (const to of outgoing.get(id) ?? []) {
      const nextRank = rank + 1;
      if ((ranks.get(to) ?? Number.POSITIVE_INFINITY) <= nextRank)
        continue;
      ranks.set(to, nextRank);
      queue.push(to);
    }
  }
  for (const node of diagram.nodes) {
    if (!ranks.has(node.id))
      ranks.set(node.id, ranks.size);
  }
  const acyclicRanks = new Map;
  const acyclicQueue = diagram.nodes.filter((node) => incomingCounts.get(node.id) === 0).map((node) => node.id);
  for (const id of acyclicQueue)
    acyclicRanks.set(id, 0);
  for (let index = 0;index < acyclicQueue.length; index++) {
    const id = acyclicQueue[index];
    const rank = acyclicRanks.get(id) ?? 0;
    for (const to of outgoing.get(id) ?? []) {
      acyclicRanks.set(to, Math.max(acyclicRanks.get(to) ?? 0, rank + 1));
      const remainingIncoming = (incomingCounts.get(to) ?? 0) - 1;
      incomingCounts.set(to, remainingIncoming);
      if (remainingIncoming === 0)
        acyclicQueue.push(to);
    }
  }
  for (const [id, rank] of acyclicRanks)
    ranks.set(id, rank);
  return ranks;
}
function translateBounds(bounds, dx, dy) {
  translateDiagramBounds(bounds, dx, dy);
}
function translateRoutes(routes, dx, dy) {
  for (const route of routes) {
    for (const point of route.points) {
      point.x += dx;
      point.y += dy;
    }
    if (route.labelPoint) {
      route.labelPoint.x += dx;
      route.labelPoint.y += dy;
    }
  }
}
function freezeRouteLabelPoints(routes) {
  for (const route of routes) {
    if (!route.edge.label || route.labelPoint)
      continue;
    route.labelPoint = flowchartEdgeLabelLayout(route.points, route.edge.label, visualLength, route.labelAxis).point;
  }
}
function boundsFromChildren(children) {
  return diagramBoundsFromBounds(children);
}
function subgraphBoundFromChildren(id, label, children) {
  const labelLines = splitDiagramLines(label);
  const labelHeight = labelLines.length;
  let left = Math.min(...children.map((child) => child.left)) - SUBGRAPH_PADDING_X;
  const top = Math.min(...children.map((child) => child.top)) - Math.max(SUBGRAPH_PADDING_TOP, labelHeight);
  let right = Math.max(...children.map((child) => child.left + child.width)) + SUBGRAPH_PADDING_X;
  const bottom = Math.max(...children.map((child) => child.top + child.height)) + Math.max(SUBGRAPH_PADDING_BOTTOM, labelHeight);
  const minWidth = Math.max(...labelLines.map(visualLength)) + 5;
  if (right - left < minWidth) {
    const extra = minWidth - (right - left);
    left -= Math.floor(extra / 2);
    right += Math.ceil(extra / 2);
  }
  const width = right - left;
  const height = Math.max(3, bottom - top);
  return {
    id,
    label,
    left,
    top,
    width,
    height,
    centerX: left + Math.floor(width / 2),
    centerY: top + Math.floor(height / 2),
    labelSide: "top"
  };
}
function spansOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}
function labelSlot(bounds, side) {
  const lines = splitDiagramLines(bounds.label);
  const left = bounds.left + 2;
  const height = lines.length;
  const top = side === "top" ? bounds.top : bounds.top + bounds.height - height;
  const width = Math.max(...lines.map((line) => visualLength(` ${line} `)));
  return { left, top, width, height, centerX: left + Math.floor(width / 2), centerY: top + Math.floor(height / 2) };
}
function segmentOverlapsSlot(from, to, slot) {
  const segment = segmentBetween(from, to);
  if (!segment)
    return false;
  const slotRight = slot.left + slot.width - 1;
  const slotBottom = slot.top + slot.height - 1;
  const span = segmentSpan(segment);
  if (segment.axis === "x") {
    return segment.from.y >= slot.top && segment.from.y <= slotBottom && spansOverlap(span.start, span.end, slot.left, slotRight);
  }
  return segment.from.x >= slot.left && segment.from.x <= slotRight && spansOverlap(span.start, span.end, slot.top, slotBottom);
}
function routeOverlapsSlot(route, slot) {
  for (let index = 1;index < route.points.length; index++) {
    if (segmentOverlapsSlot(route.points[index - 1], route.points[index], slot))
      return true;
  }
  const routeLabelBounds = labelBounds(route);
  if (!routeLabelBounds || !spansOverlap(routeLabelBounds.top, routeLabelBounds.top + routeLabelBounds.height - 1, slot.top, slot.top + slot.height - 1)) {
    return false;
  }
  return spansOverlap(routeLabelBounds.left, routeLabelBounds.left + routeLabelBounds.width - 1, slot.left, slot.left + slot.width - 1);
}
function chooseSubgraphLabelSide(bounds, routes) {
  const topSlot = labelSlot(bounds, "top");
  if (!routes.some((route) => routeOverlapsSlot(route, topSlot)))
    return "top";
  const bottomSlot = labelSlot(bounds, "bottom");
  return routes.some((route) => routeOverlapsSlot(route, bottomSlot)) ? "top" : "bottom";
}
function pathBounds(points) {
  return diagramBoundsFromPoints(points);
}
function labelBounds(route) {
  if (!route.edge.label)
    return;
  const label = flowchartRouteLabelLayout(route, visualLength);
  const { point, width, height } = label;
  return {
    left: point.x,
    top: point.y,
    width,
    height,
    centerX: point.x + Math.floor(width / 2),
    centerY: point.y + Math.floor(height / 2)
  };
}
function subgraphRouteBounds(subgraphNodeIds, routes) {
  return routeRenderBounds(routes.filter((route) => subgraphNodeIds.has(route.edge.from) && subgraphNodeIds.has(route.edge.to)));
}
function routeRenderBounds(routes) {
  const bounds = [];
  for (const route of routes) {
    const routeBounds = pathBounds(route.points);
    if (routeBounds)
      bounds.push(routeBounds);
    const routeLabelBounds = labelBounds(route);
    if (routeLabelBounds)
      bounds.push(routeLabelBounds);
  }
  return bounds;
}
function layoutRankedNodes(diagram, direction, sizes, minNodeGap, requestedMinRankGap, targetWidth) {
  const horizontal = isHorizontalDirection(direction);
  const ranks = rankNodes(diagram);
  const maxRank = Math.max(0, ...ranks.values());
  const ranksByIndex = new Map;
  const normalizedRanks = new Map;
  for (const node of diagram.nodes) {
    const rank = ranks.get(node.id) ?? 0;
    const normalizedRank = direction === "RL" || direction === "BT" ? maxRank - rank : rank;
    normalizedRanks.set(node.id, normalizedRank);
    const nodes = ranksByIndex.get(normalizedRank) ?? [];
    nodes.push(node);
    ranksByIndex.set(normalizedRank, nodes);
  }
  const spaciousNodeGap = Math.max(minNodeGap, DEFAULT_MIN_BRANCH_LABEL_GAP);
  const widestUnlabeledRank = Math.max(0, ...[...ranksByIndex.values()].map((nodes) => nodes.reduce((total, node) => total + sizes.get(node.id).width, 0) + Math.max(0, nodes.length - 1) * spaciousNodeGap));
  const verticalNodeGap = (rank) => {
    const widestLabel = Math.max(0, ...diagram.edges.filter((edge) => edge.label && (normalizedRanks.get(edge.from) === rank || normalizedRanks.get(edge.to) === rank)).map((edge) => flowchartLabelWidth(edge.label, visualLength)));
    if (widestLabel > 0)
      return Math.max(spaciousNodeGap, flowchartVerticalBranchLabelGap(widestLabel));
    return widestUnlabeledRank > DEFAULT_MAX_UNLABELED_RANK_WIDTH ? minNodeGap : spaciousNodeGap;
  };
  const rankKeys = [...ranksByIndex.keys()].sort((a, b) => a - b);
  const horizontalGaps = horizontal ? horizontalRankGaps(diagram, normalizedRanks, rankKeys, requestedMinRankGap) : [];
  const verticalGaps = horizontal ? [] : verticalRankGaps(diagram, normalizedRanks, rankKeys, requestedMinRankGap);
  const bounds = new Map;
  let wrapped = false;
  if (horizontal) {
    const columnWidths = rankKeys.map((rank) => Math.max(...ranksByIndex.get(rank).map((node) => sizes.get(node.id).width)));
    const columnHeights = rankKeys.map((rank) => {
      const nodes = ranksByIndex.get(rank);
      return nodes.reduce((total, node) => total + sizes.get(node.id).height, 0) + Math.max(0, nodes.length - 1) * minNodeGap;
    });
    const canvasHeight = Math.max(1, ...columnHeights);
    const centerBaseline = Math.floor(canvasHeight / 2);
    let x = 0;
    for (let rankIndex = 0;rankIndex < rankKeys.length; rankIndex++) {
      const rank = rankKeys[rankIndex];
      const nodes = ranksByIndex.get(rank);
      const columnWidth = columnWidths[rankIndex];
      let y = centerBaseline - Math.floor(columnHeights[rankIndex] / 2);
      for (const node of nodes) {
        const size = sizes.get(node.id);
        const left = x + Math.floor((columnWidth - size.width) / 2);
        bounds.set(node.id, {
          id: node.id,
          ...size,
          left,
          top: y,
          centerX: left + Math.floor(size.width / 2),
          centerY: y + Math.floor(size.height / 2)
        });
        y += size.height + minNodeGap;
      }
      x += columnWidth + (horizontalGaps[rankIndex] ?? 0);
    }
  } else {
    const rankBands = rankKeys.map((rank) => {
      const nodes = ranksByIndex.get(rank);
      const roomyNodeGap = verticalNodeGap(rank);
      const naturalWidth = nodes.reduce((total, node) => total + sizes.get(node.id).width, 0) + Math.max(0, nodes.length - 1) * roomyNodeGap;
      const labeledEdges = diagram.edges.filter((edge) => edge.label && (normalizedRanks.get(edge.from) === rank || normalizedRanks.get(edge.to) === rank));
      const needsLabelLanes = labeledEdges.length > 1 && labeledEdges.some((edge) => {
        const targets = new Set(labeledEdges.filter((candidate) => candidate.from === edge.from).map((candidate) => candidate.to));
        const sources = new Set(labeledEdges.filter((candidate) => candidate.to === edge.to).map((candidate) => candidate.from));
        const grouped = (ids) => !diagram.subgraphs?.length || diagram.subgraphs.some((subgraph) => ids.every((id) => subgraph.nodeIds.includes(id)));
        return targets.size > 1 && grouped([edge.from, ...targets]) || sources.size > 1 && grouped([edge.to, ...sources]);
      });
      const nodeGap = targetWidth !== undefined && naturalWidth > targetWidth && (!needsLabelLanes || !diagram.subgraphs?.length) ? minNodeGap : roomyNodeGap;
      const bands = [];
      for (const node of nodes) {
        const size = sizes.get(node.id);
        const current = bands.at(-1);
        const width = current ? current.width + nodeGap + size.width : size.width;
        if (current && targetWidth !== undefined && width > targetWidth) {
          wrapped = true;
          bands.push({ nodes: [node], width: size.width, height: size.height });
          continue;
        }
        if (!current) {
          bands.push({ nodes: [node], width: size.width, height: size.height });
          continue;
        }
        current.nodes.push(node);
        current.width = width;
        current.height = Math.max(current.height, size.height);
      }
      return { bands, nodeGap };
    });
    const canvasWidth = Math.max(1, ...rankBands.flatMap((rank) => rank.bands.map((band) => band.width)));
    let y = 0;
    for (let rankIndex = 0;rankIndex < rankKeys.length; rankIndex++) {
      const rank = rankBands[rankIndex];
      for (const [bandIndex, band] of rank.bands.entries()) {
        let x = Math.floor((canvasWidth - band.width) / 2);
        for (const node of band.nodes) {
          const size = sizes.get(node.id);
          const top = y + Math.floor((band.height - size.height) / 2);
          bounds.set(node.id, {
            id: node.id,
            ...size,
            left: x,
            top,
            centerX: x + Math.floor(size.width / 2),
            centerY: top + Math.floor(size.height / 2)
          });
          x += size.width + rank.nodeGap;
        }
        y += band.height + (bandIndex < rank.bands.length - 1 ? minNodeGap : 0);
      }
      y += verticalGaps[rankIndex] ?? 0;
    }
  }
  return { bounds, wrapped };
}
function layoutLocalSubgraphDirections(diagram, nodeBounds, minNodeGap, requestedMinRankGap, targetWidth) {
  let wrapped = false;
  const subgraphs = diagram.subgraphs ?? [];
  const subgraphById = new Map(subgraphs.map((subgraph) => [subgraph.id, subgraph]));
  for (const subgraph of [...subgraphs].reverse()) {
    let parent = subgraph.parentId ? subgraphById.get(subgraph.parentId) : undefined;
    while (parent && !parent.direction)
      parent = parent.parentId ? subgraphById.get(parent.parentId) : undefined;
    const direction = subgraph.direction ?? (parent && subgraphs.filter((child) => child.parentId === parent.id).length > 1 ? parent.direction : undefined);
    if (!direction || direction === diagram.direction)
      continue;
    const childSubgraphs = subgraphs.filter((child) => child.parentId === subgraph.id);
    const coveredNodeIds = new Set(childSubgraphs.flatMap((child) => [...collectSubgraphNodeIds(diagram, child.id)]));
    const items = [
      ...childSubgraphs.flatMap((child) => {
        const nodeIds = [...collectSubgraphNodeIds(diagram, child.id)];
        const content = boundsFromChildren(nodeIds.flatMap((id) => nodeBounds.get(id) ?? []));
        const bounds = content ? subgraphBoundFromChildren(child.id, child.label, [content]) : undefined;
        return bounds ? [{ id: `subgraph:${child.id}`, nodeIds, bounds, childId: child.id }] : [];
      }),
      ...subgraph.nodeIds.flatMap((id) => {
        if (coveredNodeIds.has(id))
          return [];
        const bounds = nodeBounds.get(id);
        return bounds ? [{ id, nodeIds: [id], bounds, childId: undefined }] : [];
      })
    ];
    if (items.length === 0)
      continue;
    const currentBounds = boundsFromChildren(items.map((item) => item.bounds));
    if (!currentBounds)
      continue;
    const itemByEndpoint = new Map;
    for (const item of items) {
      for (const nodeId of item.nodeIds)
        itemByEndpoint.set(nodeId, item.id);
      if (item.childId)
        itemByEndpoint.set(item.childId, item.id);
    }
    const nodes = items.map((item) => ({ id: item.id, label: item.id, shape: "box" }));
    const localDiagram = {
      direction,
      nodes,
      edges: diagram.edges.flatMap((edge) => {
        const from = itemByEndpoint.get(edge.from);
        const to = itemByEndpoint.get(edge.to);
        return from && to && from !== to ? [{ ...edge, from, to }] : [];
      }),
      subgraphs: []
    };
    const itemSizes = new Map(items.map((item) => [item.id, { width: item.bounds.width, height: item.bounds.height, lines: [item.id] }]));
    const localLayout = layoutRankedNodes(localDiagram, direction, itemSizes, Math.max(minNodeGap, SUBGRAPH_PADDING_X * 2 + 1), requestedMinRankGap, targetWidth);
    const localBounds = localLayout.bounds;
    wrapped ||= localLayout.wrapped;
    const localExtent = boundsFromChildren([...localBounds.values()]);
    if (!localExtent)
      continue;
    const targetLeft = currentBounds.left + Math.floor((currentBounds.width - localExtent.width) / 2);
    const targetTop = currentBounds.top + Math.floor((currentBounds.height - localExtent.height) / 2);
    const dx = targetLeft - localExtent.left;
    const dy = targetTop - localExtent.top;
    const translations = new Map;
    for (const item of items) {
      const bound = localBounds.get(item.id);
      const itemDx = bound.left + dx - item.bounds.left;
      const itemDy = bound.top + dy - item.bounds.top;
      for (const nodeId of item.nodeIds)
        translations.set(nodeId, { dx: itemDx, dy: itemDy });
    }
    let groupOffset = { x: 0, y: 0 };
    if (targetWidth !== undefined) {
      const localNodeIds = new Set(translations.keys());
      const external = [...nodeBounds.entries()].filter(([id]) => !localNodeIds.has(id)).map(([, bound]) => bound);
      const overlaps = (offset) => [...translations].some(([id, translation]) => {
        const bound = nodeBounds.get(id);
        const left = bound.left + translation.dx + offset.x;
        const top = bound.top + translation.dy + offset.y;
        return external.some((other) => left < other.left + other.width + minNodeGap && left + bound.width + minNodeGap > other.left && top < other.top + other.height + minNodeGap && top + bound.height + minNodeGap > other.top);
      });
      if (overlaps(groupOffset)) {
        const vertical = !isHorizontalDirection(diagram.direction);
        const sign = diagram.direction === "RL" || diagram.direction === "BT" ? -1 : 1;
        let found = false;
        search:
          for (let distance = 1;distance < 1000; distance++) {
            const candidates = vertical ? [
              { x: 0, y: sign * distance },
              { x: 0, y: -sign * distance },
              { x: distance, y: 0 },
              { x: -distance, y: 0 }
            ] : [
              { x: sign * distance, y: 0 },
              { x: -sign * distance, y: 0 },
              { x: 0, y: distance },
              { x: 0, y: -distance }
            ];
            for (const candidate of candidates) {
              if (overlaps(candidate))
                continue;
              groupOffset = candidate;
              found = true;
              break search;
            }
          }
        if (!found)
          throw new Error(`Subgraph ${subgraph.id} has no collision-free responsive position`);
      }
    }
    for (const [nodeId, translation] of translations) {
      const nodeBound = nodeBounds.get(nodeId);
      if (nodeBound)
        translateBounds(nodeBound, translation.dx + groupOffset.x, translation.dy + groupOffset.y);
    }
  }
  return wrapped;
}
function edgeDirection(diagram, edge) {
  for (const subgraph of [...diagram.subgraphs ?? []].reverse()) {
    if (!subgraph.direction)
      continue;
    if (subgraph.nodeIds.includes(edge.from) && subgraph.nodeIds.includes(edge.to))
      return subgraph.direction;
  }
  return diagram.direction;
}
function collectSubgraphNodeIds(diagram, subgraphId) {
  const nodeIds = new Set;
  for (const subgraph of diagram.subgraphs ?? []) {
    if (subgraph.id !== subgraphId && subgraph.parentId !== subgraphId)
      continue;
    for (const nodeId of subgraph.nodeIds)
      nodeIds.add(nodeId);
    if (subgraph.parentId === subgraphId) {
      for (const nodeId of collectSubgraphNodeIds(diagram, subgraph.id))
        nodeIds.add(nodeId);
    }
  }
  return nodeIds;
}
function rankGraphComponents(ids, outgoing) {
  const reachable = new Map;
  for (const id of ids) {
    const seen = new Set;
    const queue = [id];
    for (let index = 0;index < queue.length; index++) {
      const current = queue[index];
      if (seen.has(current))
        continue;
      seen.add(current);
      queue.push(...outgoing.get(current) ?? []);
    }
    reachable.set(id, seen);
  }
  const componentById = new Map;
  const components = [];
  for (const id of ids) {
    if (componentById.has(id))
      continue;
    const component = ids.filter((candidate) => !componentById.has(candidate) && reachable.get(id).has(candidate) && reachable.get(candidate).has(id));
    const componentIndex = components.length;
    components.push(component);
    for (const member of component)
      componentById.set(member, componentIndex);
  }
  const componentOutgoing = new Map(components.map((_, index) => [index, new Set]));
  const incoming = new Map(components.map((_, index) => [index, 0]));
  for (const [from, targets] of outgoing) {
    const fromComponent = componentById.get(from);
    for (const to of targets) {
      const toComponent = componentById.get(to);
      if (fromComponent === toComponent || componentOutgoing.get(fromComponent).has(toComponent))
        continue;
      componentOutgoing.get(fromComponent).add(toComponent);
      incoming.set(toComponent, incoming.get(toComponent) + 1);
    }
  }
  const componentRanks = new Map;
  const queue = components.map((_, index) => index).filter((index) => incoming.get(index) === 0);
  for (const component of queue)
    componentRanks.set(component, 0);
  for (let index = 0;index < queue.length; index++) {
    const component = queue[index];
    for (const to of componentOutgoing.get(component)) {
      componentRanks.set(to, Math.max(componentRanks.get(to) ?? 0, componentRanks.get(component) + 1));
      incoming.set(to, incoming.get(to) - 1);
      if (incoming.get(to) === 0)
        queue.push(to);
    }
  }
  return new Map(ids.map((id) => [id, componentRanks.get(componentById.get(id)) ?? 0]));
}
function separateTopLevelItems(diagram, nodeBounds, subgraphBounds, gap, targetWidth) {
  const hasLocalDirection = (diagram.subgraphs ?? []).some((subgraph) => subgraph.direction && subgraph.direction !== diagram.direction);
  const coveredNodeIds = new Set;
  const items = [];
  const itemByEndpoint = new Map;
  const subgraphs = diagram.subgraphs ?? [];
  const topLevelIds = new Set(subgraphs.filter((subgraph) => !subgraph.parentId).map((subgraph) => subgraph.id));
  const subgraphById = new Map(subgraphs.map((subgraph) => [subgraph.id, subgraph]));
  const topLevelSubgraphId = (id) => {
    let current = subgraphById.get(id);
    while (current?.parentId)
      current = subgraphById.get(current.parentId);
    return current?.id ?? id;
  };
  for (const subgraph of subgraphs) {
    if (subgraph.parentId)
      continue;
    const bounds = subgraphBounds.get(subgraph.id);
    const nodeIds = collectSubgraphNodeIds(diagram, subgraph.id);
    if (!bounds || nodeIds.size === 0)
      continue;
    items.push({ id: subgraph.id, bounds, nodeIds, rank: 0 });
    itemByEndpoint.set(subgraph.id, subgraph.id);
    for (const nodeId of nodeIds) {
      coveredNodeIds.add(nodeId);
      itemByEndpoint.set(nodeId, subgraph.id);
    }
  }
  for (const subgraph of subgraphs)
    itemByEndpoint.set(subgraph.id, topLevelSubgraphId(subgraph.id));
  for (const node of diagram.nodes) {
    if (coveredNodeIds.has(node.id))
      continue;
    const bounds = nodeBounds.get(node.id);
    if (!bounds)
      continue;
    items.push({ id: node.id, bounds, nodeIds: new Set([node.id]), rank: 0 });
    itemByEndpoint.set(node.id, node.id);
  }
  if (items.length < 2)
    return false;
  const horizontal = isHorizontalDirection(diagram.direction);
  const moveItem = (item, dx, dy) => {
    for (const nodeId of item.nodeIds) {
      const bounds = nodeBounds.get(nodeId);
      if (bounds)
        translateBounds(bounds, dx, dy);
    }
    if (!topLevelIds.has(item.id))
      return;
    for (const subgraph of subgraphs) {
      if (topLevelSubgraphId(subgraph.id) !== item.id)
        continue;
      const bounds = subgraphBounds.get(subgraph.id);
      if (bounds)
        translateBounds(bounds, dx, dy);
    }
  };
  if (hasLocalDirection) {
    const outgoing = new Map(items.map((item) => [item.id, new Set]));
    for (const edge of diagram.edges) {
      const from = itemByEndpoint.get(edge.from);
      const to = itemByEndpoint.get(edge.to);
      if (from && to && from !== to)
        outgoing.get(from)?.add(to);
    }
    const ranks = rankGraphComponents(items.map((item) => item.id), outgoing);
    items.sort((a, b) => ranks.get(a.id) - ranks.get(b.id) || (horizontal ? a.bounds.centerX - b.bounds.centerX : a.bounds.centerY - b.bounds.centerY));
    let cursor;
    let moved = false;
    for (const item of items) {
      const start = horizontal ? item.bounds.left : item.bounds.top;
      const size = horizontal ? item.bounds.width : item.bounds.height;
      if (cursor === undefined) {
        cursor = start + size + gap;
        continue;
      }
      const shift = cursor - start;
      moved ||= shift !== 0;
      moveItem(item, horizontal ? shift : 0, horizontal ? 0 : shift);
      cursor = start + shift + size + gap;
    }
    return moved;
  }
  const rankedItems = items.filter((item) => topLevelIds.has(item.id));
  if (rankedItems.length < 2)
    return false;
  const itemById = new Map(rankedItems.map((item) => [item.id, item]));
  const outgoing = new Map(rankedItems.map((item) => [item.id, new Set]));
  for (const edge of diagram.edges) {
    const from = itemByEndpoint.get(edge.from);
    const to = itemByEndpoint.get(edge.to);
    if (!from || !to || from === to || !itemById.has(from) || !itemById.has(to) || outgoing.get(from).has(to))
      continue;
    outgoing.get(from).add(to);
  }
  const ranks = rankGraphComponents(rankedItems.map((item) => item.id), outgoing);
  for (const item of rankedItems)
    item.rank = ranks.get(item.id);
  const reversed = diagram.direction === "RL" || diagram.direction === "BT";
  const primaryStart = (item) => {
    const start = horizontal ? item.bounds.left : item.bounds.top;
    const size = horizontal ? item.bounds.width : item.bounds.height;
    return reversed ? -(start + size) : start;
  };
  const itemsByRank = Map.groupBy(rankedItems, (item) => item.rank);
  const rankKeys = [...itemsByRank.keys()].sort((a, b) => a - b);
  let cursor;
  let moved = false;
  for (const rank of rankKeys) {
    const rankItems = itemsByRank.get(rank);
    const start = Math.min(...rankItems.map(primaryStart));
    const end = Math.max(...rankItems.map((item) => primaryStart(item) + (horizontal ? item.bounds.width : item.bounds.height)));
    if (cursor === undefined) {
      cursor = end + gap;
      continue;
    }
    const shift = Math.max(0, cursor - start);
    if (shift > 0) {
      moved = true;
      for (const item of rankItems) {
        const offset = reversed ? -shift : shift;
        moveItem(item, horizontal ? offset : 0, horizontal ? 0 : offset);
      }
    }
    cursor = end + shift + gap;
  }
  for (const rank of rankKeys) {
    const rankItems = itemsByRank.get(rank).toSorted((a, b) => horizontal ? a.bounds.top - b.bounds.top : a.bounds.left - b.bounds.left);
    let crossCursor;
    for (const item of rankItems) {
      const start = horizontal ? item.bounds.top : item.bounds.left;
      const size = horizontal ? item.bounds.height : item.bounds.width;
      if (crossCursor === undefined) {
        crossCursor = start + size + gap;
        continue;
      }
      const shift = Math.max(0, crossCursor - start);
      if (shift > 0) {
        moved = true;
        moveItem(item, horizontal ? 0 : shift, horizontal ? shift : 0);
      }
      crossCursor = start + shift + size + gap;
    }
  }
  if (targetWidth !== undefined && !horizontal) {
    const intersects = (left, right) => [...left.nodeIds].some((leftId) => {
      const leftBounds = nodeBounds.get(leftId);
      return [...right.nodeIds].some((rightId) => {
        const rightBounds = nodeBounds.get(rightId);
        return leftBounds.left <= rightBounds.left + rightBounds.width - 1 && leftBounds.left + leftBounds.width - 1 >= rightBounds.left && leftBounds.top <= rightBounds.top + rightBounds.height - 1 && leftBounds.top + leftBounds.height - 1 >= rightBounds.top;
      });
    });
    for (let rightIndex = 1;rightIndex < items.length; rightIndex++) {
      const right = items[rightIndex];
      for (let leftIndex = 0;leftIndex < rightIndex; leftIndex++) {
        const left = items[leftIndex];
        if (!intersects(left, right))
          continue;
        const leftBounds = boundsFromChildren([...left.nodeIds].map((id) => nodeBounds.get(id)));
        const rightBounds = boundsFromChildren([...right.nodeIds].map((id) => nodeBounds.get(id)));
        const shift = reversed ? leftBounds.top - gap - (rightBounds.top + rightBounds.height) : leftBounds.top + leftBounds.height + gap - rightBounds.top;
        moved ||= shift !== 0;
        moveItem(right, 0, shift);
      }
    }
  }
  return moved;
}
function layoutSubgraphs(diagram, nodeBounds, routes) {
  const subgraphBounds = new Map;
  const subgraphs = diagram.subgraphs ?? [];
  for (const subgraph of [...subgraphs].reverse()) {
    const children = [];
    for (const nodeId of subgraph.nodeIds) {
      const bound = nodeBounds.get(nodeId);
      if (bound)
        children.push(bound);
    }
    children.push(...subgraphRouteBounds(new Set(subgraph.nodeIds), routes));
    for (const childSubgraph of subgraphs) {
      if (childSubgraph.parentId !== subgraph.id)
        continue;
      const bound = subgraphBounds.get(childSubgraph.id);
      if (bound)
        children.push(bound);
    }
    if (children.length > 0) {
      const bound = subgraphBoundFromChildren(subgraph.id, subgraph.label, children);
      bound.labelSide = chooseSubgraphLabelSide(bound, routes);
      subgraphBounds.set(subgraph.id, bound);
    }
  }
  return subgraphBounds;
}
function layoutFlowchartWithDirection(sourceDiagram, options, direction, responsiveFallback = false) {
  const diagram = direction === sourceDiagram.direction ? sourceDiagram : { ...sourceDiagram, direction };
  const horizontal = isHorizontalDirection(direction);
  const minNodeGap = normalizePositiveInt(options.minNodeGap, DEFAULT_MIN_NODE_GAP);
  const requestedMinRankGap = normalizePositiveInt(options.minRankGap, options.compact ? horizontal ? COMPACT_MIN_RANK_GAP : COMPACT_MIN_VERTICAL_RANK_GAP : horizontal ? DEFAULT_MIN_RANK_GAP : DEFAULT_MIN_VERTICAL_RANK_GAP);
  const sizes = new Map(diagram.nodes.map((node) => [node.id, nodeSize(node)]));
  const targetWidth = !horizontal && options.layoutMaxWidth !== undefined && Number.isFinite(options.layoutMaxWidth) ? Math.max(1, Math.trunc(options.layoutMaxWidth)) : undefined;
  const ranked = layoutRankedNodes(diagram, direction, sizes, minNodeGap, requestedMinRankGap, targetWidth);
  const bounds = ranked.bounds;
  const responsive = layoutLocalSubgraphDirections(diagram, bounds, minNodeGap, requestedMinRankGap, targetWidth);
  const directionAligned = responsiveFallback || responsive || ranked.wrapped;
  const route = (frames) => routeFlowchartEdges(diagram, bounds, (edge) => edgeDirection(diagram, edge), frames, targetWidth, directionAligned);
  const subgraphs = diagram.subgraphs ?? [];
  let subgraphBounds = new Map;
  let routes;
  if (subgraphs.length === 0) {
    routes = route();
  } else {
    routes = route();
    subgraphBounds = layoutSubgraphs(diagram, bounds, routes);
    const moved = separateTopLevelItems(diagram, bounds, subgraphBounds, Math.max(1, Math.floor(requestedMinRankGap / 2)), targetWidth);
    if (moved) {
      routes = route();
      subgraphBounds = layoutSubgraphs(diagram, bounds, routes);
    }
    routes = route(subgraphBounds);
    subgraphBounds = layoutSubgraphs(diagram, bounds, routes);
    const expanded = separateTopLevelItems(diagram, bounds, subgraphBounds, Math.max(1, Math.floor(requestedMinRankGap / 2)), targetWidth);
    if (expanded)
      routes = route(subgraphBounds);
    avoidFlowchartFrameBorders(routes, bounds, subgraphBounds);
  }
  freezeRouteLabelPoints(routes);
  const allBounds = [...bounds.values(), ...subgraphBounds.values(), ...routeRenderBounds(routes)];
  const dx = Math.max(0, -Math.min(0, ...allBounds.map((bound) => bound.left)));
  const dy = Math.max(0, -Math.min(0, ...allBounds.map((bound) => bound.top)));
  if (dx > 0 || dy > 0) {
    for (const bound of allBounds)
      translateBounds(bound, dx, dy);
    translateRoutes(routes, dx, dy);
  }
  const maxX = Math.max(0, ...allBounds.map((bound) => bound.left + bound.width));
  const maxY = Math.max(0, ...allBounds.map((bound) => bound.top + bound.height));
  return { diagram, bounds, routes, subgraphBounds, width: maxX + 4, height: maxY + 4 };
}
function layoutFlowchartDiagram(sourceDiagram, options = {}) {
  const direction = options.direction ?? sourceDiagram.direction;
  const layout = layoutFlowchartWithDirection(sourceDiagram, options, direction);
  const maxWidth = options.layoutMaxWidth;
  if (!isHorizontalDirection(direction) || maxWidth === undefined || !Number.isFinite(maxWidth))
    return layout;
  if (layout.width <= Math.max(1, Math.trunc(maxWidth)))
    return layout;
  return layoutFlowchartWithDirection(sourceDiagram, options, direction === "RL" ? "BT" : "TD", true);
}

// src/merman/flowchart/style.ts
var DEFAULT_THEME_RGB2 = {
  node: [228, 239, 232],
  nodeBorder: [141, 163, 151],
  database: [228, 239, 232],
  databaseBorder: [141, 163, 151],
  edge: [134, 225, 200],
  label: [134, 225, 200],
  group: [76, 99, 89],
  groupLabel: [76, 99, 89]
};
var NODE_EDGE_FADE_STYLES = numberedStyleKeys("nodeEdgeFade", DIAGRAM_FADE_STEPS);
var DATABASE_EDGE_FADE_STYLES = numberedStyleKeys("databaseEdgeFade", DIAGRAM_FADE_STEPS);
function resolveFlowchartStyleColors(colors = {}) {
  const node = colors.node ?? rgba(DEFAULT_THEME_RGB2.node);
  const nodeBorder = colors.nodeBorder ?? rgba(DEFAULT_THEME_RGB2.nodeBorder);
  const database = colors.database ?? rgba(DEFAULT_THEME_RGB2.database);
  const databaseBorder = colors.databaseBorder ?? rgba(DEFAULT_THEME_RGB2.databaseBorder);
  const edge = colors.edge ?? rgba(DEFAULT_THEME_RGB2.edge);
  return {
    node,
    nodeBorder,
    database,
    databaseBorder,
    edge,
    label: colors.label ?? rgba(DEFAULT_THEME_RGB2.label),
    group: colors.group ?? rgba(DEFAULT_THEME_RGB2.group),
    groupLabel: colors.groupLabel ?? colors.group ?? rgba(DEFAULT_THEME_RGB2.groupLabel),
    ...createColorRampTheme(NODE_EDGE_FADE_STYLES, nodeBorder, edge),
    ...createColorRampTheme(DATABASE_EDGE_FADE_STYLES, databaseBorder, edge)
  };
}
function renderGridStyledText(grid, colors, backgrounds) {
  return renderDiagramGridStyledTextByStyle(grid, colors, backgrounds, {
    key: (cell) => [cell.style, cell.attributes],
    attributes: (run) => run.cell.attributes,
    trimTop: true,
    trimBottom: true
  });
}

// src/merman/flowchart/drawing.ts
var DEFAULT_BORDER_STYLE = "rounded";
function mergeFlowchartCell(existing, incoming) {
  if (incoming.style !== "edge")
    return incoming;
  if (existing.style === "label")
    return existing;
  if (incoming.char === " ")
    return existing;
  if (existing.style !== "edge" || existing.char === " ")
    return incoming;
  if (DIAGRAM_ARROW_HEADS.has(existing.char))
    return existing;
  if (DIAGRAM_ARROW_HEADS.has(incoming.char))
    return incoming;
  return {
    ...incoming,
    char: mergeDiagramLineGlyph(existing.char, incoming.char, "rounded") ?? incoming.char
  };
}
function setRichText(grid, x, y, runs, style) {
  let offset = 0;
  for (const run of runs) {
    grid.setText(x + offset, y, run.text, style, run.italic ? { attributes: TextAttributes4.ITALIC } : undefined);
    offset += visualLength(run.text);
  }
  return offset;
}
function drawNode(grid, node, bounds, borderStyle) {
  const chars = BorderChars3[borderStyle];
  const style = node.shape === "database" ? "database" : "node";
  const border = node.shape === "database" ? "databaseBorder" : "nodeBorder";
  if (node.shape === "decision") {
    drawDiagramDiamond(bounds, (x, y, char) => grid.setCell(x, y, char, border), diagramDiamondCharactersFromBorder(chars));
  } else if (node.shape === "circle") {
    fillDiagramFrameInterior(bounds, (x, y) => grid.setCell(x, y, " ", style));
    drawCircleNode(grid, bounds, chars, border);
  } else if (node.shape === "hexagon") {
    fillDiagramFrameInterior(bounds, (x, y) => grid.setCell(x, y, " ", style));
    drawHexagonNode(grid, bounds, chars, border);
  } else if (node.shape === "parallelogram") {
    fillDiagramFrameInterior(bounds, (x, y) => grid.setCell(x, y, " ", style));
    drawParallelogramNode(grid, bounds, chars, border);
  } else if (node.shape === "subroutine") {
    fillDiagramFrameInterior(bounds, (x, y) => grid.setCell(x, y, " ", style));
    drawSubroutineNode(grid, bounds, chars, border);
  } else if (node.shape === "database") {
    fillDiagramFrameInterior(bounds, (x, y) => grid.setCell(x, y, " ", style));
    drawDatabaseNode(grid, bounds, chars, border);
  } else if (node.shape === "rounded") {
    fillDiagramFrameInterior(bounds, (x, y) => grid.setCell(x, y, " ", style));
    drawRoundedNode(grid, bounds, border);
  } else {
    fillDiagramFrameInterior(bounds, (x, y) => grid.setCell(x, y, " ", style));
    drawDiagramFrame(bounds, chars, (x, y, char) => grid.setCell(x, y, char, border));
  }
  const textTop = node.shape === "decision" || node.shape === "circle" || node.shape === "hexagon" ? bounds.top + Math.floor((bounds.height - bounds.lines.length) / 2) : node.shape === "database" ? bounds.top + 2 : bounds.top + 1;
  const lines = parseDiagramTextLines(node.label);
  for (const [index, line] of bounds.lines.entries()) {
    const lineX = node.shape === "subroutine" ? bounds.left + 3 : bounds.left + Math.max(1, Math.floor((bounds.width - visualLength(line)) / 2));
    setRichText(grid, lineX, textTop + index, lines[index].runs, style);
  }
}
function drawRoundedNode(grid, bounds, style) {
  const { left, top, width, height } = bounds;
  const right = left + width - 1;
  const bottom = top + height - 1;
  const chars = BorderChars3.rounded;
  for (const y of [top, bottom]) {
    grid.setCell(left + 1, y, y === top ? chars.topLeft : chars.bottomLeft, style);
    grid.setCell(right - 1, y, y === top ? chars.topRight : chars.bottomRight, style);
    for (let x = left + 2;x < right - 1; x++)
      grid.setCell(x, y, chars.horizontal, style);
  }
  for (let y = top + 1;y < bottom; y++) {
    grid.setCell(left, y, chars.vertical, style);
    grid.setCell(right, y, chars.vertical, style);
  }
}
function drawCircleNode(grid, bounds, chars, style) {
  const right = bounds.left + bounds.width - 1;
  const bottom = bounds.top + bounds.height - 1;
  for (const y of [bounds.top, bottom]) {
    grid.setCell(bounds.left + 1, y, y === bounds.top ? chars.topLeft : chars.bottomLeft, style);
    grid.setCell(right - 1, y, y === bounds.top ? chars.topRight : chars.bottomRight, style);
    for (let x = bounds.left + 2;x < right - 1; x++)
      grid.setCell(x, y, chars.horizontal, style);
  }
  for (let y = bounds.top + 1;y < bottom; y++) {
    grid.setCell(bounds.left, y, y === bounds.top + 1 ? "\u2571" : y === bottom - 1 ? "\u2572" : chars.vertical, style);
    grid.setCell(right, y, y === bounds.top + 1 ? "\u2572" : y === bottom - 1 ? "\u2571" : chars.vertical, style);
  }
}
function drawHexagonNode(grid, bounds, chars, style) {
  const right = bounds.left + bounds.width - 1;
  const bottom = bounds.top + bounds.height - 1;
  for (const y of [bounds.top, bottom]) {
    const top = y === bounds.top;
    grid.setCell(bounds.left + 1, y, top ? "\u2571" : "\u2572", style);
    grid.setCell(right - 1, y, top ? "\u2572" : "\u2571", style);
    for (let x = bounds.left + 2;x < right - 1; x++)
      grid.setCell(x, y, chars.horizontal, style);
  }
  for (let y = bounds.top + 1;y < bottom; y++) {
    grid.setCell(bounds.left, y, chars.vertical, style);
    grid.setCell(right, y, chars.vertical, style);
  }
}
function drawParallelogramNode(grid, bounds, chars, style) {
  const left = bounds.left;
  const right = bounds.left + bounds.width - 1;
  const top = bounds.top;
  const bottom = bounds.top + bounds.height - 1;
  const height = bottom - top;
  const slant = Math.max(1, Math.min(2, Math.floor((bounds.width - 3) / 4)));
  for (let y = top;y <= bottom; y++) {
    const progress = height === 0 ? 1 : (bottom - y) / height;
    const leftX = left + Math.round(slant * progress);
    const rightX = right - Math.round(slant * (1 - progress));
    grid.setCell(leftX, y, "\u2571", style);
    grid.setCell(rightX, y, "\u2571", style);
    if (y === top || y === bottom) {
      for (let x = leftX + 1;x < rightX; x++)
        grid.setCell(x, y, chars.horizontal, style);
    }
  }
}
function drawSubroutineNode(grid, bounds, chars, style) {
  drawDiagramFrame(bounds, chars, (x, y, char) => grid.setCell(x, y, char, style));
  const leftRailX = bounds.left + 2;
  const rightRailX = bounds.left + bounds.width - 3;
  grid.setCell(leftRailX, bounds.top, chars.topT, style);
  grid.setCell(rightRailX, bounds.top, chars.topT, style);
  grid.setCell(leftRailX, bounds.top + bounds.height - 1, chars.bottomT, style);
  grid.setCell(rightRailX, bounds.top + bounds.height - 1, chars.bottomT, style);
  for (let y = bounds.top + 1;y < bounds.top + bounds.height - 1; y++) {
    grid.setCell(leftRailX, y, chars.vertical, style);
    grid.setCell(rightRailX, y, chars.vertical, style);
  }
}
function drawDatabaseNode(grid, bounds, chars, style) {
  drawDiagramFrame(bounds, chars, (x, y, char) => grid.setCell(x, y, char, style));
  const topRailY = bounds.top + 1;
  const bottomRailY = bounds.top + bounds.height - 2;
  for (const y of [topRailY, bottomRailY]) {
    grid.setCell(bounds.left, y, chars.leftT, style);
    grid.setCell(bounds.left + bounds.width - 1, y, chars.rightT, style);
    for (let x = bounds.left + 1;x < bounds.left + bounds.width - 1; x++) {
      grid.setCell(x, y, chars.horizontal, style);
    }
  }
}
function drawSubgraphFrame(grid, bounds, borderStyle) {
  const chars = BorderChars3[borderStyle];
  drawDiagramFrame(bounds, chars, (x, y, char) => grid.setCell(x, y, char, "group"));
}
function drawSubgraphLabel(grid, bounds) {
  if (bounds.label) {
    const lines = parseDiagramTextLines(bounds.label);
    const labelY = bounds.labelSide === "top" ? bounds.top : bounds.top + bounds.height - lines.length;
    for (const [index, line] of lines.entries()) {
      grid.setText(bounds.left + 2, labelY + index, " ", "groupLabel");
      const width = setRichText(grid, bounds.left + 3, labelY + index, line.runs, "groupLabel");
      grid.setText(bounds.left + width + 3, labelY + index, " ", "groupLabel");
    }
  }
}
function drawEdgeLabel(grid, route, style) {
  const label = flowchartRouteLabelLayout(route, visualLength);
  const padding = " ".repeat(DIAGRAM_LABEL_PADDING_X);
  for (const [index, line] of parseDiagramTextLines(route.edge.label).entries()) {
    grid.setText(label.point.x, label.point.y + index, padding, style);
    const width = setRichText(grid, label.point.x + DIAGRAM_LABEL_PADDING_X, label.point.y + index, line.runs, style);
    grid.setText(label.point.x + width + DIAGRAM_LABEL_PADDING_X, label.point.y + index, padding, style);
  }
}
function drawRoutedEdge(grid, route) {
  const { edge, points } = route;
  if (points.length < 2)
    return;
  const style = "edge";
  drawOrthogonalPath(points, (x, y, char) => grid.setCell(x, y, char, style), {
    cornerStyle: "rounded",
    lineStyle: edge.style === "thick" ? "heavy" : "single"
  });
  if (edge.arrowhead !== false) {
    const end = points[points.length - 1];
    const arrowFrom = points[points.length - 2];
    grid.setCell(end.x, end.y, diagramArrowHeadBetween(arrowFrom, end), style);
  } else {
    const end = points[points.length - 1];
    const endDirection = directionBetween(points[points.length - 2], end);
    if (endDirection)
      grid.setCell(end.x, end.y, diagramLineGlyph(new Set([endDirection])), style);
  }
  if (edge.label) {
    drawEdgeLabel(grid, route, "label");
  }
}
function flowchartNodeStyle(node) {
  return node?.shape === "database" ? "database" : "node";
}
function sourceFadeStyles(sourceStyle) {
  return sourceStyle === "database" ? DATABASE_EDGE_FADE_STYLES : NODE_EDGE_FADE_STYLES;
}
function styleExistingEdgeCell(grid, x, y, style) {
  const cell = grid.getCell(x, y);
  if (cell)
    grid.setCell(x, y, cell.char, style);
}
function routeCellOccupancy(routes) {
  const occupancy = new Map;
  for (const route of routes) {
    const routeCells = new Set;
    for (let index = 1;index < route.points.length; index++) {
      walkOrthogonalSegment(route.points[index - 1], route.points[index], index === 1, (point) => {
        routeCells.add(`${point.x}:${point.y}`);
      });
    }
    for (const key of routeCells)
      occupancy.set(key, (occupancy.get(key) ?? 0) + 1);
  }
  return occupancy;
}
function fadeSourcePath(grid, connector, points, styles, occupancy) {
  const from = points[0];
  const to = points[1];
  if (!from || !to)
    return;
  const privateCells = [connector];
  walkOrthogonalSegment(from, to, true, (point) => {
    const key = `${point.x}:${point.y}`;
    const cell = grid.getCell(point.x, point.y);
    if (occupancy.get(key) !== 1 || !cell || !"\u2500\u2501\u2502\u2503".includes(cell.char) || cell.style === "label")
      return false;
    privateCells.push(point);
  });
  for (const [index, point] of privateCells.entries()) {
    const styleIndex = Math.min(styles.length - 1, Math.floor((index + 1) * styles.length / (privateCells.length + 1)));
    styleExistingEdgeCell(grid, point.x, point.y, styles[styleIndex]);
  }
}
function drawSourceConnectors(grid, diagram, bounds, routes) {
  const nodesById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const occupancy = routeCellOccupancy(routes);
  const sourceJunctions = new Map;
  for (const route of routes) {
    const sourcePoint = route.points[0];
    const next = route.points[1];
    if (!sourcePoint || !next)
      continue;
    const key = `${route.edge.from}:${sourcePoint.x}:${sourcePoint.y}`;
    const direction = directionBetween(sourcePoint, next);
    const junction = sourceJunctions.get(key) ?? { directions: new Set, heavy: true };
    if (direction)
      junction.directions.add(direction);
    junction.heavy &&= route.edge.style === "thick";
    sourceJunctions.set(key, junction);
  }
  for (const route of routes) {
    const from = bounds.get(route.edge.from);
    const sourcePoint = route.points[0];
    if (!from || !sourcePoint)
      continue;
    const styles = sourceFadeStyles(flowchartNodeStyle(nodesById.get(route.edge.from)));
    const connector = flowchartSourceConnector(from, sourcePoint);
    grid.setCell(connector.x, connector.y, connector.char, "edge");
    const connectorDirection = directionBetween(sourcePoint, connector);
    if (connectorDirection) {
      const cell = grid.getCell(sourcePoint.x, sourcePoint.y);
      if (cell && cell.style !== "label" && !DIAGRAM_ARROW_HEADS.has(cell.char)) {
        const key = `${route.edge.from}:${sourcePoint.x}:${sourcePoint.y}`;
        const junction = sourceJunctions.get(key);
        const directions = new Set(junction?.directions);
        directions.add(connectorDirection);
        grid.replaceCell(sourcePoint.x, sourcePoint.y, diagramLineGlyph(directions, "rounded", junction?.heavy ?? route.edge.style === "thick" ? "heavy" : "single"), "edge");
      }
    }
    fadeSourcePath(grid, connector, route.points, styles, occupancy);
    if (route.edge.sourceArrowhead && route.points[1]) {
      grid.setCell(sourcePoint.x, sourcePoint.y, diagramArrowHeadBetween(route.points[1], sourcePoint), "edge");
    }
  }
}
function drawFlowchartDiagramGrid(diagram, options = {}) {
  const borderStyle = options.borderStyle ?? DEFAULT_BORDER_STYLE;
  const layout = layoutFlowchartDiagram(diagram, options);
  const { bounds, routes, subgraphBounds, width, height } = layout;
  diagram = layout.diagram;
  const grid = new DiagramCanvas(width, height, {
    mergeCell: mergeFlowchartCell
  });
  for (const subgraph of diagram.subgraphs ?? []) {
    const bound = subgraphBounds.get(subgraph.id);
    if (bound)
      drawSubgraphFrame(grid, bound, borderStyle);
  }
  for (const route of routes)
    drawRoutedEdge(grid, route);
  for (const node of diagram.nodes) {
    const bound = bounds.get(node.id);
    if (bound)
      drawNode(grid, node, bound, borderStyle);
  }
  drawSourceConnectors(grid, diagram, bounds, routes);
  for (const subgraph of diagram.subgraphs ?? []) {
    const bound = subgraphBounds.get(subgraph.id);
    if (bound)
      drawSubgraphLabel(grid, bound);
  }
  return grid;
}

// src/merman/gantt/drawing.ts
var LABEL_GAP = 2;
var MIN_CHART_WIDTH = 24;
var MAX_CHART_WIDTH = 64;
function drawGanttDiagramGrid(diagram, options = {}) {
  if (diagram.entries.length === 0)
    return new DiagramCanvas(0, 0);
  const labels = diagram.entries.map((_, index) => entryLabel(diagram, index, options.labels ?? "left"));
  const labelWidth = Math.max(...labels.map(diagramTextWidth));
  const entryRows = [];
  let bodyHeight = 0;
  diagram.entries.forEach((entry, index) => {
    if ((options.sections ?? "spaced") === "spaced" && entry.type === "section" && index > 0)
      bodyHeight += 1;
    entryRows.push(bodyHeight);
    bodyHeight += 1;
  });
  if (diagram.tasks.length === 0) {
    const grid = new DiagramCanvas(labelWidth, bodyHeight);
    diagram.entries.forEach((entry, index) => {
      if (entry.type === "section")
        grid.setText(0, entryRows[index], entry.section.label, "section");
    });
    return grid;
  }
  const available = (options.layoutMaxWidth ?? 120) - labelWidth - LABEL_GAP;
  const chartWidth = Math.max(MIN_CHART_WIDTH, Math.min(MAX_CHART_WIDTH, available));
  const starts = diagram.tasks.map((task) => task.start);
  const ends = diagram.tasks.map((task) => task.end);
  const minimum = Math.min(...starts);
  const maximum = Math.max(...ends);
  const span = Math.max(1, maximum - minimum);
  const titleHeight = diagram.title ? 2 : 0;
  const axisHeight = 2;
  const grid = new DiagramCanvas(labelWidth + LABEL_GAP + chartWidth, titleHeight + axisHeight + bodyHeight);
  const chartX = labelWidth + LABEL_GAP;
  if (diagram.title)
    grid.setText(Math.max(0, chartX + Math.floor((chartWidth - diagramTextWidth(diagram.title)) / 2)), 0, diagram.title, "title");
  drawAxis(grid, chartX, titleHeight, chartWidth, minimum, span, diagram.axisFormat, diagram.tickInterval);
  diagram.entries.forEach((entry, index) => {
    const y = titleHeight + axisHeight + entryRows[index];
    if (entry.type === "section") {
      grid.setText(0, y, labels[index], "section");
      return;
    }
    const label = labels[index];
    const labelX = options.labels === "right" ? labelWidth - diagramTextWidth(label) : 0;
    grid.setText(labelX, y, label, entry.task.state);
    drawTask(grid, entry.task, chartX, y, chartWidth, minimum, span, options);
  });
  return grid;
}
function drawAxis(grid, x, y, width, minimum, span, format, interval) {
  for (let offset = 0;offset < width; offset++)
    grid.setCell(x + offset, y + 1, "\u2500", "axis");
  const step = interval ? interval * Math.max(1, Math.ceil(span / (interval * 12))) : tickStep(span);
  const ticks = [];
  for (let value = Math.ceil(minimum / step) * step;value <= minimum + span; value += step)
    ticks.push(value);
  if (ticks.length === 0)
    ticks.push(minimum, minimum + span);
  for (const value of ticks) {
    const offset = Math.round((value - minimum) / span * (width - 1));
    const label = formatTime(value, format);
    const labelX = Math.max(x, Math.min(x + width - diagramTextWidth(label), x + offset - Math.floor(diagramTextWidth(label) / 2)));
    grid.setText(labelX, y, label, "axis");
    grid.setCell(x + offset, y + 1, "\u252C", "axis");
  }
}
function tickStep(span) {
  const steps = [
    1000,
    5000,
    1e4,
    30000,
    60000,
    300000,
    900000,
    3600000,
    21600000,
    43200000,
    86400000,
    172800000,
    604800000,
    2592000000,
    31536000000
  ];
  return steps.find((step) => step >= span / 4) ?? steps.at(-1);
}
function drawTask(grid, task, x, y, width, minimum, span, options) {
  const style = options.style ?? "track";
  const line = lineGlyph(options.line ?? "thin");
  const start = Math.round((task.start - minimum) / span * (width - 1));
  const end = Math.round((task.end - minimum) / span * (width - 1));
  if (task.state === "milestone" || start === end) {
    grid.setCell(x + start, y, "\u25C6", task.state);
    return;
  }
  if (style === "track") {
    for (let offset = 0;offset < width; offset++) {
      grid.setCell(x + offset, y, (options.track ?? "line") === "line" ? line : "\xB7", trackCellStyle(options));
    }
  }
  const glyph = style === "block" ? "\u2588" : line;
  for (let offset = start;offset <= end; offset++)
    grid.setCell(x + offset, y, glyph, task.state);
  if (style === "block")
    return;
  if (style === "capsule" || style === "track") {
    if (style === "track") {
      if (options.endpoints === "points") {
        grid.setCell(x + start, y, "\u25CF", trackCellStyle(options));
        grid.setCell(x + end, y, "\u25CF", trackCellStyle(options));
      }
      return;
    }
    const caps = capGlyphs(options.line ?? "thin");
    grid.setCell(x + start, y, caps.start, task.state);
    grid.setCell(x + end, y, caps.end, task.state);
    return;
  }
  if (style === "points") {
    grid.setCell(x + start, y, "\u25CF", task.state);
    grid.setCell(x + end, y, "\u25CF", task.state);
    return;
  }
  grid.setCell(x + start, y, "\u2523", task.state);
  grid.setCell(x + end, y, "\u252B", task.state);
}
function entryLabel(diagram, index, layout) {
  const entry = diagram.entries[index];
  if (entry.type === "section" || layout !== "tree") {
    return entry.type === "section" ? entry.section.label : entry.task.label;
  }
  const last = diagram.entries[index + 1]?.type !== "task";
  return `  ${last ? "\u2514" : "\u251C"}\u2500 ${entry.task.label}`;
}
function lineGlyph(line) {
  if (line === "thin")
    return "\u2500";
  if (line === "double")
    return "\u2550";
  if (line === "dashed")
    return "\u254C";
  return "\u2501";
}
function capGlyphs(line) {
  if (line === "thin" || line === "dashed")
    return { start: "\u2576", end: "\u2574" };
  if (line === "double")
    return { start: "\u255E", end: "\u2561" };
  return { start: "\u257A", end: "\u2578" };
}
function trackCellStyle(options) {
  if (options.trackTone === "medium")
    return "trackMedium";
  if (options.trackTone === "dim")
    return "trackDim";
  return "trackFaint";
}
function formatTime(value, format) {
  const date = new Date(value);
  const parts = {
    "%Y": String(date.getUTCFullYear()),
    "%m": String(date.getUTCMonth() + 1).padStart(2, "0"),
    "%d": String(date.getUTCDate()).padStart(2, "0"),
    "%H": String(date.getUTCHours()).padStart(2, "0"),
    "%M": String(date.getUTCMinutes()).padStart(2, "0"),
    "%S": String(date.getUTCSeconds()).padStart(2, "0")
  };
  return Object.entries(parts).reduce((result, [token, replacement]) => result.replaceAll(token, replacement), format);
}

// src/merman/gantt/render-grid.ts
function renderGanttGridStyledText(grid, colors) {
  return renderDiagramGridStyledText(grid, (run) => run.style ? colors[run.style] : undefined, undefined, {
    trimBottom: true
  });
}

// src/merman/gantt/style.ts
var DEFAULT_THEME_RGB3 = {
  title: [228, 239, 232],
  axis: [111, 138, 126],
  section: [154, 184, 169],
  task: [134, 225, 200],
  active: [134, 225, 200],
  critical: [230, 177, 126],
  done: [111, 138, 126],
  milestone: [198, 160, 246]
};
function resolveGanttStyleColors(colors = {}) {
  const axis = colors.axis ?? rgba(DEFAULT_THEME_RGB3.axis);
  const background = colors.background ?? rgba([13, 17, 23]);
  return {
    title: colors.title ?? rgba(DEFAULT_THEME_RGB3.title),
    axis,
    section: colors.section ?? rgba(DEFAULT_THEME_RGB3.section),
    task: colors.task ?? rgba(DEFAULT_THEME_RGB3.task),
    active: colors.active ?? rgba(DEFAULT_THEME_RGB3.active),
    critical: colors.critical ?? rgba(DEFAULT_THEME_RGB3.critical),
    done: colors.done ?? rgba(DEFAULT_THEME_RGB3.done),
    milestone: colors.milestone ?? rgba(DEFAULT_THEME_RGB3.milestone),
    trackMedium: blendColor(axis, background, 0.35),
    trackDim: blendColor(axis, background, 0.55),
    trackFaint: blendColor(axis, background, 0.72)
  };
}

// src/merman/gitgraph/drawing.ts
var LANE_WIDTH = 2;
var LABEL_GAP2 = 2;
function drawGitGraphDiagramGrid(diagram, _options = {}) {
  if (diagram.commits.length === 0)
    return new DiagramCanvas(0, 0);
  const laneByBranch = new Map(diagram.branches.map((branch, index) => [branch.name, index]));
  const commitById = new Map(diagram.commits.map((commit) => [commit.id, commit]));
  const spans = branchSpans(diagram, commitById);
  const heads = branchHeads(diagram);
  const graphWidth = (diagram.branches.length - 1) * LANE_WIDTH + 1;
  let labelWidth = 0;
  for (const commit of diagram.commits)
    labelWidth = Math.max(labelWidth, diagramTextWidth(commitLabel(commit, heads)));
  const forks = diagram.commits.map((commit) => isFork(commit, laneByBranch, commitById));
  const height = diagram.commits.length + forks.filter(Boolean).length;
  const grid = new DiagramCanvas(graphWidth + LABEL_GAP2 + labelWidth, height);
  let row = 0;
  diagram.commits.forEach((commit, index) => {
    if (forks[index]) {
      drawTransitionRow(grid, spans, laneByBranch, commitById, commit, index, row);
      row += 1;
    }
    drawCommitRow(grid, diagram, spans, laneByBranch, commitById, commit, index, row);
    grid.setText(graphWidth + LABEL_GAP2, row, commitLabel(commit, heads), "label");
    row += 1;
  });
  return grid;
}
function drawTransitionRow(grid, spans, laneByBranch, commitById, commit, index, y) {
  const cells = new Map;
  for (const [branch, span] of spans) {
    if (span.first >= index || span.last < index)
      continue;
    const lane = laneByBranch.get(branch);
    connect(cells, lane * LANE_WIDTH, { up: true, down: true }, branchStyle(lane));
  }
  const lane = laneByBranch.get(commit.branch);
  const firstParent = commit.parents[0] === undefined ? undefined : commitById.get(commit.parents[0]);
  if (firstParent && firstParent.branch !== commit.branch) {
    const parentLane = laneByBranch.get(firstParent.branch);
    connectHorizontal(cells, parentLane, lane, { sourceUp: true, sourceDown: true, targetDown: true }, branchStyle(lane));
  }
  paintConnections(grid, cells, y);
}
function drawCommitRow(grid, diagram, spans, laneByBranch, commitById, commit, index, y) {
  const cells = new Map;
  for (const branch of diagram.branches) {
    const span = spans.get(branch.name);
    if (!span || span.first > index || span.last <= index && branch.name !== commit.branch)
      continue;
    const lane = laneByBranch.get(branch.name);
    connect(cells, lane * LANE_WIDTH, { up: index > 0, down: span.last > index }, branchStyle(lane));
  }
  const lane = laneByBranch.get(commit.branch);
  const secondParent = commit.parents[1] === undefined ? undefined : commitById.get(commit.parents[1]);
  if (secondParent) {
    const parentLane = laneByBranch.get(secondParent.branch);
    connectHorizontal(cells, lane, parentLane, { sourceUp: true, targetUp: true }, branchStyle(parentLane));
  }
  paintConnections(grid, cells, y);
  grid.setCell(lane * LANE_WIDTH, y, commitGlyph(commit), commitStyle(commit));
}
function connectHorizontal(cells, sourceLane, targetLane, vertical, style) {
  if (sourceLane === targetLane)
    return;
  const source = sourceLane * LANE_WIDTH;
  const target = targetLane * LANE_WIDTH;
  const direction = Math.sign(target - source);
  connect(cells, source, { ...verticalAt(vertical.sourceUp, vertical.sourceDown), ...direction > 0 ? { right: true } : { left: true } }, style);
  for (let x = source + direction;x !== target; x += direction) {
    connect(cells, x, { left: true, right: true }, style);
  }
  connect(cells, target, { ...verticalAt(vertical.targetUp, vertical.targetDown), ...direction > 0 ? { left: true } : { right: true } }, style);
}
function verticalAt(up, down) {
  return { ...up ? { up: true } : {}, ...down ? { down: true } : {} };
}
function connect(cells, x, additions, style) {
  const current = cells.get(x);
  cells.set(x, { ...current, ...additions, style: current?.style ?? style });
}
function paintConnections(grid, cells, y) {
  for (const [x, connections] of cells)
    grid.setCell(x, y, connectionGlyph(connections), connections.style);
}
function connectionGlyph({ up, down, left, right }) {
  const mask = `${up ? 1 : 0}${down ? 1 : 0}${left ? 1 : 0}${right ? 1 : 0}`;
  const glyphs = {
    "1100": "\u2502",
    "0011": "\u2500",
    "0101": "\u256D",
    "0110": "\u256E",
    "1001": "\u2570",
    "1010": "\u256F",
    "1101": "\u251C",
    "1110": "\u2524",
    "0111": "\u252C",
    "1011": "\u2534",
    "1111": "\u253C",
    "1000": "\u2502",
    "0100": "\u2502",
    "0010": "\u2500",
    "0001": "\u2500"
  };
  return glyphs[mask] ?? " ";
}
function branchSpans(diagram, commitById) {
  const spans = new Map;
  diagram.commits.forEach((commit, index) => {
    const span = spans.get(commit.branch);
    if (span)
      span.last = index;
    else
      spans.set(commit.branch, { first: index, last: index });
    for (const parentId of commit.parents) {
      const parent = commitById.get(parentId);
      if (!parent || parent.branch === commit.branch)
        continue;
      const parentSpan = spans.get(parent.branch);
      if (parentSpan)
        parentSpan.last = Math.max(parentSpan.last, index);
    }
  });
  return spans;
}
function branchHeads(diagram) {
  const heads = new Map;
  for (const branch of diagram.branches) {
    if (branch.head === undefined)
      continue;
    const names = heads.get(branch.head) ?? [];
    names.push(branch.name);
    heads.set(branch.head, names);
  }
  return heads;
}
function isFork(commit, laneByBranch, commitById) {
  const parent = commit.parents[0] === undefined ? undefined : commitById.get(commit.parents[0]);
  return parent !== undefined && laneByBranch.get(parent.branch) !== laneByBranch.get(commit.branch);
}
function commitGlyph(commit) {
  if (commit.type === "REVERSE")
    return "\u2297";
  if (commit.type === "HIGHLIGHT")
    return "\u25C6";
  return commit.parents.length > 1 ? "\u25CE" : "\u25CF";
}
function commitStyle(commit) {
  if (commit.type === "REVERSE")
    return "reverse";
  if (commit.type === "HIGHLIGHT")
    return "highlight";
  return commit.parents.length > 1 ? "merge" : "commit";
}
function commitLabel(commit, heads) {
  const subject = commit.message ?? commit.id;
  const decorations = [...heads.get(commit.id) ?? [], ...commit.tags].map((value) => `[${value}]`);
  return decorations.length === 0 ? subject : `${subject}  ${decorations.join(" ")}`;
}
function branchStyle(lane) {
  return `branch${lane % 8}`;
}

// src/merman/gitgraph/render-grid.ts
function renderGitGraphGridStyledText(grid, colors) {
  return renderDiagramGridStyledText(grid, (run) => run.style ? colors[run.style] : undefined, undefined, {
    trimBottom: true
  });
}

// src/merman/gitgraph/style.ts
var BRANCH_RGB = [
  [134, 225, 200],
  [230, 177, 126],
  [154, 184, 169],
  [198, 160, 246],
  [126, 189, 230],
  [225, 134, 166],
  [190, 210, 120],
  [180, 180, 210]
];
function resolveGitGraphStyleColors(colors = {}) {
  const rail = colors.muted ?? rgba([111, 138, 126]);
  return {
    branch0: rail,
    branch1: rail,
    branch2: rail,
    branch3: rail,
    branch4: rail,
    branch5: rail,
    branch6: rail,
    branch7: rail,
    commit: colors.primary ?? rgba(BRANCH_RGB[0]),
    merge: colors.secondary ?? rgba(BRANCH_RGB[2]),
    highlight: colors.warning ?? rgba(BRANCH_RGB[1]),
    reverse: colors.warning ?? rgba(BRANCH_RGB[5]),
    label: colors.text ?? rgba([228, 239, 232])
  };
}

// src/merman/sequence/drawing.ts
import { BorderChars as BorderChars4 } from "@opentui/core";

// src/merman/sequence/options.ts
var DEFAULT_MIN_PARTICIPANT_GAP = 18;
var DEFAULT_FRAGMENT_BORDER_STYLE = "rounded";
function normalizeSequenceMinParticipantGap(value) {
  return value === undefined || !Number.isFinite(value) ? DEFAULT_MIN_PARTICIPANT_GAP : Math.max(1, Math.floor(value));
}

// src/merman/sequence/placement.ts
var NOTE_HORIZONTAL_PADDING = 2;
var GROUP_HORIZONTAL_PADDING = 2;
var FRAGMENT_HORIZONTAL_OVERHANG = 3;
function visualLength2(value) {
  return diagramTextWidth(value);
}
function mermaidLabelLines(label) {
  const lines = label.split(/(?:<br\s*\/?\s*>|\\n)/i).map((line) => line.trimEnd());
  return lines.length > 0 ? lines : [""];
}
function noteLabelLines(label) {
  const lines = mermaidLabelLines(label);
  const width = labelLinesWidth(lines);
  const padding = " ".repeat(NOTE_HORIZONTAL_PADDING);
  return lines.map((line) => `${padding}${line}${" ".repeat(width - visualLength2(line))}${padding}`);
}
function messageLabelText(message) {
  return message.number === undefined ? message.label : `${message.number}. ${message.label}`;
}
function participantHeaderWidth(label, compact) {
  const width = labelLinesWidth(mermaidLabelLines(label));
  return compact ? width : Math.max(3, width);
}
function fragmentLabelText(fragment) {
  if (fragment.kind === "end")
    return "";
  const prefix = fragment.kind === "loop" ? "\u21BB loop" : fragment.kind;
  return fragment.label ? ` ${prefix}: ${fragment.label} ` : ` ${prefix} `;
}
function isFragmentStart(kind) {
  return kind !== "else" && kind !== "and" && kind !== "option" && kind !== "end";
}
function messageLabelLines(label) {
  return mermaidLabelLines(label);
}
function labelLinesWidth(lines) {
  return lines.reduce((max, line) => Math.max(max, visualLength2(line)), 0);
}
function messageWidth(message) {
  return labelLinesWidth(messageLabelLines(messageLabelText(message)));
}
function selfMessageLoopWidthForLines(labelLines) {
  return Math.max(10, labelLinesWidth(labelLines) + 4);
}
function selfMessageLoopWidth(message) {
  return selfMessageLoopWidthForLines(messageLabelLines(messageLabelText(message)));
}
function arrowHeadX(toX, direction, head) {
  return head === undefined ? toX : toX - direction;
}
function inlineMessageLabel(message, labelLines, fromX, toX, compact) {
  if (!compact || message.from === message.to || labelLines.length !== 1)
    return;
  const label = ` ${labelLines[0]} `;
  return visualLength2(label) <= Math.abs(toX - fromX) - 3 ? label : undefined;
}
function getStepHeight(step, centers, participantIndexes, compact) {
  if (step.type === "note")
    return noteLabelLines(step.note.label).length + 2;
  if (step.type === "activation")
    return 0;
  if (step.type === "fragment")
    return 2;
  const labelLines = messageLabelLines(messageLabelText(step.message));
  const fromX = centers[participantIndexes.get(step.message.from) ?? -1];
  const toX = centers[participantIndexes.get(step.message.to) ?? -1];
  if (fromX !== undefined && toX !== undefined && inlineMessageLabel(step.message, labelLines, fromX, toX, compact)) {
    return 2;
  }
  return labelLines.length + (step.message.from === step.message.to ? 3 : 2);
}
function createParticipantIndexMap(diagram) {
  return new Map(diagram.participants.map((participant, index) => [participant.id, index]));
}
function getParticipantIndexes(participantIndexes, participantIds) {
  return participantIds.map((id) => participantIndexes.get(id) ?? -1).filter((index) => index >= 0);
}
function groupLabelText(group) {
  return group.label ? ` ${group.label} ` : "";
}
function getGroupRanges(diagram, participantIndexes) {
  return diagram.groups.flatMap((group) => {
    const indexes = getParticipantIndexes(participantIndexes, group.participantIds);
    return indexes.length === 0 ? [] : [{ group, startIndex: Math.min(...indexes), endIndex: Math.max(...indexes) }];
  });
}
function getStepParticipantIndexes(step, participantIndexes) {
  if (step.type === "message") {
    return getParticipantIndexes(participantIndexes, [step.message.from, step.message.to]);
  }
  if (step.type === "note")
    return getParticipantIndexes(participantIndexes, step.note.over);
  return [];
}
function getStepContentBounds(step, centers, participantIndexes) {
  if (step.type === "message") {
    const fromIndex = participantIndexes.get(step.message.from) ?? -1;
    const toIndex = participantIndexes.get(step.message.to) ?? -1;
    if (fromIndex < 0 || toIndex < 0)
      return;
    const fromX = centers[fromIndex];
    const toX = centers[toIndex];
    if (fromIndex === toIndex)
      return { leftX: fromX, rightX: fromX + selfMessageLoopWidth(step.message) };
    const leftX = Math.min(fromX, toX);
    const rightX = Math.max(fromX, toX);
    const labelWidth = messageWidth(step.message);
    const labelLeftX = leftX + 2;
    return { leftX: Math.min(leftX, labelLeftX), rightX: Math.max(rightX, labelLeftX + labelWidth - 1) };
  }
  if (step.type !== "note")
    return;
  const indexes = getParticipantIndexes(participantIndexes, step.note.over);
  if (indexes.length === 0)
    return;
  const centerX = Math.floor((centers[Math.min(...indexes)] + centers[Math.max(...indexes)]) / 2);
  const textLines = noteLabelLines(step.note.label);
  const width = labelLinesWidth(textLines);
  const leftX = step.note.position === "left" ? centerX - width - 2 : step.note.position === "right" ? centerX + 2 : centerX - Math.floor(width / 2);
  return { leftX, rightX: leftX + width - 1 };
}
function rangeContainsIndexes(range, indexes) {
  return indexes.length > 0 && indexes.every((index) => index >= range.startIndex && index <= range.endIndex);
}
function resolveGroupBounds(diagram, centers, participantIndexes, groupRanges, compact) {
  return groupRanges.map((range) => {
    let contentLeftX = centers[range.startIndex];
    let contentRightX = centers[range.endIndex];
    for (let i = range.startIndex;i <= range.endIndex; i++) {
      const headerWidth = participantHeaderWidth(diagram.participants[i].label, compact);
      const headerStartX = centers[i] - Math.floor(headerWidth / 2);
      contentLeftX = Math.min(contentLeftX, headerStartX);
      contentRightX = Math.max(contentRightX, headerStartX + headerWidth - 1);
    }
    for (const step of diagram.steps) {
      const indexes = getStepParticipantIndexes(step, participantIndexes);
      if (!rangeContainsIndexes(range, indexes))
        continue;
      const bounds = getStepContentBounds(step, centers, participantIndexes);
      if (bounds) {
        contentLeftX = Math.min(contentLeftX, bounds.leftX);
        contentRightX = Math.max(contentRightX, bounds.rightX);
      }
    }
    const labelText = groupLabelText(range.group);
    let leftX = contentLeftX - GROUP_HORIZONTAL_PADDING;
    let rightX = contentRightX + GROUP_HORIZONTAL_PADDING;
    const extraWidth = Math.max(0, visualLength2(labelText) + 4 - (rightX - leftX + 1));
    leftX -= Math.floor(extraWidth / 2);
    rightX += Math.ceil(extraWidth / 2);
    return { group: range.group, labelText, leftX, rightX };
  });
}
function expandHorizontalBounds(bounds, leftX, rightX) {
  bounds.leftX = Math.min(bounds.leftX, leftX);
  bounds.rightX = Math.max(bounds.rightX, rightX);
}
function getDiagramContentBounds(diagram, centers, participantIndexes, compact) {
  const bounds = { leftX: 0, rightX: 0 };
  for (let i = 0;i < diagram.participants.length; i++) {
    const headerWidth = participantHeaderWidth(diagram.participants[i].label, compact);
    const labelStartX = centers[i] - Math.floor(headerWidth / 2);
    expandHorizontalBounds(bounds, labelStartX, labelStartX + headerWidth - 1);
  }
  for (const step of diagram.steps) {
    const content = getStepContentBounds(step, centers, participantIndexes);
    if (content)
      expandHorizontalBounds(bounds, content.leftX, content.rightX);
  }
  return bounds;
}
function getFragmentFrameBounds(centers, fragment, nestingDepth = 0) {
  const leftParticipantX = centers[0];
  const rightParticipantX = centers[centers.length - 1];
  if (leftParticipantX === undefined || rightParticipantX === undefined)
    return;
  const leftX = leftParticipantX - FRAGMENT_HORIZONTAL_OVERHANG + nestingDepth;
  const participantRightX = rightParticipantX + FRAGMENT_HORIZONTAL_OVERHANG - nestingDepth;
  return { leftX, rightX: Math.max(participantRightX, leftX + 2 + visualLength2(fragmentLabelText(fragment)) + 1) };
}
function getFragmentFrameBoundsByStep(centers, steps, participantIndexes) {
  const boundsByStep = new Map;
  const activeFrames = [];
  for (const [index, step] of steps.entries()) {
    if (step.type !== "fragment") {
      const content = getStepContentBounds(step, centers, participantIndexes);
      if (content) {
        for (const frame of activeFrames) {
          expandHorizontalBounds(frame.bounds, content.leftX - 1, content.rightX + 1);
        }
      }
      continue;
    }
    const bounds = getFragmentFrameBounds(centers, step.fragment, activeFrames.length);
    if (!bounds)
      continue;
    if (isFragmentStart(step.fragment.kind)) {
      activeFrames.push({ startIndex: index, bounds: { ...bounds } });
      continue;
    }
    const frame = activeFrames[activeFrames.length - 1];
    if (!frame)
      continue;
    expandHorizontalBounds(frame.bounds, bounds.leftX, bounds.rightX);
    if (step.fragment.kind !== "end")
      continue;
    activeFrames.pop();
    boundsByStep.set(frame.startIndex, frame.bounds);
    const parent = activeFrames[activeFrames.length - 1];
    if (parent)
      expandHorizontalBounds(parent.bounds, frame.bounds.leftX - 1, frame.bounds.rightX + 1);
  }
  for (const frame of activeFrames)
    boundsByStep.set(frame.startIndex, frame.bounds);
  return boundsByStep;
}
function resolveParticipantCenters(diagram, participantIndexes, minParticipantGap, compact) {
  const gaps = Array.from({ length: Math.max(0, diagram.participants.length - 1) }, (_, index) => {
    const left = diagram.participants[index];
    const right = diagram.participants[index + 1];
    return Math.max(minParticipantGap, Math.ceil(participantHeaderWidth(left.label, compact) / 2) + Math.ceil(participantHeaderWidth(right.label, compact) / 2) + 6);
  });
  for (const message of diagram.messages) {
    const fromIndex = participantIndexes.get(message.from) ?? -1;
    const toIndex = participantIndexes.get(message.to) ?? -1;
    if (fromIndex === toIndex && fromIndex >= 0 && fromIndex < diagram.participants.length - 1) {
      gaps[fromIndex] = Math.max(gaps[fromIndex], selfMessageLoopWidth(message) + Math.ceil(labelLinesWidth(mermaidLabelLines(diagram.participants[fromIndex + 1].label)) / 2) + 2);
      continue;
    }
    if (fromIndex < 0 || toIndex < 0 || Math.abs(fromIndex - toIndex) !== 1)
      continue;
    const gapIndex = Math.min(fromIndex, toIndex);
    gaps[gapIndex] = Math.max(gaps[gapIndex], messageWidth(message) + 6);
  }
  for (const step of diagram.steps) {
    if (step.type !== "note")
      continue;
    const indexes = getParticipantIndexes(participantIndexes, step.note.over);
    if (indexes.length === 1 && step.note.position && step.note.position !== "over") {
      const participantIndex = indexes[0];
      const gapIndex = step.note.position === "left" ? participantIndex - 1 : participantIndex;
      if (gapIndex >= 0 && gapIndex < gaps.length) {
        gaps[gapIndex] = Math.max(gaps[gapIndex], labelLinesWidth(noteLabelLines(step.note.label)) + 4);
      }
      continue;
    }
    if (indexes.length !== 2 || Math.abs(indexes[0] - indexes[1]) !== 1)
      continue;
    const gapIndex = Math.min(indexes[0], indexes[1]);
    gaps[gapIndex] = Math.max(gaps[gapIndex], labelLinesWidth(noteLabelLines(step.note.label)) + 4);
  }
  const centers = [Math.max(1, Math.floor(participantHeaderWidth(diagram.participants[0]?.label ?? "", compact) / 2))];
  for (let i = 1;i < diagram.participants.length; i++)
    centers[i] = centers[i - 1] + gaps[i - 1];
  return centers;
}
function separateExpandedGroupsFromExternalParticipants(diagram, centers, participantIndexes, ranges, compact) {
  const adjusted = [...centers];
  for (let boundary = 0;boundary < adjusted.length - 1; boundary++) {
    const groups = resolveGroupBounds(diagram, adjusted, participantIndexes, ranges, compact);
    const leftWidth = participantHeaderWidth(diagram.participants[boundary].label, compact);
    const rightWidth = participantHeaderWidth(diagram.participants[boundary + 1].label, compact);
    let leftRight = adjusted[boundary] - Math.floor(leftWidth / 2) + leftWidth - 1;
    let rightLeft = adjusted[boundary + 1] - Math.floor(rightWidth / 2);
    let bordersGroup = false;
    for (const [index, range] of ranges.entries()) {
      if (range.endIndex === boundary) {
        leftRight = Math.max(leftRight, groups[index].rightX);
        bordersGroup = true;
      }
      if (range.startIndex === boundary + 1) {
        rightLeft = Math.min(rightLeft, groups[index].leftX);
        bordersGroup = true;
      }
    }
    if (!bordersGroup)
      continue;
    const shift = leftRight + GROUP_HORIZONTAL_PADDING + 1 - rightLeft;
    if (shift <= 0)
      continue;
    for (let participantIndex = boundary + 1;participantIndex < adjusted.length; participantIndex++) {
      adjusted[participantIndex] += shift;
    }
  }
  return adjusted;
}
function createSequencePlacementPlan(diagram, options = {}) {
  if (diagram.participants.length === 0) {
    return {
      width: 0,
      height: 0,
      rows: {
        participantHeaderTopY: 0,
        participantHeaderY: 0,
        participantRuleY: 0,
        lifelineStartY: 0,
        lifelineEndY: 0
      },
      participants: [],
      groups: [],
      activations: [],
      steps: []
    };
  }
  const indexes = createParticipantIndexMap(diagram);
  const compact = options.compact ?? false;
  let centers = resolveParticipantCenters(diagram, indexes, normalizeSequenceMinParticipantGap(options.minParticipantGap), compact);
  const ranges = getGroupRanges(diagram, indexes);
  centers = separateExpandedGroupsFromExternalParticipants(diagram, centers, indexes, ranges, compact);
  let groups = resolveGroupBounds(diagram, centers, indexes, ranges, compact);
  let contentBounds = getDiagramContentBounds(diagram, centers, indexes, compact);
  let frameBounds = getFragmentFrameBoundsByStep(centers, diagram.steps, indexes);
  const fragmentBounds = () => {
    const result = { leftX: 0, rightX: 0 };
    for (const bounds of frameBounds.values())
      expandHorizontalBounds(result, bounds.leftX, bounds.rightX);
    return result;
  };
  let fragments = fragmentBounds();
  const leftOverflow = Math.min(groups.reduce((left, group) => Math.min(left, group.leftX), 0), contentBounds.leftX, fragments.leftX, 0);
  if (leftOverflow < 0) {
    centers = centers.map((center) => center - leftOverflow);
    groups = resolveGroupBounds(diagram, centers, indexes, ranges, compact);
    contentBounds = getDiagramContentBounds(diagram, centers, indexes, compact);
    frameBounds = getFragmentFrameBoundsByStep(centers, diagram.steps, indexes);
    fragments = fragmentBounds();
  }
  const hasGroups = groups.length > 0;
  const participantLabelHeight = Math.max(1, ...diagram.participants.map((participant) => mermaidLabelLines(participant.label).length));
  const participantHeaderTopY = hasGroups ? 1 : 0;
  const participantHeaderY = participantHeaderTopY;
  const participantRuleY = participantHeaderTopY + (compact ? participantLabelHeight - 1 : participantLabelHeight);
  const lifelineStartY = participantRuleY + 1;
  const stepStartY = lifelineStartY + 1;
  const width = Math.max(contentBounds.rightX + 1, ...groups.map((group) => group.rightX + 1), fragments.rightX + 1);
  const baseHeight = stepStartY + diagram.steps.reduce((total, step) => total + getStepHeight(step, centers, indexes, compact), 0);
  const height = hasGroups ? Math.max(5, baseHeight + 1) : Math.max(3, baseHeight);
  const lifelineEndY = hasGroups ? height - 2 : height - 1;
  const participants = diagram.participants.map((participant, index) => {
    const centerX = centers[index];
    const width = participantHeaderWidth(participant.label, compact);
    const headerLeftX = centerX - Math.floor(width / 2);
    const labelLines = mermaidLabelLines(participant.label);
    return {
      participant,
      centerX,
      headerLeftX,
      headerRightX: headerLeftX + width - 1,
      labelLines
    };
  });
  const steps = [];
  const activations = [];
  const activeByParticipant = new Map;
  const lastEventYByParticipant = new Map;
  const openActivation = (participant, y) => {
    const active = activeByParticipant.get(participant) ?? [];
    active.push({ startY: y, depth: active.length });
    activeByParticipant.set(participant, active);
  };
  const closeActivation = (participant, y) => {
    const active = activeByParticipant.get(participant);
    const opened = active?.pop();
    const participantIndex = indexes.get(participant);
    if (!opened || participantIndex === undefined)
      return;
    activations.push({
      participant,
      centerX: centers[participantIndex],
      startY: opened.startY,
      endY: y,
      depth: opened.depth
    });
  };
  let stepY = stepStartY;
  const activeFrames = [];
  for (const [stepIndex, step] of diagram.steps.entries()) {
    if (step.type === "activation") {
      const eventY = Math.min(lastEventYByParticipant.get(step.activation.participant) ?? stepY, lifelineEndY);
      if (step.activation.active)
        openActivation(step.activation.participant, eventY);
      else
        closeActivation(step.activation.participant, eventY);
      continue;
    }
    const stepHeight = getStepHeight(step, centers, indexes, compact);
    if (step.type === "note") {
      const noteIndexes = getParticipantIndexes(indexes, step.note.over);
      if (noteIndexes.length > 0) {
        const centerX = Math.floor((centers[Math.min(...noteIndexes)] + centers[Math.max(...noteIndexes)]) / 2);
        const textLines = noteLabelLines(step.note.label);
        const width = labelLinesWidth(textLines);
        const textX = step.note.position === "left" ? centerX - width - 2 : step.note.position === "right" ? centerX + 2 : centerX - Math.floor(width / 2);
        steps.push({ type: "note", note: step.note, textLines, textX, textY: stepY + 1 });
      }
      stepY += stepHeight;
      continue;
    }
    if (step.type === "fragment") {
      let bounds = frameBounds.get(stepIndex) ?? getFragmentFrameBounds(centers, step.fragment);
      let wallsBefore;
      if (isFragmentStart(step.fragment.kind)) {
        if (bounds)
          activeFrames.push({ bounds, boundaryY: stepY });
      } else {
        const frame = activeFrames[activeFrames.length - 1];
        if (frame) {
          bounds = frame.bounds;
          wallsBefore = { bounds, startY: frame.boundaryY + 1, endY: stepY - 1 };
          if (step.fragment.kind === "end")
            activeFrames.pop();
          else
            frame.boundaryY = stepY;
        }
      }
      if (bounds)
        steps.push({
          type: "fragment",
          fragment: step.fragment,
          labelText: fragmentLabelText(step.fragment),
          bounds,
          y: stepY,
          wallsBefore
        });
      stepY += stepHeight;
      continue;
    }
    const fromIndex = indexes.get(step.message.from) ?? -1;
    const toIndex = indexes.get(step.message.to) ?? -1;
    if (fromIndex < 0 || toIndex < 0)
      continue;
    const labelLines = messageLabelLines(messageLabelText(step.message));
    if (fromIndex === toIndex) {
      const centerX = centers[fromIndex];
      const bottomY = stepY + labelLines.length + 1;
      steps.push({
        type: "selfMessage",
        message: step.message,
        labelLines,
        centerX,
        rightX: centerX + selfMessageLoopWidthForLines(labelLines),
        topY: stepY,
        bottomY
      });
      if (step.message.activate)
        openActivation(step.message.activate, bottomY);
      if (step.message.deactivate)
        closeActivation(step.message.deactivate, bottomY);
      lastEventYByParticipant.set(step.message.from, bottomY);
    } else {
      const fromX = centers[fromIndex];
      const toX = centers[toIndex];
      const direction = toX > fromX ? 1 : -1;
      const leftX = Math.min(fromX, toX);
      const rightX = Math.max(fromX, toX);
      const inlineLabel = inlineMessageLabel(step.message, labelLines, fromX, toX, compact);
      const arrowY = inlineLabel ? stepY : stepY + labelLines.length;
      const renderedLabelWidth = inlineLabel ? visualLength2(inlineLabel) : labelLinesWidth(labelLines);
      const labelX = inlineLabel ? Math.floor((leftX + rightX - renderedLabelWidth) / 2) : leftX + 2;
      steps.push({
        type: "message",
        message: step.message,
        labelLines,
        labelX,
        labelY: stepY,
        arrowY,
        fromX,
        toX,
        leftX,
        rightX,
        direction,
        headX: arrowHeadX(toX, direction, step.message.head),
        inlineLabel
      });
      if (step.message.activate)
        openActivation(step.message.activate, arrowY);
      if (step.message.deactivate)
        closeActivation(step.message.deactivate, arrowY);
      lastEventYByParticipant.set(step.message.from, arrowY);
      lastEventYByParticipant.set(step.message.to, arrowY);
    }
    stepY += stepHeight;
  }
  for (const [participant, active] of activeByParticipant) {
    while (active.length > 0)
      closeActivation(participant, lifelineEndY);
  }
  return {
    width,
    height,
    rows: { participantHeaderTopY, participantHeaderY, participantRuleY, lifelineStartY, lifelineEndY },
    participants,
    groups,
    activations,
    steps
  };
}

// src/merman/sequence/style.ts
var SEQUENCE_FADE_STEPS = DIAGRAM_FADE_STEPS;
var LIFELINE_RAMP_STYLES = [
  "lifelineRamp1",
  "lifelineRamp2",
  "lifelineRamp3"
];
var DEFAULT_THEME_RGB4 = {
  participant: [228, 239, 232],
  lifeline: [111, 138, 126],
  group: [76, 99, 89],
  request: [134, 225, 200],
  response: [230, 177, 126],
  fragment: [154, 184, 169],
  fragmentLabelBg: [28, 43, 36],
  noteFg: [215, 229, 221],
  noteBg: [36, 56, 47]
};
function resolveSequenceStyleColors(colors = {}) {
  const participant = colors.participant ?? rgba(DEFAULT_THEME_RGB4.participant);
  const lifeline = colors.lifeline ?? rgba(DEFAULT_THEME_RGB4.lifeline);
  const request = colors.request ?? rgba(DEFAULT_THEME_RGB4.request);
  const response = colors.response ?? rgba(DEFAULT_THEME_RGB4.response);
  return {
    participant,
    lifeline,
    group: colors.group ?? rgba(DEFAULT_THEME_RGB4.group),
    request,
    response,
    fragment: colors.fragment ?? rgba(DEFAULT_THEME_RGB4.fragment),
    fragmentLabelBg: colors.fragmentLabelBg ?? rgba(DEFAULT_THEME_RGB4.fragmentLabelBg),
    note: colors.note ?? rgba(DEFAULT_THEME_RGB4.noteFg),
    noteBg: colors.noteBg ?? rgba(DEFAULT_THEME_RGB4.noteBg),
    ...createColorRampTheme(numberedStyleKeys("requestFade", SEQUENCE_FADE_STEPS), lifeline, request),
    ...createColorRampTheme(numberedStyleKeys("responseFade", SEQUENCE_FADE_STEPS), lifeline, response),
    ...createColorRampTheme(LIFELINE_RAMP_STYLES, participant, lifeline)
  };
}
function sequenceStyleColor(style, colors) {
  if (style === "noteBadge")
    return colors.note;
  if (style === "fragmentLabel")
    return colors.fragment;
  return style ? colors[style] : undefined;
}
function sequenceStyleBackgroundColor(style, colors) {
  if (style === "note" || style === "noteBadge")
    return colors.noteBg;
  if (style === "fragmentLabel")
    return colors.fragmentLabelBg;
  return;
}

// src/merman/sequence/drawing.ts
var SEQUENCE_BORDER = BorderChars4.rounded;
function centeredStart(center, text) {
  return center - Math.floor(diagramTextWidth(text) / 2);
}
function arrowHeadChar(head, direction) {
  switch (head) {
    case "open":
      return direction === 1 ? ">" : "<";
    case "cross":
      return "\u2715";
    case "async":
      return direction === 1 ? ")" : "(";
    default:
      return direction === 1 ? "\u25BA" : "\u25C4";
  }
}
function createGrid(width, height) {
  return new DiagramCanvas(width, height);
}
function setCell2(grid, x, y, char, style) {
  grid.setCell(x, y, char, style);
}
function setText2(grid, x, y, text, style) {
  grid.setText(Math.max(0, x), y, text, style);
}
function setArrowDepartureFade(grid, x, y, direction, style) {
  setCell2(grid, x, y, direction === 1 ? SEQUENCE_BORDER.leftT : SEQUENCE_BORDER.rightT, `${style}Fade1`);
  for (let step = 2;step <= 5; step++) {
    setCell2(grid, x + direction * (step - 1), y, SEQUENCE_BORDER.horizontal, `${style}Fade${step}`);
  }
}
function groupVerticalChar(existing) {
  switch (existing) {
    case undefined:
    case " ":
      return SEQUENCE_BORDER.vertical;
    case SEQUENCE_BORDER.vertical:
      return SEQUENCE_BORDER.vertical;
    default:
      return;
  }
}
function setGroupVerticalCell(grid, x, y) {
  const existing = grid.getCell(x, y)?.char;
  const char = groupVerticalChar(existing);
  if (char)
    setCell2(grid, x, y, char, "group");
}
function renderParticipantGroups(grid, groupBounds, bottomY) {
  for (const bounds of groupBounds) {
    for (let x = bounds.leftX;x <= bounds.rightX; x++) {
      setCell2(grid, x, 0, SEQUENCE_BORDER.horizontal, "group");
      setCell2(grid, x, bottomY, SEQUENCE_BORDER.horizontal, "group");
    }
    setCell2(grid, bounds.leftX, 0, SEQUENCE_BORDER.topLeft, "group");
    setCell2(grid, bounds.rightX, 0, SEQUENCE_BORDER.topRight, "group");
    setCell2(grid, bounds.leftX, bottomY, SEQUENCE_BORDER.bottomLeft, "group");
    setCell2(grid, bounds.rightX, bottomY, SEQUENCE_BORDER.bottomRight, "group");
    for (let y = 1;y < bottomY; y++) {
      setGroupVerticalCell(grid, bounds.leftX, y);
      setGroupVerticalCell(grid, bounds.rightX, y);
    }
    if (bounds.labelText) {
      setText2(grid, bounds.leftX + 2, 0, bounds.labelText, "group");
    }
  }
}
function drawFragmentWalls(grid, bounds, startY, endY, borderStyle) {
  if (endY < startY)
    return;
  const border = BorderChars4[borderStyle];
  for (let y = startY;y <= endY; y++) {
    setCell2(grid, bounds.leftX, y, border.vertical, "fragment");
    setCell2(grid, bounds.rightX, y, border.vertical, "fragment");
  }
}
function renderFragment(grid, placement, borderStyle) {
  const { bounds, fragment, labelText: label, y } = placement;
  const border = BorderChars4[borderStyle];
  const { leftX, rightX } = bounds;
  const leftChar = isFragmentStart(fragment.kind) ? border.topLeft : fragment.kind !== "end" ? border.leftT : border.bottomLeft;
  const rightChar = isFragmentStart(fragment.kind) ? border.topRight : fragment.kind !== "end" ? border.rightT : border.bottomRight;
  for (let x = leftX;x <= rightX; x++) {
    setCell2(grid, x, y, border.horizontal, "fragment");
  }
  setCell2(grid, leftX, y, leftChar, "fragment");
  setCell2(grid, rightX, y, rightChar, "fragment");
  if (label) {
    setText2(grid, leftX + 2, y, label, "fragmentLabel");
  }
}
function renderSelfMessage(grid, placement, style) {
  const { centerX, rightX, topY: topRow, bottomY: bottomRow, labelLines, message } = placement;
  setArrowDepartureFade(grid, centerX, topRow, 1, style);
  for (let x = centerX + SEQUENCE_FADE_STEPS.length;x < rightX; x++) {
    setCell2(grid, x, topRow, SEQUENCE_BORDER.horizontal, style);
  }
  setCell2(grid, rightX, topRow, SEQUENCE_BORDER.topRight, style);
  for (let lineIndex = 0;lineIndex < labelLines.length; lineIndex++) {
    const y = topRow + lineIndex + 1;
    setCell2(grid, centerX, y, SEQUENCE_BORDER.vertical, "lifeline");
    setText2(grid, centerX + 2, y, labelLines[lineIndex], style);
    setCell2(grid, rightX, y, SEQUENCE_BORDER.vertical, style);
  }
  for (let x = centerX + 1;x < rightX; x++) {
    setCell2(grid, x, bottomRow, SEQUENCE_BORDER.horizontal, style);
  }
  const headX = message.head === undefined ? centerX : centerX + 1;
  setCell2(grid, headX, bottomRow, arrowHeadChar(message.head, -1), style);
  setCell2(grid, rightX, bottomRow, SEQUENCE_BORDER.bottomRight, style);
}
function renderNote(grid, placement) {
  placement.textLines.forEach((line, index) => setText2(grid, placement.textX, placement.textY + index, line, "noteBadge"));
}
function drawSequenceDiagramGrid(diagram, options = {}) {
  const plan = createSequencePlacementPlan(diagram, options);
  if (plan.width === 0 || plan.height === 0)
    return createGrid(0, 0);
  const fragmentBorderStyle = options.fragmentBorderStyle ?? DEFAULT_FRAGMENT_BORDER_STYLE;
  const grid = createGrid(plan.width, plan.height);
  if (plan.groups.length > 0)
    renderParticipantGroups(grid, plan.groups, plan.height - 1);
  for (const placement of plan.participants) {
    const { centerX: center, headerLeftX, headerRightX, labelLines } = placement;
    const { participantHeaderTopY, participantHeaderY, participantRuleY, lifelineStartY, lifelineEndY } = plan.rows;
    if (options.compact) {
      labelLines.forEach((line, index) => setText2(grid, centeredStart(center, line), participantHeaderY + index, line, "participant"));
    } else {
      labelLines.forEach((line, index) => setText2(grid, centeredStart(center, line), participantHeaderTopY + index, line, "participant"));
      for (let x = headerLeftX;x <= headerRightX; x++) {
        setCell2(grid, x, participantRuleY, SEQUENCE_BORDER.horizontal, "participant");
      }
      setCell2(grid, center, participantRuleY, SEQUENCE_BORDER.topT, "participant");
    }
    for (let y = lifelineStartY;y <= lifelineEndY; y++) {
      const distance = y - lifelineStartY;
      const style = !options.compact && distance < 3 ? `lifelineRamp${distance + 1}` : "lifeline";
      setCell2(grid, center, y, SEQUENCE_BORDER.vertical, style);
    }
  }
  for (const placement of plan.steps) {
    if (placement.type === "note") {
      renderNote(grid, placement);
      continue;
    }
    if (placement.type === "fragment") {
      if (placement.wallsBefore) {
        drawFragmentWalls(grid, placement.wallsBefore.bounds, placement.wallsBefore.startY, placement.wallsBefore.endY, fragmentBorderStyle);
      }
      renderFragment(grid, placement, fragmentBorderStyle);
      continue;
    }
    const message = placement.message;
    const messageStyle = message.style === "dashed" ? "response" : "request";
    if (placement.type === "selfMessage") {
      renderSelfMessage(grid, placement, messageStyle);
      continue;
    }
    if (!placement.inlineLabel) {
      for (let lineIndex = 0;lineIndex < placement.labelLines.length; lineIndex++) {
        setText2(grid, placement.labelX, placement.labelY + lineIndex, placement.labelLines[lineIndex], messageStyle);
      }
    }
    for (let x = placement.leftX + 1;x < placement.rightX; x++) {
      setCell2(grid, x, placement.arrowY, SEQUENCE_BORDER.horizontal, messageStyle);
    }
    setArrowDepartureFade(grid, placement.fromX, placement.arrowY, placement.direction, messageStyle);
    setCell2(grid, placement.headX, placement.arrowY, arrowHeadChar(message.head, placement.direction), messageStyle);
    if (placement.inlineLabel)
      setText2(grid, placement.labelX, placement.labelY, placement.inlineLabel, messageStyle);
  }
  for (const activation of plan.activations) {
    for (let y = activation.startY;y <= activation.endY; y++) {
      if (grid.getCell(activation.centerX, y)?.char === SEQUENCE_BORDER.vertical) {
        setCell2(grid, activation.centerX, y, "\u2503", "lifeline");
      }
    }
  }
  return grid;
}

// src/merman/sequence/render-grid.ts
function renderSequenceGridStyledText(grid, colors) {
  return renderDiagramGridStyledText(grid, (run) => sequenceStyleColor(run.style, colors), (run) => sequenceStyleBackgroundColor(run.style, colors));
}

// src/merman/state/drawing.ts
import { BorderChars as BorderChars6 } from "@opentui/core";

// src/merman/core/spatial.ts
function normalizedSpan(y, fromX, toX) {
  return { y, fromX: Math.min(fromX, toX), toX: Math.max(fromX, toX) };
}
function assertFiniteInteger(value, name) {
  if (!Number.isFinite(value) || !Number.isInteger(value))
    throw new RangeError(`${name} must be a finite integer`);
}
function spatialRectSpans(bounds) {
  assertFiniteInteger(bounds.left, "bounds.left");
  assertFiniteInteger(bounds.top, "bounds.top");
  assertFiniteInteger(bounds.width, "bounds.width");
  assertFiniteInteger(bounds.height, "bounds.height");
  if (bounds.width <= 0 || bounds.height <= 0)
    throw new RangeError("Spatial bounds must have positive dimensions");
  return Array.from({ length: bounds.height }, (_, offset) => normalizedSpan(bounds.top + offset, bounds.left, bounds.left + bounds.width - 1));
}
function spatialPathSpans(points) {
  for (const [index, point] of points.entries()) {
    assertFiniteInteger(point.x, `points[${index}].x`);
    assertFiniteInteger(point.y, `points[${index}].y`);
    if (index > 0 && point.x !== points[index - 1].x && point.y !== points[index - 1].y) {
      throw new RangeError("Spatial paths must be orthogonal");
    }
  }
  const cells = new Map;
  const add = (point) => {
    const row = cells.get(point.y) ?? new Set;
    row.add(point.x);
    cells.set(point.y, row);
  };
  if (points.length === 1)
    add(points[0]);
  for (const point of orthogonalPathPoints(points))
    add(point);
  return [...cells.entries()].sort(([left], [right]) => left - right).flatMap(([y, xs]) => {
    const sorted = [...xs].sort((left, right) => left - right);
    const [first, ...rest] = sorted;
    if (first === undefined)
      return [];
    const spans = [];
    let start = first;
    let end = first;
    for (const x of rest) {
      if (x === end + 1) {
        end = x;
        continue;
      }
      spans.push(normalizedSpan(y, start, end));
      start = x;
      end = x;
    }
    spans.push(normalizedSpan(y, start, end));
    return spans;
  });
}
function spatialRectClaim(id, owner, role, bounds) {
  return { id, owner, role, spans: spatialRectSpans(bounds) };
}
function spatialPathClaim(id, owner, role, points) {
  return { id, owner, role, spans: spatialPathSpans(points) };
}
function compareClaims(left, right) {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
function sameClaim(left, right) {
  return left.id === right.id && left.owner === right.owner && left.role === right.role && left.spans.length === right.spans.length && left.spans.every((span, index) => span.y === right.spans[index].y && span.fromX === right.spans[index].fromX && span.toX === right.spans[index].toX);
}
function pointIsContact(point, existing, contacts) {
  return contacts.some((contact) => contact.owner === existing.owner && contact.points.some((candidate) => candidate.x === point.x && candidate.y === point.y));
}
function rolesMayOverlap(moving, existing) {
  if (moving.owner === existing.owner)
    return true;
  return moving.role === "route" && existing.role === "route";
}
function normalizeClearance(clearance) {
  const x = typeof clearance === "number" ? clearance : clearance?.x ?? 0;
  const y = typeof clearance === "number" ? clearance : clearance?.y ?? 0;
  assertFiniteInteger(x, "clearance.x");
  assertFiniteInteger(y, "clearance.y");
  if (x < 0 || y < 0)
    throw new RangeError("Spatial clearance cannot be negative");
  return { x, y };
}
function inflateSpan(span, clearance) {
  return { y: span.y, fromX: span.fromX - clearance.x, toX: span.toX + clearance.x };
}

class SpatialIndex {
  static empty() {
    return new SpatialIndex([]);
  }
  claims;
  constructor(claims) {
    this.claims = Object.freeze(claims.map((claim) => Object.freeze({
      ...claim,
      spans: Object.freeze([...claim.spans].map((span) => Object.freeze({ ...span })).sort((left, right) => left.y - right.y || left.fromX - right.fromX || left.toX - right.toX))
    })));
  }
  add(...claims) {
    return this.overlay(new SpatialIndex(claims));
  }
  overlay(other) {
    const claims = new Map(this.claims.map((claim) => [claim.id, claim]));
    for (const claim of other.claims) {
      const existing = claims.get(claim.id);
      if (existing && !sameClaim(existing, claim))
        throw new Error(`Conflicting spatial claim id: ${claim.id}`);
      claims.set(claim.id, claim);
    }
    return new SpatialIndex([...claims.values()].sort(compareClaims));
  }
  conflicts(moving, policy = {}) {
    const contacts = policy.contacts ?? [];
    const conflicts = [];
    for (const existing of this.claims) {
      if (rolesMayOverlap(moving, existing))
        continue;
      const configuredClearance = typeof policy.clearance === "number" || policy.clearance && "x" in policy.clearance ? policy.clearance : policy.clearance?.[existing.role];
      const clearance = normalizeClearance(configuredClearance);
      for (const movingSpan of moving.spans) {
        for (let dy = -clearance.y;dy <= clearance.y; dy++) {
          const inflated = inflateSpan({ ...movingSpan, y: movingSpan.y + dy }, clearance);
          for (const existingSpan of existing.spans) {
            if (inflated.y !== existingSpan.y)
              continue;
            const fromX = Math.max(inflated.fromX, existingSpan.fromX);
            const toX = Math.min(inflated.toX, existingSpan.toX);
            for (let x = fromX;x <= toX; x++) {
              const point = { x, y: inflated.y };
              const movingOccupiesPoint = moving.spans.some((span) => span.y === point.y && point.x >= span.fromX && point.x <= span.toX);
              if (!(movingOccupiesPoint && pointIsContact(point, existing, contacts))) {
                conflicts.push({ moving, existing, point });
              }
            }
          }
        }
      }
    }
    return conflicts;
  }
  isFree(claim, policy = {}) {
    return this.conflicts(claim, policy).length === 0;
  }
  firstFit(candidates, policy = {}) {
    return candidates.find((candidate) => this.isFree(candidate.claim, policy));
  }
}

// src/merman/state/routing.ts
import { BorderChars as BorderChars5 } from "@opentui/core";

// src/merman/state/note.ts
function stateDiagramNoteConnector(bounds, target) {
  if (bounds.connector)
    return bounds.connector;
  const noteX = bounds.note.position === "right" ? bounds.left - 1 : bounds.left + bounds.width;
  const targetX = bounds.note.position === "right" ? target.left + target.width : target.left - 1;
  const targetBottom = target.top + target.height - 1;
  const noteBottom = bounds.top + bounds.height - 1;
  const noteAbove = noteBottom < target.top;
  const noteBelow = bounds.top > targetBottom;
  if (noteAbove || noteBelow) {
    const connectorY = bounds.centerY;
    return {
      connectorY,
      points: [
        { x: targetX, y: noteAbove ? target.top - 1 : targetBottom + 1 },
        { x: targetX, y: connectorY },
        { x: noteX, y: connectorY }
      ]
    };
  }
  const connectorY = Math.max(bounds.top + 1, Math.min(target.centerY, bounds.top + bounds.height - 2));
  return {
    connectorY,
    points: [
      { x: targetX, y: connectorY },
      { x: noteX, y: connectorY }
    ]
  };
}

// src/merman/state/search.ts
var MAX_RENDER_SEARCH_VISITS = 250000;
function createStateSearchBudget() {
  return { remaining: MAX_RENDER_SEARCH_VISITS };
}
function createStateSearchSpace(space, clearance = () => 0) {
  const blocked = new Set;
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (const claim of space.claims) {
    const padding = clearance(claim.role);
    for (const span of claim.spans) {
      for (let y = span.y - padding;y <= span.y + padding; y++) {
        for (let x = span.fromX - padding;x <= span.toX + padding; x++) {
          blocked.add(`${x}:${y}`);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
  }
  return { blocked, minX, minY, maxX, maxY };
}
function findStateManhattanPath(starts, goal, space, bounds, budget, isFree = (point) => !space.blocked.has(pointKey(point))) {
  const queue = [...new Map(starts.filter(isFree).map((point) => [pointKey(point), point])).values()];
  const parents = new Map(queue.map((point) => [pointKey(point), undefined]));
  const points = new Map(queue.map((point) => [pointKey(point), point]));
  for (let cursor = 0;cursor < queue.length && budget.remaining > 0; cursor++, budget.remaining--) {
    const current = queue[cursor];
    if (current.x === goal.x && current.y === goal.y)
      break;
    const dx = Math.sign(goal.x - current.x);
    const dy = Math.sign(goal.y - current.y);
    const candidates = [
      ...dx === 0 ? [] : [{ x: current.x + dx, y: current.y }],
      ...dy === 0 ? [] : [{ x: current.x, y: current.y + dy }],
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y - 1 }
    ];
    for (const candidate of candidates) {
      if (candidate.x < bounds.minX || candidate.x > bounds.maxX || candidate.y < bounds.minY || candidate.y > bounds.maxY)
        continue;
      const key = pointKey(candidate);
      if (parents.has(key) || !isFree(candidate))
        continue;
      parents.set(key, pointKey(current));
      points.set(key, candidate);
      queue.push(candidate);
    }
  }
  if (!parents.has(pointKey(goal)))
    return;
  const path = [];
  let cursor = pointKey(goal);
  while (cursor) {
    path.push(points.get(cursor));
    cursor = parents.get(cursor);
  }
  return path.reverse();
}
function pointKey(point) {
  return `${point.x}:${point.y}`;
}

// src/merman/state/visible-model.ts
function isHiddenCompositeMarker(state) {
  return Boolean(state?.parentId && (state.kind === "start" || state.kind === "end"));
}
function composeTransitionLabel(incoming, outgoing) {
  return [incoming.label, outgoing.label].filter(Boolean).join("<br/>");
}
function collapseHiddenCompositeMarkerTransitionsOnce(transitions, statesById) {
  const hiddenMarkers = new Set([...statesById.values()].filter((state) => isHiddenCompositeMarker(state)).map((state) => state.id));
  if (hiddenMarkers.size === 0)
    return { transitions: [...transitions], changed: false };
  for (const markerId of hiddenMarkers) {
    const incoming = transitions.filter((transition) => transition.to === markerId && transition.from !== markerId);
    const outgoing = transitions.filter((transition) => transition.from === markerId && transition.to !== markerId);
    if (incoming.length === 0 || outgoing.length === 0)
      continue;
    const skipped = new Set([...incoming, ...outgoing]);
    return {
      transitions: [
        ...transitions.filter((transition) => !skipped.has(transition)),
        ...incoming.flatMap((incomingTransition) => outgoing.map((outgoingTransition) => ({
          from: incomingTransition.from,
          to: outgoingTransition.to,
          label: composeTransitionLabel(incomingTransition, outgoingTransition)
        })))
      ],
      changed: true
    };
  }
  return { transitions: [...transitions], changed: false };
}
function collapseHiddenCompositeMarkerTransitions(diagram) {
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  let transitions = diagram.transitions.map((transition) => ({ ...transition }));
  while (true) {
    const result = collapseHiddenCompositeMarkerTransitionsOnce(transitions, statesById);
    transitions = result.transitions;
    if (!result.changed)
      return transitions;
  }
}
function prepareVisibleStateDiagram(diagram) {
  const transitions = collapseHiddenCompositeMarkerTransitions(diagram);
  const referencedHiddenMarkers = new Set;
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  for (const transition of transitions) {
    const from = statesById.get(transition.from);
    const to = statesById.get(transition.to);
    if (from && isHiddenCompositeMarker(from))
      referencedHiddenMarkers.add(from.id);
    if (to && isHiddenCompositeMarker(to))
      referencedHiddenMarkers.add(to.id);
  }
  return {
    ...diagram,
    states: diagram.states.filter((state) => !isHiddenCompositeMarker(state) || referencedHiddenMarkers.has(state.id)),
    transitions
  };
}

// src/merman/state/routing.ts
function measureStateTransitionLabel(label) {
  if (!label)
    return { lines: [], width: 0, height: 0 };
  const lines = splitDiagramLines(label);
  return { lines, width: Math.max(...lines.map(diagramTextWidth)), height: lines.length };
}
function hasReverseTransition(diagram, transition) {
  return diagram.transitions.some((other) => other.from === transition.to && other.to === transition.from);
}
function isStateHorizontalFeedback(diagram, from, to) {
  if (diagram.direction === "RL")
    return to.centerX > from.centerX;
  return to.centerX < from.centerX;
}
function feedbackIntervalsOverlap(left, right) {
  return left.left <= right.right && right.left <= left.right;
}
function feedbackIntervalsCross(left, right) {
  return left.left < right.left && right.left < left.right && left.right < right.right || right.left < left.left && left.left < right.right && right.right < left.right;
}
function createFeedbackAllocations(diagram, bounds, feedbackLaneY, laneGap, feedbackTopY) {
  if (diagram.direction !== "LR" && diagram.direction !== "RL")
    return new Map;
  const allocations = new Map;
  const sidedIntervals = { bottom: [], top: [] };
  const canonicalSides = new Map;
  const topLaneY = feedbackTopY ?? Math.min(...[...bounds.values()].map((bound) => bound.top)) - 3;
  const intervals = [];
  for (const transition of diagram.transitions) {
    const from = bounds.get(transition.from);
    const to = bounds.get(transition.to);
    if (!from || !to || transition.from === transition.to || !isStateHorizontalFeedback(diagram, from, to))
      continue;
    if (from.centerY !== to.centerY && !(from.centerY > to.centerY))
      continue;
    intervals.push({ transition, left: Math.min(from.centerX, to.centerX), right: Math.max(from.centerX, to.centerX) });
  }
  for (const interval of intervals) {
    const endpointKey = `${interval.transition.from}\x00${interval.transition.to}`;
    const side = canonicalSides.get(endpointKey) ?? ["bottom", "top"].find((candidate) => !sidedIntervals[candidate].some((existing) => feedbackIntervalsCross(existing, interval)));
    if (!side)
      continue;
    canonicalSides.set(endpointKey, side);
    interval.side = side;
    sidedIntervals[side].push(interval);
  }
  for (const side of ["bottom", "top"]) {
    const occupied = [];
    const intervalsByWidth = [...sidedIntervals[side]].sort((left, right) => left.right - left.left - (right.right - right.left));
    for (const interval of intervalsByWidth) {
      let lane = 0;
      while (occupied.some((existing) => existing.lane === lane && feedbackIntervalsOverlap(existing, interval)))
        lane++;
      const railY = side === "bottom" ? feedbackLaneY + lane * laneGap : topLaneY - lane * laneGap;
      occupied.push({ ...interval, side, lane, railY });
      allocations.set(interval.transition, { side, railY });
    }
  }
  return allocations;
}
function hasOpposingTopConnector(diagram, transition, bounds) {
  const from = bounds.get(transition.from);
  const to = bounds.get(transition.to);
  if (!from || !to || from.centerY === to.centerY)
    return false;
  const lowerId = from.centerY > to.centerY ? transition.from : transition.to;
  const lower = bounds.get(lowerId);
  const leavesLower = transition.from === lowerId;
  return diagram.transitions.some((other) => {
    if (other === transition || (leavesLower ? other.to !== lowerId : other.from !== lowerId))
      return false;
    const otherFrom = bounds.get(other.from);
    const otherTo = bounds.get(other.to);
    if (!otherFrom || !otherTo || Math.max(otherFrom.centerY, otherTo.centerY) !== lower.centerY)
      return false;
    if (other.from !== lowerId)
      return true;
    return !((diagram.direction === "LR" || diagram.direction === "RL") && isStateHorizontalFeedback(diagram, otherFrom, otherTo));
  });
}
function verticalCorridorCrossesUnrelatedState(diagram, transition, from, to, bounds) {
  const top = Math.min(from.top + from.height, to.top + to.height);
  const bottom = Math.max(from.top - 1, to.top - 1);
  return diagram.states.some((state) => {
    if (state.id === transition.from || state.id === transition.to || isHiddenCompositeMarker(state))
      return false;
    const bound = bounds.get(state.id);
    return Boolean(bound && from.centerX >= bound.left && from.centerX < bound.left + bound.width && top < bound.top + bound.height && bottom >= bound.top);
  });
}
function hasVerticalCorridor(from, to) {
  if (from.centerY < to.centerY)
    return from.top + from.height <= to.top - 1;
  return from.top - 1 >= to.top + to.height;
}
function horizontalCorridorCrossesUnrelatedState(diagram, transition, from, to, bounds) {
  const leftToRight = from.centerX <= to.centerX;
  const startX = leftToRight ? from.left + from.width : from.left - 1;
  const endX = leftToRight ? to.left - 1 : to.left + to.width;
  const space = SpatialIndex.empty().add(...diagram.states.flatMap((state) => {
    if (state.id === transition.from || state.id === transition.to || isHiddenCompositeMarker(state))
      return [];
    const bound = bounds.get(state.id);
    return bound ? [spatialRectClaim(`state:${state.id}`, `state:${state.id}`, "body", bound)] : [];
  }));
  const corridor = spatialPathClaim(`corridor:${transition.from}:${transition.to}`, `transition:${transition.from}:${transition.to}`, "route", [
    { x: startX, y: from.centerY },
    { x: endX, y: from.centerY }
  ]);
  return !space.isFree(corridor);
}
function bottomApproachX(diagram, transition, from, to, bounds, railY) {
  const targetX = to.width > 1 ? from.centerX > to.centerX ? to.left + 1 : to.left + to.width - 2 : to.centerX;
  const targetBottomY = to.top + to.height;
  const top = Math.min(targetBottomY, railY);
  const bottom = Math.max(targetBottomY, railY);
  const isClear = (x) => !diagram.states.some((state) => {
    if (state.id === transition.from || state.id === transition.to || isHiddenCompositeMarker(state))
      return false;
    const bound = bounds.get(state.id);
    return Boolean(bound && x >= bound.left && x < bound.left + bound.width && top < bound.top + bound.height && bottom >= bound.top);
  });
  if (isClear(targetX))
    return targetX;
  const maxX = Math.max(targetX, ...[...bounds.values()].map((bound) => bound.left + bound.width)) + 1;
  for (let distance = 1;distance <= maxX; distance++) {
    const right = targetX + distance;
    if (isClear(right))
      return right;
    const left = targetX - distance;
    if (left >= 0 && isClear(left))
      return left;
  }
  return targetX;
}
function sideParallelTargetApproach(diagram, transition, from, to, bounds, railX) {
  const space = SpatialIndex.empty().add(...diagram.states.flatMap((state) => {
    if (state.id === transition.from || state.id === transition.to || isHiddenCompositeMarker(state))
      return [];
    const bound = bounds.get(state.id);
    return bound ? [spatialRectClaim(`state:${state.id}`, `state:${state.id}`, "body", bound)] : [];
  }));
  const targetSideX = to.left + to.width;
  const claim = (points) => spatialPathClaim(`side-target:${transition.from}:${transition.to}`, "side-target", "route", points);
  if (space.isFree(claim([
    { x: railX, y: to.centerY },
    { x: targetSideX, y: to.centerY }
  ])))
    return;
  const targetX = innerConnectorX(to, from.centerX);
  const preferred = from.centerY > to.centerY ? "top" : "bottom";
  return [preferred, preferred === "top" ? "bottom" : "top"].find((side) => {
    const railY = side === "top" ? to.top - 2 : to.top + to.height + 1;
    const targetY = side === "top" ? to.top - 1 : to.top + to.height;
    return space.isFree(claim([
      { x: railX, y: railY },
      { x: targetX, y: railY },
      { x: targetX, y: targetY }
    ]));
  });
}
function containingCompositeIds(diagram, id) {
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const compositesById = new Map(diagram.composites.map((composite) => [composite.id, composite]));
  const ids = [];
  let parentId = statesById.get(id)?.parentId ?? compositesById.get(id)?.parentId;
  while (parentId) {
    ids.push(parentId);
    parentId = compositesById.get(parentId)?.parentId;
  }
  return ids;
}
function innermostCommonComposite(diagram, transition) {
  const target = new Set(containingCompositeIds(diagram, transition.to));
  return containingCompositeIds(diagram, transition.from).find((id) => target.has(id));
}
function createStateTransitionRoutePlans(diagram, bounds, feedbackLaneY, feedbackTopY) {
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const endpointOccurrences = new Map;
  const selfOccurrences = new Map;
  const parallelLaneGap = Math.max(3, ...diagram.transitions.map((transition) => measureStateTransitionLabel(transition.label).height + 2));
  let nextSideRailX = Math.max(0, ...[...bounds.values()].map((bound) => bound.left + bound.width)) + 3;
  const sideRailLanes = new Map;
  const feedbackAllocations = createFeedbackAllocations(diagram, bounds, feedbackLaneY, parallelLaneGap, feedbackTopY);
  let nextBottomRailY = Math.max(feedbackLaneY - parallelLaneGap, ...[...feedbackAllocations.values()].filter((allocation) => allocation.side === "bottom").map((allocation) => allocation.railY)) + parallelLaneGap;
  const allocateSideRail = (transition) => {
    const compositeId = innermostCommonComposite(diagram, transition);
    const composite = compositeId ? bounds.get(compositeId) : undefined;
    if (compositeId && composite) {
      const lane = sideRailLanes.get(compositeId) ?? 0;
      sideRailLanes.set(compositeId, lane + 1);
      const descendantRight = Math.max(composite.left + 1, ...diagram.states.flatMap((state) => {
        if (!containingCompositeIds(diagram, state.id).includes(compositeId))
          return [];
        const bound = bounds.get(state.id);
        return bound ? [bound.left + bound.width] : [];
      }));
      return Math.min(descendantRight + 2 + lane * 3, composite.left + composite.width - 2);
    }
    const railX = nextSideRailX;
    nextSideRailX += 3;
    return railX;
  };
  const allocateBottomRail = () => {
    const railY = nextBottomRailY;
    nextBottomRailY += parallelLaneGap;
    return railY;
  };
  return diagram.transitions.flatMap((transition) => {
    const from = bounds.get(transition.from);
    const to = bounds.get(transition.to);
    if (!from || !to)
      return [];
    const targetState = statesById.get(transition.to);
    const targetIsChoice = targetState?.kind === "choice";
    const targetIsHiddenMarker = isHiddenCompositeMarker(targetState);
    const base = { transition, from, to, targetIsChoice, targetIsHiddenMarker };
    const sideParallel = () => {
      const railX = allocateSideRail(transition);
      return {
        ...base,
        kind: "side-parallel",
        railX,
        targetApproach: sideParallelTargetApproach(diagram, transition, from, to, bounds, railX)
      };
    };
    if (transition.from === transition.to) {
      const lane = selfOccurrences.get(transition.from) ?? 0;
      selfOccurrences.set(transition.from, lane + 1);
      return [{ ...base, kind: "self", lane }];
    }
    const endpointKey = `${transition.from}\x00${transition.to}`;
    const parallelIndex = endpointOccurrences.get(endpointKey) ?? 0;
    endpointOccurrences.set(endpointKey, parallelIndex + 1);
    const feedback = (diagram.direction === "LR" || diagram.direction === "RL") && isStateHorizontalFeedback(diagram, from, to);
    const feedbackAllocation = feedbackAllocations.get(transition);
    if (feedbackAllocation) {
      if (feedbackAllocation.side === "bottom") {
        return [
          {
            ...base,
            kind: "bottom-feedback",
            railY: feedbackAllocation.railY,
            approachX: bottomApproachX(diagram, transition, from, to, bounds, feedbackAllocation.railY)
          }
        ];
      }
      return [
        {
          ...base,
          kind: "top-feedback",
          railY: feedbackAllocation.railY
        }
      ];
    }
    if (parallelIndex > 0) {
      if (from.centerY === to.centerY) {
        const railY = allocateBottomRail();
        return [
          {
            ...base,
            kind: "bottom-parallel",
            railY,
            approachX: bottomApproachX(diagram, transition, from, to, bounds, railY)
          }
        ];
      }
      return [sideParallel()];
    }
    if (diagram.direction !== "LR" && diagram.direction !== "RL") {
      const fromParent = statesById.get(transition.from)?.parentId;
      const toParent = statesById.get(transition.to)?.parentId;
      if (fromParent && toParent && fromParent !== toParent) {
        return [sideParallel()];
      }
      if (verticalCorridorCrossesUnrelatedState(diagram, transition, from, to, bounds)) {
        return [sideParallel()];
      }
      const verticalFeedback = diagram.direction === "BT" ? from.centerY < to.centerY : from.centerY > to.centerY;
      if (verticalFeedback) {
        return [sideParallel()];
      }
      if (from.centerY === to.centerY) {
        if (hasReverseTransition(diagram, transition) && from.centerX > to.centerX) {
          const railY = allocateBottomRail();
          return [
            {
              ...base,
              kind: "bottom-parallel",
              railY,
              approachX: bottomApproachX(diagram, transition, from, to, bounds, railY)
            }
          ];
        }
        return [{ ...base, kind: "horizontal-forward", leftToRight: from.centerX <= to.centerX }];
      }
      if (!hasVerticalCorridor(from, to)) {
        return [sideParallel()];
      }
      if (from.centerX !== to.centerX) {
        return [{ ...base, kind: "vertical-elbow", hasReverse: false, offsetConnector: false }];
      }
      return [{ ...base, kind: "vertical" }];
    }
    if (from.centerY !== to.centerY) {
      if (!hasVerticalCorridor(from, to)) {
        return [sideParallel()];
      }
      if (from.centerY > to.centerY && feedback)
        return [
          {
            ...base,
            kind: "bottom-feedback",
            railY: feedbackLaneY,
            approachX: bottomApproachX(diagram, transition, from, to, bounds, feedbackLaneY)
          }
        ];
      const hasReverse = hasReverseTransition(diagram, transition);
      return [
        {
          ...base,
          kind: "vertical-elbow",
          hasReverse,
          offsetConnector: hasReverse || hasOpposingTopConnector(diagram, transition, bounds)
        }
      ];
    }
    if (feedback)
      return [
        {
          ...base,
          kind: "bottom-feedback",
          railY: feedbackLaneY,
          approachX: bottomApproachX(diagram, transition, from, to, bounds, feedbackLaneY)
        }
      ];
    if (horizontalCorridorCrossesUnrelatedState(diagram, transition, from, to, bounds)) {
      const railY = allocateBottomRail();
      return [
        {
          ...base,
          kind: "bottom-parallel",
          railY,
          approachX: bottomApproachX(diagram, transition, from, to, bounds, railY)
        }
      ];
    }
    return [{ ...base, kind: "horizontal-forward", leftToRight: from.centerX <= to.centerX }];
  });
}
function addCell(builder, cell) {
  builder.cells.push(cell);
  builder.path.push([cell.x, cell.y]);
}
function addPathPoint(builder, x, y) {
  builder.path.push([x, y]);
}
function addLabel(builder, x, y, label) {
  const metrics = measureStateTransitionLabel(label);
  if (metrics.lines.length > 0)
    builder.label = { x, y, lines: metrics.lines };
}
function addHorizontalLine(builder, fromX, toX, y, direction) {
  for (let x = fromX;direction === 1 ? x <= toX : x >= toX; x += direction) {
    addCell(builder, { x, y, char: "\u2500" });
  }
}
function addVerticalLine(builder, x, fromY, toY, direction) {
  for (let y = fromY;direction === 1 ? y <= toY : y >= toY; y += direction) {
    addCell(builder, { x, y, char: "\u2502" });
  }
}
function addRightDeparture(builder, bounds) {
  if (bounds.width <= 1 || bounds.height <= 1)
    return;
  addCell(builder, {
    x: bounds.left + bounds.width - 1,
    y: bounds.centerY,
    char: BorderChars5.rounded.leftT
  });
}
function addLeftDeparture(builder, bounds) {
  if (bounds.width <= 1 || bounds.height <= 1)
    return;
  addCell(builder, { x: bounds.left, y: bounds.centerY, char: BorderChars5.rounded.rightT });
}
function addBottomDeparture(builder, bounds, x) {
  if (bounds.width <= 1 || bounds.height <= 1)
    return;
  addCell(builder, {
    x,
    y: bounds.top + bounds.height - 1,
    char: BorderChars5.rounded.topT
  });
}
function addTopDeparture(builder, bounds, x) {
  if (bounds.width <= 1 || bounds.height <= 1)
    return;
  addCell(builder, { x, y: bounds.top, char: BorderChars5.rounded.bottomT });
}
function addHorizontalForward(builder) {
  const { from, to, targetIsChoice, targetIsHiddenMarker, leftToRight, transition } = builder.route;
  const y = from.centerY;
  if (leftToRight)
    addRightDeparture(builder, from);
  else
    addLeftDeparture(builder, from);
  const step = leftToRight ? 1 : -1;
  const startX = leftToRight ? from.left + from.width : from.left - 1;
  const endX = leftToRight ? to.left - 1 : to.left + to.width;
  addHorizontalLine(builder, startX, endX - step, y, step);
  addCell(builder, targetIsHiddenMarker ? { x: endX, y, char: "\u2500" } : { x: endX, y, arrowDirection: leftToRight ? "right" : "left" });
  if (targetIsChoice || targetIsHiddenMarker)
    addPathPoint(builder, to.left, y);
  if (!transition.label)
    return;
  const metrics = measureStateTransitionLabel(transition.label);
  const labelX = Math.min(startX, endX) + Math.max(1, Math.floor((Math.abs(endX - startX) - metrics.width) / 2));
  addLabel(builder, labelX, Math.max(0, y - metrics.height), transition.label);
}
function addSelfTransition(builder) {
  const { from: bounds, transition, lane } = builder.route;
  if (bounds.width <= 1 || bounds.height <= 1) {
    const railX = bounds.left + 4 + lane * 4;
    const railY = bounds.top + 2 + lane * 2;
    addHorizontalLine(builder, bounds.left + 1, railX - 1, bounds.top, 1);
    addCell(builder, { x: railX, y: bounds.top, char: "\u256E" });
    addVerticalLine(builder, railX, bounds.top + 1, railY - 1, 1);
    addCell(builder, { x: railX, y: railY, char: "\u256F" });
    addHorizontalLine(builder, railX - 1, bounds.left + 1, railY, -1);
    addCell(builder, { x: bounds.left, y: railY, char: "\u2570" });
    for (let y = railY - 1;y > bounds.top + 1; y--)
      addCell(builder, { x: bounds.left, y, char: "\u2502" });
    addCell(builder, { x: bounds.left, y: bounds.top + 1, arrowDirection: "up" });
    addPathPoint(builder, bounds.left, bounds.top);
    if (transition.label)
      addLabel(builder, railX + 2, lane === 0 ? bounds.top + 1 : railY - 1, transition.label);
    return;
  }
  const sourceX = bounds.left + Math.max(2, Math.floor(bounds.width / 3));
  const bottomY = bounds.top + bounds.height - 1;
  const railY = bottomY + 2 + lane * 3;
  const targetX = Math.max(sourceX + 3, bounds.left + Math.min(bounds.width - 3, Math.ceil(bounds.width * 2 / 3))) + lane * 4;
  addBottomDeparture(builder, bounds, sourceX);
  addVerticalLine(builder, sourceX, bottomY + 1, railY - 1, 1);
  addCell(builder, { x: sourceX, y: railY, char: "\u2570" });
  for (let x = sourceX + 1;x < targetX; x++)
    addCell(builder, { x, y: railY, char: "\u2500" });
  addCell(builder, { x: targetX, y: railY, char: "\u256F" });
  for (let y = railY - 1;y > bottomY + 1; y--)
    addCell(builder, { x: targetX, y, char: "\u2502" });
  addCell(builder, { x: targetX, y: bottomY + 1, arrowDirection: "up" });
  if (transition.label)
    addLabel(builder, targetX + 2, lane === 0 ? bottomY + 1 : railY - 1, transition.label);
}
function outsideBottomY(bounds) {
  return bounds.top + bounds.height;
}
function outsideTopY(bounds) {
  return bounds.top - 1;
}
function addBottomLaneTransition(builder) {
  const { from, to, targetIsChoice, targetIsHiddenMarker, transition, railY, approachX } = builder.route;
  const sourceX = from.centerX;
  const targetX = to.width > 1 ? sourceX > to.centerX ? to.left + 1 : to.left + to.width - 2 : to.centerX;
  const targetRailCutsSource = targetX >= from.left && targetX <= from.left + from.width - 1;
  const railTargetX = targetRailCutsSource ? Math.max(from.left + from.width, to.left + to.width) + 2 : approachX;
  const sourceBottomY = outsideBottomY(from);
  const targetBottomY = outsideBottomY(to);
  addBottomDeparture(builder, from, sourceX);
  addVerticalLine(builder, sourceX, sourceBottomY, railY - 1, 1);
  addCell(builder, { x: sourceX, y: railY, char: sourceX > railTargetX ? "\u256F" : "\u2570" });
  if (sourceX !== railTargetX) {
    const horizontalStep = sourceX < railTargetX ? 1 : -1;
    for (let x = sourceX + horizontalStep;x !== railTargetX; x += horizontalStep) {
      addCell(builder, { x, y: railY, char: "\u2500" });
    }
  }
  addCell(builder, { x: railTargetX, y: railY, char: sourceX > railTargetX ? "\u2570" : "\u256F" });
  for (let y = railY - 1;y > targetBottomY; y--)
    addCell(builder, { x: railTargetX, y, char: "\u2502" });
  if (railTargetX !== targetX) {
    addCell(builder, { x: railTargetX, y: targetBottomY, char: railTargetX < targetX ? "\u256D" : "\u256E" });
    const horizontalStep = railTargetX < targetX ? 1 : -1;
    for (let x = railTargetX + horizontalStep;x !== targetX; x += horizontalStep) {
      addCell(builder, { x, y: targetBottomY, char: "\u2500" });
    }
  }
  addCell(builder, targetIsHiddenMarker ? { x: targetX, y: targetBottomY, char: "\u2502" } : { x: targetX, y: targetBottomY, arrowDirection: "up" });
  if (targetIsChoice || targetIsHiddenMarker)
    addPathPoint(builder, to.left, to.top);
  if (!transition.label)
    return;
  const metrics = measureStateTransitionLabel(transition.label);
  const horizontalRoom = Math.abs(sourceX - railTargetX) - 2;
  const labelX = metrics.width <= horizontalRoom ? Math.min(sourceX, railTargetX) + Math.max(1, Math.floor((Math.abs(sourceX - railTargetX) - metrics.width) / 2)) : railTargetX + 2;
  addLabel(builder, labelX, Math.max(0, railY - metrics.height), transition.label);
}
function addTopFeedbackTransition(builder) {
  const { from, to, targetIsChoice, targetIsHiddenMarker, transition, railY } = builder.route;
  const sourceX = from.centerX;
  const targetX = to.width > 1 ? sourceX > to.centerX ? to.left + to.width - 2 : to.left + 1 : to.centerX;
  const sourceTopY = outsideTopY(from);
  const targetTopY = outsideTopY(to);
  addTopDeparture(builder, from, sourceX);
  addVerticalLine(builder, sourceX, sourceTopY, railY + 1, -1);
  addCell(builder, { x: sourceX, y: railY, char: sourceX > targetX ? "\u256E" : "\u256D" });
  if (sourceX !== targetX) {
    const horizontalStep = sourceX < targetX ? 1 : -1;
    for (let x = sourceX + horizontalStep;x !== targetX; x += horizontalStep)
      addCell(builder, { x, y: railY, char: "\u2500" });
  }
  addCell(builder, { x: targetX, y: railY, char: sourceX > targetX ? "\u256D" : "\u256E" });
  for (let y = railY + 1;y < targetTopY; y++)
    addCell(builder, { x: targetX, y, char: "\u2502" });
  addCell(builder, targetIsHiddenMarker ? { x: targetX, y: targetTopY, char: "\u2502" } : { x: targetX, y: targetTopY, arrowDirection: "down" });
  if (targetIsChoice || targetIsHiddenMarker)
    addPathPoint(builder, to.left, to.top);
  if (!transition.label)
    return;
  const metrics = measureStateTransitionLabel(transition.label);
  const horizontalRoom = Math.abs(sourceX - targetX) - 2;
  const labelX = metrics.width <= horizontalRoom ? Math.min(sourceX, targetX) + Math.max(1, Math.floor((Math.abs(sourceX - targetX) - metrics.width) / 2)) : targetX + 2;
  addLabel(builder, labelX, railY - metrics.height, transition.label);
}
function addSideParallelTransition(builder) {
  const { from, to, targetIsChoice, targetIsHiddenMarker, transition, railX, targetApproach } = builder.route;
  const startX = from.left + from.width;
  const startY = from.centerY;
  const endY = targetApproach === "top" ? to.top - 2 : targetApproach === "bottom" ? to.top + to.height + 1 : to.centerY;
  const verticalStep = startY <= endY ? 1 : -1;
  addRightDeparture(builder, from);
  addHorizontalLine(builder, startX, railX - 1, startY, 1);
  addCell(builder, { x: railX, y: startY, char: verticalStep === 1 ? "\u256E" : "\u256F" });
  for (let y = startY + verticalStep;y !== endY; y += verticalStep)
    addCell(builder, { x: railX, y, char: "\u2502" });
  addCell(builder, { x: railX, y: endY, char: verticalStep === 1 ? "\u256F" : "\u256E" });
  if (targetApproach) {
    const targetX = innerConnectorX(to, from.centerX);
    for (let x = railX - 1;x > targetX; x--)
      addCell(builder, { x, y: endY, char: "\u2500" });
    addCell(builder, { x: targetX, y: endY, char: targetApproach === "top" ? "\u256D" : "\u2570" });
    addCell(builder, {
      x: targetX,
      y: targetApproach === "top" ? endY + 1 : endY - 1,
      arrowDirection: targetApproach === "top" ? "down" : "up"
    });
    if (targetIsChoice || targetIsHiddenMarker)
      addPathPoint(builder, to.left, to.top);
    if (transition.label) {
      const metrics = measureStateTransitionLabel(transition.label);
      addLabel(builder, railX + 2, Math.max(0, Math.floor((startY + to.centerY - metrics.height + 1) / 2)), transition.label);
    }
    return;
  }
  const endX = to.left + to.width;
  for (let x = railX - 1;x > endX; x--)
    addCell(builder, { x, y: endY, char: "\u2500" });
  addCell(builder, targetIsHiddenMarker ? { x: endX, y: endY, char: "\u2500" } : { x: endX, y: endY, arrowDirection: "left" });
  if (targetIsChoice || targetIsHiddenMarker)
    addPathPoint(builder, to.left, to.top);
  if (transition.label) {
    const metrics = measureStateTransitionLabel(transition.label);
    const labelY = Math.max(0, Math.floor((startY + endY - metrics.height + 1) / 2));
    addLabel(builder, railX + 2, labelY, transition.label);
  }
}
function innerConnectorX(bounds, preferredX) {
  if (bounds.width <= 2)
    return bounds.centerX;
  return Math.max(bounds.left + 1, Math.min(bounds.left + bounds.width - 2, preferredX));
}
function addVerticalElbowTransition(builder) {
  const { from, to, transition, targetIsChoice, targetIsHiddenMarker, hasReverse, offsetConnector } = builder.route;
  const topToBottom = from.centerY < to.centerY;
  const offset = offsetConnector ? topToBottom ? -2 : 2 : 0;
  const startX = innerConnectorX(from, from.centerX + offset);
  const endX = innerConnectorX(to, to.centerX + offset);
  const startY = topToBottom ? from.top + from.height : from.top - 1;
  const endY = topToBottom ? to.top - 1 : to.top + to.height;
  const verticalStep = topToBottom ? 1 : -1;
  if (topToBottom)
    addBottomDeparture(builder, from, startX);
  else
    addTopDeparture(builder, from, startX);
  const availableApproach = Math.max(0, Math.abs(endY - startY) - 1);
  const bendY = startX === endX ? endY : topToBottom ? endY - verticalStep * Math.min(2, availableApproach) : startY;
  const targetApproachLength = Math.abs(endY - bendY);
  const hasTargetApproach = targetApproachLength > 0;
  if (startY !== bendY)
    addVerticalLine(builder, startX, startY, bendY - verticalStep, verticalStep);
  if (startX !== endX) {
    const horizontalStep = startX < endX ? 1 : -1;
    addCell(builder, {
      x: startX,
      y: bendY,
      char: topToBottom ? startX < endX ? "\u2570" : "\u256F" : startX < endX ? "\u256D" : "\u256E"
    });
    for (let x = startX + horizontalStep;x !== endX; x += horizontalStep)
      addCell(builder, { x, y: bendY, char: "\u2500" });
    if (hasTargetApproach) {
      addCell(builder, {
        x: endX,
        y: bendY,
        char: topToBottom ? startX < endX ? "\u256E" : "\u256D" : startX < endX ? "\u256F" : "\u2570"
      });
      for (let distance = 1;distance < targetApproachLength; distance++) {
        addCell(builder, { x: endX, y: bendY + verticalStep * distance, char: "\u2502" });
      }
    }
  }
  const targetChar = targetIsHiddenMarker ? hasTargetApproach || startX === endX ? "\u2502" : topToBottom ? "\u252C" : "\u2534" : undefined;
  addCell(builder, {
    x: endX,
    y: endY,
    ...targetChar ? { char: targetChar } : { arrowDirection: topToBottom ? "down" : "up" }
  });
  if (targetIsChoice || targetIsHiddenMarker)
    addPathPoint(builder, to.left, to.top);
  if (!transition.label)
    return;
  const metrics = measureStateTransitionLabel(transition.label);
  if (topToBottom) {
    const leftLabelX = startX - metrics.width - 2;
    const labelX = from.width === 1 && Math.abs(endX - startX) >= metrics.width + 2 ? Math.min(startX, endX) + Math.floor((Math.abs(endX - startX) - metrics.width) / 2) : hasReverse || endX < startX ? leftLabelX >= 0 ? leftLabelX : startX + 4 : startX + 2;
    addLabel(builder, labelX, hasTargetApproach ? Math.max(0, bendY - metrics.height) : Math.min(startY + 1, endY), transition.label);
  } else {
    const labelX = Math.min(startX, endX) + Math.max(1, Math.floor((Math.abs(endX - startX) - metrics.width) / 2));
    addLabel(builder, startX === endX ? startX + 3 : labelX, hasTargetApproach ? Math.max(0, bendY - metrics.height) : Math.max(0, startY), transition.label);
  }
}
function addVerticalTransition(builder) {
  const { from, to, transition, targetIsChoice, targetIsHiddenMarker } = builder.route;
  const topToBottom = from.centerY <= to.centerY;
  const x = from.centerX;
  const startY = topToBottom ? from.top + from.height : from.top - 1;
  const endY = topToBottom ? to.top - 1 : to.top + to.height;
  const step = topToBottom ? 1 : -1;
  if (topToBottom)
    addBottomDeparture(builder, from, x);
  else
    addTopDeparture(builder, from, x);
  if (startY !== endY)
    addVerticalLine(builder, x, startY, endY - step, step);
  addCell(builder, {
    x,
    y: endY,
    ...targetIsHiddenMarker ? { char: "\u2502" } : { arrowDirection: topToBottom ? "down" : "up" }
  });
  if (targetIsChoice || targetIsHiddenMarker)
    addPathPoint(builder, to.left, to.top);
  if (transition.label)
    addLabel(builder, x + 2, Math.min(startY, endY) + 1, transition.label);
}
function createStateTransitionRenderPlan(route) {
  const builder = { route, cells: [], path: [] };
  switch (route.kind) {
    case "self":
      addSelfTransition(builder);
      break;
    case "horizontal-forward":
      addHorizontalForward(builder);
      break;
    case "bottom-feedback":
    case "bottom-parallel":
      addBottomLaneTransition(builder);
      break;
    case "top-feedback":
      addTopFeedbackTransition(builder);
      break;
    case "vertical-elbow":
      addVerticalElbowTransition(builder);
      break;
    case "vertical":
      addVerticalTransition(builder);
      break;
    case "side-parallel":
      addSideParallelTransition(builder);
      break;
  }
  return builder;
}
function pointIsInsideBounds(point, bounds) {
  return point[0] >= bounds.left && point[0] < bounds.left + bounds.width && point[1] >= bounds.top && point[1] < bounds.top + bounds.height;
}
function routeIntersectsUnrelatedState(plan, diagram, bounds, noteBounds) {
  if (diagram.states.some((state) => {
    if (state.id === plan.route.transition.from || state.id === plan.route.transition.to || isHiddenCompositeMarker(state))
      return false;
    const bound = bounds.get(state.id);
    return Boolean(bound && plan.path.some((point) => pointIsInsideBounds(point, bound)));
  }))
    return true;
  return noteBounds.some((noteBound) => {
    if (plan.path.some((point) => pointIsInsideBounds(point, noteBound)))
      return true;
    const target = bounds.get(noteBound.note.target);
    if (!target)
      return false;
    const connector = spatialPathClaim(`note-connector:${noteBound.id}`, `note-connector:${noteBound.id}`, "boundary", stateDiagramNoteConnector(noteBound, target).points);
    return plan.path.some(([x, y]) => connector.spans.some((span) => span.y === y && x >= span.fromX && x <= span.toX));
  });
}
function findBodySafePath(start, end, diagram, bounds, plan, search, budget) {
  const margin = Math.max(8, bounds.size * 2);
  const compositeId = innermostCommonComposite(diagram, plan.route.transition);
  const composite = compositeId ? bounds.get(compositeId) : undefined;
  const searchBounds = {
    minX: composite ? composite.left + 1 : search.minX - margin,
    minY: composite ? composite.top + 1 : Math.min(search.minY, ...plan.path.map((point) => point[1])) - margin,
    maxX: composite ? composite.left + composite.width - 2 : Math.max(search.maxX, ...plan.path.map((point) => point[0])) + margin,
    maxY: composite ? composite.top + composite.height - 2 : Math.max(search.maxY, ...plan.path.map((point) => point[1])) + margin
  };
  const isFree = ([x, y]) => x >= searchBounds.minX && x <= searchBounds.maxX && y >= searchBounds.minY && y <= searchBounds.maxY && !search.blocked.has(`${x}:${y}`);
  const pathMinX = Math.min(...plan.path.map((point) => point[0]));
  const pathMinY = Math.min(...plan.path.map((point) => point[1]));
  const pathMaxX = Math.max(...plan.path.map((point) => point[0]));
  const pathMaxY = Math.max(...plan.path.map((point) => point[1]));
  const directCandidates = [
    [start, [start[0], end[1]], end],
    [start, [end[0], start[1]], end],
    ...Array.from({ length: 4 }, (_, index) => index + 1).flatMap((offset) => [
      [start, [start[0], pathMinY - offset], [end[0], pathMinY - offset], end],
      [start, [start[0], pathMaxY + offset], [end[0], pathMaxY + offset], end],
      [start, [pathMinX - offset, start[1]], [pathMinX - offset, end[1]], end],
      [start, [pathMaxX + offset, start[1]], [pathMaxX + offset, end[1]], end]
    ])
  ];
  const direct = directCandidates.map((points) => orthogonalPathPoints(points.map(([x, y]) => ({ x, y }))).map(({ x, y }) => [x, y])).filter((points) => points.every(isFree)).sort((left, right) => left.length - right.length)[0];
  if (direct)
    return direct;
  const path = findStateManhattanPath([{ x: start[0], y: start[1] }], { x: end[0], y: end[1] }, search, searchBounds, budget);
  return path?.map((point) => [point.x, point.y]);
}
function bodySafeTransitionPlan(plan, diagram, bounds, noteBounds, search, budget, forceRepair = false) {
  if (!forceRepair && !routeIntersectsUnrelatedState(plan, diagram, bounds, noteBounds))
    return plan;
  const sourceOutsideIndex = plan.path.findIndex((point) => !pointIsInsideBounds(point, plan.route.from));
  const targetOutsideIndex = plan.path.findLastIndex((point) => !pointIsInsideBounds(point, plan.route.to));
  if (sourceOutsideIndex < 0 || targetOutsideIndex < sourceOutsideIndex)
    return plan;
  const safePath = findBodySafePath(plan.path[sourceOutsideIndex], plan.path[targetOutsideIndex], diagram, bounds, plan, search, budget);
  if (!safePath)
    return alternateBodySafeTransitionPlan(plan, diagram, bounds, noteBounds, search, budget);
  const prefix = plan.path.slice(0, sourceOutsideIndex);
  const suffix = plan.path.slice(targetOutsideIndex + 1);
  const repaired = renderBodySafeTransitionPlan(plan, safePath, prefix, suffix);
  if (safePath.length <= plan.path.length + 4)
    return repaired;
  const alternate = alternateBodySafeTransitionPlan(plan, diagram, bounds, noteBounds, search, budget);
  return alternate !== plan && alternate.path.length < repaired.path.length ? alternate : repaired;
}
function alternateBodySafeTransitionPlan(plan, diagram, bounds, noteBounds, search, budget) {
  const candidates = [];
  for (const source of stateRoutePorts(plan.route.from)) {
    for (const target of stateRoutePorts(plan.route.to)) {
      const safePath = findBodySafePath(source.outside, target.outside, diagram, bounds, plan, search, budget);
      if (!safePath)
        continue;
      const prefix = plan.route.from.width > 1 && plan.route.from.height > 1 ? [source.border] : [];
      const suffix = plan.route.targetIsChoice || plan.route.targetIsHiddenMarker ? [[plan.route.to.left, plan.route.to.top]] : [];
      const repaired = renderBodySafeTransitionPlan(plan, safePath, prefix, suffix, source.char);
      if (!routeIntersectsUnrelatedState(repaired, diagram, bounds, noteBounds))
        candidates.push(repaired);
    }
  }
  return candidates.sort((left, right) => left.path.length - right.path.length)[0] ?? plan;
}
function stateRoutePorts(bounds) {
  return [
    {
      outside: [bounds.centerX, bounds.top - 1],
      border: [bounds.centerX, bounds.top],
      char: BorderChars5.rounded.bottomT
    },
    {
      outside: [bounds.centerX, bounds.top + bounds.height],
      border: [bounds.centerX, bounds.top + bounds.height - 1],
      char: BorderChars5.rounded.topT
    },
    {
      outside: [bounds.left - 1, bounds.centerY],
      border: [bounds.left, bounds.centerY],
      char: BorderChars5.rounded.rightT
    },
    {
      outside: [bounds.left + bounds.width, bounds.centerY],
      border: [bounds.left + bounds.width - 1, bounds.centerY],
      char: BorderChars5.rounded.leftT
    }
  ].filter((port) => port.outside[0] >= 0);
}
function renderBodySafeTransitionPlan(plan, safePath, prefix, suffix, sourceChar) {
  const prefixKeys = new Set(prefix.map(([x, y]) => `${x}:${y}`));
  const cells = sourceChar ? prefix.map(([x, y]) => ({ x, y, char: sourceChar })) : plan.cells.filter((cell) => prefixKeys.has(`${cell.x}:${cell.y}`));
  const fullPath = [...prefix, ...safePath, ...suffix];
  const previous = prefix.at(-1);
  for (const [index, point] of safePath.entries()) {
    if (index === safePath.length - 1) {
      const targetDirection = connectionDirection(point, [plan.route.to.centerX, plan.route.to.centerY]);
      cells.push(plan.route.targetIsHiddenMarker ? { x: point[0], y: point[1], char: targetDirection === "left" || targetDirection === "right" ? "\u2500" : "\u2502" } : { x: point[0], y: point[1], arrowDirection: targetDirection });
      continue;
    }
    const before = index === 0 ? previous : safePath[index - 1];
    const after = safePath[index + 1];
    const connections = new Set;
    if (before)
      connections.add(connectionDirection(point, before));
    connections.add(connectionDirection(point, after));
    cells.push({ x: point[0], y: point[1], char: diagramLineGlyph(connections, "rounded") });
  }
  return { ...plan, cells, path: fullPath, pathRepaired: true };
}
function labelDistanceToPath(x, y, width, height, path) {
  return Math.min(...path.map(([pathX, pathY]) => {
    const dx = pathX < x ? x - pathX : pathX >= x + width ? pathX - (x + width - 1) : 0;
    const dy = pathY < y ? y - pathY : pathY >= y + height ? pathY - (y + height - 1) : 0;
    return dx + dy;
  }));
}
function stateTransitionLabelCandidates(plan, width, height) {
  const candidates = new Map;
  const add = (x, y) => candidates.set(`${x}:${y}`, { x, y });
  if (plan.label && (!plan.pathRepaired || labelDistanceToPath(plan.label.x, plan.label.y, width, height, plan.path) <= 4)) {
    add(plan.label.x, plan.label.y);
  }
  for (const [x, y] of plan.path) {
    add(x + 2, y - Math.floor(height / 2));
    add(x - width - 2, y - Math.floor(height / 2));
    add(x - Math.floor(width / 2), y - height - 1);
    add(x - Math.floor(width / 2), y + 2);
  }
  const preferred = plan.label ?? { x: plan.path[0]?.[0] ?? 0, y: plan.path[0]?.[1] ?? 0 };
  return [...candidates.values()].sort((left, right) => {
    const leftDistance = Math.abs(left.x - preferred.x) + Math.abs(left.y - preferred.y);
    const rightDistance = Math.abs(right.x - preferred.x) + Math.abs(right.y - preferred.y);
    return leftDistance - rightDistance;
  });
}
function placeStateTransitionLabels(plans, diagram, bounds, noteBounds) {
  let space = SpatialIndex.empty().add(...diagram.states.flatMap((state) => {
    const bound = bounds.get(state.id);
    return bound && !isHiddenCompositeMarker(state) ? [spatialRectClaim(`state:${state.id}`, `state:${state.id}`, "body", bound)] : [];
  }), ...plans.map((plan, index) => spatialPathClaim(`route:${index}`, `route:${index}`, "route", plan.path.map(([x, y]) => ({ x, y })))), ...diagram.composites.flatMap((composite) => {
    const bound = bounds.get(composite.id);
    if (!bound)
      return [];
    return [
      spatialPathClaim(`composite:${composite.id}`, `composite:${composite.id}`, "boundary", [
        { x: bound.left, y: bound.top },
        { x: bound.left + bound.width - 1, y: bound.top },
        { x: bound.left + bound.width - 1, y: bound.top + bound.height - 1 },
        { x: bound.left, y: bound.top + bound.height - 1 },
        { x: bound.left, y: bound.top }
      ])
    ];
  }), ...noteBounds.flatMap((noteBound) => {
    const target = bounds.get(noteBound.note.target);
    return [
      spatialRectClaim(`note:${noteBound.id}`, `note:${noteBound.id}`, "body", noteBound),
      ...target ? [
        spatialPathClaim(`note-connector:${noteBound.id}`, `note-connector:${noteBound.id}`, "boundary", stateDiagramNoteConnector(noteBound, target).points)
      ] : []
    ];
  }));
  const placed = new Map;
  const endpointCounts = new Map;
  for (const plan of plans) {
    const key = `${plan.route.transition.from}\x00${plan.route.transition.to}`;
    endpointCounts.set(key, (endpointCounts.get(key) ?? 0) + 1);
  }
  const placementOrder = [...plans.keys()].sort((left, right) => Number(Boolean(plans[left].pathRepaired)) - Number(Boolean(plans[right].pathRepaired)));
  for (const planIndex of placementOrder) {
    const plan = plans[planIndex];
    if (!plan.label) {
      placed.set(planIndex, plan);
      continue;
    }
    const width = Math.max(...plan.label.lines.map(diagramTextWidth));
    const endpointKey = `${plan.route.transition.from}\x00${plan.route.transition.to}`;
    const needsLaneClearance = (endpointCounts.get(endpointKey) ?? 0) > 1;
    const statePadding = needsLaneClearance || plan.label.lines.length > 1 ? 1 : 0;
    const labelClaim = (x, y) => spatialRectClaim(`label:${planIndex}`, `label:${planIndex}`, "label", {
      left: x,
      top: y,
      width,
      height: plan.label.lines.length
    });
    const sharesLoopCorridor = plans.some((candidate) => candidate.route.transition.from === plan.route.transition.from && candidate.route.kind === (plan.route.kind === "self" ? "vertical" : "self"));
    const corridorTop = plan.route.kind === "side-parallel" && plans.some((candidate) => candidate !== plan && candidate.route.transition.to === plan.route.transition.to) ? Math.min(...plan.path.map(([, y]) => y)) : sharesLoopCorridor && (plan.route.kind === "self" || plan.route.kind === "vertical" && plan.route.from.centerY < plan.route.to.centerY) ? plan.route.from.top + plan.route.from.height : undefined;
    const corridorBottom = corridorTop === undefined ? undefined : Math.max(...plan.path.map(([, y]) => y));
    const isClear = (x, y) => {
      if (x < 0 || y < 0 || corridorTop !== undefined && (y < corridorTop || y > corridorBottom))
        return false;
      return space.isFree(labelClaim(x, y), {
        clearance: {
          body: statePadding,
          label: { x: 1, y: 1 },
          route: plan.pathRepaired || plan.route.kind === "side-parallel" || needsLaneClearance || corridorTop !== undefined ? {
            x: 1,
            y: 0
          } : 0
        }
      });
    };
    const candidates = stateTransitionLabelCandidates(plan, width, plan.label.lines.length);
    const nearby = candidates.find((candidate) => (!(plan.pathRepaired || plan.route.kind === "side-parallel" || needsLaneClearance || corridorTop !== undefined) || labelDistanceToPath(candidate.x, candidate.y, width, plan.label.lines.length, plan.path) >= 2) && isClear(candidate.x, candidate.y));
    let x = nearby?.x ?? candidates[0]?.x ?? plan.label.x;
    let y = nearby?.y ?? candidates[0]?.y ?? plan.label.y;
    if (!nearby) {
      search:
        for (let distance = 1;distance < 500; distance++) {
          for (let dx = -distance;dx <= distance; dx++) {
            const dy = distance - Math.abs(dx);
            for (const candidateY of dy === 0 ? [y] : [y - dy, y + dy]) {
              const candidateX = x + dx;
              if (!isClear(candidateX, candidateY))
                continue;
              const pathDistance = labelDistanceToPath(candidateX, candidateY, width, plan.label.lines.length, plan.path);
              if (pathDistance < 2 || pathDistance > 8)
                continue;
              x = candidateX;
              y = candidateY;
              break search;
            }
          }
        }
    }
    if (!isClear(x, y)) {
      fallback:
        for (let distance = 1;distance < 500; distance++) {
          for (let dx = -distance;dx <= distance; dx++) {
            const dy = distance - Math.abs(dx);
            for (const candidateY of dy === 0 ? [y] : [y - dy, y + dy]) {
              const candidateX = x + dx;
              if (!isClear(candidateX, candidateY))
                continue;
              x = candidateX;
              y = candidateY;
              break fallback;
            }
          }
        }
    }
    if (!isClear(x, y))
      throw new Error(`Transition ${endpointKey} has no clear label position`);
    space = space.add(labelClaim(x, y));
    placed.set(planIndex, { ...plan, label: { ...plan.label, x, y } });
  }
  return plans.map((plan, index) => placed.get(index) ?? plan);
}
function createStateTransitionRenderPlans(diagram, bounds, feedbackLaneY, options = {}) {
  const noteBounds = options.noteBounds ?? [];
  const budget = options.searchBudget ?? createStateSearchBudget();
  const plans = createStateTransitionRoutePlans(diagram, bounds, feedbackLaneY, options.feedbackTopY).map(createStateTransitionRenderPlan);
  if (options.repairRoutes === false)
    return placeStateTransitionLabels(plans, diagram, bounds, noteBounds);
  const baseObstacles = transitionObstacles(diagram, bounds, noteBounds);
  const repaired = [];
  for (const [index, plan] of plans.entries()) {
    const disjoint = repaired.filter((previous) => transitionsHaveDisjointEndpoints(previous, plan));
    const routeObstacles = repaired.filter((previous) => disjoint.includes(previous) || transitionsAreReciprocal(previous, plan));
    const routeSpace = createStateSearchSpace(baseObstacles.add(...routeObstacles.map((previous, previousIndex) => spatialPathClaim(`transition:${index}:obstacle:${previousIndex}`, `transition:${index}:obstacle:${previousIndex}`, "route", previous.path.map(([x, y]) => ({ x, y }))))));
    repaired.push(bodySafeTransitionPlan(plan, diagram, bounds, noteBounds, routeSpace, budget, disjoint.some((previous) => pathsIntersect2(previous.path, plan.path))));
  }
  return placeStateTransitionLabels(repaired, diagram, bounds, noteBounds);
}
function transitionsHaveDisjointEndpoints(left, right) {
  const leftEndpoints = new Set([left.route.transition.from, left.route.transition.to]);
  return !leftEndpoints.has(right.route.transition.from) && !leftEndpoints.has(right.route.transition.to);
}
function transitionsAreReciprocal(left, right) {
  return left.route.transition.from === right.route.transition.to && left.route.transition.to === right.route.transition.from;
}
function pathsIntersect2(left, right) {
  const occupied = new Set(left.map(([x, y]) => `${x}:${y}`));
  return right.some(([x, y]) => occupied.has(`${x}:${y}`));
}
function transitionObstacles(diagram, bounds, noteBounds) {
  return SpatialIndex.empty().add(...diagram.states.flatMap((state) => {
    const bound = bounds.get(state.id);
    return bound && !isHiddenCompositeMarker(state) ? [spatialRectClaim(`state:${state.id}`, `state:${state.id}`, "body", bound)] : [];
  }), ...noteBounds.flatMap((noteBound) => {
    const target = bounds.get(noteBound.note.target);
    return [
      spatialRectClaim(`note:${noteBound.id}`, `note:${noteBound.id}`, "body", noteBound),
      ...target ? [
        spatialPathClaim(`note-connector:${noteBound.id}`, `note-connector:${noteBound.id}`, "boundary", stateDiagramNoteConnector(noteBound, target).points)
      ] : []
    ];
  }));
}
function connectionDirection(from, to) {
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];
  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0)
    return deltaX > 0 ? "right" : "left";
  if (deltaY !== 0)
    return deltaY > 0 ? "down" : "up";
  return "right";
}
function createStateTransitionJunctionPlans(diagram, bounds, renderPlans) {
  const renderPlanByTransition = new Map(renderPlans.map((plan) => [plan.route.transition, plan]));
  return diagram.states.flatMap((state) => {
    const kind = state.kind === "choice" || state.kind === "fork" || state.kind === "join" ? state.kind : isHiddenCompositeMarker(state) ? "hidden-composite-marker" : undefined;
    if (!kind)
      return [];
    const stateBounds = bounds.get(state.id);
    if (!stateBounds)
      return [];
    const connections = new Set;
    const transitions = [];
    for (const transition of diagram.transitions) {
      const renderPlan = renderPlanByTransition.get(transition);
      let connected = false;
      if (transition.to === state.id) {
        const junction = renderPlan?.path.at(-1);
        const neighbor = renderPlan?.path.at(-2);
        if (junction && neighbor)
          connections.add(connectionDirection(junction, neighbor));
        connected = true;
      }
      if (transition.from === state.id) {
        const neighbor = renderPlan?.path[0];
        if (neighbor)
          connections.add(connectionDirection([stateBounds.left, stateBounds.top], neighbor));
        connected = true;
      }
      if (connected)
        transitions.push(transition);
    }
    return [{ state, bounds: stateBounds, connections, transitions, kind }];
  });
}

// src/merman/state/layout.ts
var MAX_STRICT_NOTE_PLACEMENTS = 24;
function computeRanks2(diagram) {
  const ranks = new Map;
  const outgoing = new Map;
  for (const transition of diagram.transitions) {
    const list = outgoing.get(transition.from) ?? [];
    list.push(transition.to);
    outgoing.set(transition.from, list);
  }
  const first = diagram.states.find((state) => state.kind === "start")?.id ?? diagram.states[0]?.id;
  if (!first)
    return ranks;
  ranks.set(first, 0);
  const queue = [first];
  while (queue.length > 0) {
    const id = queue.shift();
    const rank = ranks.get(id) ?? 0;
    for (const to of outgoing.get(id) ?? []) {
      const nextRank = rank + 1;
      if ((ranks.get(to) ?? Number.POSITIVE_INFINITY) <= nextRank)
        continue;
      ranks.set(to, nextRank);
      queue.push(to);
    }
  }
  for (const state of diagram.states) {
    if (!ranks.has(state.id))
      ranks.set(state.id, ranks.size);
  }
  return ranks;
}
function outgoingTransitions(diagram) {
  const outgoing = new Map;
  for (const transition of diagram.transitions) {
    const list = outgoing.get(transition.from) ?? [];
    list.push(transition);
    outgoing.set(transition.from, list);
  }
  return outgoing;
}
function reaches(outgoing, from, target) {
  const visited = new Set;
  const stack = [from];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === target)
      return true;
    if (visited.has(id))
      continue;
    visited.add(id);
    for (const transition of outgoing.get(id) ?? [])
      stack.push(transition.to);
  }
  return false;
}
function computeMainPath(diagram) {
  const outgoing = outgoingTransitions(diagram);
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const start = diagram.states.find((state) => state.kind === "start")?.id ?? diagram.states[0]?.id;
  if (!start)
    return [];
  const path = [start];
  const visited = new Set(path);
  let current = start;
  while (true) {
    const candidates = (outgoing.get(current) ?? []).filter((transition) => !visited.has(transition.to));
    if (candidates.length === 0)
      break;
    const next = candidates.find((transition) => statesById.get(transition.to)?.kind === "end") ?? candidates.find((transition) => !reaches(outgoing, transition.to, current)) ?? candidates.find((transition) => !hasReverseTransition(diagram, transition)) ?? candidates.find((transition) => {
      const fromParent = statesById.get(current)?.parentId;
      const toParent = statesById.get(transition.to)?.parentId;
      return Boolean(fromParent && toParent && fromParent !== toParent);
    }) ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (!next)
      break;
    path.push(next.to);
    visited.add(next.to);
    current = next.to;
  }
  return path;
}
function stateSize(state) {
  if (state.kind !== "state")
    return { width: 1, height: 1, lines: [state.label] };
  return measureDiagramTextBox(state.label, { paddingX: 2, paddingY: 1 });
}
function noteLines(note) {
  const lines = note.lines.flatMap(splitDiagramLines).map((line) => line.trim());
  return lines.length > 0 ? lines : [""];
}
function noteSize(note) {
  const lines = noteLines(note);
  const innerWidth = Math.max(...lines.map(diagramTextWidth), 1);
  return { width: innerWidth + 4, height: lines.length + 2, lines };
}
function emptyLayout(bounds, sizes) {
  return { bounds, sizes, compositeBounds: new Map, noteBounds: [] };
}
function isNoteBound(bound) {
  return "note" in bound;
}
function shiftBounds(bounds, dx, dy) {
  for (const bound of bounds) {
    translateDiagramBounds(bound, dx, dy);
    if (!isNoteBound(bound) || !bound.connector)
      continue;
    bound.connector = {
      connectorY: bound.connector.connectorY + dy,
      points: bound.connector.points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
    };
  }
}
function translateStateDiagramLayout(layout, dx, dy) {
  shiftBounds(uniqueBounds(layout.bounds.values(), layout.compositeBounds.values(), layout.noteBounds), dx, dy);
}
function uniqueBounds(...bounds) {
  return [...new Set(bounds.flatMap((group) => [...group]))];
}
function normalizeLayout(layout) {
  const allBounds = uniqueBounds(layout.bounds.values(), layout.compositeBounds.values(), layout.noteBounds);
  if (allBounds.length === 0)
    return;
  const connectorPoints = layout.noteBounds.flatMap((bound) => bound.connector?.points ?? []);
  const minX = Math.min(0, ...allBounds.map((bound) => bound.left), ...connectorPoints.map((point) => point.x));
  const minY = Math.min(0, ...allBounds.map((bound) => bound.top), ...connectorPoints.map((point) => point.y));
  if (minX === 0 && minY === 0)
    return;
  shiftBounds(allBounds, -minX, -minY);
}
function addCompositeBounds(diagram, layout) {
  const statesByParent = new Map;
  const compositesByParent = new Map;
  for (const state of diagram.states) {
    if (!state.parentId)
      continue;
    const states = statesByParent.get(state.parentId) ?? [];
    states.push(state.id);
    statesByParent.set(state.parentId, states);
  }
  for (const composite of diagram.composites) {
    if (!composite.parentId)
      continue;
    const composites = compositesByParent.get(composite.parentId) ?? [];
    composites.push(composite);
    compositesByParent.set(composite.parentId, composites);
  }
  const addComposite = (composite) => {
    const existing = layout.compositeBounds.get(composite.id);
    if (existing)
      return existing;
    for (const child of compositesByParent.get(composite.id) ?? [])
      addComposite(child);
    const childBounds = [
      ...statesByParent.get(composite.id) ?? [],
      ...(compositesByParent.get(composite.id) ?? []).map((child) => child.id)
    ].map((id) => layout.bounds.get(id)).filter((bound) => Boolean(bound));
    if (childBounds.length === 0)
      return;
    const left = Math.min(...childBounds.map((bound) => bound.left)) - 2;
    const top = Math.min(...childBounds.map((bound) => bound.top)) - 2;
    const right = Math.max(...childBounds.map((bound) => bound.left + bound.width)) + 2;
    const bottom = Math.max(...childBounds.map((bound) => bound.top + bound.height)) + 2;
    const width = Math.max(right - left, diagramTextWidth(composite.label) + 5);
    const bound = {
      id: composite.id,
      left,
      top,
      width,
      height: bottom - top,
      centerX: left + Math.floor(width / 2),
      centerY: top + Math.floor((bottom - top) / 2)
    };
    layout.compositeBounds.set(composite.id, bound);
    layout.bounds.set(composite.id, bound);
    return bound;
  };
  for (const composite of diagram.composites)
    addComposite(composite);
}
function intersects(left, top, width, height, bound, padding = 1) {
  return left < bound.left + bound.width + padding && left + width + padding > bound.left && top < bound.top + bound.height + padding && top + height + padding > bound.top;
}
function createNoteBound(note, index, left, top, size) {
  return {
    id: `${note.target}-note-${index}`,
    left,
    top,
    width: size.width,
    height: size.height,
    centerX: left + Math.floor(size.width / 2),
    centerY: top + Math.floor(size.height / 2),
    note,
    lines: size.lines
  };
}
function findNoteConnector(search, bounds, target, budget) {
  const connectorY = Math.max(bounds.top + 1, Math.min(target.centerY, bounds.top + bounds.height - 2));
  const end = {
    x: bounds.note.position === "right" ? bounds.left - 1 : bounds.left + bounds.width,
    y: connectorY
  };
  const goal = { x: end.x + (bounds.note.position === "right" ? -1 : 1), y: end.y };
  const targetX = bounds.note.position === "right" ? target.left + target.width : target.left - 1;
  const preferredStarts = [
    { x: targetX, y: target.centerY },
    { x: targetX, y: target.top - 1 },
    { x: targetX, y: target.top + target.height }
  ];
  const perimeterStarts = [
    ...Array.from({ length: target.height }, (_, offset) => ({ x: target.left - 1, y: target.top + offset })),
    ...Array.from({ length: target.height }, (_, offset) => ({
      x: target.left + target.width,
      y: target.top + offset
    })),
    ...Array.from({ length: target.width }, (_, offset) => ({ x: target.left + offset, y: target.top - 1 })),
    ...Array.from({ length: target.width }, (_, offset) => ({
      x: target.left + offset,
      y: target.top + target.height
    }))
  ];
  const starts = [...preferredStarts, ...perimeterStarts];
  const isFree = (point) => point.x >= 0 && !search.blocked.has(`${point.x}:${point.y}`) && !(point.x >= bounds.left && point.x < bounds.left + bounds.width && point.y >= bounds.top && point.y < bounds.top + bounds.height);
  if (!isFree(end) || !isFree(goal))
    return;
  for (const start of starts.filter(isFree)) {
    const directPaths = [
      [start, { x: start.x, y: goal.y }, goal, end],
      [start, { x: goal.x, y: start.y }, goal, end]
    ];
    const direct = directPaths.find((points) => orthogonalPathPoints(points).every(isFree));
    if (direct)
      return { connectorY, points: direct };
  }
  const margin = 8;
  const minY = Math.min(target.top, bounds.top, search.minY) - margin;
  const maxX = Math.max(target.left + target.width, bounds.left + bounds.width, search.maxX) + margin;
  const maxY = Math.max(target.top + target.height, bounds.top + bounds.height, search.maxY) + margin;
  const path = findStateManhattanPath(starts, goal, search, { minX: 0, minY, maxX, maxY }, budget, isFree);
  return path ? { connectorY, points: [...path, end] } : undefined;
}
function belongsToComposite(id, compositeId, statesById, compositesById) {
  let parentId = statesById.get(id)?.parentId ?? compositesById.get(id)?.parentId;
  while (parentId) {
    if (parentId === compositeId)
      return true;
    parentId = compositesById.get(parentId)?.parentId;
  }
  return false;
}
function expandCompositeBoundsForNotes(diagram, layout) {
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const compositesById = new Map(diagram.composites.map((composite) => [composite.id, composite]));
  for (const composite of [...diagram.composites].reverse()) {
    const bound = layout.compositeBounds.get(composite.id);
    if (!bound)
      continue;
    const descendantNotes = layout.noteBounds.filter((noteBound) => belongsToComposite(noteBound.note.target, composite.id, statesById, compositesById));
    if (descendantNotes.length === 0)
      continue;
    const connectorPoints = descendantNotes.flatMap((note) => note.connector?.points ?? []);
    const left = Math.min(bound.left, ...descendantNotes.map((note) => note.left - 2), ...connectorPoints.map((point) => point.x - 1));
    const top = Math.min(bound.top, ...descendantNotes.map((note) => note.top - 1), ...connectorPoints.map((point) => point.y - 1));
    const right = Math.max(bound.left + bound.width, ...descendantNotes.map((note) => note.left + note.width + 2), ...connectorPoints.map((point) => point.x + 2));
    const bottom = Math.max(bound.top + bound.height, ...descendantNotes.map((note) => note.top + note.height + 1), ...connectorPoints.map((point) => point.y + 2));
    bound.left = left;
    bound.top = top;
    bound.width = Math.max(right - left, diagramTextWidth(composite.label) + 5);
    bound.height = bottom - top;
    bound.centerX = bound.left + Math.floor(bound.width / 2);
    bound.centerY = bound.top + Math.floor(bound.height / 2);
  }
}
function expandCompositeBoundsForInternalRouting(diagram, layout) {
  if (diagram.direction === "LR" || diagram.direction === "RL")
    return;
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const compositesById = new Map(diagram.composites.map((composite) => [composite.id, composite]));
  for (const composite of [...diagram.composites].reverse()) {
    const bound = layout.compositeBounds.get(composite.id);
    if (!bound)
      continue;
    const internal = diagram.transitions.filter((transition) => transition.from !== transition.to && innermostCommonCompositeId(transition, statesById, compositesById) === composite.id);
    const endpointOccurrences = new Map;
    const hasNestedComposite = diagram.composites.some((candidate) => candidate.parentId === composite.id);
    const sideRoutes = internal.filter((transition) => {
      const from = layout.bounds.get(transition.from);
      const to = layout.bounds.get(transition.to);
      if (!from || !to)
        return false;
      const key = `${transition.from}\x00${transition.to}`;
      const occurrence = endpointOccurrences.get(key) ?? 0;
      endpointOccurrences.set(key, occurrence + 1);
      const fromParent = statesById.get(transition.from)?.parentId;
      const toParent = statesById.get(transition.to)?.parentId;
      return occurrence > 0 || from.centerY > to.centerY && (!hasNestedComposite || from.left - 1 <= bound.left) || fromParent !== toParent && (from.centerX !== to.centerX || statesById.get(transition.from)?.kind !== "state" || statesById.get(transition.to)?.kind !== "state");
    });
    if (sideRoutes.length === 0)
      continue;
    const childRight = Math.max(...diagram.states.flatMap((state) => {
      if (!belongsToComposite(state.id, composite.id, statesById, compositesById))
        return [];
      const child = layout.bounds.get(state.id);
      return child ? [child.left + child.width] : [];
    }), ...diagram.composites.flatMap((childComposite) => {
      if (childComposite.parentId !== composite.id)
        return [];
      const child = layout.compositeBounds.get(childComposite.id);
      return child ? [child.left + child.width] : [];
    }));
    const labelWidth = Math.max(...sideRoutes.map((transition) => measureStateTransitionLabel(transition.label).width));
    const right = childRight + labelWidth + sideRoutes.length * 3 + 6;
    if (right <= bound.left + bound.width)
      continue;
    bound.width = right - bound.left;
    bound.centerX = bound.left + Math.floor(bound.width / 2);
  }
  enforceCompositeMargins(diagram, layout.compositeBounds);
}
function innermostCommonCompositeId(transition, statesById, compositesById) {
  const containers = (id) => {
    const ids = [];
    let parentId = statesById.get(id)?.parentId ?? compositesById.get(id)?.parentId;
    while (parentId) {
      ids.push(parentId);
      parentId = compositesById.get(parentId)?.parentId;
    }
    return ids;
  };
  const target = new Set(containers(transition.to));
  return containers(transition.from).find((id) => target.has(id));
}
function enforceCompositeMargins(diagram, compositeBounds) {
  const compositesByParent = new Map;
  for (const composite of diagram.composites) {
    if (!composite.parentId)
      continue;
    const children = compositesByParent.get(composite.parentId) ?? [];
    children.push(composite);
    compositesByParent.set(composite.parentId, children);
  }
  const expand = (composite) => {
    const bound = compositeBounds.get(composite.id);
    if (!bound)
      return;
    const children = (compositesByParent.get(composite.id) ?? []).map(expand).filter((child) => Boolean(child));
    if (children.length === 0)
      return bound;
    const left = Math.min(bound.left, ...children.map((child) => child.left - 2));
    const top = Math.min(bound.top, ...children.map((child) => child.top - 2));
    const right = Math.max(bound.left + bound.width, ...children.map((child) => child.left + child.width + 2));
    const bottom = Math.max(bound.top + bound.height, ...children.map((child) => child.top + child.height + 2));
    bound.left = left;
    bound.top = top;
    bound.width = right - left;
    bound.height = bottom - top;
    bound.centerX = left + Math.floor(bound.width / 2);
    bound.centerY = top + Math.floor(bound.height / 2);
    return bound;
  };
  for (const composite of diagram.composites.filter((candidate) => !candidate.parentId))
    expand(composite);
}
function boundsIntersect(left, right) {
  return intersects(left.left, left.top, left.width, left.height, right, 0);
}
function separateExternalBoundsFromComposites(diagram, layout) {
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const compositesById = new Map(diagram.composites.map((composite) => [composite.id, composite]));
  let shifted = false;
  for (const composite of diagram.composites) {
    const compositeBound = layout.compositeBounds.get(composite.id);
    if (!compositeBound)
      continue;
    for (const state of diagram.states) {
      if (belongsToComposite(state.id, composite.id, statesById, compositesById))
        continue;
      const bound = layout.bounds.get(state.id);
      if (!bound || !boundsIntersect(bound, compositeBound))
        continue;
      const dx = compositeBound.left + compositeBound.width + 4 - bound.left;
      if (dx <= 0)
        continue;
      const leftThreshold = bound.left;
      const boundsToShift = [];
      for (const candidate of diagram.states) {
        if (belongsToComposite(candidate.id, composite.id, statesById, compositesById))
          continue;
        const candidateBound = layout.bounds.get(candidate.id);
        if (candidateBound && candidateBound.left >= leftThreshold)
          boundsToShift.push(candidateBound);
      }
      for (const candidate of diagram.composites) {
        if (candidate.id === composite.id || belongsToComposite(candidate.id, composite.id, statesById, compositesById))
          continue;
        const candidateBound = layout.compositeBounds.get(candidate.id);
        if (candidateBound && candidateBound.left >= leftThreshold)
          boundsToShift.push(candidateBound);
      }
      for (const noteBound of layout.noteBounds) {
        const target = layout.bounds.get(noteBound.note.target);
        if (target && boundsToShift.includes(target))
          boundsToShift.push(noteBound);
      }
      shiftBounds(uniqueBounds(boundsToShift), dx, 0);
      shifted = true;
    }
  }
  return shifted;
}
function finalizeLayout(diagram, layout, budget) {
  if (diagram.composites.length === 0 && diagram.notes.length === 0)
    return layout;
  addCompositeBounds(diagram, layout);
  normalizeLayout(layout);
  expandCompositeBoundsForInternalRouting(diagram, layout);
  if (diagram.notes.length > 0) {
    const allBounds = [...layout.bounds.values()];
    placeStateDiagramNotesAroundTransitions(diagram, layout, createStateTransitionRenderPlans(diagram, layout.bounds, Math.max(0, ...allBounds.map((bound) => bound.top + bound.height)) + 3, {
      feedbackTopY: Math.min(0, ...allBounds.map((bound) => bound.top)) - 3,
      repairRoutes: false,
      searchBudget: budget
    }), budget);
  }
  expandCompositeBoundsForNotes(diagram, layout);
  expandCompositeBoundsForInternalRouting(diagram, layout);
  separateExternalBoundsFromComposites(diagram, layout);
  normalizeLayout(layout);
  return layout;
}
function createStateDiagramLayout(diagram, options) {
  const budget = options.searchBudget ?? createStateSearchBudget();
  if (diagram.direction === "LR" || diagram.direction === "RL") {
    return finalizeLayout(diagram, createHorizontalLayout(diagram, options), budget);
  }
  const ranks = computeRanks2(diagram);
  const maxRank = Math.max(0, ...ranks.values());
  const byRank = new Map;
  for (const state of diagram.states) {
    const rank = diagram.direction === "BT" ? maxRank - (ranks.get(state.id) ?? 0) : ranks.get(state.id) ?? 0;
    const list = byRank.get(rank) ?? [];
    list.push(state);
    byRank.set(rank, list);
  }
  const rankKeys = [...byRank.keys()].sort((a, b) => a - b);
  const sizes = new Map(diagram.states.map((state) => [state.id, stateSize(state)]));
  const bounds = new Map;
  const outgoingLabelRows = new Map;
  const selfTransitionCounts = new Map;
  for (const transition of diagram.transitions) {
    const rows = measureStateTransitionLabel(transition.label).height;
    outgoingLabelRows.set(transition.from, Math.max(outgoingLabelRows.get(transition.from) ?? 0, rows));
    if (transition.from === transition.to) {
      selfTransitionCounts.set(transition.from, (selfTransitionCounts.get(transition.from) ?? 0) + 1);
    }
  }
  const singleColumnCenter = Math.max(0, ...rankKeys.flatMap((rank) => {
    const states = byRank.get(rank);
    return states.length === 1 ? [Math.floor(sizes.get(states[0].id).width / 2)] : [];
  }));
  let y = 0;
  for (const rank of rankKeys) {
    const states = byRank.get(rank);
    const rowHeight = Math.max(...states.map((state) => sizes.get(state.id).height));
    let x = 0;
    for (const state of states) {
      const size = sizes.get(state.id);
      const top = y + Math.floor((rowHeight - size.height) / 2);
      const left = states.length === 1 ? singleColumnCenter - Math.floor(size.width / 2) : x;
      bounds.set(state.id, {
        id: state.id,
        left,
        top,
        width: size.width,
        height: size.height,
        centerX: left + Math.floor(size.width / 2),
        centerY: top + Math.floor(size.height / 2)
      });
      x += size.width + options.minStateGap + 8;
    }
    const labelRows = states.reduce((rows, state) => Math.max(rows, outgoingLabelRows.get(state.id) ?? 0), 0);
    const selfTransitionRows = states.reduce((rows, state) => Math.max(rows, (selfTransitionCounts.get(state.id) ?? 0) * 3 + 1), 0);
    const pseudoStateApproachClearance = states.some((state) => state.kind === "choice") ? 2 : 0;
    y += rowHeight + Math.max(4, labelRows + 3, selfTransitionRows) + pseudoStateApproachClearance;
  }
  return finalizeLayout(diagram, emptyLayout(bounds, sizes), budget);
}
function createHorizontalLayout(diagram, options) {
  const sizes = new Map(diagram.states.map((state) => [state.id, stateSize(state)]));
  const bounds = new Map;
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const mainPath = computeMainPath(diagram);
  const mainIds = new Set(mainPath);
  const mainPathIndex = new Map(mainPath.map((id, index) => [id, index]));
  const baselineY = Math.max(1, ...diagram.transitions.map((transition) => measureStateTransitionLabel(transition.label).height));
  const defaultGap = options.minStateGap + 8;
  let x = 0;
  for (const [index, id] of mainPath.entries()) {
    const state = statesById.get(id);
    const size = sizes.get(id);
    if (!state || !size)
      continue;
    const top = state.kind === "state" ? baselineY - Math.floor(size.height / 2) : baselineY;
    bounds.set(id, {
      id,
      left: x,
      top,
      width: size.width,
      height: size.height,
      centerX: x + Math.floor(size.width / 2),
      centerY: top + Math.floor(size.height / 2)
    });
    const nextId = mainPath[index + 1];
    const adjacentLabelWidth = diagram.transitions.filter((transition) => transition.from === id && transition.to === nextId).reduce((width, transition) => Math.max(width, measureStateTransitionLabel(transition.label).width), 0);
    const crossesCompositeBoundary = Boolean(nextId && statesById.get(id)?.parentId !== statesById.get(nextId)?.parentId);
    x += size.width + Math.max(defaultGap, adjacentLabelWidth + (crossesCompositeBoundary ? 6 : 2));
  }
  const branchesByParent = new Map;
  for (const transition of diagram.transitions) {
    if (!mainIds.has(transition.from) || mainIds.has(transition.to))
      continue;
    const list = branchesByParent.get(transition.from) ?? [];
    if (!list.includes(transition.to))
      list.push(transition.to);
    branchesByParent.set(transition.from, list);
  }
  for (const [parentId, branchIds] of branchesByParent) {
    const parent = bounds.get(parentId);
    if (!parent)
      continue;
    const branchGap = defaultGap;
    const branchSizes = branchIds.map((id) => sizes.get(id)).filter(Boolean);
    const totalWidth = branchSizes.reduce((sum, size) => sum + size.width, 0) + Math.max(0, branchSizes.length - 1) * branchGap;
    const parentIndex = mainPathIndex.get(parentId);
    const joinIds = branchIds.map((id) => diagram.transitions.find((transition) => transition.from === id && mainIds.has(transition.to) && parentIndex !== undefined && (mainPathIndex.get(transition.to) ?? -1) > parentIndex + 1)?.to);
    const commonJoin = joinIds[0] && joinIds.every((id) => id === joinIds[0]) ? joinIds[0] : undefined;
    const parallelLane = commonJoin && parentIndex !== undefined ? bounds.get(mainPath[parentIndex + 1]) : undefined;
    let left = (parallelLane?.centerX ?? parent.centerX) - Math.floor(totalWidth / 2);
    for (const branchId of branchIds) {
      if (bounds.has(branchId))
        continue;
      const size = sizes.get(branchId);
      if (!size)
        continue;
      const top = availableStateTop([...bounds.values()], left, baselineY + (parallelLane ? 6 : 5), size.width, size.height);
      bounds.set(branchId, {
        id: branchId,
        left,
        top,
        width: size.width,
        height: size.height,
        centerX: left + Math.floor(size.width / 2),
        centerY: top + Math.floor(size.height / 2)
      });
      left += size.width + branchGap;
    }
  }
  const ranks = computeRanks2(diagram);
  const fallbackStates = diagram.states.filter((state) => !bounds.has(state.id)).sort((left, right) => (ranks.get(left.id) ?? 0) - (ranks.get(right.id) ?? 0));
  for (const state of fallbackStates) {
    const size = sizes.get(state.id);
    const top = baselineY + 5;
    const rank = ranks.get(state.id) ?? bounds.size;
    let left = rank * (size.width + defaultGap);
    while (true) {
      const collision = [...bounds.values()].find((bound) => left < bound.left + bound.width + defaultGap && left + size.width + defaultGap > bound.left && top < bound.top + bound.height && top + size.height > bound.top);
      if (!collision)
        break;
      left = collision.left + collision.width + defaultGap;
    }
    bounds.set(state.id, {
      id: state.id,
      left,
      top,
      width: size.width,
      height: size.height,
      centerX: left + Math.floor(size.width / 2),
      centerY: top + Math.floor(size.height / 2)
    });
  }
  const minX = Math.min(0, ...[...bounds.values()].map((bound) => bound.left));
  if (minX < 0) {
    for (const bound of bounds.values()) {
      bound.left -= minX;
      bound.centerX -= minX;
    }
  }
  if (diagram.direction === "RL") {
    const right = Math.max(0, ...[...bounds.values()].map((bound) => bound.left + bound.width));
    for (const bound of bounds.values()) {
      bound.left = right - bound.left - bound.width;
      bound.centerX = bound.left + Math.floor(bound.width / 2);
    }
    const branchLabelGutter = Math.max(0, ...diagram.transitions.flatMap((transition) => {
      const from = bounds.get(transition.from);
      const to = bounds.get(transition.to);
      return from && to && from.centerY !== to.centerY ? [measureStateTransitionLabel(transition.label).width + 2] : [];
    }));
    if (branchLabelGutter > 0) {
      shiftBounds(bounds.values(), branchLabelGutter, 0);
    }
  }
  return emptyLayout(bounds, sizes);
}
function availableStateTop(bounds, left, top, width, height) {
  let available = top;
  while (true) {
    const collision = bounds.find((bound) => intersects(left, available, width, height, bound, 0));
    if (!collision)
      return available;
    available = collision.top + collision.height + 3;
  }
}
function expandCompositeBoundsForFeedback(diagram, bounds, compositeBounds, feedbackLaneY) {
  if (diagram.direction !== "LR" && diagram.direction !== "RL")
    return;
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const compositesById = new Map(diagram.composites.map((composite) => [composite.id, composite]));
  for (const composite of diagram.composites) {
    const compositeBound = compositeBounds.get(composite.id);
    if (!compositeBound)
      continue;
    const hasInternalFeedback = diagram.transitions.some((transition) => {
      if (!belongsToComposite(transition.from, composite.id, statesById, compositesById))
        return false;
      if (!belongsToComposite(transition.to, composite.id, statesById, compositesById))
        return false;
      const from = bounds.get(transition.from);
      const to = bounds.get(transition.to);
      return Boolean(from && to && isStateHorizontalFeedback(diagram, from, to));
    });
    if (!hasInternalFeedback)
      continue;
    const bottom = Math.max(compositeBound.top + compositeBound.height, feedbackLaneY + 2);
    compositeBound.height = bottom - compositeBound.top;
    compositeBound.centerY = compositeBound.top + Math.floor(compositeBound.height / 2);
  }
}
function placeStateDiagramNotesAroundTransitions(diagram, layout, transitionPlans, budget) {
  if (diagram.notes.length === 0)
    return;
  const compositeIds = new Set(diagram.composites.map((composite) => composite.id));
  let noteSpace = SpatialIndex.empty().add(...[...layout.bounds.values()].flatMap((bound) => compositeIds.has(bound.id) ? [] : [spatialRectClaim(`state:${bound.id}`, `state:${bound.id}`, "body", bound)]));
  let reserved = noteSpace.add(...transitionPlans.flatMap((plan, planIndex) => [
    spatialPathClaim(`transition-terminal:${planIndex}:source`, `transition-terminal:${planIndex}:source`, "route", plan.path.slice(0, 2).map(([x, y]) => ({ x, y }))),
    spatialPathClaim(`transition-terminal:${planIndex}:target`, `transition-terminal:${planIndex}:target`, "route", plan.path.slice(-2).map(([x, y]) => ({ x, y })))
  ]));
  let space = reserved.add(...transitionPlans.flatMap((plan, planIndex) => [
    spatialPathClaim(`transition:${planIndex}`, `transition:${planIndex}`, "route", plan.path.map(([x, y]) => ({ x, y }))),
    ...plan.label ? [
      spatialRectClaim(`transition-label:${planIndex}`, `transition-label:${planIndex}`, "label", {
        left: plan.label.x,
        top: plan.label.y,
        width: Math.max(...plan.label.lines.map(diagramTextWidth)),
        height: plan.label.lines.length
      })
    ] : []
  ]));
  const noteBounds = [];
  for (const [index, note] of diagram.notes.entries()) {
    const target = layout.bounds.get(note.target);
    if (!target)
      continue;
    const size = noteSize(note);
    const gap = 4;
    const baseLeft = note.position === "right" ? target.left + target.width + gap : target.left - size.width - gap;
    const baseTop = target.centerY - Math.floor(size.height / 2);
    const candidates = [
      baseTop,
      target.top - size.height - 2,
      target.top + target.height + 2,
      ...Array.from({ length: 12 }, (_, distance) => [baseTop - distance - 1, baseTop + distance + 1]).flat()
    ];
    const candidateBounds = Array.from({ length: 5 }, (_, outward) => candidates.map((top) => createNoteBound(note, index, baseLeft + (note.position === "right" ? 1 : -1) * outward * (size.width + 2), top, size))).flat();
    const findPlacement = (candidateSpace, limit) => {
      const connectorSearch = createStateSearchSpace(candidateSpace, (role) => role === "label" ? 1 : 0);
      for (const bound of candidateBounds.slice(0, limit)) {
        if (bound.left < 0)
          continue;
        const owner = `note:${index}`;
        if (!candidateSpace.isFree(spatialRectClaim(`${owner}:body`, owner, "body", bound), { clearance: 1 }))
          continue;
        const connector = findNoteConnector(connectorSearch, bound, target, budget);
        if (connector)
          return { bound: { ...bound, connector }, connector };
      }
      return;
    };
    const placement = findPlacement(space, 1) ?? findPlacement(noteSpace, 1) ?? findPlacement(space, MAX_STRICT_NOTE_PLACEMENTS) ?? findPlacement(reserved, candidateBounds.length) ?? outsideNotePlacement(noteSpace, note, index, target, size);
    const owner = `note:${index}`;
    const claims = [
      spatialRectClaim(`${owner}:body`, owner, "body", placement.bound),
      spatialPathClaim(`${owner}:connector`, owner, "boundary", placement.connector.points)
    ];
    noteBounds.push(placement.bound);
    noteSpace = noteSpace.add(...claims);
    reserved = reserved.add(...claims);
    space = space.add(...claims);
  }
  layout.noteBounds.splice(0, layout.noteBounds.length, ...noteBounds);
}
function outsideNotePlacement(space, note, index, target, size) {
  const search = createStateSearchSpace(space);
  const top = search.maxY + 4;
  const owner = `note:${index}:outside`;
  for (const position of [note.position, note.position === "left" ? "right" : "left"]) {
    const aligned = createNoteBound({ ...note, position }, index, position === "left" ? search.minX - size.width - 4 : search.maxX + 4, target.centerY - Math.floor(size.height / 2), size);
    const alignedNoteX = position === "left" ? aligned.left + aligned.width : aligned.left - 1;
    const alignedConnectorY = Math.max(aligned.top + 1, Math.min(target.centerY, aligned.top + aligned.height - 2));
    const alignedTargetX = position === "left" ? target.left - 1 : target.left + target.width;
    const alignedConnector = {
      connectorY: alignedConnectorY,
      points: [
        { x: alignedTargetX, y: target.centerY },
        { x: alignedNoteX, y: alignedConnectorY }
      ]
    };
    if (space.isFree(spatialRectClaim(`${owner}:body`, owner, "body", aligned), { clearance: 1 }) && space.isFree(spatialPathClaim(`${owner}:connector`, owner, "boundary", alignedConnector.points)))
      return { bound: { ...aligned, connector: alignedConnector }, connector: alignedConnector };
    const railX = position === "left" ? search.minX - 2 : search.maxX + 2;
    const bound = createNoteBound({ ...note, position }, index, position === "left" ? railX - size.width - 2 : railX + 3, top, size);
    const noteX = position === "left" ? bound.left + bound.width : bound.left - 1;
    const connectorY = bound.top + 1;
    const sideX = position === "left" ? target.left - 1 : target.left + target.width;
    const escapes = [
      ...[target.top, target.centerY, target.top + target.height - 1].map((y) => [
        { x: sideX, y },
        { x: railX, y }
      ]),
      [
        { x: target.centerX, y: target.top - 1 },
        { x: railX, y: target.top - 1 }
      ],
      [
        { x: target.centerX, y: target.top + target.height },
        { x: railX, y: target.top + target.height }
      ]
    ];
    for (const escape of escapes) {
      const connector = {
        connectorY,
        points: [...escape, { x: railX, y: connectorY }, { x: noteX, y: connectorY }]
      };
      if (space.isFree(spatialRectClaim(`${owner}:body`, owner, "body", bound), { clearance: 1 }) && space.isFree(spatialPathClaim(`${owner}:connector`, owner, "boundary", connector.points)))
        return { bound: { ...bound, connector }, connector };
    }
  }
  for (const vertical of ["below", "above"]) {
    const railY = vertical === "below" ? search.maxY + 2 : search.minY - 2;
    const bound = createNoteBound(note, index, note.position === "left" ? search.minX - size.width - 4 : search.maxX + 4, vertical === "below" ? railY + 2 : railY - size.height - 2, size);
    const noteX = note.position === "left" ? bound.left + bound.width : bound.left - 1;
    const connectorY = bound.top + 1;
    const targetY = vertical === "below" ? target.top + target.height : target.top - 1;
    const escapes = [
      ...[target.left, target.centerX, target.left + target.width - 1].map((x) => [
        { x, y: targetY },
        { x, y: railY }
      ]),
      [
        { x: target.left, y: targetY },
        { x: target.left - 1, y: targetY },
        { x: target.left - 1, y: railY }
      ],
      [
        { x: target.left + target.width - 1, y: targetY },
        { x: target.left + target.width, y: targetY },
        { x: target.left + target.width, y: railY }
      ]
    ];
    for (const escape of escapes) {
      const connector = {
        connectorY,
        points: [...escape, { x: noteX, y: railY }, { x: noteX, y: connectorY }]
      };
      if (space.isFree(spatialRectClaim(`${owner}:body`, owner, "body", bound), { clearance: 1 }) && space.isFree(spatialPathClaim(`${owner}:connector`, owner, "boundary", connector.points)))
        return { bound: { ...bound, connector }, connector };
    }
  }
  throw new Error(`State ${note.target} has no exterior note corridor`);
}
function expandCompositeBoundsForInternalTransitions(diagram, compositeBounds, transitionPlans) {
  const statesById = new Map(diagram.states.map((state) => [state.id, state]));
  const compositesById = new Map(diagram.composites.map((composite) => [composite.id, composite]));
  for (const composite of diagram.composites) {
    const bound = compositeBounds.get(composite.id);
    if (!bound)
      continue;
    const internalPlans = transitionPlans.filter((plan) => belongsToComposite(plan.route.transition.from, composite.id, statesById, compositesById) && belongsToComposite(plan.route.transition.to, composite.id, statesById, compositesById));
    const occupied = internalPlans.flatMap((plan) => [
      ...plan.cells.map((cell) => ({ x: cell.x, y: cell.y })),
      ...plan.label ? plan.label.lines.flatMap((line, row) => Array.from({ length: diagramTextWidth(line) }, (_, column) => ({
        x: plan.label.x + column,
        y: plan.label.y + row
      }))) : []
    ]);
    if (occupied.length === 0)
      continue;
    const left = Math.min(bound.left, Math.min(...occupied.map((point) => point.x)) - 1);
    const top = Math.min(bound.top, Math.min(...occupied.map((point) => point.y)) - 1);
    const right = Math.max(bound.left + bound.width, Math.max(...occupied.map((point) => point.x)) + 2);
    const bottom = Math.max(bound.top + bound.height, Math.max(...occupied.map((point) => point.y)) + 2);
    bound.left = left;
    bound.top = top;
    bound.width = right - left;
    bound.height = bottom - top;
    bound.centerX = bound.left + Math.floor(bound.width / 2);
    bound.centerY = bound.top + Math.floor(bound.height / 2);
  }
  enforceCompositeMargins(diagram, compositeBounds);
}

// src/merman/state/options.ts
var DEFAULT_STATE_DIAGRAM_MIN_STATE_GAP = 5;
var DEFAULT_STATE_BORDER_STYLE = "rounded";
var DEFAULT_STATE_ARROW_HEAD_STYLE = "filled";
function normalizeStateMinStateGap(value) {
  if (value === undefined || !Number.isFinite(value))
    return DEFAULT_STATE_DIAGRAM_MIN_STATE_GAP;
  return Math.max(1, Math.trunc(value));
}

// src/merman/state/style.ts
var DEFAULT_THEME_RGB5 = {
  state: [228, 239, 232],
  stateBorder: [228, 239, 232],
  composite: [111, 138, 126],
  compositeLabel: [111, 138, 126],
  transition: [134, 225, 200],
  label: [134, 225, 200],
  noteBorder: [141, 169, 155],
  noteText: [215, 229, 221],
  noteConnector: [141, 169, 155],
  start: [134, 225, 200],
  end: [230, 177, 126],
  choice: [134, 225, 200]
};
var STATE_RAMP_STEPS = [1, 2, 3];
var NOTE_CONNECTOR_RAMP_STYLES = numberedStyleKeys("noteConnectorRamp", STATE_RAMP_STEPS);
var STATE_DEPARTURE_RAMP_STYLES = numberedStyleKeys("stateDepartureRamp", STATE_RAMP_STEPS);
function resolveStateStyleColors(colors = {}) {
  const resolved = {
    state: colors.state ?? rgba(DEFAULT_THEME_RGB5.state),
    stateBorder: colors.stateBorder ?? colors.state ?? rgba(DEFAULT_THEME_RGB5.stateBorder),
    composite: colors.composite ?? rgba(DEFAULT_THEME_RGB5.composite),
    compositeLabel: colors.compositeLabel ?? colors.composite ?? rgba(DEFAULT_THEME_RGB5.compositeLabel),
    transition: colors.transition ?? rgba(DEFAULT_THEME_RGB5.transition),
    label: colors.label ?? rgba(DEFAULT_THEME_RGB5.label),
    noteBorder: colors.noteBorder ?? rgba(DEFAULT_THEME_RGB5.noteBorder),
    noteText: colors.noteText ?? rgba(DEFAULT_THEME_RGB5.noteText),
    noteConnector: colors.noteConnector ?? rgba(DEFAULT_THEME_RGB5.noteConnector),
    start: colors.start ?? rgba(DEFAULT_THEME_RGB5.start),
    end: colors.end ?? rgba(DEFAULT_THEME_RGB5.end),
    choice: colors.choice ?? rgba(DEFAULT_THEME_RGB5.choice)
  };
  return {
    ...resolved,
    ...createColorRampTheme(NOTE_CONNECTOR_RAMP_STYLES, resolved.noteConnector, resolved.noteBorder),
    ...createColorRampTheme(STATE_DEPARTURE_RAMP_STYLES, resolved.stateBorder, resolved.transition)
  };
}

// src/merman/state/drawing.ts
function translateTransitionPlans(plans, dx, dy) {
  return plans.map((plan) => ({
    ...plan,
    cells: plan.cells.map((cell) => ({ ...cell, x: cell.x + dx, y: cell.y + dy })),
    path: plan.path.map(([x, y]) => [x + dx, y + dy]),
    label: plan.label ? { ...plan.label, x: plan.label.x + dx, y: plan.label.y + dy } : undefined
  }));
}
function makeGrid2(width, height) {
  return new DiagramCanvas(width, height, {
    mergeCell: (existing, incoming) => {
      const existingIsTransition = existing.style === "transition" || existing.style?.startsWith("stateDepartureRamp");
      const incomingIsTransition = incoming.style === "transition" || incoming.style?.startsWith("stateDepartureRamp");
      const shouldMerge = incomingIsTransition && existingIsTransition;
      return {
        ...incoming,
        char: shouldMerge ? mergeDiagramLineGlyph(existing.char, incoming.char, "rounded") ?? incoming.char : incoming.char
      };
    }
  });
}
function setCell3(grid, x, y, char, style) {
  grid.setCell(x, y, char, style);
}
function setText3(grid, x, y, text, style) {
  grid.setText(x, y, text, style);
}
function drawBox2(grid, state, bounds, lines, borderStyle) {
  if (isHiddenCompositeMarker(state))
    return;
  if (state.kind === "fork" || state.kind === "join")
    return;
  if (state.kind !== "state") {
    setCell3(grid, bounds.left, bounds.top, state.label, state.kind);
    return;
  }
  fillDiagramFrameInterior(bounds, (x, y) => setCell3(grid, x, y, " ", "state"));
  drawStateFrame(grid, bounds, BorderChars6[borderStyle], "stateBorder");
  lines.forEach((line, index) => {
    setText3(grid, bounds.left + 2, bounds.top + 1 + index, line, "state");
  });
}
function drawStateFrame(grid, bounds, chars, style) {
  drawDiagramFrame(bounds, chars, (x, y, char) => setCell3(grid, x, y, char, style));
}
function drawContainerFrame(grid, bounds, label, chars, style) {
  drawDiagramFrame(bounds, chars, (x, y, char) => setCell3(grid, x, y, char, style));
  drawContainerLabel(grid, bounds, label, style);
}
function drawContainerLabel(grid, bounds, label, style) {
  if (label)
    setText3(grid, bounds.left + 2, bounds.top, ` ${label} `, style);
}
function noteConnectorGlyph(directions) {
  const chars = BorderChars6.double;
  const up = directions.has("up");
  const down = directions.has("down");
  const left = directions.has("left");
  const right = directions.has("right");
  if (up && down && left && right)
    return chars.cross;
  if (up && down && right)
    return chars.leftT;
  if (up && down && left)
    return chars.rightT;
  if (left && right && down)
    return chars.topT;
  if (left && right && up)
    return chars.bottomT;
  if (up && right)
    return chars.bottomLeft;
  if (up && left)
    return chars.bottomRight;
  if (down && right)
    return chars.topLeft;
  if (down && left)
    return chars.topRight;
  if (up || down)
    return chars.vertical;
  return chars.horizontal;
}
function drawNote(grid, bounds, target) {
  const chars = BorderChars6.double;
  const connector = stateDiagramNoteConnector(bounds, target);
  const points = orthogonalPathPoints(connector.points);
  for (const [index, point] of points.entries()) {
    const directions = new Set;
    const previous = points[index - 1];
    const next = points[index + 1];
    if (previous)
      directions.add(directionBetween(point, previous));
    if (next)
      directions.add(directionBetween(point, next));
    const distanceFromNote = points.length - index - 1;
    const style = distanceFromNote < 3 ? NOTE_CONNECTOR_RAMP_STYLES[2 - distanceFromNote] : "noteConnector";
    setCell3(grid, point.x, point.y, noteConnectorGlyph(directions), style);
  }
  drawContainerFrame(grid, bounds, "", chars, "noteBorder");
  setCell3(grid, bounds.note.position === "right" ? bounds.left : bounds.left + bounds.width - 1, connector.connectorY, bounds.note.position === "right" ? chars.rightT : chars.leftT, "noteBorder");
  bounds.lines.forEach((line, index) => setText3(grid, bounds.left + 2, bounds.top + 1 + index, line, "noteText"));
}
function drawTransitionRenderPlan(grid, plan, arrowHeadStyle, rampDeparture) {
  const departure = new Map(rampDeparture ? plan.path.slice(0, 3).map(([x, y], index) => [`${x}:${y}`, STATE_DEPARTURE_RAMP_STYLES[index]]) : []);
  for (const cell of plan.cells) {
    const char = cell.arrowDirection ? diagramArrowHead(cell.arrowDirection, arrowHeadStyle) : cell.char;
    setCell3(grid, cell.x, cell.y, char, departure.get(`${cell.x}:${cell.y}`) ?? "transition");
  }
  if (plan.label) {
    plan.label.lines.forEach((line, index) => {
      const y = plan.label.y + index;
      const leftX = plan.label.x - DIAGRAM_LABEL_PADDING_X;
      if (grid.getCell(leftX, y)?.char === " ")
        setCell3(grid, leftX, y, " ", "label");
      setText3(grid, plan.label.x, y, line, "label");
      const rightX = plan.label.x + diagramTextWidth(line) + DIAGRAM_LABEL_PADDING_X - 1;
      if (grid.getCell(rightX, y)?.char === " ")
        setCell3(grid, rightX, y, " ", "label");
    });
  }
}
function drawTransitionJunctionPlans(grid, diagram, bounds, renderPlans) {
  for (const plan of createStateTransitionJunctionPlans(diagram, bounds, renderPlans)) {
    const parallel = plan.kind === "fork" || plan.kind === "join";
    const style = plan.kind === "choice" ? "choice" : "transition";
    const bar = diagram.direction === "LR" || diagram.direction === "RL" ? "\u2503" : "\u2501";
    const char = plan.kind === "choice" ? "\u25C6" : parallel ? bar : diagramLineGlyph(plan.connections, "rounded");
    setCell3(grid, plan.bounds.left, plan.bounds.top, char, style);
  }
}
function drawStateDiagramGrid(sourceDiagram, options = {}) {
  return createStateDiagramDrawing(sourceDiagram, options).grid;
}
function createStateDiagramDrawing(sourceDiagram, options = {}) {
  const direction = options.direction ?? sourceDiagram.direction;
  if (direction !== "LR" && direction !== "RL") {
    return createStateDiagramDrawingWithDirection(sourceDiagram, options, direction);
  }
  if (options.layoutMaxWidth === undefined || !Number.isFinite(options.layoutMaxWidth)) {
    return createStateDiagramDrawingWithDirection(sourceDiagram, options, direction);
  }
  const fallbackDirection = direction === "RL" ? "BT" : "TB";
  const maxWidth = Math.max(1, Math.trunc(options.layoutMaxWidth));
  const drawing = (() => {
    try {
      return createStateDiagramDrawingWithDirection(sourceDiagram, options, direction);
    } catch (error) {
      if (error instanceof DiagramCanvasSizeError)
        return;
      throw error;
    }
  })();
  if (!drawing)
    return createStateDiagramDrawingWithDirection(sourceDiagram, options, fallbackDirection);
  if (drawing.grid.getTextSize({ trimTop: true, trimBottom: true }).width <= maxWidth) {
    return drawing;
  }
  const fallback = createStateDiagramDrawingWithDirection(sourceDiagram, options, fallbackDirection);
  if (fallback.grid.getTextSize({ trimTop: true, trimBottom: true }).width >= drawing.grid.getTextSize({ trimTop: true, trimBottom: true }).width) {
    return drawing;
  }
  return fallback;
}
function createStateDiagramDrawingWithDirection(sourceDiagram, options, direction) {
  const diagram = prepareVisibleStateDiagram(direction === sourceDiagram.direction ? sourceDiagram : { ...sourceDiagram, direction });
  const borderStyle = options.borderStyle ?? DEFAULT_STATE_BORDER_STYLE;
  const arrowHeadStyle = options.arrowHeadStyle ?? DEFAULT_STATE_ARROW_HEAD_STYLE;
  const minStateGap = normalizeStateMinStateGap(options.minStateGap);
  const searchBudget = createStateSearchBudget();
  const layout = createStateDiagramLayout(diagram, {
    minStateGap,
    searchBudget
  });
  const { bounds, sizes, compositeBounds, noteBounds } = layout;
  let allBounds = [...bounds.values(), ...noteBounds];
  let maxY = Math.max(0, ...allBounds.map((bound) => bound.top + bound.height));
  const feedbackLaneY = maxY + 3;
  const feedbackTopY = Math.min(0, ...allBounds.map((bound) => bound.top)) - 3;
  expandCompositeBoundsForFeedback(diagram, bounds, compositeBounds, feedbackLaneY);
  let transitionPlans = [];
  const separationAttempts = diagram.states.length + diagram.composites.length + 1;
  for (let attempt = 0;attempt < separationAttempts; attempt++) {
    transitionPlans = createStateTransitionRenderPlans(diagram, bounds, feedbackLaneY, {
      feedbackTopY,
      noteBounds,
      searchBudget
    });
    expandCompositeBoundsForInternalTransitions(diagram, compositeBounds, transitionPlans);
    if (!separateExternalBoundsFromComposites(diagram, layout))
      break;
    if (attempt === separationAttempts - 1)
      throw new Error("State composite separation did not converge");
  }
  const connectorPoints = noteBounds.flatMap((bound) => bound.connector?.points ?? []);
  const contentLeft = Math.min(0, ...[...bounds.values(), ...noteBounds].map((bound) => bound.left), ...connectorPoints.map((point) => point.x), ...transitionPlans.flatMap((plan) => [
    ...plan.cells.map((cell) => cell.x),
    ...plan.label ? [plan.label.x - DIAGRAM_LABEL_PADDING_X] : []
  ]));
  const contentTop = Math.min(0, ...[...bounds.values(), ...noteBounds].map((bound) => bound.top), ...connectorPoints.map((point) => point.y), ...transitionPlans.flatMap((plan) => [...plan.cells.map((cell) => cell.y), ...plan.label ? [plan.label.y] : []]));
  if (contentLeft < 0 || contentTop < 0) {
    translateStateDiagramLayout(layout, -contentLeft, -contentTop);
    transitionPlans = translateTransitionPlans(transitionPlans, -contentLeft, -contentTop);
  }
  allBounds = [...bounds.values(), ...noteBounds];
  const translatedConnectorPoints = noteBounds.flatMap((bound) => bound.connector?.points ?? []);
  const maxX = Math.max(0, ...allBounds.map((bound) => bound.left + bound.width), ...translatedConnectorPoints.map((point) => point.x + 1));
  maxY = Math.max(0, ...allBounds.map((bound) => bound.top + bound.height), ...translatedConnectorPoints.map((point) => point.y + 1));
  const transitionLabelSizes = diagram.transitions.map((transition) => measureStateTransitionLabel(transition.label));
  const maxTransitionLabelWidth = Math.max(0, ...transitionLabelSizes.map((size) => size.width));
  const maxTransitionLabelLines = Math.max(0, ...transitionLabelSizes.map((size) => size.height));
  const transitionRight = Math.max(maxX, ...transitionPlans.flatMap((plan) => [
    ...plan.cells.map((cell) => cell.x + 1),
    ...plan.label ? [plan.label.x + measureStateTransitionLabel(plan.route.transition.label).width + DIAGRAM_LABEL_PADDING_X] : []
  ]));
  const transitionBottom = Math.max(maxY, ...transitionPlans.flatMap((plan) => [
    ...plan.cells.map((cell) => cell.y + 1),
    ...plan.label ? [plan.label.y + plan.label.lines.length] : []
  ]));
  const grid = makeGrid2(Math.max(maxX + Math.max(24, maxTransitionLabelWidth + 4), transitionRight + 2), Math.max(maxY + 8 + maxTransitionLabelLines, transitionBottom + 2));
  for (const composite of diagram.composites) {
    const bound = compositeBounds.get(composite.id);
    if (!bound)
      continue;
    drawContainerFrame(grid, bound, composite.label, BorderChars6[borderStyle], "composite");
  }
  for (const state of diagram.states) {
    const bound = bounds.get(state.id);
    const size = sizes.get(state.id);
    if (!bound || !size)
      continue;
    drawBox2(grid, state, bound, size.lines, borderStyle);
  }
  for (const plan of transitionPlans) {
    const source = diagram.states.find((state) => state.id === plan.route.transition.from);
    drawTransitionRenderPlan(grid, plan, arrowHeadStyle, source?.kind === "state");
  }
  drawTransitionJunctionPlans(grid, diagram, bounds, transitionPlans);
  for (const composite of diagram.composites) {
    const bound = compositeBounds.get(composite.id);
    if (bound)
      drawContainerLabel(grid, bound, composite.label, "compositeLabel");
  }
  for (const noteBound of noteBounds) {
    const target = bounds.get(noteBound.note.target);
    if (target)
      drawNote(grid, noteBound, target);
  }
  return { grid, diagram, layout, transitionPlans };
}

// src/merman/state/render-grid.ts
function renderStateGridStyledText(grid, colors, backgrounds) {
  return renderDiagramGridStyledTextByStyle(grid, colors, backgrounds, {
    trimTop: true,
    trimBottom: true
  });
}

// src/merman/timeline/style.ts
var DEFAULT_THEME_RGB6 = {
  title: [228, 239, 232],
  section: [154, 184, 169],
  period: [230, 177, 126],
  spine: [111, 138, 126],
  event: [134, 225, 200]
};
var TIMELINE_SECTION_FADE_STYLES = numberedStyleKeys("sectionFade", [1, 2, 3]);
var TIMELINE_PERIOD_FADE_STYLES = numberedStyleKeys("periodFade", [1, 2, 3]);
function resolveTimelineStyleColors(colors = {}) {
  const section = colors.section ?? rgba(DEFAULT_THEME_RGB6.section);
  const period = colors.period ?? rgba(DEFAULT_THEME_RGB6.period);
  const spine = colors.spine ?? rgba(DEFAULT_THEME_RGB6.spine);
  return {
    title: colors.title ?? rgba(DEFAULT_THEME_RGB6.title),
    section,
    period,
    spine,
    event: colors.event ?? rgba(DEFAULT_THEME_RGB6.event),
    sectionFade1: blendColor(section, spine, 0.5),
    sectionFade2: blendColor(section, spine, 0.67),
    sectionFade3: blendColor(section, spine, 0.83),
    periodFade1: blendColor(period, spine, 0.5),
    periodFade2: blendColor(period, spine, 0.67),
    periodFade3: blendColor(period, spine, 0.83)
  };
}

// src/merman/timeline/drawing.ts
var JOIN_WIDTH = TIMELINE_SECTION_FADE_STYLES.length;
var SPINE_OFFSET = JOIN_WIDTH + 1;
var EVENT_OFFSET = 3;
function drawTimelineDiagramGrid(diagram, _options = {}) {
  const periodLayouts = new Map;
  let leftWidth = 0;
  let rightWidth = 0;
  let bodyHeight = 0;
  for (const entry of diagram.entries) {
    if (entry.type === "section") {
      const lines = splitDiagramLines(entry.section.label);
      bodyHeight += lines.length + 1;
      for (const line of lines)
        leftWidth = Math.max(leftWidth, diagramTextWidth(line));
      continue;
    }
    const periodLines = splitDiagramLines(entry.period.period);
    const eventLines = entry.period.events.map(splitDiagramLines);
    const eventHeight = eventLines.reduce((height, lines) => height + lines.length, 0);
    const height = Math.max(periodLines.length, eventHeight);
    periodLayouts.set(entry.period, { period: entry.period, periodLines, eventLines, height });
    for (const line of periodLines)
      leftWidth = Math.max(leftWidth, diagramTextWidth(line));
    for (const lines of eventLines) {
      for (const line of lines)
        rightWidth = Math.max(rightWidth, diagramTextWidth(line));
    }
    bodyHeight += height + 1;
  }
  const titleLines = diagram.title ? splitDiagramLines(diagram.title) : [];
  const bodyWidth = diagram.entries.length === 0 ? 0 : leftWidth + SPINE_OFFSET + EVENT_OFFSET + rightWidth + 1;
  let titleWidth = 0;
  for (const line of titleLines)
    titleWidth = Math.max(titleWidth, diagramTextWidth(line));
  const width = Math.max(bodyWidth, titleWidth);
  const titleHeight = titleLines.length === 0 ? 0 : titleLines.length + (diagram.entries.length === 0 ? 0 : 1);
  if (width === 0)
    return new DiagramCanvas(0, 0);
  const grid = new DiagramCanvas(width, titleHeight + bodyHeight);
  titleLines.forEach((line, index) => setText4(grid, Math.floor((width - diagramTextWidth(line)) / 2), index, line, "title"));
  if (diagram.entries.length === 0)
    return grid;
  const spineX = leftWidth + SPINE_OFFSET;
  let y = titleHeight;
  let railStarted = false;
  for (const entry of diagram.entries) {
    if (entry.type === "section") {
      const lines = splitDiagramLines(entry.section.label);
      lines.forEach((line, index) => {
        setText4(grid, leftWidth - diagramTextWidth(line), y + index, line, "section");
        if (index > 0)
          setCell4(grid, spineX, y + index, "\u2502", "spine");
      });
      drawJoin(grid, leftWidth, y, TIMELINE_SECTION_FADE_STYLES);
      setCell4(grid, spineX, y, railStarted ? "\u2524" : "\u2510", "spine");
      setCell4(grid, spineX, y + lines.length, "\u2502", "spine");
      railStarted = true;
      y += lines.length + 1;
      continue;
    }
    const layout = periodLayouts.get(entry.period);
    for (let row = 0;row < layout.height + 1; row++)
      setCell4(grid, spineX, y + row, "\u2502", "spine");
    railStarted = true;
    setCell4(grid, spineX, y, "\u25CF", "spine");
    layout.periodLines.forEach((line, index) => {
      const lineWidth = diagramTextWidth(line);
      setText4(grid, leftWidth - lineWidth, y + index, line, "period");
    });
    drawJoin(grid, leftWidth, y, TIMELINE_PERIOD_FADE_STYLES);
    let eventY = y;
    for (const lines of layout.eventLines) {
      lines.forEach((line, index) => setText4(grid, spineX + EVENT_OFFSET, eventY + index, line, "event"));
      eventY += lines.length;
    }
    y += layout.height + 1;
  }
  return grid;
}
function drawJoin(grid, x, y, styles) {
  styles.forEach((style, index) => setCell4(grid, x + index + 1, y, "\u2500", style));
}
function setCell4(grid, x, y, char, style) {
  grid.setCell(x, y, char, style);
}
function setText4(grid, x, y, text, style) {
  grid.setText(x, y, text, style);
}

// src/merman/timeline/render-grid.ts
function renderTimelineGridStyledText(grid, colors) {
  return renderDiagramGridStyledText(grid, (run) => run.style ? colors[run.style] : undefined, undefined, {
    trimBottom: true
  });
}

// src/merman/diagram.ts
function color(value) {
  return value === undefined ? undefined : parseColor4(value);
}
function prepareDiagram(kind, source, options, layoutMaxWidth) {
  const colors = options.colors ?? {};
  const compact = options.compact ?? true;
  switch (kind) {
    case "classDiagram": {
      const grid = drawClassDiagramGrid(parseMermaidClassDiagram(source), { layoutMaxWidth, classLayout: options.classLayout });
      const size = grid.getTextSize({ trimTop: true, trimBottom: true });
      return {
        kind,
        source,
        text: renderClassGridStyledText(grid, resolveClassStyleColors({
          border: color(colors.boxBorder ?? colors.muted),
          title: color(colors.boxText ?? colors.primary),
          stereotype: color(colors.groupText ?? colors.group ?? colors.muted),
          member: color(colors.text),
          edge: color(colors.line ?? colors.secondary),
          label: color(colors.text)
        })),
        height: size.height
      };
    }
    case "flowchart": {
      const grid = drawFlowchartDiagramGrid(parseMermaidFlowchartDiagram(source), {
        compact,
        layoutMaxWidth
      });
      const size = grid.getTextSize({ trimTop: true, trimBottom: true });
      return {
        kind,
        source,
        text: renderGridStyledText(grid, resolveFlowchartStyleColors({
          node: color(colors.boxText ?? colors.primary),
          nodeBorder: color(colors.boxBorder ?? colors.muted),
          database: color(colors.boxText ?? colors.primary),
          databaseBorder: color(colors.boxBorder ?? colors.muted),
          edge: color(colors.line ?? colors.secondary),
          label: color(colors.text),
          group: color(colors.group ?? colors.muted),
          groupLabel: color(colors.groupText ?? colors.group ?? colors.muted)
        }), { label: color(colors.labelBackground) }),
        height: size.height
      };
    }
    case "gitGraph": {
      const grid = drawGitGraphDiagramGrid(parseMermaidGitGraphDiagram(source));
      const size = grid.getTextSize({ trimBottom: true });
      return {
        kind,
        source,
        text: renderGitGraphGridStyledText(grid, resolveGitGraphStyleColors({
          primary: color(colors.primary),
          secondary: color(colors.secondary),
          muted: color(colors.muted),
          warning: color(colors.warning),
          text: color(colors.text)
        })),
        height: size.height
      };
    }
    case "gantt": {
      const grid = drawGanttDiagramGrid(parseMermaidGanttDiagram(source), { ...options.gantt, layoutMaxWidth });
      const size = grid.getTextSize({ trimBottom: true });
      return {
        kind,
        source,
        text: renderGanttGridStyledText(grid, resolveGanttStyleColors({
          title: color(colors.text),
          axis: color(colors.muted),
          background: color(colors.background),
          section: color(colors.secondary),
          task: color(colors.primary),
          active: color(colors.primary),
          critical: color(colors.warning),
          done: color(colors.muted)
        })),
        height: size.height
      };
    }
    case "sequence": {
      const grid = drawSequenceDiagramGrid(parseMermaidSequenceDiagram(source), { compact });
      const size = grid.getTextSize();
      return {
        kind,
        source,
        text: renderSequenceGridStyledText(grid, resolveSequenceStyleColors({
          participant: color(colors.primary),
          lifeline: color(colors.muted),
          group: color(colors.secondary),
          request: color(colors.request ?? colors.primary),
          response: color(colors.response ?? colors.primary),
          fragment: color(colors.secondary),
          fragmentLabelBg: color(colors.background),
          note: color(colors.note ?? colors.warning),
          noteBg: color(colors.noteBackground ?? colors.background)
        })),
        height: size.height
      };
    }
    case "state": {
      const grid = drawStateDiagramGrid(parseMermaidStateDiagram(source), { layoutMaxWidth });
      const size = grid.getTextSize({ trimTop: true, trimBottom: true });
      return {
        kind,
        source,
        text: renderStateGridStyledText(grid, resolveStateStyleColors({
          state: color(colors.boxText ?? colors.primary),
          stateBorder: color(colors.boxBorder ?? colors.primary),
          composite: color(colors.group ?? colors.muted),
          compositeLabel: color(colors.groupText ?? colors.group ?? colors.muted),
          transition: color(colors.line ?? colors.secondary),
          label: color(colors.text),
          noteBorder: color(colors.noteBorder ?? colors.warning),
          noteText: color(colors.noteText ?? colors.warning),
          noteConnector: color(colors.noteConnector ?? colors.muted),
          start: color(colors.marker ?? colors.muted),
          end: color(colors.marker ?? colors.muted),
          choice: color(colors.marker ?? colors.secondary)
        }), { label: color(colors.labelBackground) }),
        height: size.height
      };
    }
    case "timeline": {
      const grid = drawTimelineDiagramGrid(parseMermaidTimelineDiagram(source));
      const size = grid.getTextSize({ trimBottom: true });
      return {
        kind,
        source,
        text: renderTimelineGridStyledText(grid, resolveTimelineStyleColors({
          title: color(colors.text),
          section: color(colors.secondary),
          period: color(colors.warning),
          spine: color(colors.muted),
          event: color(colors.primary)
        })),
        height: size.height
      };
    }
  }
}
function measureMermaidDiagram(source, options = {}) {
  const kind = detectMermaidDiagram(source);
  if (!kind)
    return;
  const configuredMaxWidth = options.layoutMaxWidth === undefined ? 120 : Math.max(1, Math.trunc(options.layoutMaxWidth));
  const prepared = prepareDiagram(kind, source, options, configuredMaxWidth);
  const palette = options.palette;
  if (!palette?.length)
    return prepared;
  const nearest = (color) => {
    const [r, g, b] = color.toInts();
    let closest = palette[0];
    let distance = Number.POSITIVE_INFINITY;
    for (const candidate of palette) {
      const [cr, cg, cb] = candidate.toInts();
      const difference = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
      if (difference < distance) {
        distance = difference;
        closest = candidate;
      }
    }
    return closest;
  };
  return {
    ...prepared,
    text: new StyledText3(prepared.text.chunks.map((chunk) => ({
      ...chunk,
      fg: chunk.fg ? nearest(chunk.fg) : undefined,
      bg: chunk.bg && chunk.bg.a >= 1 ? nearest(chunk.bg) : undefined
    })))
  };
}

// src/merman/palette.ts
import { RGBA as RGBA4 } from "@opentui/core";
function createOpenCodeDiagramPalette(input) {
  const secondary = blendColor(input.text, input.subdued, 0.5);
  const muted = blendColor(input.text, input.subdued, 0.7);
  return {
    text: input.text,
    primary: input.text,
    secondary,
    muted,
    warning: input.info,
    background: input.background,
    request: input.success,
    response: input.warning,
    note: input.text,
    noteBackground: blendColor(input.background, input.subdued, 0.25),
    boxText: input.text,
    boxBorder: muted,
    line: input.subdued,
    labelBackground: RGBA4.fromValues(input.text.r, input.text.g, input.text.b, 0.08),
    group: input.accent.soft,
    groupText: input.accent.soft,
    marker: secondary,
    noteBorder: input.accent.soft,
    noteText: input.accent.clear,
    noteConnector: input.accent.soft
  };
}
function resolveOpenCodeDiagramPalette(theme) {
  return createOpenCodeDiagramPalette({
    text: theme.text.base,
    subdued: theme.text.muted,
    info: theme.text.feedback.info,
    success: theme.text.feedback.success,
    warning: theme.text.feedback.warning,
    background: theme.background.base,
    accent: {
      soft: theme.accent,
      clear: theme.accent
    }
  });
}

// src/view/mermaid.tsx
function DiagramText(props) {
  let ref;
  let dragX;
  createEffect3(() => {
    if (!ref)
      return;
    const prepared = props.prepared();
    ref.content = prepared.text;
    ref.height = prepared.height;
    ref.width = "100%";
    ref.wrapMode = "none";
    ref.selectable = false;
    ref.marginTop = 1;
  });
  return (() => {
    var _el$ = _$createElement7("text");
    _$use2((renderable) => {
      ref = renderable;
      if (!ref)
        return;
      ref.onMouseDown = (event) => {
        if (event.button !== 0)
          return;
        ref?.ctx.clearSelection();
        dragX = event.x;
        event.preventDefault();
        event.stopPropagation();
      };
      ref.onMouseDrag = (event) => {
        if (dragX === undefined)
          return;
        const dx = event.x - dragX;
        dragX = event.x;
        if (ref && dx)
          ref.scrollX -= dx;
        event.preventDefault();
        event.stopPropagation();
      };
      ref.onMouseDragEnd = () => {
        dragX = undefined;
      };
      ref.onMouseUp = () => {
        dragX = undefined;
      };
      ref.onMouseScroll = (event) => {
        const direction = event.scroll?.direction;
        if (direction !== "left" && direction !== "right")
          return;
        event.preventDefault();
        event.stopPropagation();
      };
    }, _el$);
    return _el$;
  })();
}
function MermaidDiagramView(props) {
  let lastGood;
  const prepared = createMemo4(() => {
    const source = props.source;
    const kind = detectMermaidDiagram(source);
    if (kind && lastGood && lastGood.kind !== kind)
      lastGood = undefined;
    const options = {
      compact: props.mermaidOptions?.compact,
      classLayout: props.mermaidOptions?.classLayout,
      layoutMaxWidth: Math.min(props.mermaidOptions?.layoutMaxWidth ?? 120, Math.max(1, props.columns)),
      colors: resolveOpenCodeDiagramPalette(props.theme),
      palette: props.theme.palette
    };
    const restore = () => {
      if (!lastGood)
        return;
      try {
        return measureMermaidDiagram(lastGood.source, options);
      } catch {
        return;
      }
    };
    try {
      const result = measureMermaidDiagram(source, options);
      if (result && result.height > 0) {
        lastGood = result;
        return result;
      }
      if (lastGood && (!kind || lastGood.kind === kind)) {
        return restore();
      }
    } catch (error) {
      if (error instanceof MermaidSyntaxError && lastGood && lastGood.kind === kind) {
        return restore();
      }
      if (error instanceof MermaidSyntaxError && kind) {
        const lines = source.split(`
`);
        if (error.lineNumber > 2 && !lines.slice(error.lineNumber).some((line) => line.trim())) {
          try {
            const result = measureMermaidDiagram(lines.slice(0, error.lineNumber - 1).join(`
`), options);
            if (result?.height) {
              lastGood = result;
              return result;
            }
          } catch (prefixError) {
            if (!(prefixError instanceof MermaidSyntaxError || prefixError instanceof DiagramCanvasSizeError)) {
              props.onDiagnostic?.({
                level: "error",
                message: prefixError instanceof Error ? prefixError.message : String(prefixError)
              });
            }
          }
        }
      }
      if (!(error instanceof MermaidSyntaxError || error instanceof DiagramCanvasSizeError)) {
        props.onDiagnostic?.({
          level: "error",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return;
  });
  return (() => {
    var _el$2 = _$createElement7("box");
    _$setProp7(_el$2, "width", "100%");
    _$setProp7(_el$2, "flexDirection", "column");
    _$setProp7(_el$2, "flexShrink", 0);
    _$insert5(_el$2, _$createComponent4(Show2, {
      get when() {
        return prepared();
      },
      get fallback() {
        return _$createComponent4(CodeBlock, {
          get content() {
            return props.source;
          },
          language: "mermaid",
          get theme() {
            return props.theme;
          },
          get headings() {
            return props.headings ?? defaultHeadingStyles;
          },
          get syntaxStyle() {
            return props.syntaxStyle;
          }
        });
      },
      children: (value) => _$createComponent4(DiagramText, {
        prepared: value
      })
    }));
    return _el$2;
  })();
}

// src/view/document.tsx
function listMarker(list, index, item) {
  const bullet = list.ordered ? `${list.start + index}.` : "-";
  return item.task ? `${bullet} ${item.checked ? "[x]" : "[ ]"}` : bullet;
}
function DocumentView(props) {
  let previous = [];
  const slots = createMemo5(() => {
    previous = reconcileSlots(previous, [...props.document.blocks]);
    return previous;
  });
  function flow(children, columns, quote, surface = props.surface, prefix, prefixColor, prefixChunks) {
    return _$createComponent5(InlineFlow, {
      inlines: children,
      get columns() {
        return columns();
      },
      get theme() {
        return props.theme;
      },
      get headings() {
        return props.headings;
      },
      get graphics() {
        return props.graphics;
      },
      surface,
      quote,
      prefix,
      prefixColor,
      prefixChunks
    });
  }
  function BlockView(input) {
    const surface = input.surface ?? props.surface;
    if (input.block().type === "mermaid") {
      return _$createComponent5(MermaidDiagramView, {
        get source() {
          return input.block().content;
        },
        get theme() {
          return props.theme;
        },
        get columns() {
          return input.columns;
        },
        get mermaidOptions() {
          return props.mermaidOptions;
        },
        get headings() {
          return props.headings;
        },
        get syntaxStyle() {
          return props.syntaxStyle;
        },
        get onDiagnostic() {
          return props.onDiagnostic;
        }
      });
    }
    const view = createMemo5(() => {
      const block = input.block();
      const columns = Math.max(1, input.columns);
      switch (block.type) {
        case "paragraph":
          return flow(block.children, () => columns, input.quote, surface);
        case "heading": {
          const level = headingLevels[block.level - 1];
          const style = props.headings[level];
          const children = style.uppercase ? block.children.map((child) => child.type === "text" ? {
            ...child,
            text: child.text.toUpperCase()
          } : child) : block.children;
          return (() => {
            var _el$ = _$createElement8("box");
            _$setProp8(_el$, "width", "100%");
            _$setProp8(_el$, "flexDirection", "column");
            _$setProp8(_el$, "flexShrink", 0);
            _$insert6(_el$, _$createComponent5(InlineFlow, {
              inlines: children,
              columns,
              get theme() {
                return props.theme;
              },
              get headings() {
                return props.headings;
              },
              get graphics() {
                return props.graphics;
              },
              surface,
              heading: {
                level
              },
              prefix: (index) => index === 0 ? `${"#".repeat(level)} ` : " ".repeat(level + 1),
              prefixColor: () => props.theme.text.muted
            }));
            _$effect6((_p$) => {
              var { marginTop: _v$, marginBottom: _v$2 } = style;
              _v$ !== _p$.e && (_p$.e = _$setProp8(_el$, "marginTop", _v$, _p$.e));
              _v$2 !== _p$.t && (_p$.t = _$setProp8(_el$, "marginBottom", _v$2, _p$.t));
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$;
          })();
        }
        case "rule":
          return (() => {
            var _el$2 = _$createElement8("box");
            _$setProp8(_el$2, "height", 1);
            _$setProp8(_el$2, "width", "100%");
            _$setProp8(_el$2, "border", ["top"]);
            _$effect6((_$p) => _$setProp8(_el$2, "borderColor", props.theme.markdown.horizontalRule, _$p));
            return _el$2;
          })();
        case "image":
          return _$createComponent5(LocalImage, {
            get href() {
              return block.href;
            },
            get alt() {
              return block.alt;
            },
            get base() {
              return props.assetBase;
            },
            columns: () => columns,
            get cell() {
              return props.graphics.cell;
            },
            background: surface,
            labelColor: () => props.theme.markdown.image,
            textColor: () => props.theme.markdown.imageText,
            get limits() {
              return props.imageLimits;
            }
          });
        case "display-math":
          return _$createComponent5(DisplayMath, {
            get content() {
              return block.content;
            },
            get open() {
              return block.open;
            },
            get close() {
              return block.close;
            },
            maxWidth: () => columns,
            theme: () => props.theme,
            get graphics() {
              return props.graphics;
            },
            surface,
            scale: () => props.mathScale ?? 1
          });
        case "quote":
          return (() => {
            var _el$3 = _$createElement8("box");
            _$setProp8(_el$3, "border", columns > 2 ? ["left"] : []);
            _$setProp8(_el$3, "paddingLeft", columns > 2 ? 1 : 0);
            _$setProp8(_el$3, "width", "100%");
            _$setProp8(_el$3, "flexDirection", "column");
            _$insert6(_el$3, _$createComponent5(For2, {
              get each() {
                return block.blocks;
              },
              children: (child) => _$createComponent5(BlockView, {
                block: () => child,
                columns: columns > 2 ? columns - 2 : columns,
                quote: true,
                surface
              })
            }));
            _$effect6((_$p) => _$setProp8(_el$3, "borderColor", props.theme.markdown.blockQuote, _$p));
            return _el$3;
          })();
        case "list":
          return _$createComponent5(ListBlockView, {
            block: () => block,
            columns,
            get quote() {
              return input.quote;
            },
            wrapItems: false
          });
        case "code":
          return _$createComponent5(CodeBlock, {
            get content() {
              return block.content;
            },
            get language() {
              return block.language;
            },
            get theme() {
              return props.theme;
            },
            get headings() {
              return props.headings;
            },
            get syntaxStyle() {
              return props.syntaxStyle;
            }
          });
        case "mermaid":
          return _$createComponent5(MermaidDiagramView, {
            get source() {
              return block.content;
            },
            get theme() {
              return props.theme;
            },
            columns,
            get mermaidOptions() {
              return props.mermaidOptions;
            },
            get headings() {
              return props.headings;
            },
            get syntaxStyle() {
              return props.syntaxStyle;
            },
            get onDiagnostic() {
              return props.onDiagnostic;
            }
          });
        case "table":
          return _$createComponent5(TableBlock, {
            block,
            get options() {
              return props.tableOptions;
            },
            get theme() {
              return props.theme;
            },
            get headings() {
              return props.headings;
            },
            surface,
            get hyperlinks() {
              return props.graphics.hyperlinks?.() ?? true;
            }
          });
        case "literal":
          return (() => {
            var _el$4 = _$createElement8("text");
            _$setProp8(_el$4, "wrapMode", "word");
            _$effect6((_p$) => {
              var _v$3 = props.theme.markdown.text, _v$4 = block.text;
              _v$3 !== _p$.e && (_p$.e = _$setProp8(_el$4, "fg", _v$3, _p$.e));
              _v$4 !== _p$.t && (_p$.t = _$setProp8(_el$4, "content", _v$4, _p$.t));
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$4;
          })();
        default:
          return assertNever(block);
      }
    });
    return (() => {
      var _el$5 = _$createElement8("box");
      _$setProp8(_el$5, "width", "100%");
      _$setProp8(_el$5, "flexDirection", "column");
      _$setProp8(_el$5, "flexShrink", 0);
      _$insert6(_el$5, view);
      _$effect6((_$p) => _$setProp8(_el$5, "backgroundColor", surface(), _$p));
      return _el$5;
    })();
  }
  function ListItemView(input) {
    const list = input.block;
    const item = input.item;
    const markerWidth = input.markerWidth;
    const hanging = () => markerWidth() + 1;
    const marker = () => listMarker(list(), input.index(), item());
    const info = () => {
      const current = item();
      const source = input.latest().items[input.index()]?.source ?? null;
      return {
        kind: "list-item",
        item: current.source === source ? current : {
          ...current,
          source
        },
        source
      };
    };
    const surface = () => props.unitSurface?.(info) ?? props.surface();
    const content = (() => {
      var _el$6 = _$createElement8("box");
      _$setProp8(_el$6, "flexDirection", "column");
      _$setProp8(_el$6, "width", "100%");
      _$setProp8(_el$6, "flexShrink", 0);
      _$insert6(_el$6, _$createComponent5(For2, {
        get each() {
          return item().blocks;
        },
        children: (child, childIndex) => childIndex() === 0 && child.type === "paragraph" ? flow(child.children, () => input.columns, input.quote, surface, (row) => row === 0 ? `${marker().padEnd(markerWidth())} ` : " ".repeat(hanging()), () => list().ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem, item().task ? (row) => row === 0 ? [{
          __isChunk: true,
          text: `${list().ordered ? `${list().start + input.index()}.` : "-"} `,
          fg: list().ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem
        }, {
          __isChunk: true,
          text: `${item().checked ? "[x]" : "[ ]"}${" ".repeat(markerWidth() - stringWidth5(marker()) + 1)}`,
          fg: item().checked ? props.theme.text.feedback.success : props.theme.text.muted
        }] : [{
          __isChunk: true,
          text: " ".repeat(hanging()),
          fg: props.theme.text.muted
        }] : undefined) : childIndex() === 0 ? (() => {
          var _el$7 = _$createElement8("box"), _el$8 = _$createElement8("text");
          _$insertNode3(_el$7, _el$8);
          _$setProp8(_el$7, "flexDirection", "row");
          _$setProp8(_el$7, "width", "100%");
          _$setProp8(_el$7, "flexShrink", 0);
          _$setProp8(_el$8, "flexShrink", 0);
          _$insert6(_el$8, () => `${marker().padEnd(markerWidth())} `);
          _$insert6(_el$7, _$createComponent5(BlockView, {
            block: () => child,
            get columns() {
              return Math.max(1, input.columns - hanging());
            },
            get quote() {
              return input.quote;
            },
            surface
          }), null);
          _$effect6((_p$) => {
            var _v$7 = hanging(), _v$8 = list().ordered ? props.theme.markdown.listEnumeration : props.theme.markdown.listItem;
            _v$7 !== _p$.e && (_p$.e = _$setProp8(_el$8, "width", _v$7, _p$.e));
            _v$8 !== _p$.t && (_p$.t = _$setProp8(_el$8, "fg", _v$8, _p$.t));
            return _p$;
          }, {
            e: undefined,
            t: undefined
          });
          return _el$7;
        })() : (() => {
          var _el$9 = _$createElement8("box");
          _$setProp8(_el$9, "flexDirection", "column");
          _$insert6(_el$9, _$createComponent5(BlockView, {
            block: () => child,
            get columns() {
              return Math.max(1, input.columns - hanging());
            },
            get quote() {
              return input.quote;
            },
            surface
          }));
          _$effect6((_p$) => {
            var _v$9 = hanging(), _v$0 = Math.max(1, input.columns - hanging());
            _v$9 !== _p$.e && (_p$.e = _$setProp8(_el$9, "marginLeft", _v$9, _p$.e));
            _v$0 !== _p$.t && (_p$.t = _$setProp8(_el$9, "width", _v$0, _p$.t));
            return _p$;
          }, {
            e: undefined,
            t: undefined
          });
          return _el$9;
        })()
      }), null);
      _$insert6(_el$6, (() => {
        var _c$ = _$memo5(() => item().blocks.length === 0);
        return () => _c$() && (() => {
          var _el$0 = _$createElement8("text");
          _$insert6(_el$0, marker);
          _$effect6((_$p) => _$setProp8(_el$0, "fg", props.theme.markdown.listItem, _$p));
          return _el$0;
        })();
      })(), null);
      _$effect6((_p$) => {
        var _v$5 = surface(), _v$6 = list().loose && input.index() < list().items.length - 1 ? 1 : 0;
        _v$5 !== _p$.e && (_p$.e = _$setProp8(_el$6, "backgroundColor", _v$5, _p$.e));
        _v$6 !== _p$.t && (_p$.t = _$setProp8(_el$6, "marginBottom", _v$6, _p$.t));
        return _p$;
      }, {
        e: undefined,
        t: undefined
      });
      return _el$6;
    })();
    return _$memo5(() => _$memo5(() => !!(input.wrapUnit && props.renderUnit))() ? props.renderUnit(info, content) : content);
  }
  function ListBlockView(input) {
    const markerWidth = createMemo5(() => {
      const list = input.block();
      return Math.max(1, ...list.items.map((entry, index) => stringWidth5(listMarker(list, index, entry))));
    });
    return (() => {
      var _el$1 = _$createElement8("box");
      _$setProp8(_el$1, "flexDirection", "column");
      _$setProp8(_el$1, "width", "100%");
      _$setProp8(_el$1, "flexShrink", 0);
      _$insert6(_el$1, _$createComponent5(For2, {
        get each() {
          return input.block().items;
        },
        children: (item, index) => _$createComponent5(ListItemView, {
          get block() {
            return input.block;
          },
          get latest() {
            return input.latest ?? input.block;
          },
          markerWidth,
          item: () => input.block().items[index()] ?? item,
          index,
          get columns() {
            return input.columns;
          },
          get quote() {
            return input.quote;
          },
          get wrapUnit() {
            return input.wrapItems;
          }
        })
      }));
      return _el$1;
    })();
  }
  function TopLevelSlot(input) {
    const block = input.slot.block;
    if (block().type === "list") {
      return _$createComponent5(ListBlockView, {
        block: () => block(),
        latest: () => input.slot.latest(),
        get columns() {
          return input.columns;
        },
        wrapItems: true
      });
    }
    const info = () => {
      const current = block();
      if (current.type === "list")
        throw new Error("A top-level list is rendered as list items, not as a block unit");
      const source = input.slot.latest().source ?? null;
      return {
        kind: "block",
        block: current.source === source ? current : {
          ...current,
          source
        },
        source
      };
    };
    const surface = () => props.unitSurface?.(info) ?? props.surface();
    const content = _$createComponent5(BlockView, {
      block,
      get columns() {
        return input.columns;
      },
      surface
    });
    return _$memo5(() => _$memo5(() => !!props.renderUnit)() ? props.renderUnit(info, content) : content);
  }
  return (() => {
    var _el$10 = _$createElement8("box");
    _$setProp8(_el$10, "width", "100%");
    _$setProp8(_el$10, "flexDirection", "column");
    _$setProp8(_el$10, "flexShrink", 0);
    _$insert6(_el$10, _$createComponent5(For2, {
      get each() {
        return slots();
      },
      children: (slot) => _$createComponent5(TopLevelSlot, {
        slot,
        get columns() {
          return props.columns;
        }
      })
    }));
    return _el$10;
  })();
}

// src/app.tsx
function resolveRendererTheme(renderer, options = {}) {
  const host = typeof options.theme === "function" ? options.theme() : options.theme;
  if (host)
    return host;
  const config = options.config ?? loadRendererConfig(options.configPath, options.cwd);
  return resolveConfiguredTheme(config, {
    themeMode: options.themeMode
  });
}
function MarkdownRenderer(props) {
  const renderer = props.renderer;
  const graphics = useCanvasGraphics(renderer);
  const surface = () => rgbaToHex(theme().background.base);
  const [measured, setMeasured] = createSignal5(0);
  const viewportWidth = () => {
    const explicit = props.columns?.();
    if (explicit !== undefined && explicit > 0)
      return Math.max(8, explicit);
    const width = measured();
    return Math.max(8, width > 0 ? width : renderer.terminalWidth);
  };
  const themeModeSetting = () => typeof props.themeMode === "function" ? props.themeMode() : props.themeMode;
  const mathScale = () => {
    const value = typeof props.mathScale === "function" ? props.mathScale() : props.mathScale;
    return value !== undefined && Number.isFinite(value) && value > 0 ? value : 1;
  };
  const config = createMemo6(() => {
    const provided = typeof props.config === "function" ? props.config() : props.config;
    if (provided)
      return provided;
    return loadRendererConfig(props.configPath, props.cwd, {
      discover: props.discoverConfig,
      report: (message) => {
        const handler = props.onDiagnostic;
        if (handler) {
          handler({
            level: "warning",
            message
          });
          return;
        }
        console.warn(`[opentui-markdown-render] ${message}`);
      }
    });
  });
  const theme = createMemo6(() => resolveRendererTheme(renderer, {
    theme: props.theme,
    config: config(),
    themeMode: themeModeSetting()
  }));
  const frameSetting = createMemo6(() => {
    const explicit = typeof props.frame === "function" ? props.frame() : props.frame;
    return explicit ?? config().frame;
  });
  const tableSetting = createMemo6(() => {
    const explicit = typeof props.tables === "function" ? props.tables() : props.tables;
    return explicit ?? config().tables;
  });
  const layout = createMemo6(() => resolveConfiguredLayout(config(), {
    viewport: viewportWidth(),
    frame: frameSetting(),
    tables: tableSetting()
  }));
  const frame = () => layout().frame;
  const contentWidth = () => layout().contentWidth;
  const tableOptions = () => layout().tables;
  const document = createMemo6(() => {
    const ready = props.document;
    if (ready)
      return ready();
    const content = props.content;
    if (!content)
      throw new Error("MarkdownRenderer requires either a content or a document accessor");
    return parseDocument(content());
  });
  const headings = createMemo6(() => resolveHeadingStyles(config().headings));
  const syntaxStyle = createMemo6(() => {
    const nativeScene = renderer.nativeScene;
    return generateSyntax(theme(), headings(), theme().markdown.codeBlock, nativeScene);
  });
  createEffect4(() => {
    const style = syntaxStyle();
    onCleanup4(() => void renderer.idle().then(() => style.destroy()));
  });
  return (() => {
    var _el$ = _$createElement9("box");
    _$setProp9(_el$, "width", "100%");
    _$setProp9(_el$, "flexDirection", "column");
    _$setProp9(_el$, "flexShrink", 0);
    _$setProp9(_el$, "onSizeChange", function() {
      const width = this.width;
      if (width !== viewportWidth())
        queueMicrotask(() => setMeasured(width));
    });
    _$insert7(_el$, _$createComponent6(MarkdownFrame, {
      get frame() {
        return frame();
      },
      get theme() {
        return theme();
      },
      get children() {
        return _$createComponent6(DocumentView, {
          get document() {
            return document();
          },
          get columns() {
            return contentWidth();
          },
          get theme() {
            return theme();
          },
          get headings() {
            return headings();
          },
          graphics,
          surface,
          assetBase: () => props.assetBase?.(),
          get imageLimits() {
            return config().images;
          },
          get tableOptions() {
            return tableOptions();
          },
          get mermaidOptions() {
            return config().mermaid;
          },
          get mathScale() {
            return mathScale();
          },
          get syntaxStyle() {
            return syntaxStyle();
          },
          get onDiagnostic() {
            return props.onDiagnostic;
          },
          get renderUnit() {
            return props.renderUnit;
          },
          get unitSurface() {
            return props.unitSurface;
          }
        });
      }
    }));
    _$effect7((_$p) => _$setProp9(_el$, "backgroundColor", theme().background.base, _$p));
    return _el$;
  })();
}
// src/cli.ts
var cliUsage = `Usage: otmd [options] [file]

Render a Markdown file in the terminal. Use - to read Markdown from stdin.

Options:
  -c, --config <path>  Load a specific JSON/JSONC config file
      --no-config      Disable automatic config discovery
  -h, --help           Show this help
  -v, --version        Show the package version

Viewer keys:
  c                     Open or close runtime configuration
  q                     Ask to quit
  Ctrl+C                Quit immediately
`;
function parseCliArgs(args) {
  let configPath;
  let discoverConfig = true;
  let file;
  for (let index = 0;index < args.length; index++) {
    const argument = args[index];
    if (argument === "--") {
      if (file !== undefined || index + 1 >= args.length)
        throw new Error("Expected one Markdown file after --");
      file = args[++index];
      continue;
    }
    if (argument === "-h" || argument === "--help")
      return { kind: "help" };
    if (argument === "-v" || argument === "--version")
      return { kind: "version" };
    if (argument === "--no-config") {
      discoverConfig = false;
      continue;
    }
    if (argument === "-") {
      if (file !== undefined)
        throw new Error("Only one Markdown file can be rendered");
      file = argument;
      continue;
    }
    if (argument === "-c" || argument === "--config") {
      const value = args[++index];
      if (!value)
        throw new Error(`${argument} requires a path`);
      configPath = value;
      continue;
    }
    if (argument.startsWith("--config=")) {
      const value = argument.slice("--config=".length);
      if (!value)
        throw new Error("--config requires a path");
      configPath = value;
      continue;
    }
    if (argument.startsWith("-"))
      throw new Error(`Unknown option: ${argument}`);
    if (file !== undefined)
      throw new Error("Only one Markdown file can be rendered");
    file = argument;
  }
  return { kind: "run", file, configPath, discoverConfig };
}
// src/statusline.tsx
import { effect as _$effect8 } from "@opentui/solid";
import { insert as _$insert8 } from "@opentui/solid";
import { createComponent as _$createComponent7 } from "@opentui/solid";
import { setProp as _$setProp10 } from "@opentui/solid";
import { createElement as _$createElement10 } from "@opentui/solid";
import { For as For3, Show as Show3 } from "solid-js";
import { TextAttributes as TextAttributes5 } from "@opentui/core";
var defaultStatusLineFields = statusLineFields.filter((field) => field !== "text");
function statusLineSegments(state, fields = defaultStatusLineFields, highlight = "title") {
  const segments = [];
  for (const field of fields) {
    if (field === "text") {
      for (const entry of state.text ?? []) {
        if (entry)
          segments.push({
            text: entry,
            emphasis: "muted"
          });
      }
      continue;
    }
    const value = statusLineValue(state, field);
    if (value === undefined)
      continue;
    segments.push({
      text: value,
      emphasis: field === highlight ? "strong" : "muted"
    });
  }
  return segments;
}
function statusLinePalette(theme, style = "bar") {
  if (style === "plain") {
    return {
      background: theme.background.base,
      foreground: theme.text.muted,
      title: theme.text.base,
      muted: theme.text.muted,
      border: theme.border.base
    };
  }
  return theme.statusline ?? deriveStatusLineTheme(theme);
}
function statusLineValue(state, field) {
  switch (field) {
    case "title":
      return state.title || undefined;
    case "mode":
      return state.mode || undefined;
    case "protocol":
      return state.protocol ? `img:${state.protocol}` : undefined;
    case "cell":
      return state.cell;
    case "mathScale":
      return state.mathScale === undefined ? undefined : `${state.mathScale.toFixed(1)}x`;
    case "position":
      return state.position;
    case "hint":
      return state.hint;
    case "text":
      return;
  }
}
function partColor(part, palette) {
  if (part.kind === "separator")
    return part.divider ? palette.border : palette.muted;
  return part.emphasis === "strong" ? palette.title : palette.foreground;
}
function StatusLine(props) {
  const separator = () => props.separator ?? " \xB7 ";
  const style = () => props.style ?? "bar";
  const highlight = () => props.highlight ?? "title";
  const palette = () => statusLinePalette(props.theme, style());
  const parts = () => {
    const segments = statusLineSegments(props.state(), props.fields, highlight());
    const result = [];
    let previousStrong = false;
    for (const segment of segments) {
      if (result.length) {
        result.push({
          text: separator(),
          kind: "separator",
          emphasis: "muted",
          divider: previousStrong
        });
      }
      result.push({
        text: segment.text,
        kind: "value",
        emphasis: segment.emphasis,
        divider: false
      });
      previousStrong = segment.emphasis === "strong";
    }
    return result;
  };
  const border = () => {
    if (props.border === "top")
      return ["top"];
    if (props.border === "bottom")
      return ["bottom"];
    return [];
  };
  return (() => {
    var _el$ = _$createElement10("box");
    _$setProp10(_el$, "width", "100%");
    _$setProp10(_el$, "flexShrink", 0);
    _$setProp10(_el$, "flexDirection", "row");
    _$setProp10(_el$, "alignItems", "center");
    _$setProp10(_el$, "paddingLeft", 1);
    _$setProp10(_el$, "paddingRight", 1);
    _$insert8(_el$, _$createComponent7(Show3, {
      get when() {
        return parts().length;
      },
      get children() {
        return _$createComponent7(For3, {
          get each() {
            return parts();
          },
          children: (part) => (() => {
            var _el$2 = _$createElement10("text");
            _$setProp10(_el$2, "flexShrink", 0);
            _$setProp10(_el$2, "wrapMode", "none");
            _$insert8(_el$2, () => part.text);
            _$effect8((_p$) => {
              var _v$4 = partColor(part, palette()), _v$5 = part.kind === "value" && part.emphasis === "strong" ? TextAttributes5.BOLD : TextAttributes5.NONE;
              _v$4 !== _p$.e && (_p$.e = _$setProp10(_el$2, "fg", _v$4, _p$.e));
              _v$5 !== _p$.t && (_p$.t = _$setProp10(_el$2, "attributes", _v$5, _p$.t));
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$2;
          })()
        });
      }
    }));
    _$effect8((_p$) => {
      var _v$ = border(), _v$2 = palette().border, _v$3 = palette().background;
      _v$ !== _p$.e && (_p$.e = _$setProp10(_el$, "border", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp10(_el$, "borderColor", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp10(_el$, "backgroundColor", _v$3, _p$.a));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined
    });
    return _el$;
  })();
}
// src/viewer/app.tsx
import { memo as _$memo6 } from "@opentui/solid";
import { use as _$use3 } from "@opentui/solid";
import { insert as _$insert9 } from "@opentui/solid";
import { createComponent as _$createComponent8 } from "@opentui/solid";
import { effect as _$effect9 } from "@opentui/solid";
import { createTextNode as _$createTextNode3 } from "@opentui/solid";
import { insertNode as _$insertNode4 } from "@opentui/solid";
import { setProp as _$setProp11 } from "@opentui/solid";
import { createElement as _$createElement11 } from "@opentui/solid";
import { createSignal as createSignal6, For as For4, onCleanup as onCleanup5, Show as Show4 } from "solid-js";

// src/viewer/quit.ts
function quitAction(key, confirming) {
  if (key.ctrl && key.name === "c")
    return "exit";
  if (confirming) {
    if (!key.ctrl && (key.name === "y" || key.name === "return" || key.name === "enter"))
      return "exit";
    if (key.name === "n" || key.name === "escape")
      return "cancel";
    return "none";
  }
  return key.name === "q" && !key.ctrl ? "prompt" : "none";
}

// src/viewer/settings.ts
var settingKeys = [
  "mode",
  "classLayout",
  "frameEnabled",
  "frameStyle",
  "frameAlign",
  "frameWidth",
  "framePadding",
  "tableWidth",
  "tableOverflow",
  "tableFitter",
  "tablePadding"
];
var themeModes = ["light", "dark", "solarized-light", "solarized-dark"];
function settingRows(settings, configuredTheme) {
  return [
    { key: "mode", label: "Theme", value: settings.themeMode ?? configuredTheme ?? "light" },
    { key: "classLayout", label: "Class layout", value: settings.classLayout },
    { key: "frameEnabled", label: "Frame", value: settings.frame.enabled ? "on" : "off" },
    { key: "frameStyle", label: "Frame style", value: settings.frame.style ?? "box" },
    { key: "frameAlign", label: "Frame align", value: settings.frame.align ?? "left" },
    { key: "frameWidth", label: "Frame width", value: String(settings.frame.width ?? "full") },
    { key: "framePadding", label: "Frame padding", value: String(settings.frame.paddingX ?? 1) },
    { key: "tableWidth", label: "Table width", value: settings.tables.widthMode ?? "content" },
    { key: "tableOverflow", label: "Table overflow", value: settings.tables.overflow ?? "scroll" },
    { key: "tableFitter", label: "Table fitter", value: settings.tables.columnFitter ?? "balanced" },
    { key: "tablePadding", label: "Table padding", value: String(settings.tables.cellPaddingX ?? 1) }
  ];
}
function cycle(options, value, direction) {
  const index = options.indexOf(value);
  return options[(index + direction + options.length) % options.length];
}
function step(value, direction, min, max) {
  return Math.min(max, Math.max(min, value + direction));
}
function configuredMode(name) {
  return themeModes.includes(name) ? name : "light";
}
function changeSetting(settings, key, direction, configuredTheme) {
  const { frame, tables } = settings;
  switch (key) {
    case "mode":
      return { ...settings, themeMode: cycle(themeModes, settings.themeMode ?? configuredMode(configuredTheme), direction) };
    case "classLayout":
      return { ...settings, classLayout: cycle(["builtin", "dagre"], settings.classLayout, direction) };
    case "frameEnabled":
      return { ...settings, frame: { ...frame, enabled: !frame.enabled } };
    case "frameStyle":
      return { ...settings, frame: { ...frame, style: cycle(["box", "ascii", "rounded", "heavy", "double"], frame.style ?? "box", direction) } };
    case "frameAlign":
      return { ...settings, frame: { ...frame, align: cycle(["left", "center", "right"], frame.align ?? "left", direction) } };
    case "frameWidth":
      return { ...settings, frame: { ...frame, width: step(frame.width ?? 100, direction * 5, 20, 200) } };
    case "framePadding":
      return { ...settings, frame: { ...frame, paddingX: step(frame.paddingX ?? 1, direction, 0, 8) } };
    case "tableWidth":
      return { ...settings, tables: { ...tables, widthMode: cycle(["content", "full"], tables.widthMode ?? "content", direction) } };
    case "tableOverflow":
      return { ...settings, tables: { ...tables, overflow: cycle(["scroll", "wrap"], tables.overflow ?? "scroll", direction) } };
    case "tableFitter":
      return { ...settings, tables: { ...tables, columnFitter: cycle(["balanced", "proportional"], tables.columnFitter ?? "balanced", direction) } };
    case "tablePadding":
      return { ...settings, tables: { ...tables, cellPaddingX: step(tables.cellPaddingX ?? 1, direction, 0, 8) } };
  }
}

// src/viewer/app.tsx
function StandaloneViewer(props) {
  const [settings, setSettings] = createSignal6({
    classLayout: props.config.mermaid?.classLayout ?? "builtin",
    frame: props.frame ?? props.config.frame ?? {},
    tables: props.config.tables ?? {}
  });
  const [panelOpen, setPanelOpen] = createSignal6(false);
  const [confirmExit, setConfirmExit] = createSignal6(false);
  const [selected, setSelected] = createSignal6(0);
  const [position, setPosition] = createSignal6("1/1");
  const theme = () => resolveRendererTheme(props.renderer, {
    themeMode: settings().themeMode,
    config: props.config,
    cwd: props.cwd
  });
  const graphics = useCanvasGraphics(props.renderer);
  let scroll;
  let savedScrollTop = 0;
  const timer = setInterval(() => {
    if (!scroll)
      return;
    const total = Math.max(0, scroll.scrollHeight - scroll.viewport.height);
    const top = Math.min(total, Math.max(0, scroll.scrollTop));
    setPosition(`${top + 1}/${total + 1}`);
  }, 200);
  onCleanup5(() => clearInterval(timer));
  const onKeypress = (key) => {
    const action = quitAction(key, confirmExit());
    if (action === "exit") {
      props.onExit();
      return;
    }
    if (action === "prompt") {
      if (scroll) {
        savedScrollTop = scroll.scrollTop;
        scroll = undefined;
      }
      setConfirmExit(true);
      key.preventDefault();
      return;
    }
    if (confirmExit()) {
      if (action === "cancel")
        setConfirmExit(false);
      key.preventDefault();
      return;
    }
    if (key.name === "c" || panelOpen() && key.name === "escape") {
      if (!panelOpen() && scroll) {
        savedScrollTop = scroll.scrollTop;
        scroll = undefined;
      }
      setPanelOpen(!panelOpen());
      key.preventDefault();
      return;
    }
    if (!panelOpen())
      return;
    if (key.name === "up" || key.name === "k") {
      setSelected((index) => (index + settingKeys.length - 1) % settingKeys.length);
    } else if (key.name === "down" || key.name === "j") {
      setSelected((index) => (index + 1) % settingKeys.length);
    } else if (key.name === "left" || key.name === "h") {
      setSettings((current) => changeSetting(current, settingKeys[selected()], -1, props.config.theme?.name));
    } else if (key.name === "right" || key.name === "l" || key.name === "return") {
      setSettings((current) => changeSetting(current, settingKeys[selected()], 1, props.config.theme?.name));
    } else {
      return;
    }
    key.preventDefault();
  };
  props.renderer.keyInput.on("keypress", onKeypress);
  onCleanup5(() => props.renderer.keyInput.off("keypress", onKeypress));
  const state = () => ({
    title: props.title,
    mode: `theme:${settings().themeMode ?? props.config.theme?.name ?? theme().mode}`,
    protocol: graphics.protocol(),
    cell: graphics.cell() ? `${graphics.cell().width}x${graphics.cell().height}` : undefined,
    position: position(),
    hint: "c:config q:quit"
  });
  return (() => {
    var _el$ = _$createElement11("box");
    _$setProp11(_el$, "width", "100%");
    _$setProp11(_el$, "height", "100%");
    _$setProp11(_el$, "flexDirection", "column");
    _$insert9(_el$, _$createComponent8(Show4, {
      get when() {
        return confirmExit();
      },
      get fallback() {
        return _$createComponent8(Show4, {
          get when() {
            return panelOpen();
          },
          get fallback() {
            return (() => {
              var _el$13 = _$createElement11("scrollbox");
              _$use3((element) => {
                scroll = element;
                queueMicrotask(() => {
                  element.scrollTop = savedScrollTop;
                });
              }, _el$13);
              _$setProp11(_el$13, "width", "100%");
              _$setProp11(_el$13, "flexGrow", 1);
              _$setProp11(_el$13, "contentOptions", {
                paddingLeft: 1,
                paddingRight: 1,
                paddingTop: 1,
                paddingBottom: 1
              });
              _$insert9(_el$13, _$createComponent8(MarkdownRenderer, {
                content: () => props.content,
                get renderer() {
                  return props.renderer;
                },
                assetBase: () => props.assetBase,
                themeMode: () => settings().themeMode,
                config: () => ({
                  ...props.config,
                  mermaid: {
                    ...props.config.mermaid,
                    classLayout: settings().classLayout
                  }
                }),
                frame: () => settings().frame,
                tables: () => settings().tables,
                get cwd() {
                  return props.cwd;
                },
                discoverConfig: false
              }));
              return _el$13;
            })();
          },
          get children() {
            var _el$9 = _$createElement11("scrollbox"), _el$0 = _$createElement11("text"), _el$10 = _$createElement11("text"), _el$12 = _$createElement11("box");
            _$insertNode4(_el$9, _el$0);
            _$insertNode4(_el$9, _el$10);
            _$insertNode4(_el$9, _el$12);
            _$setProp11(_el$9, "width", "100%");
            _$setProp11(_el$9, "flexGrow", 1);
            _$setProp11(_el$9, "contentOptions", {
              paddingLeft: 2,
              paddingTop: 1,
              paddingBottom: 1
            });
            _$insertNode4(_el$0, _$createTextNode3(`Configuration`));
            _$insertNode4(_el$10, _$createTextNode3(`Up/Down: select Left/Right: change c/Esc: close q: confirm quit`));
            _$setProp11(_el$12, "height", 1);
            _$insert9(_el$9, _$createComponent8(For4, {
              get each() {
                return settingRows(settings(), props.config.theme?.name);
              },
              children: (row, index) => (() => {
                var _el$14 = _$createElement11("text"), _el$15 = _$createTextNode3(`: `);
                _$insertNode4(_el$14, _el$15);
                _$insert9(_el$14, () => selected() === index() ? "\u276F " : "  ", _el$15);
                _$insert9(_el$14, () => row.label, _el$15);
                _$insert9(_el$14, () => row.value, null);
                _$effect9((_$p) => _$setProp11(_el$14, "fg", selected() === index() ? theme().accent : theme().text.base, _$p));
                return _el$14;
              })()
            }), null);
            _$effect9((_p$) => {
              var _v$4 = theme().text.base, _v$5 = theme().text.muted;
              _v$4 !== _p$.e && (_p$.e = _$setProp11(_el$0, "fg", _v$4, _p$.e));
              _v$5 !== _p$.t && (_p$.t = _$setProp11(_el$10, "fg", _v$5, _p$.t));
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$9;
          }
        });
      },
      get children() {
        var _el$2 = _$createElement11("box"), _el$3 = _$createElement11("text"), _el$5 = _$createElement11("text"), _el$7 = _$createElement11("text");
        _$insertNode4(_el$2, _el$3);
        _$insertNode4(_el$2, _el$5);
        _$insertNode4(_el$2, _el$7);
        _$setProp11(_el$2, "width", "100%");
        _$setProp11(_el$2, "flexGrow", 1);
        _$setProp11(_el$2, "flexDirection", "column");
        _$setProp11(_el$2, "alignItems", "center");
        _$setProp11(_el$2, "justifyContent", "center");
        _$insertNode4(_el$3, _$createTextNode3(`Quit viewer?`));
        _$insertNode4(_el$5, _$createTextNode3(`Configuration changes are not saved.`));
        _$insertNode4(_el$7, _$createTextNode3(`Enter/y: exit n/Esc: stay`));
        _$effect9((_p$) => {
          var _v$ = theme().accent, _v$2 = theme().text.muted, _v$3 = theme().text.base;
          _v$ !== _p$.e && (_p$.e = _$setProp11(_el$3, "fg", _v$, _p$.e));
          _v$2 !== _p$.t && (_p$.t = _$setProp11(_el$5, "fg", _v$2, _p$.t));
          _v$3 !== _p$.a && (_p$.a = _$setProp11(_el$7, "fg", _v$3, _p$.a));
          return _p$;
        }, {
          e: undefined,
          t: undefined,
          a: undefined
        });
        return _el$2;
      }
    }), null);
    _$insert9(_el$, _$createComponent8(Show4, {
      get when() {
        return props.config.statusline?.enabled !== false;
      },
      get children() {
        return _$createComponent8(StatusLine, {
          get theme() {
            return theme();
          },
          state,
          get fields() {
            return props.config.statusline?.fields;
          },
          get separator() {
            return props.config.statusline?.separator;
          },
          get border() {
            return props.config.statusline?.border;
          },
          get style() {
            return props.config.statusline?.style;
          },
          get highlight() {
            return props.config.statusline?.highlight;
          }
        });
      }
    }), null);
    _$effect9((_$p) => _$setProp11(_el$, "backgroundColor", theme().background.base, _$p));
    return _el$;
  })();
}

// bin/otmd-main.tsx
var manifest = await Bun.file(new URL("../package.json", import.meta.url)).json();
function fail(message) {
  console.error(`otmd: ${message}`);
  console.error("Try 'otmd --help' for usage.");
  process.exit(2);
}
var command;
try {
  command = parseCliArgs(process.argv.slice(2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
if (command.kind === "help") {
  process.stdout.write(cliUsage);
  process.exit(0);
}
if (command.kind === "version") {
  process.stdout.write(`${manifest.version}
`);
  process.exit(0);
}
var file = command.file;
var filePath = file && file !== "-" ? path5.resolve(file) : undefined;
var content = file === "-" ? await new Response(Bun.stdin).text() : filePath ? await readFile(filePath) : fail("a Markdown file is required (use - to read stdin)");
var assetBase = filePath ? path5.dirname(filePath) : process.cwd();
var config = loadRendererConfig(command.configPath, process.cwd(), {
  discover: command.discoverConfig
});
var renderer = await createCliRenderer({});
var onExit = () => {
  renderer.destroy();
  process.exit(0);
};
await render(() => _$createComponent9(StandaloneViewer, {
  renderer,
  content,
  get title() {
    return filePath ? path5.basename(filePath) : "stdin";
  },
  assetBase,
  get cwd() {
    return process.cwd();
  },
  config,
  onExit
}), renderer);
async function readFile(filePath) {
  const file = Bun.file(filePath);
  if (!await file.exists())
    fail(`file not found: ${filePath}`);
  try {
    return await file.text();
  } catch (error) {
    fail(`unable to read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
