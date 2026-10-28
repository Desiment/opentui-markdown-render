import { createMemo } from "solid-js"
import { parseDocument } from "../../src/core/parse"
import { DocumentView } from "../../src/view/document"
import { resolveConfiguredLayout } from "../../src/config/resolve"
import { defaultTheme } from "../../src/theme/default"
import { defaultHeadingsConfig } from "../../src/config/defaults"
import { defaultGraphicsCapabilities } from "../../src/graphics"
import type { RendererTheme } from "../../src/theme/types"

export function UnifiedHarness(props: any) {
  const doc = createMemo(() => parseDocument(props.source || ""))
  const theme = (props.theme || defaultTheme) as RendererTheme
  const headings = props.headings || defaultHeadingsConfig
  const graphics = props.graphics || defaultGraphicsCapabilities()
  const layout = resolveConfiguredLayout({
    frame: { width: 80, height: 24, preset: "none" },
    tables: { widthMode: "content", columnFitter: "balanced", cellPaddingX: 1, wrapMode: "truncate" },
    contentWidth: props.columns || 80,
  })
  return (
    <DocumentView
      document={doc()}
      columns={layout.contentWidth}
      theme={theme}
      headings={headings as any}
      graphics={graphics}
      surface={{ backgroundColor: () => theme.background.base }}
      assetBase={props.assetBase || ""}
      imageLimits={props.imageLimits || { maxColumns: 80, maxRows: 32 }}
      tableOptions={layout.tables}
      mermaidOptions={{}}
      renderer={props.renderer}
    />
  )
}
