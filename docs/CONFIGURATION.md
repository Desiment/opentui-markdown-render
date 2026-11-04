# Configuration

`opentui-markdown-render` accepts a JSON or JSONC configuration object. Every section is optional. Missing values keep the bundled defaults.

The repository's working example is [`examples/opentui-markdown-render.jsonc`](../examples/opentui-markdown-render.jsonc).

## Configuration sources and precedence

The standalone component can receive configuration from a prop or from a file:

1. A `config` prop, when present, replaces file lookup entirely.
2. Otherwise `configPath` names the file to load.
3. Without `configPath`, discovery starts at `cwd` (or the process working directory) and walks upward. **At each directory**, `opentui-markdown-render.jsonc` wins over `opentui-markdown-render.json`; a config in the nearest directory wins over one in a parent.
4. If no project config exists, the loader checks `$XDG_CONFIG_HOME/otmd/config.jsonc` and `$XDG_CONFIG_HOME/otmd/config.json`. When `XDG_CONFIG_HOME` is unset, `$HOME/.config` is used instead.
5. `discoverConfig={false}` disables automatic discovery for an embedded renderer, but does not cancel an explicit `configPath`.
6. Missing sections use bundled defaults.

Runtime layout props override their file sections:

```text
MarkdownRenderer frame/tables props -> config.frame/config.tables -> defaults
```

Theme mode follows a separate precedence:

```text
host-provided resolved Theme -> runtime themeMode -> config.theme.name -> light
```

The terminal's current colour theme does not select the renderer mode. The host can pass a fully resolved `Theme` when it needs complete control. A runtime `frame` or `tables` object replaces that entire config section; it is **not** merged field by field with the file section.

### JSONC parsing and `$schema`

The file loader accepts `//` and `/* ... */` comments and trailing commas, then parses the remaining text as JSON. Use double-quoted JSON keys and strings. `$schema` is reserved/ignored, but the package does not currently publish a JSON schema file; do not point it at a nonexistent package schema.

File loading and validation are not the same as a ready TypeScript `config` prop. The latter bypasses discovery, JSONC parsing, and file validation; callers must construct valid values themselves.

## Complete practical example

```jsonc
{
  "theme": {
    "name": "solarized-dark"
  },
  "statusline": {
    "enabled": true,
    "style": "bar",
    "highlight": "title",
    "fields": ["title", "mode", "protocol", "cell", "position"],
    "separator": " · ",
    "border": "top"
  },
  "images": {
    "maxColumns": 80,
    "maxRows": 32
  },
  "mermaid": {
    "compact": false,
    "layoutMaxWidth": 120,
    "classLayout": "builtin"
  },
  "headings": {
    "levels": {
      "1": { "underline": false },
      "2": { "bold": true, "marginTop": 1 },
      "3": { "bold": true, "dim": true }
    }
  },
  "frame": {
    "enabled": true,
    "width": 100,
    "align": "center",
    "style": "rounded",
    "paddingX": 1,
    "paddingY": 0,
    "title": "notes.md",
    "titleAlign": "center"
  },
  "tables": {
    "widthMode": "content",
    "overflow": "scroll",
    "columnFitter": "balanced",
    "cellPaddingX": 1
  }
}
```

Unknown sections, invalid theme names, unknown status fields, and many invalid enum values produce diagnostics and are ignored. Not every section reports every unknown or mistyped field; see [Validation and diagnostics](#validation-and-diagnostics). A file that is not valid JSON/JSONC falls back to bundled defaults *when loaded by the component adapter*. Use `onDiagnostic` to collect these messages in an embedding application's own UI.

## `theme`

```ts
type ThemeConfig = {
  name?: string
}
```

Bundled themes are `light`, `dark`, `solarized-light`, and `solarized-dark`. A
user theme with the same name in the XDG theme directory takes precedence over
the bundled file.

User themes live next to the main config:

```text
$XDG_CONFIG_HOME/otmd/themes/my-theme.jsonc
```

The complete commented template is [`themes/example.jsonc`](../themes/example.jsonc).
Copy it, remove or edit the comments, and select it with `{ "theme": { "name": "my-theme" } }`.

Theme files contain the complete colour tree: `mode`, optional `palette`,
`accent`, `categorical`, `text`, `background`, `border`, `frame`, optional
`statusline`, `markdown`, `syntax`, and `diff`. JSONC comments and trailing
commas are supported. Inline colour overrides in the main config are not
supported; edit a theme file instead.

## `statusline`

```ts
type StatusLineConfig = {
  enabled?: boolean
  fields?: StatusLineField[]
  separator?: string
  border?: "none" | "top" | "bottom"
  style?: "plain" | "bar"
  highlight?: StatusLineField
}
```

Available fields are `title`, `mode`, `protocol`, `cell`, `mathScale`, `position`, `hint`, and `text`. Fields without values are skipped. `text` expands a list of host-provided strings.

- `bar` gives the row its own background, border, and accent treatment.
- `plain` keeps the row in the page's normal colours.
- `highlight` defaults to `title`; the separator immediately after the highlighted field uses the border colour.
- `enabled` defaults to true in the standalone viewer unless the host omits the component entirely.

The status line does not read the document parser or calculate scroll position. The host supplies all values.

## `images`

```ts
type ImagesConfig = {
  maxColumns?: number
  maxRows?: number
}
```

Both values must be positive integers. Their defaults are 80 columns and 32 rows. They limit standalone rendered images in terminal columns and rows and do not change the source image on disk. See [Features](features.md#images-and-gifs) for path security and GIF behaviour.

## `mermaid`

```ts
type MermaidConfig = {
  compact?: boolean
  layoutMaxWidth?: number
  classLayout?: "builtin" | "dagre"
}
```

`compact` requests a more compact diagram layout. `layoutMaxWidth` limits the width used during layout and defaults to 120; the component also caps it to its actual content width. `classLayout` affects class diagrams only: `builtin` is the terminal-optimized default, while `dagre` uses Dagre's layered layout.

The configuration does not turn unsupported Mermaid families into supported ones. See the [Mermaid support matrix](MERMAID_SUPPORT.md).

## `headings`

```ts
type HeadingsConfig = {
  levels?: Partial<Record<"1" | "2" | "3" | "4" | "5" | "6", {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    dim?: boolean
    uppercase?: boolean
    marginTop?: number
    marginBottom?: number
  }>>
}
```

Each option is optional. An omitted option keeps the bundled style for that level. Margins are non-negative integer row counts. Heading colours are configured in the selected theme file; `headings.levels` controls attributes, case, and spacing only.

Bundled styles are:

| Level | Default attributes | Top | Bottom |
| --- | --- | ---: | ---: |
| H1 | bold, underline | 2 | 1 |
| H2 | bold | 1 | 0 |
| H3 | bold | 1 | 0 |
| H4 | italic | 1 | 0 |
| H5 | italic, dim | 1 | 0 |
| H6 | dim | 1 | 0 |

## `frame`

```ts
type FrameConfig = {
  enabled?: boolean
  width?: number
  align?: "left" | "center" | "right"
  style?: "box" | "ascii" | "rounded" | "heavy" | "double"
  paddingX?: number
  paddingY?: number
  title?: string
  titleAlign?: "left" | "center" | "right"
}
```

The frame is off by default. When enabled, the default alignment is `left`, style is `box`, title alignment is `left`, horizontal padding is 1, and vertical padding is 0. `width` includes border and padding and is clamped to the available viewport.

For a fixed frame around a scrolling view, render `MarkdownFrame` outside the scrollbox and disable the renderer's own frame. See [Getting started](getting-started.md#keep-the-frame-fixed-while-content-scrolls).

## `tables`

```ts
type TablesConfig = {
  widthMode?: "content" | "full"
  overflow?: "scroll" | "wrap"
  columnFitter?: "proportional" | "balanced"
  cellPaddingX?: number
}
```

Defaults are content-sized, scrollable, balanced columns, and one cell-padding column. The host's vertical scrollbox remains responsible for vertical movement; the table view takes horizontal movement only when its content actually overflows.

## Runtime-only configuration

All file sections can be represented by a TypeScript `MarkdownConfig` object, but some values are more naturally supplied at runtime:

```tsx
<MarkdownRenderer
  content={content}
  renderer={renderer}
  themeMode={() => currentThemeMode()}
  frame={() => currentFrameConfig()}
  tables={() => currentTableConfig()}
  config={() => currentConfig()}
  discoverConfig={false}
/>
```

Use accessors for values that change during the session. The standalone demo uses this mechanism for its configuration panel and does not rewrite the JSONC file.

## Validation and diagnostics

File validation is intentionally soft. Recognized invalid values are ignored, valid sibling values are retained, and defaults fill omitted values. Reporting is section-dependent:

| Section / value | Invalid value | Unknown keys |
| --- | --- | --- |
| Root | Unknown sections are reported and ignored; `$schema` is ignored. | Reported. |
| `theme` | Invalid theme names are reported. Theme file colour and nested-type errors are reported when that file is loaded. | Inline theme keys are reported; theme-file nested keys are also reported. |
| `statusline` | Unknown field names, `style`, and `highlight` are reported. Other invalid fields are silently omitted. | Extra object keys are not reported. |
| `images` | Non-positive or non-integer limits are silently omitted. | Extra object keys are not reported. |
| `mermaid` | Invalid `classLayout` is reported; invalid `compact` or `layoutMaxWidth` is silently omitted. | Extra object keys are not reported. |
| `headings` | Invalid levels, level styles, properties, and values are reported. | Unknown level/style keys are reported. |
| `frame` and `tables` | Invalid values for known fields are reported. | Extra object keys are not reported. |

Unknown top-level sections are reported, but mistyped *section values* (for example `"images": []`) are currently ignored without a dedicated warning. Do not rely on warnings alone as a complete schema validator.

`parseConfig` and `loadConfig` throw on malformed JSON or an invalid top-level value; `loadConfig` also throws if an **explicit** path does not exist. `loadRendererConfig` catches these failures, reports a warning, and returns `{}` so the component can render with defaults. See [Configuration helpers](api.md#configuration-helpers) for signatures and examples.

```tsx
<MarkdownRenderer
  content={content}
  renderer={renderer}
  onDiagnostic={({ level, message }) => {
    logToHostPanel(level, message)
  }}
/>
```

Without `onDiagnostic`, the component reports file/config warnings through its default console/stderr path. Unexpected Mermaid preparation errors can also reach the host as diagnostics; normal unsupported Mermaid syntax uses a code-fence fallback instead.
