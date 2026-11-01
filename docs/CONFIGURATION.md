# Конфигурация opentui-markdown-render

Справочник по JSON/JSONC-конфигурации. Рабочий пример: [`examples/opentui-markdown-render.jsonc`](../examples/opentui-markdown-render.jsonc). [Начало работы](../README.md#getting-started) · [Архитектура](architecture.md).

Без `configPath` рендерер ищет `opentui-markdown-render.jsonc`, затем `.json`, начиная с текущего каталога и поднимаясь к корню. `config` отключает поиск файла; `discoverConfig={false}` отключает автоматический поиск при встраивании. Отсутствующие секции используют значения по умолчанию. Ошибки чтения/парсинга передаются через `onDiagnostic` (по умолчанию — предупреждение в stderr), и рендерер использует значения по умолчанию.

## 1. Путь конфигурации (pipeline)

```
opentui-markdown-render.jsonc | .json
  -> discoverConfig() (вверх по дереву)
    -> loadConfig()
      -> parseConfig()  (strip comments + trailing commas, JSON.parse)
        -> validateConfig() (мягкая валидация + варнинги)
          -> MarkdownConfig
             -> resolveConfiguredTheme(config, runtime) -> Theme
                (готовая тема хоста > runtime-режим > режим файла > light)
            -> resolveConfiguredLayout(config, runtime) -> DocumentLayout
            -> resolveHeadingStyles(config.headings) -> HeadingStyles
```

Код:
- `src/config/load.ts` - поиск/парсинг/валидация
- `src/config/theme.ts` - проверка тематических override
- `src/config/resolve.ts` - объединение конфигурации с runtime-входами хоста
- `src/config/types.ts` - типы конфига
- `src/theme/*` - тема и мердж
- `src/headings.ts` - стили заголовков
- `src/app.tsx` - связка

## 2. Полная схема конфига (текущая)

### Корень
```ts
type MarkdownConfig = {
  theme?: ThemeOverride        // проверяется рекурсивно при загрузке файла
  statusline?: StatusLineConfig
  images?: ImagesConfig
  mermaid?: MermaidConfig
  headings?: HeadingsConfig
  frame?: FrameConfig
  tables?: TablesConfig
}
```

### theme (ThemeOverride)
См. [`src/theme/types.ts`](../src/theme/types.ts). JSONC-тема проверяется по известным ключам в [`src/config/theme.ts`](../src/config/theme.ts). Готовая тема, переданная хостом через `theme`, не проходит через этот валидатор.

```ts
type ThemeOverride = {
  mode?: "light" | "dark" | "solarized-light" | "solarized-dark"
  accent?: ColorInput
  categorical?: readonly ColorInput[]
  text?: {
    base?: ColorInput
    muted?: ColorInput
    feedback?: { error?: ColorInput; warning?: ColorInput; success?: ColorInput; info?: ColorInput }
    action?: { primary?: { focused?: ColorInput } }
  }
  background?: { base?: ColorInput }
  border?: { base?: ColorInput }
  frame?: FrameThemeOverride      // { border?, title? }
  statusline?: StatusLineThemeOverride // { background?, foreground?, title?, muted?, border? }
  markdown?: MarkdownThemeOverride
  syntax?: { [K in keyof Theme["syntax"]]?: ColorInput }
  diff?: {
    text?: { added?: ColorInput; removed?: ColorInput; context?: ColorInput }
    background?: { added?: ColorInput; removed?: ColorInput; context?: ColorInput }
  }
}
```

Например, `{ "theme": { "mode": "solarized-light" } }` выбирает встроенную палитру Solarized Light; `solarized-dark` — тёмную. Остальные поля `theme` переопределяют выбранную палитру. То же значение можно передать в runtime `themeMode` (он имеет приоритет над режимом файла). Готовый `Theme.mode` остаётся `"light"` или `"dark"`; для Solarized поле `Theme.palette` содержит 16 канонических цветов, к которым привязываются цвета диаграмм.

```ts
type MarkdownThemeOverride = {
  [K in Exclude<keyof Theme["markdown"], "headingLevels">]?: ColorInput
} & {
  heading1?: ColorInput
  heading2?: ColorInput
  heading3?: ColorInput
  heading4?: ColorInput
  heading5?: ColorInput
  heading6?: ColorInput
}
// + отсутствует в типе: headingLevels?: readonly ColorInput[] (длина 6)
```

Ключи `Theme["markdown"]`: `text`, `heading`, `headingLevels`, `link`, `linkText`, `code`, `blockQuote`, `emphasis`, `strong`, `horizontalRule`, `listItem`, `listEnumeration`, `image`, `imageText`, `codeBlock`

`listItem` и `listEnumeration` окрашивают маркеры списков; `code` — inline-код, `codeBlock` — базовый цвет текста блочного кода, `horizontalRule` — границу разделителя. У отдельного локального изображения `image` окрашивает подпись состояния загрузки/ошибки, `imageText` — alt-текст и сообщение об ошибке. Цвет `image` не меняет пиксели картинки; inline-картинки OpenTUI используют стиль ссылок.

### statusline
```ts
type StatusLineConfig = {
  enabled?: boolean
  fields?: StatusLineField[]  // валидируются по allowlist
  separator?: string
  border?: "none" | "top" | "bottom"
  style?: StatusLineStyle     // валидируется isStatusLineStyle
  highlight?: StatusLineField // валидируется isStatusLineField
}
statusLineFields = ["title","mode","protocol","cell","mathScale","position","hint","text"]
statusLineStyles  = ["bar","plain"]
```

Масштаб математических формул не настраивается из файла: пиксельный размер вычисляется из размера ячейки терминала. Секция `math` теперь считается неизвестной и выдаёт предупреждение. Внутренние коэффициенты растеризации в `src/math/` — не пользовательские настройки.

### images
```ts
type ImagesConfig = {
  maxColumns?: number // положительный integer
  maxRows?: number    // положительный integer
}
```

### mermaid
```ts
type MermaidConfig = {
  compact?: boolean
  layoutMaxWidth?: number // положительный integer
  classLayout?: "builtin" | "dagre" // только classDiagram; по умолчанию builtin
}
```

### headings
```ts
type HeadingsConfig = {
  levels?: Partial<Record<HeadingLevelKey, HeadingLevelConfig>>
}
type HeadingLevelKey = "1"|"2"|"3"|"4"|"5"|"6"
type HeadingLevelConfig = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  dim?: boolean
  uppercase?: boolean
  marginTop?: number      // неотрицательный integer
  marginBottom?: number   // неотрицательный integer
  // НЕТ color
}
```

Дефолты стилей: `src/headings.ts:25-32`
```ts
1: { bold: true,  italic:false, underline:true,  dim:false, uppercase:false, marginTop:2, marginBottom:1 }
2: { bold: true,  italic:false, underline:false, dim:false, uppercase:false, marginTop:1, marginBottom:0 }
3: { bold: true,  italic:false, underline:false, dim:false, uppercase:false, marginTop:1, marginBottom:0 }
4: { bold: false, italic:true,  underline:false, dim:false, uppercase:false, marginTop:1, marginBottom:0 }
5: { bold: false, italic:true,  underline:false, dim:true,  uppercase:false, marginTop:1, marginBottom:0 }
6: { bold: false, italic:false, underline:false, dim:true,  uppercase:false, marginTop:1, marginBottom:0 }
```

Цвет заголовка берётся из темы: `headingColor(theme, level) = theme.markdown.headingLevels[level-1] ?? theme.markdown.heading`

Дефолты `headingLevels`:
- light: `[h("#0969da"), h("#8250df"), h("#8250df"), h("#6f42c1"), h("#3d444d"), h("#3d444d")]`
- dark:  `[h("#58a6ff"), h("#d2a8ff"), h("#d2a8ff"), h("#8b949e"), h("#8b949e"), h("#8b949e")]`
- solarized-light и solarized-dark: все уровни используют Solarized blue `#268bd2`, без цветового градиента. Встроенные цвета и цвета Mermaid ограничены каноническими 16 цветами Solarized.

### frame
```ts
type FrameConfig = {
  enabled?: boolean
  width?: number        // > 0 integer
  align?: FrameAlign    // "left"|"center"|"right"
  style?: FrameStyle    // "box"|"ascii"|"rounded"|"heavy"|"double"
  paddingX?: number     // >= 0 integer
  paddingY?: number     // >= 0 integer
  title?: string
  titleAlign?: FrameAlign
}
```
Резолв: `src/core/frame.ts:99-144`. Дефолт: `enabled:false`, `align:left`, `style:box`, `titleAlign:left`, `paddingX:1`, `paddingY:0` (когда enabled)

### tables
```ts
type TablesConfig = {
  widthMode?: TableWidthMode   // "content"|"full"
  overflow?: TableOverflow     // "scroll"|"wrap"
  columnFitter?: TableColumnFitter // "proportional"|"balanced"
  cellPaddingX?: number       // >= 0 integer
}
```
Резолв: `src/core/tables.ts:48-58`. Дефолт: `widthMode:content`, `overflow:scroll`, `columnFitter:balanced`, `cellPaddingX:1`, `wrapMode: none|word` зависит от пары
Цвет линий таблицы берётся из `theme.border.base` (его можно переопределить в конфиге).

## 3. Полная схема темы (фактическая)

[`src/theme/types.ts`](../src/theme/types.ts) + [`src/theme/defaults.ts`](../src/theme/defaults.ts)

```ts
type Theme = {
  mode: ThemeMode // "light"|"dark"
  palette?: readonly RGBA[] // Solarized: 16 базовых цветов для диаграмм
  accent: RGBA
  categorical: readonly RGBA[]
  text: {
    base: RGBA
    muted: RGBA
    feedback: { error: RGBA; warning: RGBA; success: RGBA; info: RGBA }
    action: { primary: { focused: RGBA } }
  }
  background: { base: RGBA }
  border: { base: RGBA }
  frame?: FrameTheme  // { border: RGBA; title: RGBA }
  statusline?: StatusLineTheme // { background: RGBA; foreground: RGBA; title: RGBA; muted: RGBA; border: RGBA }
  markdown: {
    text: RGBA
    heading: RGBA
    headingLevels: readonly [RGBA,RGBA,RGBA,RGBA,RGBA,RGBA] // H1..H6
    link: RGBA
    linkText: RGBA
    code: RGBA
    blockQuote: RGBA
    emphasis: RGBA
    strong: RGBA
    horizontalRule: RGBA
    listItem: RGBA
    listEnumeration: RGBA
    image: RGBA
    imageText: RGBA
    codeBlock: RGBA
  }
  syntax: {
    comment: RGBA
    keyword: RGBA
    function: RGBA
    variable: RGBA
    string: RGBA
    number: RGBA
    type: RGBA
    operator: RGBA
    punctuation: RGBA
  }
  diff: {
    text: { added: RGBA; removed: RGBA; context: RGBA }
    background: { added: RGBA; removed: RGBA; context: RGBA }
  }
}
```

## 4. Карта валидации (текущая)
| Секция | Валидируется | Варнинги | Примечание
|---|---|---|---|
| root | allowlist + `$schema` игнор | `Unknown config section` | |
| theme | вложенные ключи, mode, hex/имена цветов, categorical | неизвестные и неверные поля | `src/config/theme.ts`; некорректный цвет не попадает в рендер |
| statusline | поля, стили, highlight, border | много | неплохо |
| images/mermaid | типы + положительные числа | нет явных варнингов (просто дроп) | |
| headings | уровни 1-6, опции, типы | много | хорошо |
| frame | все опции + типы | много (6 в тесте) | хорошо |
| tables | все опции + типы | много (4 в тесте) | хорошо |

## 5. Заметки для разработчиков (не часть формата конфига)

### Реализовано: валидация темы и разделение источников

`src/config/theme.ts` проверяет вложенные поля темы и отбрасывает некорректные цвета с предупреждениями. `src/config/resolve.ts` отдельно принимает конфиг и runtime-параметры хоста; разрешение темы и layout можно использовать без `CliRenderer` и без файловой системы.

Порядок режимов темы: готовая тема хоста > явный runtime `themeMode` > `config.theme.mode` > light. Режим терминала не учитывается. Для `frame` и `tables` явно заданные runtime-значения перекрывают настройки файла. Демо позволяет менять эти параметры через панель по `c` без сохранения файла; statusline показывает только сведения.

Оставшаяся задача — последовательно отделить загрузку/проверку статического файла от реактивных входов хоста во всех ветках рендера. В частности, нужно проверить изменение Mermaid-настроек при обновлении конфига.

### Идея, не утверждённая схема: расширить ThemeOverride
Файл: `src/theme/types.ts`
```ts
export type MarkdownThemeOverride = {
  readonly [K in Exclude<keyof Theme["markdown"], "headingLevels">]?: ColorInput
} & {
  readonly heading1?: ColorInput
  readonly heading2?: ColorInput
  readonly heading3?: ColorInput
  readonly heading4?: ColorInput
  readonly heading5?: ColorInput
  readonly heading6?: ColorInput
  readonly headingLevels?: readonly ColorInput[]  // добавить
}
```

Файл: `src/theme/resolve.ts` `mergeMarkdownTheme()` - добавить поддержку массива (приоритет выше `heading1..heading6` или наоборот? Лучше зафиксировать: `headingLevels` массив целиком перезаписывает, либо `headingN` приоритетнее массива. Нужно продумать, но явно добавить обработку)

### Идея, не утверждённая схема: цвет в headings.levels
Файлы: `src/config/types.ts`, `src/config/load.ts`, `src/headings.ts`, `src/theme/resolve.ts` или `src/app.tsx`

1. `src/config/types.ts`
```ts
export type HeadingLevelConfig = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  dim?: boolean
  uppercase?: boolean
  marginTop?: number
  marginBottom?: number
  color?: string  // новый
}
```

2. `src/config/load.ts` `validateHeadingLevel()` добавить case `color` с проверкой допустимого цвета.

3. Склейка: нужно применить `config.headings.levels[N].color` к теме. Самый чистый вариант - в `resolveTheme` или отдельная функция `applyHeadingColors(theme, headings)` вызываемая в `app.tsx` после `resolveRendererTheme()`. Альтернатива - расширить `mergeTheme` чтобы принимать `headings`.

Приоритет (предлагаемый):
`headings.levels[N].color` > `theme.markdown.headingN` > `theme.markdown.heading` > `theme.markdown.headingLevels` дефолт

### Шаг 4. Единые хелперы валидации
`src/config/load.ts` добавить:
```ts
function warn(report: ConfigReporter | undefined, message: string) { ... }
function isRecord(v: unknown): v is Record<string,unknown> { ... }
function isString(v:unknown): v is string { return typeof v === 'string' }
function isBoolean(v:unknown): v is boolean { return typeof v === 'boolean' }
function isNonNegativeInteger(v:unknown): v is number { ... }
function positiveInteger(v:unknown): number|undefined { ... }
function positiveNumber(v:unknown): number|undefined { ... }
function validateUnknownKeys(obj: Record<string,unknown>, allowed: readonly string[], file: string, report?: ConfigReporter, prefix = '') { ... }
function validateStringEnum<T extends string>(v:unknown, allowed: readonly T[]): v is T { ... }
```

Использовать во всех `validate*` функциях.

### Возможное направление: вынести фиксированные параметры
Найти и вынести:
- `src/app.tsx` - отступы display-math (`marginTop:1, marginBottom:1`), прочий хардкод
- `src/view/frame.tsx` - бордеры
- `src/view/table.ts` - скролл поведение
- `src/view/inline-flow.tsx` / `src/media.tsx` - отступы списков/блоков/картинок
- `src/core/*` - дефолты

Варианты: расширить `theme` (новые секции) или добавить `spacing/lists/blocks` в корень конфига.

## 6. Черновой пример будущего конфига (содержит неподдерживаемые поля)

**Не копируйте этот пример как рабочий JSONC.** `theme.markdown.headingLevels` и `headings.levels[N].color` сейчас не поддерживаются, `$schema` здесь не указывает на опубликованный файл. Для рабочего конфига используйте [пример из `examples/`](../examples/opentui-markdown-render.jsonc). Структура будущего конфига ещё не утверждена.
```jsonc
{
  "$schema": "./node_modules/opentui-markdown-render/schema.json",
  "theme": {
    "mode": "dark",
    "accent": "#7dd3fc",
    "categorical": ["#7dd3fc", "#a78bfa", "#34d399"],
    "text": { "base": "#e2e8f0", "muted": "#94a3b8", "feedback": { "error": "#f87171", "warning": "#fbbf24", "success": "#34d399", "info": "#7dd3fc" } },
    "background": { "base": "#0f172a" },
    "border": { "base": "#334155" },
    "frame": { "border": "#475569", "title": "#94a3b8" },
    "statusline": { "background": "#162333", "foreground": "#e2e8f0", "title": "#7dd3fc", "muted": "#94a3b8", "border": "#7dd3fc" },
    "markdown": {
      "text": "#e2e8f0",
      "heading": "#e2e8f0",
      "heading1": "#7dd3fc",
      "heading2": "#a78bfa",
      "heading3": "#94a3b8",
      "headingLevels": ["#7dd3fc", "#a78bfa", "#94a3b8", "#64748b", "#64748b", "#64748b"],
      "link": "#7dd3fc",
      "linkText": "#7dd3fc",
      "code": "#f59e0b",
      "blockQuote": "#94a3b8",
      "emphasis": "#e2e8f0",
      "strong": "#e2e8f0",
      "horizontalRule": "#334155",
      "listItem": "#e2e8f0",
      "listEnumeration": "#e2e8f0",
      "image": "#7dd3fc",
      "imageText": "#7dd3fc",
      "codeBlock": "#e2e8f0"
    },
    "syntax": {
      "comment": "#64748b",
      "keyword": "#f87171",
      "function": "#a78bfa",
      "variable": "#f59e0b",
      "string": "#34d399",
      "number": "#7dd3fc",
      "type": "#fbbf24",
      "operator": "#f87171",
      "punctuation": "#cbd5e1"
    },
    "diff": {
      "text": { "added": "#34d399", "removed": "#f87171", "context": "#94a3b8" },
      "background": { "added": "#064e3b", "removed": "#7f1d1d", "context": "#1e293b" }
    }
  },
  "statusline": {
    "enabled": true,
    "style": "bar",
    "highlight": "title",
    "fields": ["title", "mode", "protocol", "cell", "mathScale", "position"],
    "separator": " · ",
    "border": "top"
  },
  "images": { "maxColumns": 80, "maxRows": 32 },
  "mermaid": { "compact": false, "layoutMaxWidth": 120 },
  "headings": {
    "levels": {
      "1": { "bold": true, "underline": true, "color": "#7dd3fc", "marginTop": 2, "marginBottom": 1 },
      "2": { "bold": true, "color": "#a78bfa", "marginTop": 1 },
      "3": { "bold": true, "dim": true, "color": "#94a3b8" }
    }
  },
  "frame": { "enabled": true, "width": 100, "align": "center", "style": "rounded", "paddingX": 2, "paddingY": 1, "title": "notes.md", "titleAlign": "right" },
  "tables": { "widthMode": "content", "overflow": "scroll", "columnFitter": "balanced", "cellPaddingX": 1 }
}
